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
   * @param {string} offerText
   * @returns {Promise<string>}
   */
  async acceptOffer(offerText) {
    const offer = decodeOffer(offerText);
    await acceptOfferDescription(this, offer);

    const answer = await createAnswerDescription(this);
    return encodeAnswer(answer);
  }
}
