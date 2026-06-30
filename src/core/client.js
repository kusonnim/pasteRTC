import {
  acceptOfferDescription,
  createAnswerDescription,
  Peer,
} from "./peer.js";
import { decodeOffer, encodeAnswer } from "./signaling.js";

/**
 * The generic client side of a single PasteRTC connection.
 */
export class Client extends Peer {
  #offerText = null;
  #answerPending = false;
  #connected = false;
  #answerExpired = false;

  /**
   * @param {object} [callbacks]
   * @param {() => void} [callbacks.onOpen]
   * @param {(data: string) => void} [callbacks.onMessage]
   * @param {(state: string) => void} [callbacks.onStateChange]
   * @param {(error: Error) => void} [callbacks.onError]
   */
  constructor(callbacks = {}) {
    super("client", callbacks);
  }

  /**
   * Applies a copy-paste offer and returns the generated answer.
   *
   * The generated answer starts a manual-signaling pending window. If the
   * client-side connection fails before the DataChannel opens, PasteRTC reports
   * that as `answer-expired` so an application can ask the user to generate a
   * fresh answer.
   *
   * @param {string} offerText
   * @returns {Promise<string>}
   */
  async acceptOffer(offerText) {
    return this.#createAnswerFromOffer(offerText);
  }

  /**
   * Creates a fresh answer for a previously accepted offer.
   *
   * This is useful when a manually transferred answer expires before the host
   * accepts it. Passing `offerText` is recommended; when omitted, the most
   * recently accepted offer is reused.
   *
   * @param {string} [offerText]
   * @returns {Promise<string>}
   */
  async regenerateAnswer(offerText = this.#offerText) {
    if (!offerText) {
      throw new Error("Offer text is required to regenerate an answer.");
    }

    this.#answerPending = false;
    this.#connected = false;
    this.#answerExpired = false;
    this._replaceConnection();
    return this.#createAnswerFromOffer(offerText);
  }

  /** @internal */
  _handleOpen() {
    this.#answerPending = false;
    this.#connected = true;
    super._handleOpen();
  }

  /** @internal */
  _handleStateChange(state) {
    if (state === "connected") {
      this.#answerPending = false;
      this.#connected = true;
      this._emit("statechange", "connected");
      return;
    }

    if (state === "failed") {
      if (this.#answerPending && !this.#connected) {
        this.#answerPending = false;
        this.#answerExpired = true;
        this._emit("answer-expired");
        this._emit("statechange", "answer-expired");
        return;
      }

      this._emit("failed");
      this._emit("statechange", "failed");
      return;
    }

    super._handleStateChange(state);
  }

  async #createAnswerFromOffer(offerText) {
    const offer = decodeOffer(offerText);
    await acceptOfferDescription(this, offer);

    this.#offerText = offerText;
    this.#answerPending = true;
    this.#connected = false;
    this.#answerExpired = false;

    const answer = await createAnswerDescription(this);

    if (this.#answerExpired) {
      return encodeAnswer(answer);
    }

    this.#answerPending = true;
    this._emit("answer-created");
    this._emit("statechange", "answer-created");
    this._emit("signaling-pending");
    this._emit("statechange", "signaling-pending");

    return encodeAnswer(answer);
  }
}
