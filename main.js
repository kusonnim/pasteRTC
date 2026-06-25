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
const clientMessageInput = document.querySelector("#client-message");
const clientSendButton = document.querySelector("#client-send");
const clientMessageLog = document.querySelector("#client-message-log");

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

function addReceivedMessage(messageLog, data) {
  const item = document.createElement("li");

  try {
    const parsedMessage = JSON.parse(data);
    item.textContent =
      typeof parsedMessage.message === "string"
        ? parsedMessage.message
        : JSON.stringify(parsedMessage);
  } catch {
    item.textContent = "Received invalid JSON.";
    item.classList.add("message-error");
  }

  messageLog.append(item);
  messageLog.scrollTop = messageLog.scrollHeight;
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

function closeHostConnection() {
  setMessagingEnabled(hostMessageInput, hostSendButton, false);
  host?.close();
  host = undefined;
}

function closeClientConnection() {
  setMessagingEnabled(clientMessageInput, clientSendButton, false);
  client?.close();
  client = undefined;
}

async function createOffer() {
  createOfferButton.disabled = true;
  closeHostConnection();
  hostOfferOutput.value = "";
  updateStatus(hostStatus, "Creating offer...", "working");

  try {
    host = createPeer(
      Host,
      hostStatus,
      hostMessageInput,
      hostSendButton,
      hostMessageLog,
    );

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
    client = createPeer(
      Client,
      clientStatus,
      clientMessageInput,
      clientSendButton,
      clientMessageLog,
    );

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
