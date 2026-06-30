import { Controller } from "../../src/index.js";

let host;
let client;
let tiltController;
let motionController;
let buttonBinding;
let clientOfferText = "";

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
  element.textContent += `${label}: ${JSON.stringify(data)}\n`;
}

function setupHost() {
  if (host) {
    return host;
  }

  host = new Controller.Host();
  host.on("connected", (clientId) => {
    $("#host-status").textContent = `connected: ${clientId}`;
  });
  host.on("statechange", (state, clientId) => {
    $("#host-status").textContent = `${clientId}: ${state}`;
  });
  host.on("data", (data, clientId) => {
    appendLog($("#host-log"), `data from ${clientId}`, data);
  });
  host.on("button", (data, clientId) => {
    appendLog($("#host-log"), `button from ${clientId}`, data);
  });
  host.on("stick", (data, clientId) => {
    appendLog($("#host-log"), `stick from ${clientId}`, data);
  });
  host.on("tilt", (data, clientId) => {
    appendLog($("#host-log"), `tilt from ${clientId}`, data);
  });
  host.on("motion", (data, clientId) => {
    appendLog($("#host-log"), `motion from ${clientId}`, data);
  });
  host.on("error", (error, clientId) => {
    appendLog($("#host-log"), `error from ${clientId}`, error.message);
  });

  return host;
}

function setupClient() {
  if (client) {
    return client;
  }

  client = new Controller.Client();
  client.on("connected", () => {
    $("#client-status").textContent = "connected";
  });
  client.on("signaling-pending", () => {
    $("#client-status").textContent = "answer ready; copy it to the host";
  });
  client.on("answer-expired", async () => {
    $("#client-status").textContent = "answer expired; regenerated answer";
    $("#answer-output").value = await client.regenerateAnswer(clientOfferText);
  });
  client.on("statechange", (state) => {
    $("#client-status").textContent = state;
  });
  client.on("error", (error) => {
    appendLog($("#client-log"), "error", error.message);
  });

  buttonBinding = client.bindButton($("#button-b"), "B");
  tiltController = client.createTiltController();
  motionController = client.createMotionController();

  return client;
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
  $("#offer-output").value = await setupHost().createOffer();
});

$("#accept-answer").addEventListener("click", async () => {
  await setupHost().acceptAnswer($("#answer-input").value);
});

$("#create-answer").addEventListener("click", async () => {
  clientOfferText = $("#offer-input").value;
  $("#answer-output").value = await setupClient().acceptOffer(clientOfferText);
});

$("#button-a").addEventListener("pointerdown", () => {
  setupClient().sendButton("A", true);
  appendLog($("#client-log"), "sent", { type: "button", key: "A", pressed: true });
});

$("#button-a").addEventListener("pointerup", () => {
  setupClient().sendButton("A", false);
  appendLog($("#client-log"), "sent", { type: "button", key: "A", pressed: false });
});

$("#send-stick").addEventListener("click", () => {
  const message = {
    x: Number($("#stick-x").value),
    y: Number($("#stick-y").value),
  };

  setupClient().sendStick(message);
  appendLog($("#client-log"), "sent stick", message);
});

$("#send-tilt").addEventListener("click", () => {
  const message = {
    alpha: 10,
    beta: 20,
    gamma: -5,
  };

  setupClient().sendTilt(message);
  appendLog($("#client-log"), "sent tilt", message);
});

$("#start-tilt").addEventListener("click", async () => {
  setupClient();
  const started = await tiltController.start();
  appendLog($("#client-log"), "device tilt started", started);
});

$("#stop-tilt").addEventListener("click", () => {
  tiltController?.stop();
  appendLog($("#client-log"), "device tilt stopped", true);
});

$("#send-motion").addEventListener("click", () => {
  const message = {
    acceleration: { x: 0.1, y: 0.2, z: 0.3 },
    accelerationIncludingGravity: { x: 0.1, y: 9.8, z: 0.3 },
    rotationRate: { alpha: 1, beta: 2, gamma: 3 },
    interval: 16,
  };

  setupClient().sendMotion(message);
  appendLog($("#client-log"), "sent motion", message);
});

$("#start-motion").addEventListener("click", async () => {
  setupClient();
  const started = await motionController.start();
  appendLog($("#client-log"), "device motion started", started);
});

$("#stop-motion").addEventListener("click", () => {
  motionController?.stop();
  appendLog($("#client-log"), "device motion stopped", true);
});

globalThis.addEventListener("pagehide", () => {
  buttonBinding?.unbind();
  tiltController?.stop();
  motionController?.stop();
  host?.close();
  client?.close();
});
