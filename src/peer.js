import { Connection } from "./connection.js";

const SUPPORTED_EVENTS = new Set([
  "connected",
  "data",
  "statechange",
  "error",
]);

const CALLBACK_EVENTS = {
  onOpen: "connected",
  onMessage: "data",
  onStateChange: "statechange",
  onError: "error",
};

const connections = new WeakMap();

/**
 * Shared implementation for a single PasteRTC peer.
 *
 * @internal
 */
export class Peer {
  #listeners = new Map();

  /**
   * @param {"host" | "client"} role
   * @param {object} [callbacks]
   * @param {() => void} [callbacks.onOpen]
   * @param {(data: string) => void} [callbacks.onMessage]
   * @param {(state: string) => void} [callbacks.onStateChange]
   * @param {(error: Error) => void} [callbacks.onError]
   */
  constructor(role, callbacks = {}) {
    for (const [callbackName, eventName] of Object.entries(CALLBACK_EVENTS)) {
      const callback = callbacks[callbackName];

      if (typeof callback === "function") {
        this.on(eventName, callback);
      }
    }

    connections.set(this, new Connection({
      role,
      onOpen: () => this.#emit("connected"),
      onMessage: (data) => this.#emit("data", data),
      onStateChange: (state) => this.#emit("statechange", state),
      onError: (error) => this.#emit("error", error),
    }));
  }

  /**
   * Registers a listener for a peer event.
   *
   * Supported events: `connected`, `data`, `statechange`, and `error`.
   *
   * @param {"connected" | "data" | "statechange" | "error"} eventName
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

  #emit(eventName, value) {
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
