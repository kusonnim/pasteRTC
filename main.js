import { Host } from "./src/host.js";
import { Client } from "./src/client.js";

const modeButtons = document.querySelectorAll(".mode-button");
const modePanels = {
  host: document.querySelector("#host-panel"),
  client: document.querySelector("#client-panel"),
};

const createOfferButton = document.querySelector("#create-offer");
const acceptAnswerButton = document.querySelector("#accept-answer");
const createAnswerButton = document.querySelector("#create-answer");

const hostOfferOutput = document.querySelector("#host-offer");
const hostAnswerInput = document.querySelector("#host-answer");
const clientOfferInput = document.querySelector("#client-offer");
const clientAnswerOutput = document.querySelector("#client-answer");

const hostStatus = document.querySelector("#host-status");
const clientStatus = document.querySelector("#client-status");

const hostMessageInput = document.querySelector("#host-message");
const hostSendButton = document.querySelector("#host-send");
const hostMessageLog = document.querySelector("#host-message-log");
const hostControllerLog = document.querySelector("#host-controller-log");
const clientMessageInput = document.querySelector("#client-message");
const clientSendButton = document.querySelector("#client-send");
const clientMessageLog = document.querySelector("#client-message-log");
const clientButtonADown = document.querySelector("#client-button-a-down");
const clientButtonAUp = document.querySelector("#client-button-a-up");
const clientStickX = document.querySelector("#client-stick-x");
const clientStickY = document.querySelector("#client-stick-y");
const clientSendStickButton = document.querySelector("#client-send-stick");
const clientTiltAlpha = document.querySelector("#client-tilt-alpha");
const clientTiltBeta = document.querySelector("#client-tilt-beta");
const clientTiltGamma = document.querySelector("#client-tilt-gamma");
const clientSendTiltButton = document.querySelector("#client-send-tilt");
const controllerControls = [
  clientButtonADown,
  clientButtonAUp,
  clientStickX,
  clientStickY,
  clientSendStickButton,
  clientTiltAlpha,
  clientTiltBeta,
  clientTiltGamma,
  clientSendTiltButton,
];

let host;
let client;

