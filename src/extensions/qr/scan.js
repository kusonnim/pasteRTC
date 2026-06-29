import jsQR from "jsqr";

const DEFAULT_CONSTRAINTS = {
  video: {
    facingMode: "environment",
  },
  audio: false,
};

const DEFAULT_INVERSION_ATTEMPTS = "attemptBoth";

export function scan(videoElement, options = {}) {
  if (!isVideoElement(videoElement)) {
    throw new TypeError("QR scan target must be a video element.");
  }

  const canvas = options.canvas ?? createCanvas();
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new TypeError("QR scanner requires a 2D canvas context.");
  }

  let frameId = null;
  let stream = null;
  let stopped = false;
  let settled = false;

  let resolveResult;
  let rejectResult;

  const result = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const scanner = {
    result,
    stop() {
      stopInternal();

      if (!settled) {
        settled = true;
        rejectResult(new Error("QR scanning stopped."));
      }
    },
  };

  start().catch((error) => {
    stopInternal();

    if (!settled) {
      settled = true;
      rejectResult(error);
    }
  });

  return scanner;

  async function start() {
    stream = await requestCamera(options.constraints);

    if (stopped) {
      stopStream(stream);
      return;
    }

    videoElement.srcObject = stream;
    videoElement.muted = options.muted ?? true;
    videoElement.setAttribute?.("playsinline", "true");

    await videoElement.play?.();

    scheduleScan();
  }

  function scheduleScan() {
    if (stopped || settled) {
      return;
    }

    frameId = scheduleFrame(readFrame);
  }

  function readFrame() {
    frameId = null;

    if (stopped || settled) {
      return;
    }

    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(videoElement, 0, 0, width, height);

      const imageData = context.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, width, height, {
        inversionAttempts: options.inversionAttempts ?? DEFAULT_INVERSION_ATTEMPTS,
      });

      if (code && typeof code.data === "string") {
        settled = true;
        resolveResult(code.data);
        options.onDecode?.(code.data, code);
        stopInternal();
        return;
      }
    }

    scheduleScan();
  }

  function stopInternal() {
    if (stopped) {
      return;
    }

    stopped = true;

    if (frameId !== null) {
      cancelFrame(frameId);
      frameId = null;
    }

    if (stream) {
      stopStream(stream);
      stream = null;
    }

    if (videoElement.srcObject) {
      videoElement.srcObject = null;
    }
  }
}

async function requestCamera(constraints = DEFAULT_CONSTRAINTS) {
  const mediaDevices = globalThis.navigator?.mediaDevices;

  if (!mediaDevices?.getUserMedia) {
    throw new Error("Camera scanning requires navigator.mediaDevices.getUserMedia.");
  }

  return mediaDevices.getUserMedia(constraints);
}

function createCanvas() {
  if (!globalThis.document?.createElement) {
    throw new Error("QR scanner requires a canvas element.");
  }

  return globalThis.document.createElement("canvas");
}

function stopStream(stream) {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function scheduleFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(callback);
  }

  return globalThis.setTimeout(callback, 100);
}

function cancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(frameId);
    return;
  }

  globalThis.clearTimeout(frameId);
}

function isVideoElement(target) {
  return Boolean(
    target
      && typeof target === "object"
      && typeof target.tagName === "string"
      && target.tagName.toLowerCase() === "video",
  );
}
