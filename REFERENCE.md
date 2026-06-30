# PasteRTC Reference

This is the practical usage reference for developers building projects with
PasteRTC as a dependency.

For project-internal development rules, see `AI_GUIDE.md`, `ARCHITECTURE.md`,
and `CONTRIBUTING.md`. This document is about using PasteRTC, not modifying it.

---

## 1. Overview

PasteRTC is a small JavaScript library for direct browser-to-browser
communication with native WebRTC DataChannels.

The default flow is simple:

1. A Host creates an offer string.
2. A Client accepts that offer and creates an answer string.
3. The Host accepts the answer.
4. Both browsers exchange messages directly.

PasteRTC is designed around:

* Browser-to-browser communication.
* Static deployment.
* Manual copy-paste signaling by default.
* Optional extensions for focused features.
* A small public API.

Core gives you generic communication. Extensions add optional conveniences such
as phone-controller helpers or QR transfer.

---

## 2. Installation

The package name is:

```text
paste-rtc
```

### Local dependency

If your app sits next to this repository:

```json
{
  "dependencies": {
    "paste-rtc": "file:../pasteRTC"
  }
}
```

Then install:

```sh
npm install
```

### GitHub dependency

PasteRTC is not published to npm yet. You can depend on the GitHub repository:

```sh
npm install github:kusonnim/pasteRTC
```

Or in `package.json`:

```json
{
  "dependencies": {
    "paste-rtc": "github:kusonnim/pasteRTC"
  }
}
```

---

## 3. Public Imports

Use public entry points only.

Core:

```js
import { Host, Client } from "paste-rtc";
```

Controller:

```js
import * as Controller from "paste-rtc/controller";
```

QR:

```js
import * as QR from "paste-rtc/qr";
```

Do not import internal files directly:

```js
// Avoid this in applications.
import { Connection } from "paste-rtc/src/core/connection.js";
```

If you are editing examples inside the PasteRTC repository, local relative
imports are fine:

```js
import { Host, Client } from "../../src/index.js";
```

Application projects should prefer package imports.

---

## 4. Core Examples

### Minimal Host

```js
import { Host } from "paste-rtc";

const host = new Host();

host.on("connected", (clientId) => {
  console.log("connected", clientId);
});

host.on("data", (data, clientId) => {
  console.log("from", clientId, JSON.parse(data));
});

const offer = await host.createOffer();

// Show this offer to the user.
console.log(offer);
```

### Minimal Client

```js
import { Client } from "paste-rtc";

const client = new Client();

client.on("connected", () => {
  console.log("connected to host");
});

client.on("data", (data) => {
  console.log("from host", JSON.parse(data));
});

const answer = await client.acceptOffer(offerText);

// Show this answer to the user.
console.log(answer);
```

### Complete manual signaling flow

Host:

```js
const host = new Host();

const offerText = await host.createOffer();

// 1. Copy offerText to the client.
// 2. Copy answerText back from the client.
await host.acceptAnswer(answerText);
```

Client:

```js
const client = new Client();

client.on("signaling-pending", () => {
  showStatus("Copy this answer back to the host.");
});

client.on("answer-expired", async () => {
  showStatus("This answer expired. Generate a fresh answer.");
});

// Paste the host offer into offerText.
const answerText = await client.acceptOffer(offerText);

// Copy answerText back to the host.
```

### Manual signaling lifecycle

Manual copy-paste and QR transfer can take time. As soon as `acceptOffer()`
starts creating an answer, the Client is waiting for the Host to accept the
answer that will be transferred. During that window PasteRTC emits:

```js
client.on("answer-created", () => {
  console.log("Answer string is ready to transfer.");
});

client.on("signaling-pending", () => {
  console.log("Waiting for the host to accept this answer.");
});
```

If the Client-side WebRTC attempt fails before the connection opens, PasteRTC
reports that as `answer-expired` instead of a normal connected-session failure:

```js
let latestAnswerText = "";
let answerRequestId = 0;

client.on("answer-expired", async () => {
  await createAnswer({ regenerate: true });
});

async function createAnswer({ regenerate = false } = {}) {
  const requestId = ++answerRequestId;
  const answerText = regenerate
    ? await client.regenerateAnswer(offerText)
    : await client.acceptOffer(offerText);

  // Ignore stale answer promises if expiration caused a newer answer to be
  // generated while an older acceptOffer() call was still finishing.
  if (requestId === answerRequestId) {
    latestAnswerText = answerText;
    showAnswerToUser(latestAnswerText);
  }
}

await createAnswer();
```