function selectMode(selectedMode) {
  modeButtons.forEach((button) => {
    const isSelected = button.dataset.mode === selectedMode;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  Object.entries(modePanels).forEach(([mode, panel]) => {
    panel.hidden = mode !== selectedMode;
  });
}

function updateStatus(statusElement, text, state = "idle") {
  statusElement.querySelector(".status-text").textContent = text;
  statusElement.dataset.state = state;
}

function setMessagingEnabled(messageInput, sendButton, enabled) {
  messageInput.disabled = !enabled;
  sendButton.disabled = !enabled;
}

function setControllerEnabled(enabled) {
  controllerControls.forEach((control) => {
    control.disabled = !enabled;
  });
}

function addLogMessage(messageLog, text, className) {
  const item = document.createElement("li");

  item.textContent = text;

  if (className) {
    item.classList.add(className);
  }

  messageLog.append(item);
  messageLog.scrollTop = messageLog.scrollHeight;
}

function addReceivedMessage(messageLog, data) {
  let text;
  let className;

  try {
    const parsedMessage = JSON.parse(data);
    text =
      typeof parsedMessage.message === "string"
        ? parsedMessage.message
        : JSON.stringify(parsedMessage);
  } catch {
    text = "Received invalid JSON.";
    className = "message-error";
  }

  addLogMessage(messageLog, text, className);
}

function addControllerEventMessage(messageLog, eventName, data, clientId) {
  addLogMessage(
    messageLog,
    `${eventName} from ${clientId}: ${JSON.stringify(data)}`,
  );
}

function createPeer(
  PeerClass,
  statusElement,
  messageInput,
  sendButton,
  messageLog,
) {
  const peer = new PeerClass();

  peer
    .on("connected", () => {
      updateStatus(statusElement, "Connected", "connected");
      setMessagingEnabled(messageInput, sendButton, true);
    })
    .on("data", (data) => {
      addReceivedMessage(messageLog, data);
    })
    .on("statechange", (state) => {
      if (state === "failed") {
        updateStatus(statusElement, "Connection failed", "error");
      } else if (state === "disconnected") {
        updateStatus(statusElement, "Disconnected", "error");
        setMessagingEnabled(messageInput, sendButton, false);
      } else if (state === "closed") {
        updateStatus(statusElement, "Not connected", "idle");
        setMessagingEnabled(messageInput, sendButton, false);
      }
    })
    .on("error", (error) => {
      updateStatus(statusElement, error.message, "error");
      setMessagingEnabled(messageInput, sendButton, false);
    });

  return peer;
}

function createHost() {
  const peer = createPeer(
    Host,
    hostStatus,
    hostMessageInput,
    hostSendButton,
    hostMessageLog,
  );

  peer
    .on("button", (data, clientId) => {
      addControllerEventMessage(hostControllerLog, "button", data, clientId);
    })
    .on("stick", (data, clientId) => {
      addControllerEventMessage(hostControllerLog, "stick", data, clientId);
    })
    .on("tilt", (data, clientId) => {
      addControllerEventMessage(hostControllerLog, "tilt", data, clientId);
    });

  return peer;
}

function createClient() {
  const peer = createPeer(
    Client,
    clientStatus,
    clientMessageInput,
    clientSendButton,
    clientMessageLog,
  );

  peer
    .on("connected", () => {
      setControllerEnabled(true);
    })
    .on("statechange", (state) => {
      if (state === "disconnected" || state === "closed") {
        setControllerEnabled(false);
      }
    })
    .on("error", () => {
      setControllerEnabled(false);
    });

  return peer;
}

function closeHostConnection() {
  setMessagingEnabled(hostMessageInput, hostSendButton, false);
  host?.close();
  host = undefined;
}

function closeClientConnection() {
  setMessagingEnabled(clientMessageInput, clientSendButton, false);
  setControllerEnabled(false);
  client?.close();
  client = undefined;
}

async function createOffer() {
  createOfferButton.disabled = true;
  closeHostConnection();
  hostOfferOutput.value = "";
  updateStatus(hostStatus, "Creating offer...", "working");

  try {
    host = createHost();

    hostOfferOutput.value = await host.createOffer();
    updateStatus(hostStatus, "Waiting for answer", "working");
  } catch (error) {
    closeHostConnection();
    updateStatus(hostStatus, error.message, "error");
  } finally {
    createOfferButton.disabled = false;
  }
}

async function acceptAnswer() {
  acceptAnswerButton.disabled = true;

  try {
    if (!host) {
      throw new Error("Create an offer first.");
    }

    await host.acceptAnswer(hostAnswerInput.value);
    updateStatus(hostStatus, "Connecting...", "working");
  } catch (error) {
    updateStatus(hostStatus, error.message, "error");
  } finally {
    acceptAnswerButton.disabled = false;
  }
}

async function createAnswer() {
  createAnswerButton.disabled = true;
  closeClientConnection();
  clientAnswerOutput.value = "";
  updateStatus(clientStatus, "Creating answer...", "working");

  try {
    client = createClient();

    clientAnswerOutput.value = await client.acceptOffer(
      clientOfferInput.value,
    );
    updateStatus(clientStatus, "Waiting for host", "working");
  } catch (error) {
    closeClientConnection();
    updateStatus(clientStatus, error.message, "error");
  } finally {
    createAnswerButton.disabled = false;
  }
}

function sendMessage(connection, messageInput, statusElement) {
  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  try {
    if (!connection) {
      throw new Error("Channel is not open");
    }

    connection.send(JSON.stringify({ message }));
    messageInput.value = "";
    messageInput.focus();
  } catch (error) {
    updateStatus(statusElement, error.message, "error");
  }
}

function sendControllerMessage(sendAction) {
  try {
    if (!client) {
      throw new Error("Channel is not open");
    }

    sendAction();
  } catch (error) {
    updateStatus(clientStatus, error.message, "error");
  }
}

function getNumberInput(input) {
  return Number.parseFloat(input.value);
}

modeButtons.forEach((button) => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => selectMode(button.dataset.mode));
});

createOfferButton.addEventListener("click", createOffer);
acceptAnswerButton.addEventListener("click", acceptAnswer);
createAnswerButton.addEventListener("click", createAnswer);
hostSendButton.addEventListener("click", () => {
  sendMessage(host, hostMessageInput, hostStatus);
});
clientSendButton.addEventListener("click", () => {
  sendMessage(client, clientMessageInput, clientStatus);
});
clientButtonADown.addEventListener("click", () => {
  sendControllerMessage(() => client.sendButton("A", true));
});
clientButtonAUp.addEventListener("click", () => {
  sendControllerMessage(() => client.sendButton("A", false));
});
clientSendStickButton.addEventListener("click", () => {
  sendControllerMessage(() =>
    client.sendStick({
      x: getNumberInput(clientStickX),
      y: getNumberInput(clientStickY),
    }),
  );
});
clientSendTiltButton.addEventListener("click", () => {
  sendControllerMessage(() =>
    client.sendTilt({
      alpha: getNumberInput(clientTiltAlpha),
      beta: getNumberInput(clientTiltBeta),
      gamma: getNumberInput(clientTiltGamma),
    }),
  );
});
