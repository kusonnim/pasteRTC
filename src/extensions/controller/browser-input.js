/**
 * Bridges browser Device Orientation events into Client.sendTilt().
 */
export class TiltController {
  #client;
  #target;
  #eventName;
  #listening = false;
  #handleOrientation = (event) => {
    this.#client.sendTilt({
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
    });
  };

  /**
   * @param {object} client
   * @param {(tilt: { alpha: number, beta: number, gamma: number }) => void} client.sendTilt
   * @param {object} [options]
   * @param {EventTarget & object} [options.target]
   * @param {string} [options.eventName]
   */
  constructor(client, {
    target = globalThis,
    eventName = "deviceorientation",
  } = {}) {
    this.#client = client;
    this.#target = target;
    this.#eventName = eventName;
  }

  /**
   * Starts forwarding orientation events.
   *
   * @returns {Promise<boolean>} Whether listening started.
   */
  async start() {
    if (!this.#canListen()) {
      return false;
    }

    const hasPermission = await this.#requestPermission();

    if (!hasPermission) {
      return false;
    }

    if (!this.#listening) {
      this.#target.addEventListener(this.#eventName, this.#handleOrientation);
      this.#listening = true;
    }

    return true;
  }

  /** Stops forwarding orientation events. */
  stop() {
    if (!this.#listening) {
      return;
    }

    this.#target.removeEventListener(this.#eventName, this.#handleOrientation);
    this.#listening = false;
  }

  #canListen() {
    return Boolean(
      this.#target?.addEventListener &&
        this.#target?.removeEventListener &&
        this.#getDeviceOrientationEvent(),
    );
  }

  async #requestPermission() {
    const DeviceOrientation = this.#getDeviceOrientationEvent();

    if (typeof DeviceOrientation?.requestPermission !== "function") {
      return true;
    }

    try {
      return (await DeviceOrientation.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }

  #getDeviceOrientationEvent() {
    return this.#target?.DeviceOrientationEvent ?? globalThis.DeviceOrientationEvent;
  }
}

/**
 * Bridges browser Device Motion events into Client.sendMotion().
 */
export class MotionController {
  #client;
  #target;
  #eventName;
  #listening = false;
  #handleMotion = (event) => {
    this.#client.sendMotion({
      acceleration: normalizeAcceleration(event.acceleration),
      accelerationIncludingGravity: normalizeAcceleration(
        event.accelerationIncludingGravity,
      ),
      rotationRate: normalizeRotationRate(event.rotationRate),
      interval: event.interval,
    });
  };

  /**
   * @param {object} client
   * @param {(motion: {
   *   acceleration: DeviceMotionEventAcceleration | null,
   *   accelerationIncludingGravity: DeviceMotionEventAcceleration | null,
   *   rotationRate: DeviceMotionEventRotationRate | null,
   *   interval: number
   * }) => void} client.sendMotion
   * @param {object} [options]
   * @param {EventTarget & object} [options.target]
   * @param {string} [options.eventName]
   */
  constructor(client, {
    target = globalThis,
    eventName = "devicemotion",
  } = {}) {
    this.#client = client;
    this.#target = target;
    this.#eventName = eventName;
  }

  /**
   * Starts forwarding motion events.
   *
   * @returns {Promise<boolean>} Whether listening started.
   */
  async start() {
    if (!this.#canListen()) {
      return false;
    }

    const hasPermission = await this.#requestPermission();

    if (!hasPermission) {
      return false;
    }

    if (!this.#listening) {
      this.#target.addEventListener(this.#eventName, this.#handleMotion);
      this.#listening = true;
    }

    return true;
  }

  /** Stops forwarding motion events. */
  stop() {
    if (!this.#listening) {
      return;
    }

    this.#target.removeEventListener(this.#eventName, this.#handleMotion);
    this.#listening = false;
  }

  #canListen() {
    return Boolean(
      this.#target?.addEventListener &&
        this.#target?.removeEventListener &&
        this.#getDeviceMotionEvent(),
    );
  }

  async #requestPermission() {
    const DeviceMotion = this.#getDeviceMotionEvent();

    if (typeof DeviceMotion?.requestPermission !== "function") {
      return true;
    }

    try {
      return (await DeviceMotion.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }

  #getDeviceMotionEvent() {
    return this.#target?.DeviceMotionEvent ?? globalThis.DeviceMotionEvent;
  }
}

