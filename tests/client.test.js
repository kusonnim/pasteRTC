import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { Client } from "../src/client.js";
import {
  installWebRTCFakes,
  latestPeerConnection,
} from "./helpers/fake-webrtc.js";

describe("Client", () => {
  beforeEach(installWebRTCFakes);

  test("creates an instance with the stable public API", () => {
    const client = new Client();

    for (const method of [
      "acceptOffer",
      "send",
      "sendButton",
      "sendStick",
      "sendTilt",
      "sendMotion",
      "createTiltController",
      "createMotionController",
      "bindButton",
      "close",
      "on",
    ]) {
      assert.equal(typeof client[method], "function");
    }

    assert.equal("connection" in client, false);
  });

  test("registers events with a chainable API", () => {
    const client = new Client();

    assert.equal(client.on("data", () => {}), client);
    assert.throws(() => client.on("unknown", () => {}), /Unsupported event/);
    assert.throws(() => client.on("connected", "invalid"), /must be a function/);
  });

  test("accepts an encoded offer and returns an encoded answer", async () => {
    const client = new Client();
    const peer = latestPeerConnection();
    const offer = { type: "offer", sdp: "remote-offer" };
    const answerText = await client.acceptOffer(JSON.stringify(offer));

    assert.deepEqual(peer.remoteDescription, offer);
    assert.deepEqual(JSON.parse(answerText), {
      type: "answer",
      sdp: "fake-answer-sdp",
    });
  });

  test("emits basic state and DataChannel events", () => {
    const events = [];
    const client = new Client();
    const peer = latestPeerConnection();

    client
      .on("connected", () => events.push("connected"))
      .on("statechange", (state) => events.push(state))
      .on("data", (data) => events.push(data))
      .on("error", (error) => events.push(error.message));

    const channel = peer.receiveDataChannel();
    peer.setConnectionState("connecting");
    channel.open();
    channel.receive("payload");
    channel.fail();

    assert.deepEqual(events, [
      "connecting",
      "connected",
      "payload",
      "Channel error",
    ]);
  });

  test("sends controller helper messages as JSON strings", () => {
    const client = new Client();
    const peer = latestPeerConnection();
    const channel = peer.receiveDataChannel();
    channel.open();

    client.sendButton("A", true);
    client.sendStick({ x: 0.5, y: -0.25 });
    client.sendTilt({ alpha: 1, beta: 2, gamma: 3 });
    client.sendMotion({
      acceleration: { x: 1, y: 2, z: 3 },
      accelerationIncludingGravity: { x: 4, y: 5, z: 6 },
      rotationRate: { alpha: 7, beta: 8, gamma: 9 },
      interval: 16,
    });

    assert.deepEqual(channel.sent.map((message) => JSON.parse(message)), [
      {
        type: "button",
        key: "A",
        pressed: true,
      },
      {
        type: "stick",
        x: 0.5,
        y: -0.25,
      },
      {
        type: "tilt",
        alpha: 1,
        beta: 2,
        gamma: 3,
      },
      {
        type: "motion",
        acceleration: { x: 1, y: 2, z: 3 },
        accelerationIncludingGravity: { x: 4, y: 5, z: 6 },
        rotationRate: { alpha: 7, beta: 8, gamma: 9 },
        interval: 16,
      },
    ]);
  });
});
