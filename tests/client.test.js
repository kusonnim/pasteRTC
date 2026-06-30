import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { Client } from "../src/client.js";
import { Host } from "../src/host.js";
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
      "regenerateAnswer",
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
    assert.equal(client.on("answer-expired", () => {}), client);
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

  test("reports answer-created and signaling-pending after accepting an offer", async () => {
    const events = [];
    const states = [];
    const client = new Client();

    client
      .on("answer-created", () => events.push("answer-created"))
      .on("signaling-pending", () => events.push("signaling-pending"))
      .on("statechange", (state) => states.push(state));

    await client.acceptOffer(
      JSON.stringify({ type: "offer", sdp: "remote-offer" }),
    );

    assert.deepEqual(events, ["answer-created", "signaling-pending"]);
    assert.deepEqual(states, ["answer-created", "signaling-pending"]);
  });

  test("reports pre-connect failure as answer-expired when the host has not accepted", async () => {
    const host = new Host();
    const offerText = await host.createOffer();
    const client = new Client();
    const clientPeer = latestPeerConnection();
    const events = [];
    const states = [];

    client
      .on("answer-expired", () => events.push("answer-expired"))
      .on("failed", () => events.push("failed"))
      .on("statechange", (state) => states.push(state));

    await client.acceptOffer(offerText);
    clientPeer.setConnectionState("failed");

    assert.deepEqual(events, ["answer-expired"]);
    assert.deepEqual(states, [
      "answer-created",
      "signaling-pending",
      "answer-expired",
    ]);
  });

  test("reports failure during answer creation as answer-expired", async () => {
    const client = new Client();
    const clientPeer = latestPeerConnection();
    const originalSetLocalDescription =
      clientPeer.setLocalDescription.bind(clientPeer);
    const events = [];
    const states = [];

    clientPeer.setLocalDescription = async (description) => {
      await originalSetLocalDescription(description);
      clientPeer.setConnectionState("failed");
    };

    client
      .on("answer-created", () => events.push("answer-created"))
      .on("answer-expired", () => events.push("answer-expired"))
      .on("failed", () => events.push("failed"))
      .on("statechange", (state) => states.push(state));

    const answerText = await client.acceptOffer(
      JSON.stringify({ type: "offer", sdp: "remote-offer" }),
    );

    assert.deepEqual(JSON.parse(answerText), {
      type: "answer",
      sdp: "fake-answer-sdp",
    });
    assert.deepEqual(events, ["answer-expired"]);
    assert.deepEqual(states, ["answer-expired"]);
  });

  test("can regenerate a fresh answer for the same offer", async () => {
    const client = new Client();
    const offer = { type: "offer", sdp: "remote-offer" };
    const firstPeer = latestPeerConnection();

    const firstAnswerText = await client.acceptOffer(JSON.stringify(offer));
    firstPeer.setConnectionState("failed");

    const secondAnswerText = await client.regenerateAnswer();
    const secondPeer = latestPeerConnection();

    assert.notEqual(secondPeer, firstPeer);
    assert.deepEqual(JSON.parse(firstAnswerText), {
      type: "answer",
      sdp: "fake-answer-sdp",
    });
    assert.deepEqual(JSON.parse(secondAnswerText), {
      type: "answer",
      sdp: "fake-answer-sdp",
    });
    assert.deepEqual(secondPeer.remoteDescription, offer);
  });

  test("reports normal post-connect failure as failed", async () => {
    const events = [];
    const states = [];
    const client = new Client();
    const peer = latestPeerConnection();

    client
      .on("answer-expired", () => events.push("answer-expired"))
      .on("failed", () => events.push("failed"))
      .on("statechange", (state) => states.push(state));

    await client.acceptOffer(
      JSON.stringify({ type: "offer", sdp: "remote-offer" }),
    );
    peer.receiveDataChannel().open();
    peer.setConnectionState("failed");

    assert.deepEqual(events, ["failed"]);
    assert.deepEqual(states, [
      "answer-created",
      "signaling-pending",
      "failed",
    ]);
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