/**
 * Binds DOM press/release events to Client.sendButton().
 */
export class ButtonBinding {
  #client;
  #element;
  #key;
  #pressed = false;
  #listeners = [];

  /**
   * @param {object} client
   * @param {(key: string, pressed: boolean) => void} client.sendButton
   * @param {EventTarget & object} element
   * @param {string} key
   * @param {object} [options]
   * @param {boolean} [options.usePointerEvents]
   */
  constructor(client, element, key, { usePointerEvents } = {}) {
    if (!element?.addEventListener || !element?.removeEventListener) {
      throw new TypeError("Button binding requires a DOM element.");
    }

    this.#client = client;
    this.#element = element;
    this.#key = key;

    this.#bind(usePointerEvents ?? this.#supportsPointerEvents());
  }

  /** Removes all event listeners created by this binding. */
  unbind() {
    for (const [eventName, handler] of this.#listeners) {
      this.#element.removeEventListener(eventName, handler);
    }

    this.#listeners = [];
    this.#pressed = false;
  }

  #bind(usePointerEvents) {
    if (usePointerEvents) {
      this.#listen("pointerdown", () => this.#setPressed(true));
      this.#listen("pointerup", () => this.#setPressed(false));
      this.#listen("pointercancel", () => this.#setPressed(false));
      this.#listen("pointerleave", () => this.#setPressed(false));
      return;
    }

    this.#listen("touchstart", () => this.#setPressed(true));
    this.#listen("touchend", () => this.#setPressed(false));
    this.#listen("touchcancel", () => this.#setPressed(false));
    this.#listen("mousedown", () => this.#setPressed(true));
    this.#listen("mouseup", () => this.#setPressed(false));
    this.#listen("mouseleave", () => this.#setPressed(false));
  }

  #listen(eventName, handler) {
    this.#element.addEventListener(eventName, handler);
    this.#listeners.push([eventName, handler]);
  }

  #setPressed(pressed) {
    if (this.#pressed === pressed) {
      return;
    }

    this.#pressed = pressed;
    this.#client.sendButton(this.#key, pressed);
  }

  #supportsPointerEvents() {
    return "PointerEvent" in globalThis || "onpointerdown" in this.#element;
  }
}

/**
 * Creates a tilt controller for a Client-like object.
 *
 * @param {object} client
 * @param {object} [options]
 * @returns {TiltController}
 */
export function createTiltController(client, options) {
  return new TiltController(client, options);
}

/**
 * Creates a motion controller for a Client-like object.
 *
 * @param {object} client
 * @param {object} [options]
 * @returns {MotionController}
 */
export function createMotionController(client, options) {
  return new MotionController(client, options);
}

/**
 * Binds a DOM element to a Client-like button sender.
 *
 * @param {object} client
 * @param {EventTarget & object} element
 * @param {string} key
 * @param {object} [options]
 * @returns {ButtonBinding}
 */
export function bindButton(client, element, key, options) {
  return new ButtonBinding(client, element, key, options);
}

function normalizeAcceleration(acceleration) {
  if (!acceleration) {
    return acceleration;
  }

  return {
    x: acceleration.x,
    y: acceleration.y,
    z: acceleration.z,
  };
}

function normalizeRotationRate(rotationRate) {
  if (!rotationRate) {
    return rotationRate;
  }

  return {
    alpha: rotationRate.alpha,
    beta: rotationRate.beta,
    gamma: rotationRate.gamma,
  };
}
