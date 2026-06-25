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

    for (const method of ["acceptOffer", "send", "close", "on"]) {
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
});
