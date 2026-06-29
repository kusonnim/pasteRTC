# PasteRTC

PasteRTC is a small JavaScript library for connecting browsers directly with
native WebRTC DataChannels.

It is designed for fully static projects: no backend server, no Firebase, no
WebSocket signaling server, and no hosted signaling service. The first
connection step is manual copy-paste signaling. After that, browsers exchange
messages directly.

PasteRTC is currently intended for local/internal use from this repository. It
is not packaged for npm publishing yet.

---

## Current status

The project currently supports:

* Manual copy-paste signaling.
* One Host connecting to one or more Clients.
* JSON/string messages over RTCDataChannel.
* Host send, broadcast, and disconnect helpers.
* A Controller extension for button, stick, and tilt messages.
* Practical static examples.
* Basic automated tests with Node's built-in test runner.

PasteRTC is still early. The public API is intentionally small and should be
used through `src/index.js`.

---

## Run locally

Use any static file server from the repository root.

Example:

```sh
npx serve .
```

Then open:

* Basic example: `http://localhost:3000/examples/basic/`
* Controller example: `http://localhost:3000/examples/controller/`
* Multi-client example: `http://localhost:3000/examples/multi-client/`

The exact port depends on the static server you use.

Browser ES modules usually should be served over `http://localhost` rather than
opened directly as `file://` URLs.

---

## Import locally

For local static projects inside this repository, import the public API from
`src/index.js`:

```js
import { Host, Client, Controller } from "./src/index.js";
```

From files inside `examples/<name>/`, the relative import looks like this:

```js
import { Host, Client } from "../../src/index.js";
```

Use `src/index.js` as the public entry point. Avoid importing internal modules
such as `src/core/connection.js`, `src/core/signaling.js`, or peer internals
from app code.

---

## Manual signaling flow

PasteRTC does not use a signaling server.

Each connection is established by copying text between browsers:

1. Host creates an offer.
2. User copies the offer to the Client browser.
3. Client accepts the offer and creates an answer.
4. User copies the answer back to the Host browser.
5. Host accepts the answer.
6. The WebRTC DataChannel opens.
7. Host and Client exchange messages directly.

For multi-client use, repeat this flow once per client. Each client gets its own
offer/answer pair and its own WebRTC connection.

---

## Basic Host/Client usage

Host:

```js
import { Host } from "./src/index.js";

const host = new Host();

host.on("connected", (clientId) => {
  console.log("connected", clientId);
});

host.on("data", (data, clientId) => {
  console.log("from client", clientId, data);
});

const offer = await host.createOffer();

// Copy `offer` to the client.
// Paste the answer text back from the client.
await host.acceptAnswer(answerText);

host.send(JSON.stringify({
  type: "message",
  text: "hello client",
}));
```

Client:

```js
import { Client } from "./src/index.js";

const client = new Client();

client.on("connected", () => {
  console.log("connected to host");
});

client.on("data", (data) => {
  console.log("from host", data);
});

// Paste the offer text from the host.
const answer = await client.acceptOffer(offerText);

// Copy `answer` back to the host.
client.send(JSON.stringify({
  type: "message",
  text: "hello host",
}));
```

---

## Multi-client usage

The core Host can manage multiple Clients. Each Client must complete a separate
manual signaling flow.

```js
import { Host } from "./src/index.js";

const host = new Host();

host.on("clientConnected", (clientId) => {
  console.log("client connected", clientId);
});

host.on("clientDisconnected", (clientId) => {
  console.log("client disconnected", clientId);
});

host.on("data", (data, clientId) => {
  console.log("message", clientId, data);
});

const offerA = await host.createOffer("phone-a");
const offerB = await host.createOffer("phone-b");

// Send each offer to its matching client.
// Then paste each answer back into the host.
await host.acceptAnswer("phone-a", answerA);
await host.acceptAnswer("phone-b", answerB);

host.send("phone-a", JSON.stringify({
  type: "message",
  text: "only phone A",
}));

host.broadcast(JSON.stringify({
  type: "message",
  text: "everyone",
}));

host.disconnect("phone-a");
```

Client usage stays the same for each browser:

```js
import { Client } from "./src/index.js";

const client = new Client();
const answer = await client.acceptOffer(offerText);
```

---

## Controller extension usage

The Controller extension is optional. It builds on the core Host and Client API
without changing WebRTC behavior.

Use it through the `Controller` namespace:

```js
import { Controller } from "./src/index.js";
```

Controller Host:

```js
const host = new Controller.Host();

host.on("button", (data, clientId) => {
  console.log("button", clientId, data.key, data.pressed);
});

host.on("stick", (data, clientId) => {
  console.log("stick", clientId, data.x, data.y);
});

host.on("tilt", (data, clientId) => {
  console.log("tilt", clientId, data.alpha, data.beta, data.gamma);
});

host.on("data", (data, clientId) => {
  // Generic data still fires for all messages.
  console.log("raw data", clientId, data);
});
```

Controller Client:

```js
const client = new Controller.Client();

client.sendButton("A", true);
client.sendButton("A", false);

client.sendStick({
  x: 0.5,
  y: -0.2,
});

client.sendTilt({
  alpha: 10,
  beta: 20,
  gamma: -5,
});
```

Browser input helpers:

```js
const binding = client.bindButton(buttonElement, "A");

const tilt = client.createTiltController();
await tilt.start();

// Later:
tilt.stop();
binding.unbind();
```

Device orientation support depends on the browser. Mobile browsers may require
HTTPS and an explicit permission prompt.

---

## Project structure

```text
.
├── examples/               # Practical local examples
│   ├── basic/
│   ├── controller/
│   └── multi-client/
├── src/
│   ├── index.js            # Public library entry point
│   ├── core/               # Generic communication core
│   └── extensions/
│       └── controller/     # Optional controller extension
└── tests/                  # Automated tests
```

Core contains generic browser-to-browser communication:

* `Host`
* `Client`
* WebRTC connection internals
* Manual signaling internals
* Event plumbing

Extensions build on top of Core:

```text
extensions → core
```

Core must never import from extensions.

---

## Development notes

Run tests:

```sh
npm test
```

The test suite uses Node's built-in test runner.

Development should follow the roadmap one phase at a time. Keep changes small,
keep the demo working, and keep existing tests passing.

When adding application code, prefer the public entry point:

```js
import { Host, Client, Controller } from "./src/index.js";
```

When working on library internals, keep generic networking inside `src/core/`
and optional feature layers inside `src/extensions/`.

---

## Not supported yet

PasteRTC intentionally does not support these yet:

* npm publishing workflow.
* Build tooling or generated `dist/` files.
* Backend signaling.
* QR signaling.
* Compression.
* Automatic reconnection.
* Matchmaking or online discovery.
* Authentication or user accounts.
* File transfer.
* Binary message helpers.
* Production-scale connection diagnostics.

Manual copy-paste signaling and static deployment remain the baseline behavior.
