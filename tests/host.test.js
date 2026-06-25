import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { Host } from "../src/host.js";
import {
  installWebRTCFakes,
  latestPeerConnection,
} from "./helpers/fake-webrtc.js";

describe("Host", () => {
  beforeEach(installWebRTCFakes);

  test("creates an instance with the stable public API", () => {
    const host = new Host();

    for (const method of [
      "createOffer",
      "acceptAnswer",
      "send",
      "close",
      "on",
    ]) {
      assert.equal(typeof host[method], "function");
    }

    assert.equal("connection" in host, false);
  });

  test("registers events with a chainable API", () => {
    const host = new Host();

    assert.equal(host.on("connected", () => {}), host);
    assert.throws(() => host.on("unknown", () => {}), /Unsupported event/);
    assert.throws(() => host.on("data", null), /must be a function/);
  });

  test("creates an encoded offer and accepts an encoded answer", async () => {
    const host = new Host();
    const peer = latestPeerConnection();
    const offerText = await host.createOffer();

    assert.deepEqual(JSON.parse(offerText), {
      type: "offer",
      sdp: "fake-offer-sdp",
    });

    const answer = { type: "answer", sdp: "remote-answer" };
    await host.acceptAnswer(JSON.stringify(answer));
    assert.deepEqual(peer.remoteDescription, answer);
  });

  test("emits connected, statechange, data, and error events", () => {
    const events = [];
    const host = new Host();
    const peer = latestPeerConnection();
    const channel = peer.channels[0];

    host
      .on("connected", () => events.push("connected"))
      .on("statechange", (state) => events.push(state))
      .on("data", (data) => events.push(data))
      .on("error", (error) => events.push(error.message));

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
