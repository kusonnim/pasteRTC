import {
  acceptAnswerDescription,
  createOfferDescription,
  Peer,
} from "./peer.js";
import { decodeAnswer, encodeOffer } from "./signaling.js";

const PRIMARY_CLIENT_ID = "primary";
const SUPPORTED_EVENTS = new Set([
  "connected",
  "data",
  "statechange",
  "error",
  "clientConnected",
  "clientDisconnected",
]);

const CALLBACK_EVENTS = {
  onOpen: "connected",
  onMessage: "data",
  onStateChange: "statechange",
  onError: "error",
  onClientConnected: "clientConnected",
  onClientDisconnected: "clientDisconnected",
};

/**
 * The host side of one or more independent PasteRTC connections.
 */
export class Host {
  #clients = new Map();
  #listeners = new Map();

  /**
   * @param {object} [callbacks]
   * @param {() => void} [callbacks.onOpen]
   * @param {(data: string) => void} [callbacks.onMessage]
   * @param {(state: string) => void} [callbacks.onStateChange]
   * @param {(error: Error) => void} [callbacks.onError]
   * @param {(clientId: string) => void} [callbacks.onClientConnected]
   * @param {(clientId: string) => void} [callbacks.onClientDisconnected]
   */
  constructor(callbacks = {}) {
    for (const [callbackName, eventName] of Object.entries(CALLBACK_EVENTS)) {
      const callback = callbacks[callbackName];

      if (typeof callback === "function") {
        this.on(eventName, callback);
      }
    }

    this.#addClient(PRIMARY_CLIENT_ID);
  }

  /**
   * Registers a listener for a host event.
   *
   * Supported events: `connected`, `data`, `statechange`, `error`,
   * `clientConnected`, and `clientDisconnected`.
   *
   * @param {"connected" | "data" | "statechange" | "error" | "clientConnected" | "clientDisconnected"} eventName
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
   * Creates a copy-paste offer for one client after ICE gathering completes.
   *
   * @param {string} [clientId="primary"]
   * @returns {Promise<string>}
   */
  async createOffer(clientId = PRIMARY_CLIENT_ID) {
    const client = this.#getOrAddClient(clientId);
    const offer = await createOfferDescription(client.peer);
    return encodeOffer(offer);
  }

  /**
   * Applies a copy-paste answer from the client.
   *
   * Supports `acceptAnswer(answerText)` for the primary client and
   * `acceptAnswer(clientId, answerText)` for a specific client.
   *
   * @param {string} clientIdOrAnswer
   * @param {string} [answerText]
   * @returns {Promise<void>}
   */
  async acceptAnswer(clientIdOrAnswer, answerText) {
    const [clientId, signalText] =
      answerText === undefined
        ? [PRIMARY_CLIENT_ID, clientIdOrAnswer]
        : [clientIdOrAnswer, answerText];
    const answer = decodeAnswer(signalText);
    await acceptAnswerDescription(this.#getClient(clientId).peer, answer);
  }

  /**
   * Sends a raw string to one client.
   *
   * Supports `send(data)` for the primary client and
   * `send(clientId, data)` for a specific client.
   *
   * @param {string} clientIdOrData
   * @param {string} [data]
   */
  send(clientIdOrData, data) {
    const [clientId, message] =
      data === undefined
        ? [PRIMARY_CLIENT_ID, clientIdOrData]
        : [clientIdOrData, data];
    this.#getClient(clientId).peer.send(message);
  }

  /**
   * Sends a raw string to every connected client.
   *
   * @param {string} data
   */
  broadcast(data) {
    for (const client of this.#clients.values()) {
      if (client.connected) {
        client.peer.send(data);
      }
    }
  }

  /**
   * Disconnects and removes one client.
   *
   * @param {string} [clientId="primary"]
   * @returns {boolean} Whether a client was removed.
   */
  disconnect(clientId = PRIMARY_CLIENT_ID) {
    const client = this.#clients.get(clientId);

    if (!client) {
      return false;
    }

    client.peer.close();
    this.#clients.delete(clientId);
    this.#emitClientDisconnected(clientId, client);
    return true;
  }

  /** Closes every connection owned by the host. */
  close() {
    for (const clientId of [...this.#clients.keys()]) {
      this.disconnect(clientId);
    }
  }

  #getOrAddClient(clientId) {
    this.#assertClientId(clientId);
    return this.#clients.get(clientId) ?? this.#addClient(clientId);
  }

  #getClient(clientId) {
    this.#assertClientId(clientId);
    const client = this.#clients.get(clientId);

    if (!client) {
      throw new Error(`Unknown client: ${clientId}`);
    }

    return client;
  }

  #addClient(clientId) {
    this.#assertClientId(clientId);

    const client = {
      connected: false,
      disconnected: false,
      peer: undefined,
    };

    client.peer = new Peer("host", {
      onOpen: () => {
        client.connected = true;
        this.#emit("connected", clientId);
        this.#emit("clientConnected", clientId);
      },
      onMessage: (data) => {
        this.#emit("data", data, clientId);
      },
      onStateChange: (state) => {
        this.#emit("statechange", state, clientId);

        if (state === "disconnected" || state === "closed") {
          this.#emitClientDisconnected(clientId, client);
        }
      },
      onError: (error) => {
        this.#emit("error", error, clientId);
      },
    });

    this.#clients.set(clientId, client);
    return client;
  }

  #emitClientDisconnected(clientId, client) {
    if (!client.connected || client.disconnected) {
      return;
    }

    client.disconnected = true;
    client.connected = false;
    this.#emit("clientDisconnected", clientId);
  }

  #emit(eventName, ...args) {
    for (const listener of this.#listeners.get(eventName) ?? []) {
      listener(...args);
    }
  }

  #assertClientId(clientId) {
    if (typeof clientId !== "string" || !clientId.trim()) {
      throw new TypeError("Client ID must be a non-empty string.");
    }
  }
}
