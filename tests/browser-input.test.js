import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  bindButton,
  createMotionController,
  createTiltController,
} from "../src/browser-input.js";

function dispatch(target, eventName, values = {}) {
  const event = new Event(eventName);

  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { value });
  }

  target.dispatchEvent(event);
}

describe("browser input helpers", () => {
  test("tilt controller starts, forwards orientation values, and stops", async () => {
    const sent = [];
    const target = new EventTarget();
    target.DeviceOrientationEvent = function DeviceOrientationEvent() {};
    const tilt = createTiltController(
      {
        sendTilt: (data) => sent.push(data),
      },
      { target },
    );

    assert.equal(await tilt.start(), true);

    dispatch(target, "deviceorientation", {
      alpha: 10,
      beta: 20,
      gamma: -5,
    });

    tilt.stop();

    dispatch(target, "deviceorientation", {
      alpha: 1,
      beta: 2,
      gamma: 3,
    });

    assert.deepEqual(sent, [
      {
        alpha: 10,
        beta: 20,
        gamma: -5,
      },
    ]);
  });

  test("tilt controller reports unavailable browser support", async () => {
    const target = new EventTarget();
    const tilt = createTiltController(
      {
        sendTilt: () => {
          throw new Error("should not send");
        },
      },
      { target },
    );

    assert.equal(await tilt.start(), false);
  });

  test("tilt controller handles denied browser permission", async () => {
    const target = new EventTarget();
    target.DeviceOrientationEvent = function DeviceOrientationEvent() {};
    target.DeviceOrientationEvent.requestPermission = async () => "denied";
    const tilt = createTiltController(
      {
        sendTilt: () => {
          throw new Error("should not send");
        },
      },
      { target },
    );

    assert.equal(await tilt.start(), false);

    dispatch(target, "deviceorientation", {
      alpha: 10,
      beta: 20,
      gamma: -5,
    });
  });

  test("motion controller starts, forwards motion values, and stops", async () => {
    const sent = [];
    const target = new EventTarget();
    target.DeviceMotionEvent = function DeviceMotionEvent() {};
    const motion = createMotionController(
      {
        sendMotion: (data) => sent.push(data),
      },
      { target },
    );

    assert.equal(await motion.start(), true);

    dispatch(target, "devicemotion", {
      acceleration: { x: 1, y: 2, z: 3 },
      accelerationIncludingGravity: { x: 4, y: 5, z: 6 },
      rotationRate: { alpha: 7, beta: 8, gamma: 9 },
      interval: 16,
    });

    motion.stop();

    dispatch(target, "devicemotion", {
      acceleration: { x: 10, y: 20, z: 30 },
      accelerationIncludingGravity: { x: 40, y: 50, z: 60 },
      rotationRate: { alpha: 70, beta: 80, gamma: 90 },
      interval: 32,
    });

    assert.deepEqual(sent, [
      {
        acceleration: { x: 1, y: 2, z: 3 },
        accelerationIncludingGravity: { x: 4, y: 5, z: 6 },
        rotationRate: { alpha: 7, beta: 8, gamma: 9 },
        interval: 16,
      },
    ]);
  });

  test("motion controller reports unavailable browser support", async () => {
    const target = new EventTarget();
    const motion = createMotionController(
      {
        sendMotion: () => {
          throw new Error("should not send");
        },
      },
      { target },
    );

    assert.equal(await motion.start(), false);
  });

  test("motion controller handles denied browser permission", async () => {
    const target = new EventTarget();
    target.DeviceMotionEvent = function DeviceMotionEvent() {};
    target.DeviceMotionEvent.requestPermission = async () => "denied";
    const motion = createMotionController(
      {
        sendMotion: () => {
          throw new Error("should not send");
        },
      },
      { target },
    );

    assert.equal(await motion.start(), false);

    dispatch(target, "devicemotion", {
      acceleration: { x: 1, y: 2, z: 3 },
      accelerationIncludingGravity: { x: 4, y: 5, z: 6 },
      rotationRate: { alpha: 7, beta: 8, gamma: 9 },
      interval: 16,
    });
  });

  test("button binding forwards press and release through sendButton", () => {
    const sent = [];
    const element = new EventTarget();
    const binding = bindButton(
      {
        sendButton: (key, pressed) => sent.push({ key, pressed }),
      },
      element,
      "A",
      { usePointerEvents: true },
    );

    dispatch(element, "pointerdown");
    dispatch(element, "pointerdown");
    dispatch(element, "pointerup");
    dispatch(element, "pointerup");
    binding.unbind();
    dispatch(element, "pointerdown");

    assert.deepEqual(sent, [
      {
        key: "A",
        pressed: true,
      },
      {
        key: "A",
        pressed: false,
      },
    ]);
  });

  test("button binding can use touch events when pointer events are unavailable", () => {
    const sent = [];
    const element = new EventTarget();

    bindButton(
      {
        sendButton: (key, pressed) => sent.push({ key, pressed }),
      },
      element,
      "B",
      { usePointerEvents: false },
    );

    dispatch(element, "touchstart");
    dispatch(element, "touchcancel");

    assert.deepEqual(sent, [
      {
        key: "B",
        pressed: true,
      },
      {
        key: "B",
        pressed: false,
      },
    ]);
  });
});
