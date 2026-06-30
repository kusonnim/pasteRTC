# PasteRTC

PasteRTC is a small JavaScript library for connecting browsers directly with
native WebRTC DataChannels.

It is designed for fully static projects: no backend server, no Firebase, no
WebSocket signaling server, and no hosted signaling service. The first
connection step is manual copy-paste signaling. After that, browsers exchange
messages directly.

PasteRTC is currently intended to be used directly from this GitHub repository
or from local source files. It is not published to npm yet.

---

## Current status

The project currently supports:

* Manual copy-paste signaling.
* One Host connecting to one or more Clients.
* JSON/string messages over RTCDataChannel.
* Host send, broadcast, and disconnect helpers.
* A Controller extension for button, stick, tilt, and motion messages.
* A QR extension for rendering strings as QR codes and scanning QR codes back
  into strings.
* Practical static examples.
* Basic automated tests with Node's built-in test runner.

QR helpers are optional and do not replace copy-paste signaling.

PasteRTC is still early. The public API is intentionally small:

```js
import { Host, Client } from "paste-rtc";
import * as Controller from "paste-rtc/controller";
import { generate, scan } from "paste-rtc/qr";
```

When working inside this repository, the same public API is available through
`src/index.js`.

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
* QR example: `http://localhost:3000/examples/qr/`

The exact port depends on the static server you use.

Browser ES modules usually should be served over `http://localhost` rather than
opened directly as `file://` URLs.

The examples include the manual-signaling recovery flow: when a Client answer
expires before the Host accepts it, the page regenerates a fresh answer with
`client.regenerateAnswer(offerText)`.

---

## Use from another project as a GitHub dependency

PasteRTC is not published to npm yet, but another JavaScript project can depend
on this GitHub repository.

Install from GitHub:

```sh
npm install github:kusonnim/pasteRTC
```

Or add it to another project's `package.json`:

```json
{
  "dependencies": {
    "paste-rtc": "github:kusonnim/pasteRTC"
  }
}
```

Then import the Core API from the package root:

```js
import { Host, Client } from "paste-rtc";
```

Import the Controller extension from its subpath:

```js
import * as Controller from "paste-rtc/controller";
```

Import the QR extension from its subpath:

```js
import { generate as generateQr, scan as scanQr } from "paste-rtc/qr";
```

For application code, prefer importing Core from the package root and the
Controller and QR extensions from their subpaths. The package root also
re-exports a `Controller` namespace from `src/index.js` for compatibility, but
extension subpaths keep optional usage explicit.

---

## Import from local source files

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

Copy-paste signaling is the baseline behavior. QR helpers only make it easier
to transfer the same offer and answer strings between browsers. Applications
should still keep a copy-paste path available.

---

## Basic Host/Client usage

Host:

```js
import { Host } from "paste-rtc";

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
import { Client } from "paste-rtc";

const client = new Client();

client.on("connected", () => {
  console.log("connected to host");
});

client.on("data", (data) => {
  console.log("from host", data);
});

client.on("answer-expired", async () => {
  const freshAnswer = await client.regenerateAnswer(offerText);
  console.log("answer expired; copy this fresh answer instead", freshAnswer);
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
import { Host } from "paste-rtc";

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
import { Client } from "paste-rtc";

const client = new Client();
const answer = await client.acceptOffer(offerText);
```

If manual copy-paste or QR transfer takes too long, the pending answer can
expire before the Host accepts it. Listen for `answer-expired` and call
`client.regenerateAnswer(offerText)` to create a fresh answer for the same
offer.

---

## Controller extension usage

The Controller extension is optional. It builds on the core Host and Client API
without changing WebRTC behavior.

Use it through the `Controller` namespace:

