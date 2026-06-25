import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { Connection } from "../src/connection.js";
import {
  FakeDataChannel,
  installWebRTCFakes,
  latestPeerConnection,
} from "./helpers/fake-webrtc.js";

describe("Connection", () => {
  beforeEach(installWebRTCFakes);

  test("creates a host peer and DataChannel in the initial state", () => {
    const connection = new Connection({ role: "host" });
    const peer = latestPeerConnection();

    assert.ok(connection);
    assert.equal(peer.connectionState, "new");
    assert.equal(peer.channels.length, 1);
    assert.equal(peer.channels[0].label, "paste-rtc");
  });

  test("receives a DataChannel on the client side", () => {
    new Connection({ role: "client" });
    const peer = latestPeerConnection();

    assert.equal(peer.channels.length, 0);
    assert.ok(peer.receiveDataChannel() instanceof FakeDataChannel);
  });

  test("creates and accepts offer and answer descriptions", async () => {
    const host = new Connection({ role: "host" });
    const hostPeer = latestPeerConnection();
    const offer = await host.createOffer();

    assert.deepEqual(offer, { type: "offer", sdp: "fake-offer-sdp" });

    const client = new Connection({ role: "client" });
    const clientPeer = latestPeerConnection();
    await client.acceptOffer(offer);
    const answer = await client.createAnswer();
    await host.acceptAnswer(answer);

    assert.deepEqual(clientPeer.remoteDescription, offer);
    assert.deepEqual(hostPeer.remoteDescription, answer);
  });

  test("reports state changes", () => {
    const states = [];
    new Connection({
      role: "host",
      onStateChange: (state) => states.push(state),
    });

    latestPeerConnection().setConnectionState("connecting");
    latestPeerConnection().setConnectionState("connected");

    assert.deepEqual(states, ["connecting", "connected"]);
  });

  test("passes JSON strings through send and receive unchanged", () => {
    const received = [];
    const connection = new Connection({
      role: "host",
      onMessage: (data) => received.push(JSON.parse(data)),
    });
    const channel = latestPeerConnection().channels[0];
    const message = JSON.stringify({ message: "hello" });

    channel.open();
    connection.send(message);
    channel.receive(message);

    assert.deepEqual(channel.sent, [message]);
    assert.deepEqual(received, [{ message: "hello" }]);
  });

  test("reports channel errors and rejects sends before open", () => {
    const errors = [];
    const connection = new Connection({
      role: "host",
      onError: (error) => errors.push(error.message),
    });
    const channel = latestPeerConnection().channels[0];

    assert.throws(() => connection.send("message"), /Channel is not open/);
    channel.fail();
    assert.deepEqual(errors, ["Channel error"]);
  });
});