Use this to tell the user: "This answer expired. Generate a fresh answer."

`client.regenerateAnswer(offerText)` creates a fresh peer connection and a new
answer for the same offer. If you omit `offerText`, PasteRTC reuses the most
recent offer accepted by that Client:

```js
const freshAnswerText = await client.regenerateAnswer();
```

PasteRTC does not automatically reconnect or resend signals. Applications stay
in control of the manual signaling UI.

### Send JSON

Client:

```js
client.send(JSON.stringify({
  type: "chat",
  text: "hello host",
}));
```

Host:

```js
host.on("data", (data, clientId) => {
  const message = JSON.parse(data);
  console.log(clientId, message.type, message.text);
});
```

### Send to a specific client

```js
host.send("phone-a", JSON.stringify({
  type: "notice",
  text: "only phone A sees this",
}));
```

### Broadcast to all connected clients

```js
host.broadcast(JSON.stringify({
  type: "announcement",
  text: "everyone sees this",
}));
```

### Disconnect a client

```js
host.disconnect("phone-a");
```

### Multi-client signaling

Each client needs its own offer/answer pair.

```js
const host = new Host();

const offerA = await host.createOffer("phone-a");
const offerB = await host.createOffer("phone-b");

// Send offerA to phone A and offerB to phone B.

await host.acceptAnswer("phone-a", answerA);
await host.acceptAnswer("phone-b", answerB);
```

### Core events

```js
host.on("clientConnected", (clientId) => {});
host.on("clientDisconnected", (clientId) => {});
host.on("connected", (clientId) => {});
host.on("data", (data, clientId) => {});
host.on("statechange", (state, clientId) => {});
host.on("error", (error, clientId) => {});

client.on("connected", () => {});
client.on("data", (data) => {});
client.on("statechange", (state) => {});
client.on("error", (error) => {});
client.on("answer-created", () => {});
client.on("signaling-pending", () => {});
client.on("answer-expired", () => {});
client.on("failed", () => {});
```

---

## 5. Controller Examples

Use the Controller extension when the Client is acting like an input device.

```js
import * as Controller from "paste-rtc/controller";
```

### Controller Host

```js
const host = new Controller.Host();

host.on("button", (data, clientId) => {
  console.log(clientId, data.key, data.pressed);
});

host.on("stick", (data, clientId) => {
  console.log(clientId, data.x, data.y);
});

host.on("tilt", (data, clientId) => {
  console.log(clientId, data.alpha, data.beta, data.gamma);
});

host.on("motion", (data, clientId) => {
  console.log(clientId, data.acceleration, data.rotationRate);
});

host.on("data", (data, clientId) => {
  // Still fires for all controller messages.
});
```

### Controller Client

```js
const client = new Controller.Client();

client.sendButton("A", true);
client.sendButton("A", false);

client.sendStick({
  x: 0.5,
  y: -0.25,
});

client.sendTilt({
  alpha: 10,
  beta: 20,
  gamma: -5,
});

client.sendMotion({
  acceleration: { x: 0.1, y: 0.2, z: 0.3 },
  accelerationIncludingGravity: { x: 0.1, y: 9.8, z: 0.3 },
  rotationRate: { alpha: 1, beta: 2, gamma: 3 },
  interval: 16,
});
```

### Bind a button element

```js
const button = document.querySelector("#button-a");
const binding = client.bindButton(button, "A");

// Later:
binding.unbind();
```

### Use device orientation

```js
const tilt = client.createTiltController();

const started = await tilt.start();

if (!started) {
  console.log("Device Orientation API unavailable or permission denied");
}

// Later:
tilt.stop();
```

### Use device motion

```js
const motion = client.createMotionController();

const started = await motion.start();

if (!started) {
  console.log("Device Motion API unavailable or permission denied");
}

// Later:
motion.stop();
```

Device orientation and motion often require a mobile browser, HTTPS, and a user
permission prompt.

---

## 6. QR Examples

Use QR when you want easier transfer of the same offer/answer strings. QR does
not replace Core signaling.

```js
import * as QR from "paste-rtc/qr";
```

### Render a signal string

```js
const canvas = document.querySelector("#qr");

QR.generate(canvas, offerText);
```

You can also render to an image element:

```js
const image = document.querySelector("#qr-image");

QR.generate(image, answerText);
```

### Scan a QR code

```js
const video = document.querySelector("#camera");
const scanner = QR.scan(video);

try {
  const signalText = await scanner.result;
  console.log(signalText);
} finally {
  scanner.stop();
}
```

### Typical QR signaling flow

Host:

