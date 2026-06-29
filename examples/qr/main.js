import { Client, Host } from "../../src/index.js";
import { generate, scan } from "../../src/extensions/qr/index.js";

let host;
let client;
let offerScanner;
let answerScanner;

const $ = (selector) => document.querySelector(selector);

const panels = {
  mode: $("#mode-panel"),
  host: $("#host-panel"),
  client: $("#client-panel"),
};

function show(panelName) {
  for (const [name, panel] of Object.entries(panels)) {
    panel.classList.toggle("hidden", name !== panelName);
  }
}

function appendLog(element, label, data) {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  element.textContent += `${label}: ${text}\n`;
}

function setupHost() {
  if (host) {
    return host;
  }

  host = new Host();
  host.on("connected", () => {
    $("#host-status").textContent = "connected";
  });
  host.on("statechange", (state) => {
    $("#host-status").textContent = state;
  });
  host.on("data", (data) => {
    appendLog($("#host-log"), "client", data);
  });
  host.on("error", (error) => {
    appendLog($("#host-log"), "error", error.message);
  });

  return host;
}

function setupClient() {
  if (client) {
    return client;
  }

  client = new Client();
  client.on("connected", () => {
    $("#client-status").textContent = "connected";
  });
  client.on("statechange", (state) => {
    $("#client-status").textContent = state;
  });
  client.on("data", (data) => {
    appendLog($("#client-log"), "host", data);
  });
  client.on("error", (error) => {
    appendLog($("#client-log"), "error", error.message);
  });

  return client;
}

function stopScanner(scanner) {
  if (!scanner) {
    return;
  }

  scanner.stop();
}

function startSignalScan(videoElement, onDecode, logElement) {
  const scanner = scan(videoElement);

  scanner.result
    .then((text) => {
      return onDecode(text);
    })
    .then(() => {
      appendLog(logElement, "qr", "decoded signal");
    })
    .catch((error) => {
      appendLog(logElement, "qr", error.message);
    });

  return scanner;
}

$("#host-mode").addEventListener("click", () => {
  setupHost();
  show("host");
});

$("#client-mode").addEventListener("click", () => {
  setupClient();
  show("client");
});

$("#create-offer").addEventListener("click", async () => {
  const offer = await setupHost().createOffer();
  $("#offer-output").value = offer;
  generate($("#offer-qr"), offer);
  appendLog($("#host-log"), "host", "created offer QR");
});

$("#scan-answer").addEventListener("click", () => {
  stopScanner(answerScanner);
  answerScanner = startSignalScan(
    $("#answer-video"),
    async (text) => {
      $("#answer-input").value = text;
      answerScanner = null;
      await setupHost().acceptAnswer(text);
      appendLog($("#host-log"), "host", "accepted scanned answer");
    },
    $("#host-log"),
  );
});

$("#stop-answer-scan").addEventListener("click", () => {
  stopScanner(answerScanner);
  answerScanner = null;
});

$("#accept-answer").addEventListener("click", async () => {
  await setupHost().acceptAnswer($("#answer-input").value);
  appendLog($("#host-log"), "host", "accepted answer");
});

$("#scan-offer").addEventListener("click", () => {
  stopScanner(offerScanner);
  offerScanner = startSignalScan(
    $("#offer-video"),
    (text) => {
      $("#offer-input").value = text;
      offerScanner = null;
    },
    $("#client-log"),
  );
});

$("#stop-offer-scan").addEventListener("click", () => {
  stopScanner(offerScanner);
  offerScanner = null;
});

$("#create-answer").addEventListener("click", async () => {
  const answer = await setupClient().acceptOffer($("#offer-input").value);
  $("#answer-output").value = answer;
  generate($("#answer-qr"), answer);
  appendLog($("#client-log"), "client", "created answer QR");
});

$("#host-send").addEventListener("click", () => {
  const message = {
    type: "message",
    from: "host",
    text: $("#host-message").value,
  };

  setupHost().send(JSON.stringify(message));
  appendLog($("#host-log"), "host", message);
});

$("#client-send").addEventListener("click", () => {
  const message = {
    type: "message",
    from: "client",
    text: $("#client-message").value,
  };

  setupClient().send(JSON.stringify(message));
  appendLog($("#client-log"), "client", message);
});
