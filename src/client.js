import {
  acceptOfferDescription,
  createAnswerDescription,
  Peer,
} from "./peer.js";
import {
  bindButton,
  createTiltController,
} from "./browser-input.js";
import { decodeOffer, encodeAnswer } from "./signaling.js";

/**
 * The client side of a single PasteRTC connection.
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

  /**
   * Sends a controller button event.
   *
   * @param {string} key
   * @param {boolean} pressed
   */
  sendButton(key, pressed) {
    this.send(JSON.stringify({
      type: "button",
      key,
      pressed,
    }));
  }

  /**
   * Sends a controller stick position.
   *
   * @param {object} position
   * @param {number} position.x
   * @param {number} position.y
   */
  sendStick({ x, y }) {
    this.send(JSON.stringify({
      type: "stick",
      x,
      y,
    }));
  }

  /**
   * Sends device tilt values.
   *
   * @param {object} tilt
   * @param {number} tilt.alpha
   * @param {number} tilt.beta
   * @param {number} tilt.gamma
   */
  sendTilt({ alpha, beta, gamma }) {
    this.send(JSON.stringify({
      type: "tilt",
      alpha,
      beta,
      gamma,
    }));
  }

  /**
   * Creates a browser Device Orientation helper.
   *
   * @param {object} [options]
   * @returns {import("./browser-input.js").TiltController}
   */
  createTiltController(options) {
    return createTiltController(this, options);
  }

  /**
   * Binds a DOM element to a controller button.
   *
   * @param {EventTarget & object} element
   * @param {string} key
   * @param {object} [options]
   * @returns {import("./browser-input.js").ButtonBinding}
   */
  bindButton(element, key, options) {
    return bindButton(this, element, key, options);
  }
}