```js
const host = new Host();
const offerText = await host.createOffer();

QR.generate(offerCanvas, offerText);

const answerScanner = QR.scan(answerVideo);
const answerText = await answerScanner.result;
answerScanner.stop();

await host.acceptAnswer(answerText);
```

Client:

```js
const client = new Client();

const offerScanner = QR.scan(offerVideo);
const offerText = await offerScanner.result;
offerScanner.stop();

const answerText = await client.acceptOffer(offerText);
QR.generate(answerCanvas, answerText);
```

If scanning the answer on the Host side takes too long, the Client may emit
`answer-expired`. Generate and display a fresh answer:

```js
client.on("answer-expired", async () => {
  const freshAnswerText = await client.regenerateAnswer(offerText);
  QR.generate(answerCanvas, freshAnswerText);
});
```

Keep copy-paste controls available as a fallback. QR is only a transfer helper
for the same offer and answer strings.

---

## 7. Common Patterns

### Phone Controller

Use:

* `Controller.Host`
* `Controller.Client`
* `sendButton()`
* `sendStick()`
* `sendTilt()`
* `sendMotion()`
* `bindButton()`
* `createTiltController()`
* `createMotionController()`

Desktop:

```js
const host = new Controller.Host();

host.on("button", handleButton);
host.on("stick", handleStick);
host.on("tilt", handleTilt);
host.on("motion", handleMotion);
```

Phone:

```js
const client = new Controller.Client();

client.bindButton(document.querySelector("#jump"), "jump");
client.sendStick({ x, y });
```

### Presentation Remote

Use:

* Core for connection.
* Controller buttons for actions.
* QR to transfer signals if useful.

```js
host.on("button", ({ key, pressed }) => {
  if (!pressed) return;

  if (key === "next") nextSlide();
  if (key === "previous") previousSlide();
});
```

### Remote Whiteboard

Use:

* Core Host/Client.
* JSON messages for pointer or drawing commands.
* `broadcast()` to mirror updates to viewers.

```js
client.send(JSON.stringify({
  type: "draw",
  x,
  y,
  color,
}));
```

```js
host.on("data", (data, clientId) => {
  const message = JSON.parse(data);

  if (message.type === "draw") {
    drawStroke(message);
    host.broadcast(data);
  }
});
```

### Simple Multiplayer

Use:

* Core multi-client Host.
* One client ID per player.
* `host.send(clientId, data)` for private updates.
* `host.broadcast(data)` for world updates.

```js
host.on("clientConnected", (clientId) => {
  players.set(clientId, createPlayer());
});

host.on("data", (data, clientId) => {
  updatePlayer(clientId, JSON.parse(data));
});

setInterval(() => {
  host.broadcast(JSON.stringify({
    type: "state",
    players: [...players],
  }));
}, 100);
```

### Remote Dashboard

Use:

* Core Host/Client.
* Client sends telemetry.
* Host updates UI.

```js
client.send(JSON.stringify({
  type: "metric",
  name: "temperature",
  value: 23.5,
}));
```

```js
host.on("data", (data) => {
  const metric = JSON.parse(data);
  updateDashboard(metric.name, metric.value);
});
```

---

## 8. Choosing the Right Module

Use Core when you need generic browser-to-browser communication.

```js
import { Host, Client } from "paste-rtc";
```

Good for:

* Chat
* Multiplayer state
* Dashboards
* Whiteboards
* Custom app protocols

Use Controller when the Client behaves like an input device.

```js
import * as Controller from "paste-rtc/controller";
```

Good for:

* Phone controllers
* Remote buttons
* Sticks
* Tilt input
* Motion input
* Presentation remotes

Use QR when you want to transfer existing signal strings visually.

```js
import * as QR from "paste-rtc/qr";
```

Good for:

* Phone-to-desktop setup
* Avoiding long copy-paste strings
* Static demos
* Local network-free onboarding

QR should still feed strings back into Core APIs.

---

## 9. Best Practices

Import only from public entry points:

```js
import { Host, Client } from "paste-rtc";
import * as Controller from "paste-rtc/controller";
import * as QR from "paste-rtc/qr";
```

Keep application logic outside the library.

```js
host.on("data", (data, clientId) => {
  const message = JSON.parse(data);
  app.handleMessage(clientId, message);
});
```

Treat Controller and QR as optional.

Prefer JSON messages for application data:

```js
client.send(JSON.stringify({
  type: "action",
  action: "jump",
}));
```

Keep Core generic. If your message is app-specific, handle it in your app.

Keep copy-paste signaling available when using QR.

Stop browser helpers when leaving a page:

