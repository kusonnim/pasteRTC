import { Connection } from "./connection.js";

const SUPPORTED_EVENTS = new Set([
  "connected",
  "data",
  "statechange",
  "error",
  "answer-created",
  "answer-expired",
  "signaling-pending",
  "failed",
]);

const CALLBACK_EVENTS = {
  onOpen: "connected",
  onMessage: "data",
  onStateChange: "statechange",
  onError: "error",
};

const connections = new WeakMap();

/**
 * Shared implementation for a single generic PasteRTC peer.
 *
 * @internal
 */
export class Peer {
  #listeners = new Map();
  #role;

  /**
   * @param {"host" | "client"} role
   * @param {object} [callbacks]
   * @param {() => void} [callbacks.onOpen]
   * @param {(data: string) => void} [callbacks.onMessage]
   * @param {(state: string) => void} [callbacks.onStateChange]
   * @param {(error: Error) => void} [callbacks.onError]
   */
  constructor(role, callbacks = {}) {
    this.#role = role;

    for (const [callbackName, eventName] of Object.entries(CALLBACK_EVENTS)) {
      const callback = callbacks[callbackName];

      if (typeof callback === "function") {
        this.on(eventName, callback);
      }
    }

    this._replaceConnection();
  }

  /**
   * Registers a listener for a peer event.
   *
   * Supported events: `connected`, `data`, `statechange`, `error`,
   * `answer-created`, `signaling-pending`, `answer-expired`, and `failed`.
   *
   * @param {"connected" | "data" | "statechange" | "error" | "answer-created" | "signaling-pending" | "answer-expired" | "failed"} eventName
   * @param {Function} callback
   * @returns {this}
   */
  on(eventName, callback) {
    if (!SUPPORTED_EVENTS.has(eventName)) {
      throw new Error(`Unsupported event: ${eventName}`);
    }

    if (typeof callback !== "function") {
      throw new TypeError("Event callback must be a function.");
    }

    const listeners = this.#listeners.get(eventName) ?? new Set();
    listeners.add(callback);
    this.#listeners.set(eventName, listeners);
    return this;
  }

  /**
   * Sends a raw string through the open DataChannel.
   *
   * @param {string} data
   */
  send(data) {
    getConnection(this).send(data);
  }

  /** Closes the DataChannel and peer connection. */
  close() {
    getConnection(this).close();
  }

  /** @internal */
  _replaceConnection() {
    const existingConnection = connections.get(this);
    const connection = new Connection({
      role: this.#role,
      onOpen: () => {
        if (connections.get(this) === connection) {
          this._handleOpen();
        }
      },
      onMessage: (data) => {
        if (connections.get(this) === connection) {
          this._handleMessage(data);
        }
      },
      onStateChange: (state) => {
        if (connections.get(this) === connection) {
          this._handleStateChange(state);
        }
      },
      onError: (error) => {
        if (connections.get(this) === connection) {
          this._handleError(error);
        }
      },
    });

    connections.set(this, connection);
    existingConnection?.close();
  }

  /** @internal */
  _handleOpen() {
    this._emit("connected");
  }

  /** @internal */
  _handleMessage(data) {
    this._emit("data", data);
  }

  /** @internal */
  _handleStateChange(state) {
    this._emit("statechange", state);
  }

  /** @internal */
  _handleError(error) {
    this._emit("error", error);
  }

  /** @internal */
  _emit(eventName, value) {
    for (const listener of this.#listeners.get(eventName) ?? []) {
      listener(value);
    }
  }
}

/** @internal */
export function createOfferDescription(peer) {
  return getConnection(peer).createOffer();
}

/** @internal */
export function acceptOfferDescription(peer, offer) {
  return getConnection(peer).acceptOffer(offer);
}

/** @internal */
export function createAnswerDescription(peer) {
  return getConnection(peer).createAnswer();
}

/** @internal */
export function acceptAnswerDescription(peer, answer) {
  return getConnection(peer).acceptAnswer(answer);
}

function getConnection(peer) {
  const connection = connections.get(peer);

  if (!connection) {
    throw new TypeError("Invalid peer instance.");
  }

  return connection;
}