```js
import * as Controller from "paste-rtc/controller";
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

host.on("motion", (data, clientId) => {
  console.log("motion", clientId, data.acceleration, data.rotationRate);
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

client.sendMotion({
  acceleration: { x: 0.1, y: 0.2, z: 0.3 },
  accelerationIncludingGravity: { x: 0.1, y: 9.8, z: 0.3 },
  rotationRate: { alpha: 1, beta: 2, gamma: 3 },
  interval: 16,
});
```

Browser input helpers:

```js
const binding = client.bindButton(buttonElement, "A");

const tilt = client.createTiltController();
await tilt.start();

const motion = client.createMotionController();
await motion.start();

// Later:
tilt.stop();
motion.stop();
binding.unbind();
```

Device orientation and device motion support depend on the browser. Mobile
browsers may require HTTPS and an explicit permission prompt.

---

## QR extension usage

The QR extension is optional. It converts strings into QR codes and scans QR
codes back into strings. It does not know about Host, Client, offers, answers,
or WebRTC.

```js
import { generate, scan } from "paste-rtc/qr";

generate(canvasElement, signalText);
generate(imageElement, signalText);

const scanner = scan(videoElement);
const decodedText = await scanner.result;

// Or stop early and release the camera:
scanner.stop();
```

The main library entry point does not re-export QR.

The QR example at `examples/qr/` shows the complete flow:

1. Host creates an offer with Core.
2. QR Extension renders the offer.
3. Client scans the offer.
4. Client creates an answer with Core.
5. QR Extension renders the answer.
6. Host scans the answer.
7. Core opens the DataChannel.
8. Host and Client exchange messages.

Use the `paste-rtc/qr` subpath, or `src/extensions/qr/index.js` when importing
from local source files.

---

## Project structure

```text
.
+-- examples/                 # Practical local examples
|   +-- basic/
|   +-- controller/
|   +-- multi-client/
|   `-- qr/
+-- src/
|   +-- index.js              # Public entry point
|   +-- core/                 # Generic communication core
|   `-- extensions/
|       +-- controller/       # Optional controller extension
|       `-- qr/               # Optional QR signaling helper
+-- tests/                    # Automated tests
`-- package.json              # Package metadata and exports
```

Core contains generic browser-to-browser communication:

* `Host`
* `Client`
* WebRTC connection internals
* Manual signaling internals
* Event plumbing

Extensions build on top of Core:

```text
extensions -> core
```

Core must never import from extensions.

Package exports mirror that split:

```text
paste-rtc              -> src/index.js
paste-rtc/controller   -> src/extensions/controller/index.js
paste-rtc/qr           -> src/extensions/qr/index.js
```

The QR Extension belongs under `src/extensions/qr/`. It accepts any string,
including Core-generated offer/answer strings, renders it as a QR code, and can
scan a QR code back into a string. Core must never depend on QR. If signal
strings are too long for practical QR transfer, chunking can be added later
inside the QR Extension.

QR Extension files:

```text
src/extensions/qr/index.js       # Public QR entry point
src/extensions/qr/generate.js    # String to QR rendering
src/extensions/qr/scan.js        # Camera scanner and QR decode helper
```

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
import { Host, Client } from "paste-rtc";
import * as Controller from "paste-rtc/controller";
```

When editing examples or static pages inside this repository, use relative local
source imports instead:

```js
import { Host, Client, Controller } from "./src/index.js";
```

Files under `examples/<name>/` need to walk back to the repository root:

```js
import { Host, Client } from "../../src/index.js";
```

When working on library internals, keep generic networking inside `src/core/`
and optional feature layers inside `src/extensions/`.

---

## Not supported yet

PasteRTC intentionally does not support these yet:

* npm publishing workflow.
* Build tooling or generated `dist/` files.
* Backend signaling.
* QR chunking.
* Compression.
* Automatic reconnection.
* Matchmaking or online discovery.
* Authentication or user accounts.
* File transfer.
* Binary message helpers.
* Production-scale connection diagnostics.

Manual copy-paste signaling and static deployment remain the baseline behavior.