```js
window.addEventListener("pagehide", () => {
  tilt?.stop();
  motion?.stop();
  binding?.unbind();
  client?.close();
  host?.close();
});
```

---

## 10. Things To Avoid

Avoid importing internal files:

```js
// Avoid.
import { Peer } from "paste-rtc/src/core/peer.js";
```

Avoid modifying Core for application-specific messages.

```js
// Prefer app-level handling instead.
host.on("data", (data) => {
  const message = JSON.parse(data);
  if (message.type === "my-app-event") {
    handleMyAppEvent(message);
  }
});
```

Avoid making Core depend on Extensions.

Avoid adding backend services unless you are intentionally building a separate
project around PasteRTC.

Avoid assuming QR is required.

Avoid assuming Controller is required.

Avoid changing signaling strings in app code.

Avoid sending non-serializable objects if you plan to use JSON.

---

## 11. API Cheatsheet

### Core API

| API | Description |
| --- | --- |
| `new Host()` | Creates a host that can manage one or more clients. |
| `host.createOffer(clientId?)` | Creates an offer string for one client. |
| `host.acceptAnswer(answerText)` | Accepts an answer for the primary or only pending client. |
| `host.acceptAnswer(clientId, answerText)` | Accepts an answer for a specific client. |
| `host.send(data)` | Sends a string to the primary client. |
| `host.send(clientId, data)` | Sends a string to a specific client. |
| `host.broadcast(data)` | Sends a string to all connected clients. |
| `host.disconnect(clientId?)` | Disconnects a client. |
| `host.close()` | Closes all host connections. |
| `host.on("connected", fn)` | Runs when a host-side connection opens. |
| `host.on("clientConnected", fn)` | Runs when a client connects. |
| `host.on("clientDisconnected", fn)` | Runs when a client disconnects. |
| `host.on("data", fn)` | Runs when the host receives data from a client. |
| `host.on("statechange", fn)` | Runs when a connection state changes. |
| `host.on("error", fn)` | Runs when an error is reported. |
| `new Client()` | Creates a client for one host connection. |
| `client.acceptOffer(offerText)` | Accepts an offer and returns an answer string. |
| `client.regenerateAnswer(offerText?)` | Creates a fresh answer after an answer expires. |
| `client.send(data)` | Sends a string to the host. |
| `client.close()` | Closes the client connection. |
| `client.on("connected", fn)` | Runs when the client connects. |
| `client.on("data", fn)` | Runs when the client receives data from the host. |
| `client.on("statechange", fn)` | Runs when the client state changes. |
| `client.on("error", fn)` | Runs when the client reports an error. |
| `client.on("answer-created", fn)` | Runs when a transferable answer has been created. |
| `client.on("signaling-pending", fn)` | Runs while waiting for the host to accept an answer. |
| `client.on("answer-expired", fn)` | Runs when the pending answer fails before connection. |
| `client.on("failed", fn)` | Runs when an established client session fails. |

### Controller API

| API | Description |
| --- | --- |
| `new Controller.Host()` | Host with controller event routing. |
| `new Controller.Client()` | Client with controller send/browser helpers. |
| `host.on("button", fn)` | Receives button messages. |
| `host.on("stick", fn)` | Receives stick messages. |
| `host.on("tilt", fn)` | Receives tilt messages. |
| `host.on("motion", fn)` | Receives device motion messages. |
| `client.sendButton(key, pressed)` | Sends a button message. |
| `client.sendStick({ x, y })` | Sends a stick position. |
| `client.sendTilt({ alpha, beta, gamma })` | Sends orientation values. |
| `client.sendMotion(data)` | Sends Device Motion values. |
| `client.createTiltController(options?)` | Creates a Device Orientation bridge. |
| `client.createMotionController(options?)` | Creates a Device Motion bridge. |
| `client.bindButton(element, key, options?)` | Binds DOM press/release events to a button message. |
| `Controller.createTiltController(client, options?)` | Creates a tilt helper for a client-like object. |
| `Controller.createMotionController(client, options?)` | Creates a motion helper for a client-like object. |
| `Controller.bindButton(client, element, key, options?)` | Binds a DOM element to a client-like object. |

### QR API

| API | Description |
| --- | --- |
| `QR.generate(canvasElement, text)` | Renders text as QR on a canvas. |
| `QR.generate(imageElement, text)` | Renders text as QR on an image element. |
| `QR.scan(videoElement, options?)` | Starts scanning QR codes from a video element. |
| `scanner.result` | Promise resolving to decoded QR text. |
| `scanner.stop()` | Stops scanning and releases the camera. |
