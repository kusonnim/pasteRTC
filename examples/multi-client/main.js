import { Client, Host } from "../../src/index.js";

let host;
let client;

const connectedClients = new Set();
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

function getClientId() {
  return $("#client-id").value.trim();
}

function updateClientSelect() {
  const select = $("#connected-clients");
  select.replaceChildren();

  for (const clientId of connectedClients) {
    const option = document.createElement("option");
    option.value = clientId;
    option.textContent = clientId;
    select.append(option);
  }
}

function setupHost() {
  if (host) {
    return host;
  }

  host = new Host();
  host.on("clientConnected", (clientId) => {
    connectedClients.add(clientId);
    updateClientSelect();
    $("#host-status").textContent = `${connectedClients.size} connected`;
    appendLog($("#host-log"), "connected", clientId);
  });
  host.on("clientDisconnected", (clientId) => {
    connectedClients.delete(clientId);
    updateClientSelect();
    $("#host-status").textContent = `${connectedClients.size} connected`;
    appendLog($("#host-log"), "disconnected", clientId);
  });
  host.on("data", (data, clientId) => {
    appendLog($("#host-log"), `from ${clientId}`, data);
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

$("#host-mode").addEventListener("click", () => {
  setupHost();
  show("host");
});

$("#client-mode").addEventListener("click", () => {
  setupClient();
  show("client");
});

$("#create-offer").addEventListener("click", async () => {
  const clientId = getClientId();
  $("#offer-output").value = await setupHost().createOffer(clientId);
  appendLog($("#host-log"), "created offer for", clientId);
});

$("#accept-answer").addEventListener("click", async () => {
  const clientId = getClientId();
  await setupHost().acceptAnswer(clientId, $("#answer-input").value);
  appendLog($("#host-log"), "accepted answer for", clientId);
});

$("#create-answer").addEventListener("click", async () => {
  $("#answer-output").value = await setupClient().acceptOffer($("#offer-input").value);
});

$("#send-selected").addEventListener("click", () => {
  const clientId = $("#connected-clients").value;

  if (!clientId) {
    appendLog($("#host-log"), "error", "No connected client selected.");
    return;
  }

  const message = {
    type: "message",
    from: "host",
    text: $("#host-message").value,
  };

  setupHost().send(clientId, JSON.stringify(message));
  appendLog($("#host-log"), `sent to ${clientId}`, message);
});

$("#broadcast").addEventListener("click", () => {
  const message = {
    type: "broadcast",
    from: "host",
    text: $("#host-message").value,
  };

  setupHost().broadcast(JSON.stringify(message));
  appendLog($("#host-log"), "broadcast", message);
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
