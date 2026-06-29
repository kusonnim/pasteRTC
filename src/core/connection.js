/**
 * Low-level wrapper around one RTCPeerConnection and RTCDataChannel.
 *
 * @internal
 */
export class Connection {
  #peerConnection;
  #dataChannel;
  #onOpen;
  #onMessage;
  #onStateChange;
  #onError;

  /**
   * @param {object} options
   * @param {"host" | "client"} options.role
   * @param {() => void} [options.onOpen]
   * @param {(data: string) => void} [options.onMessage]
   * @param {(state: string) => void} [options.onStateChange]
   * @param {(error: Error) => void} [options.onError]
   */
  constructor({
    role,
    onOpen = () => {},
    onMessage = () => {},
    onStateChange = () => {},
    onError = () => {},
  }) {
    if (role !== "host" && role !== "client") {
      throw new Error('Connection role must be "host" or "client".');
    }

    this.#onOpen = onOpen;
    this.#onMessage = onMessage;
    this.#onStateChange = onStateChange;
    this.#onError = onError;
    this.#peerConnection = new RTCPeerConnection();

    this.#peerConnection.addEventListener("connectionstatechange", () => {
      this.#onStateChange(this.#peerConnection.connectionState);
    });

    if (role === "host") {
      this.#attachDataChannel(
        this.#peerConnection.createDataChannel("paste-rtc"),
      );
    } else {
      this.#peerConnection.addEventListener(
        "datachannel",
        (event) => this.#attachDataChannel(event.channel),
        { once: true },
      );
    }
  }

  /** @returns {Promise<RTCSessionDescription>} */
  async createOffer() {
    const offer = await this.#peerConnection.createOffer();
    await this.#peerConnection.setLocalDescription(offer);
    await this.#waitForIceGathering();
    return this.#peerConnection.localDescription;
  }

  /** @param {RTCSessionDescriptionInit} offer */
  async acceptOffer(offer) {
    await this.#peerConnection.setRemoteDescription(offer);
  }

  /** @returns {Promise<RTCSessionDescription>} */
  async createAnswer() {
    const answer = await this.#peerConnection.createAnswer();
    await this.#peerConnection.setLocalDescription(answer);
    await this.#waitForIceGathering();
    return this.#peerConnection.localDescription;
  }

  /** @param {RTCSessionDescriptionInit} answer */
  async acceptAnswer(answer) {
    await this.#peerConnection.setRemoteDescription(answer);
  }

  /** @param {string} data */
  send(data) {
    if (!this.#dataChannel || this.#dataChannel.readyState !== "open") {
      throw new Error("Channel is not open");
    }

    this.#dataChannel.send(data);
  }

  close() {
    this.#dataChannel?.close();
    this.#peerConnection.close();
  }

  #attachDataChannel(channel) {
    this.#dataChannel = channel;

    channel.addEventListener("open", () => {
      this.#onOpen();
    });

    channel.addEventListener("message", (event) => {
      this.#onMessage(event.data);
    });

    channel.addEventListener("close", () => {
      this.#onStateChange("disconnected");
    });

    channel.addEventListener("error", () => {
      this.#onError(new Error("Channel error"));
    });
  }

  #waitForIceGathering() {
    if (this.#peerConnection.iceGatheringState === "complete") {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const handleStateChange = () => {
        if (this.#peerConnection.iceGatheringState === "complete") {
          this.#peerConnection.removeEventListener(
            "icegatheringstatechange",
            handleStateChange,
          );
          resolve();
        }
      };

      this.#peerConnection.addEventListener(
        "icegatheringstatechange",
        handleStateChange,
      );
    });
  }
}
