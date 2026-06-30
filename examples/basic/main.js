import { Client, Host } from "../../src/index.js";

let host;
let client;
let clientOfferText = "";
let answerRequestId = 0;

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
  client.on("signaling-pending", () => {
    $("#client-status").textContent = "answer ready; copy it to the host";
  });
  client.on("answer-expired", async () => {
    $("#client-status").textContent = "answer expired; regenerated answer";
    await createClientAnswer({ regenerate: true });
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

async function createClientAnswer({ regenerate = false } = {}) {
  const requestId = ++answerRequestId;
  const answer = regenerate
    ? await setupClient().regenerateAnswer(clientOfferText)
    : await setupClient().acceptOffer(clientOfferText);

  if (requestId === answerRequestId) {
    $("#answer-output").value = answer;
  }

  return answer;
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
  await createClientAnswer();
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
