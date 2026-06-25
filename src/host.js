import {
  acceptAnswerDescription,
  createOfferDescription,
  Peer,
} from "./peer.js";
import { decodeAnswer, encodeOffer } from "./signaling.js";

/**
 * The host side of a single PasteRTC connection.
 */
export class Host extends Peer {
  /**
   * @param {object} [callbacks]
   * @param {() => void} [callbacks.onOpen]
   * @param {(data: string) => void} [callbacks.onMessage]
   * @param {(state: string) => void} [callbacks.onStateChange]
   * @param {(error: Error) => void} [callbacks.onError]
   */
  constructor(callbacks = {}) {
    super("host", callbacks);
  }

  /**
   * Creates a copy-paste offer after ICE gathering completes.
   *
   * @returns {Promise<string>}
   */
  async createOffer() {
    const offer = await createOfferDescription(this);
    return encodeOffer(offer);
  }

  /**
   * Applies a copy-paste answer from the client.
   *
   * @param {string} answerText
   * @returns {Promise<void>}
   */
  async acceptAnswer(answerText) {
    const answer = decodeAnswer(answerText);
    await acceptAnswerDescription(this, answer);
  }
}
