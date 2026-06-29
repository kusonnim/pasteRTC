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
      "broadcast",
      "disconnect",
      "close",
      "on",
    ]) {
      assert.equal(typeof host[method], "function");
    }

    assert.equal("connection" in host, false);
    assert.equal(latestPeerConnection().connectionState, "new");
  });

  test("registers events with a chainable API", () => {
    const host = new Host();

    assert.equal(host.on("connected", () => {}), host);
    assert.equal(host.on("clientConnected", () => {}), host);
    assert.equal(host.on("clientDisconnected", () => {}), host);
    assert.equal(host.on("button", () => {}), host);
    assert.equal(host.on("stick", () => {}), host);
    assert.equal(host.on("tilt", () => {}), host);
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

  test("closes its currently supported client connection", () => {
    const host = new Host();
    const peer = latestPeerConnection();

    host.close();

    assert.equal(peer.connectionState, "closed");
  });

  test("creates independent signaling connections for multiple clients", async () => {
    const host = new Host();
    const primaryPeer = latestPeerConnection();

    await host.createOffer();
    await host.createOffer("client-b");
    const clientBPeer = latestPeerConnection();

    assert.notEqual(primaryPeer, clientBPeer);
    assert.equal(primaryPeer.channels.length, 1);
    assert.equal(clientBPeer.channels.length, 1);

    const primaryAnswer = { type: "answer", sdp: "primary-answer" };
    const clientBAnswer = { type: "answer", sdp: "client-b-answer" };
    await host.acceptAnswer(JSON.stringify(primaryAnswer));
    await host.acceptAnswer("client-b", JSON.stringify(clientBAnswer));

    assert.deepEqual(primaryPeer.remoteDescription, primaryAnswer);
    assert.deepEqual(clientBPeer.remoteDescription, clientBAnswer);
  });

  test("accepts a one-argument answer for the only pending client", async () => {
    const host = new Host();
    const primaryPeer = latestPeerConnection();

    await host.createOffer();
    await host.acceptAnswer(
      JSON.stringify({ type: "answer", sdp: "primary-answer" }),
    );

    await host.createOffer("client-b");
    const clientBPeer = latestPeerConnection();
    const clientBAnswer = { type: "answer", sdp: "client-b-answer" };

    await host.acceptAnswer(JSON.stringify(clientBAnswer));

    assert.deepEqual(primaryPeer.remoteDescription, {
      type: "answer",
      sdp: "primary-answer",
    });
    assert.deepEqual(clientBPeer.remoteDescription, clientBAnswer);
  });

  test("requires a client ID when multiple clients are waiting for answers", async () => {
    const host = new Host();

    await host.createOffer("client-a");
    await host.createOffer("client-b");

    await assert.rejects(
      () =>
        host.acceptAnswer(
          JSON.stringify({ type: "answer", sdp: "ambiguous-answer" }),
        ),
      /Multiple clients are waiting for answers/,
    );
  });

  test("sends to one client and broadcasts to all connected clients", async () => {
    const host = new Host();
    const primaryPeer = latestPeerConnection();
    await host.createOffer("client-b");
    const clientBPeer = latestPeerConnection();
    const primaryChannel = primaryPeer.channels[0];
    const clientBChannel = clientBPeer.channels[0];

    primaryChannel.open();
    clientBChannel.open();

    host.send("primary-only");
    host.send("client-b", "client-b-only");
    host.broadcast("everyone");

    assert.deepEqual(primaryChannel.sent, ["primary-only", "everyone"]);
    assert.deepEqual(clientBChannel.sent, ["client-b-only", "everyone"]);
  });

  test("includes client IDs in data and connection events", async () => {
    const events = [];
    const host = new Host();
    await host.createOffer("client-b");
    const clientBPeer = latestPeerConnection();
    const clientBChannel = clientBPeer.channels[0];

    host
      .on("clientConnected", (clientId) =>
        events.push(["connected", clientId]),
      )
      .on("data", (data, clientId) => events.push(["data", clientId, data]))
      .on("clientDisconnected", (clientId) =>
        events.push(["disconnected", clientId]),
      );

    clientBChannel.open();
    clientBChannel.receive("hello");
    host.disconnect("client-b");

    assert.deepEqual(events, [
      ["connected", "client-b"],
      ["data", "client-b", "hello"],
      ["disconnected", "client-b"],
    ]);
  });

  test("routes controller messages to typed host events", async () => {
    const events = [];
    const host = new Host();
    await host.createOffer("client-b");
    const clientBPeer = latestPeerConnection();
    const clientBChannel = clientBPeer.channels[0];
    const messages = [
      {
        type: "button",
        key: "A",
        pressed: true,
      },
      {
        type: "stick",
        x: 0.5,
        y: -0.2,
      },
      {
        type: "tilt",
        alpha: 10,
        beta: 20,
        gamma: -5,
      },
    ];

    host
      .on("data", (data, clientId) =>
        events.push(["data", clientId, JSON.parse(data)]),
      )
      .on("button", (data, clientId) =>
        events.push(["button", clientId, data]),
      )
      .on("stick", (data, clientId) =>
        events.push(["stick", clientId, data]),
      )
      .on("tilt", (data, clientId) =>
        events.push(["tilt", clientId, data]),
      );

    for (const message of messages) {
      clientBChannel.receive(JSON.stringify(message));
    }

    assert.deepEqual(events, [
      ["data", "client-b", messages[0]],
      ["button", "client-b", messages[0]],
      ["data", "client-b", messages[1]],
      ["stick", "client-b", messages[1]],
      ["data", "client-b", messages[2]],
      ["tilt", "client-b", messages[2]],
    ]);
  });

  test("disconnects clients independently", async () => {
    const host = new Host();
    const primaryPeer = latestPeerConnection();
    await host.createOffer("client-b");
    const clientBPeer = latestPeerConnection();

    assert.equal(host.disconnect("client-b"), true);
    assert.equal(clientBPeer.connectionState, "closed");
    assert.equal(primaryPeer.connectionState, "new");
    assert.equal(host.disconnect("missing"), false);
    assert.throws(() => host.send("client-b", "message"), /Unknown client/);
  });

  test("preserves the legacy primary-client overloads", async () => {
    const host = new Host();
    const peer = latestPeerConnection();
    const channel = peer.channels[0];
    const answer = { type: "answer", sdp: "primary-answer" };

    await host.createOffer();
    await host.acceptAnswer(JSON.stringify(answer));
    channel.open();
    host.send("primary-message");

    assert.deepEqual(peer.remoteDescription, answer);
    assert.deepEqual(channel.sent, ["primary-message"]);
  });

  test("validates client IDs consistently", async () => {
    const host = new Host();

    await assert.rejects(() => host.createOffer(""), /non-empty string/);
    await assert.rejects(
      () => host.acceptAnswer("", JSON.stringify({ type: "answer", sdp: "x" })),
      /non-empty string/,
    );
    assert.throws(() => host.send("", "message"), /non-empty string/);
    assert.throws(() => host.disconnect(""), /non-empty string/);
  });

  test("supports constructor callbacks with stable client IDs", async () => {
    const events = [];
    const host = new Host({
      onOpen: (clientId) => events.push(["open", clientId]),
      onMessage: (data, clientId) => events.push(["data", clientId, data]),
      onClientConnected: (clientId) =>
        events.push(["clientConnected", clientId]),
      onClientDisconnected: (clientId) =>
        events.push(["clientDisconnected", clientId]),
    });
    await host.createOffer("client-b");
    const peer = latestPeerConnection();
    const channel = peer.channels[0];

    channel.open();
    channel.receive("hello");
    host.disconnect("client-b");

    assert.deepEqual(events, [
      ["open", "client-b"],
      ["clientConnected", "client-b"],
      ["data", "client-b", "hello"],
      ["clientDisconnected", "client-b"],
    ]);
  });

  test("emits clientDisconnected once and allows reusing the client ID", async () => {
    const disconnected = [];
    const host = new Host();
    host.on("clientDisconnected", (clientId) => disconnected.push(clientId));

    await host.createOffer("client-b");
    const firstPeer = latestPeerConnection();
    firstPeer.channels[0].open();
    firstPeer.channels[0].close();
    firstPeer.setConnectionState("closed");

    assert.deepEqual(disconnected, ["client-b"]);
    assert.throws(() => host.send("client-b", "message"), /Unknown client/);

    await host.createOffer("client-b");
    const replacementPeer = latestPeerConnection();
    assert.notEqual(replacementPeer, firstPeer);
    assert.equal(replacementPeer.connectionState, "new");
  });

  test("broadcast ignores clients that have not connected", async () => {
    const host = new Host();
    const primaryPeer = latestPeerConnection();
    await host.createOffer("client-b");
    const clientBPeer = latestPeerConnection();

    primaryPeer.channels[0].open();
    host.broadcast("connected-only");

    assert.deepEqual(primaryPeer.channels[0].sent, ["connected-only"]);
    assert.deepEqual(clientBPeer.channels[0].sent, []);
  });
});
