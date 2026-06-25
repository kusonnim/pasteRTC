export class FakeDataChannel extends EventTarget {
  constructor(label = "paste-rtc") {
    super();
    this.label = label;
    this.readyState = "connecting";
    this.sent = [];
  }

  open() {
    this.readyState = "open";
    this.dispatchEvent(new Event("open"));
  }

  send(data) {
    if (this.readyState !== "open") {
      throw new Error("Fake channel is not open");
    }

    this.sent.push(data);
  }

  receive(data) {
    const event = new Event("message");
    Object.defineProperty(event, "data", { value: data });
    this.dispatchEvent(event);
  }

  fail() {
    this.dispatchEvent(new Event("error"));
  }

  close() {
    this.readyState = "closed";
    this.dispatchEvent(new Event("close"));
  }
}

export class FakeRTCPeerConnection extends EventTarget {
  static instances = [];

  constructor() {
    super();
    this.connectionState = "new";
    this.iceGatheringState = "complete";
    this.localDescription = null;
    this.remoteDescription = null;
    this.channels = [];
    FakeRTCPeerConnection.instances.push(this);
  }

  createDataChannel(label) {
    const channel = new FakeDataChannel(label);
    this.channels.push(channel);
    return channel;
  }

  async createOffer() {
    return { type: "offer", sdp: "fake-offer-sdp" };
  }

  async createAnswer() {
    return { type: "answer", sdp: "fake-answer-sdp" };
  }

  async setLocalDescription(description) {
    this.localDescription = description;
  }

  async setRemoteDescription(description) {
    this.remoteDescription = description;
  }

  receiveDataChannel(channel = new FakeDataChannel()) {
    const event = new Event("datachannel");
    Object.defineProperty(event, "channel", { value: channel });
    this.dispatchEvent(event);
    return channel;
  }

  setConnectionState(state) {
    this.connectionState = state;
    this.dispatchEvent(new Event("connectionstatechange"));
  }

  close() {
    this.setConnectionState("closed");
  }
}

export function installWebRTCFakes() {
  FakeRTCPeerConnection.instances.length = 0;
  globalThis.RTCPeerConnection = FakeRTCPeerConnection;
}

export function latestPeerConnection() {
  return FakeRTCPeerConnection.instances.at(-1);
}
