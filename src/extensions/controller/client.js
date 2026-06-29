import { Client as CoreClient } from "../../core/client.js";
import {
  bindButton,
  createMotionController,
  createTiltController,
} from "./browser-input.js";

/**
 * Client with optional controller helper methods.
 */
export class Client extends CoreClient {
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
   * Sends device motion values.
   *
   * @param {object} motion
   * @param {DeviceMotionEventAcceleration | null} motion.acceleration
   * @param {DeviceMotionEventAcceleration | null} motion.accelerationIncludingGravity
   * @param {DeviceMotionEventRotationRate | null} motion.rotationRate
   * @param {number} motion.interval
   */
  sendMotion({
    acceleration,
    accelerationIncludingGravity,
    rotationRate,
    interval,
  }) {
    this.send(JSON.stringify({
      type: "motion",
      acceleration,
      accelerationIncludingGravity,
      rotationRate,
      interval,
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
   * Creates a browser Device Motion helper.
   *
   * @param {object} [options]
   * @returns {import("./browser-input.js").MotionController}
   */
  createMotionController(options) {
    return createMotionController(this, options);
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
