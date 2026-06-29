# ARCHITECTURE

This document explains the internal structure of the PasteRTC project.

PasteRTC is a small TypeScript/JavaScript library for connecting browsers through WebRTC DataChannels without any backend server.

The project starts simple and becomes more modular over time.

---

# Core Idea

PasteRTC hides the complexity of WebRTC behind a simple API.

Instead of forcing users to directly manage:

* RTCPeerConnection
* RTCDataChannel
* Offer
* Answer
* ICE candidates
* Connection states

PasteRTC exposes simple Host and Client objects.

Example:

```ts
const host = new PasteRTC.Host();

const offer = await host.createOffer();

await host.acceptAnswer(answerText);

host.on("data", (data, clientId) => {
    console.log(data, clientId);
});
```

---

# High-Level Structure

```text
PasteRTC
├─ Host
├─ Client
├─ Connection
├─ Signaling
├─ Events
├─ Controller Helpers
└─ Utilities
```

Each module has a clear responsibility.

Current organization separates generic networking from optional extensions:

```text
src/
├─ core/
│  ├─ host.js
│  ├─ client.js
│  ├─ connection.js
│  ├─ peer.js
│  └─ signaling.js
└─ extensions/
   └─ controller/
      ├─ host.js
      ├─ client.js
      └─ browser-input.js
```

Dependencies flow in one direction only:

```text
extensions → core
```

Core modules must not import extension modules. Top-level files such as
`src/host.js`, `src/client.js`, and `src/browser-input.js` are compatibility
re-export files for earlier local imports.

The dependency rule is:

```text
extensions → core
```

Core must never depend on extensions.

---

# Module Responsibilities

## Core Modules

Core modules provide generic browser-to-browser communication. They should not
know about controller inputs, QR codes, debugging tools, file transfer, gamepad
APIs, or any other optional feature layer.

Core includes:

* Host
* Client
* Connection
* Signaling
* Events
* Utilities

Core code lives under:

```text
src/core/
```

## Extension Modules

Extensions are optional feature layers built on top of the public Core API.
Extensions may import from Core, but Core must never import from Extensions.

Initial and future extensions include:

* Controller extension
* QR signaling extension
* Debug extension
* File transfer extension
* Gamepad extension

Extension code lives under:

```text
src/extensions/
```

The first extension is the Controller extension:

```text
src/extensions/controller/
```

## Host

The Host represents the main browser.

Typical use case:

* Desktop browser
* Main game screen
* Presentation screen
* Shared canvas owner

Responsibilities:

* Create offers
* Accept answers
* Manage one or more clients
* Send messages to a specific client
* Broadcast messages to all clients
* Emit client-related events

Public API:

```ts
const host = new Host();

const offer = await host.createOffer();

await host.acceptAnswer(answerText);

host.send(clientId, data);

host.broadcast(data);
```

Internally, the Host owns multiple Connection objects.

```text
Host
├─ Connection to Client A
├─ Connection to Client B
└─ Connection to Client C
```

---

## Client

The Client represents a browser that connects to a Host.

Typical use case:

* Phone controller
* Remote input device
* Secondary screen
* Viewer

Responsibilities:

* Accept an offer from the Host
* Generate an answer
* Send messages to the Host
* Receive messages from the Host
* Emit connection events

Public API:

```ts
const client = new Client();

const answer = await client.acceptOffer(offerText);

client.send({
    type: "button",
    key: "A",
    pressed: true
});
```

A Client owns one Connection object.

---

## Connection

The Connection module wraps one WebRTC peer connection.

Responsibilities:

* Create RTCPeerConnection
* Create or receive RTCDataChannel
* Open and close the channel
* Send raw messages
* Receive raw messages
* Track connection state
* Emit low-level events

Conceptually:

```text
Connection
├─ RTCPeerConnection
└─ RTCDataChannel
```

Host and Client should not directly manipulate raw WebRTC objects unless necessary.

They should use Connection as the internal abstraction.

---

## Signaling

The Signaling module handles copy-paste signaling strings.

Responsibilities:

* Convert WebRTC offer objects into strings
* Convert WebRTC answer objects into strings
* Parse signaling strings back into objects
* Validate signaling type
* Add readable prefixes
* Optionally compress data in the future

Signaling string examples:

```text
PASTERTC_OFFER:...
```

```text
PASTERTC_ANSWER:...
```

The first version may use plain JSON strings.

Later versions may use:

```text
JSON → base64url → optional compression
```

Signaling must remain manual and serverless.

No signaling server is allowed.

---

## Events

PasteRTC should use a small event system.

Common events:

```text
connected
disconnected
data
error
statechange
```

Host-specific events:

```text
clientConnected
clientDisconnected
button
stick
tilt
```

The public API should look like this:

```ts
host.on("data", (data, clientId) => {});

host.on("button", (data, clientId) => {});

host.on("stick", (data, clientId) => {});

host.on("tilt", (data, clientId) => {});

client.on("connected", () => {});
```

The event system should be small and dependency-free.

---

## Controller Helpers

Controller Helpers are optional high-level utilities for the phone-controller use case.

They should not be part of the first proof of concept.

Future helpers:

```ts
client.sendButton("A", true);

client.sendStick({
    x: 0.5,
    y: -0.2
});

client.sendTilt({
    alpha,
    beta,
    gamma
});

const tilt = client.createTiltController();

await tilt.start();

tilt.stop();

const binding = client.bindButton(buttonElement, "A");

binding.unbind();
```

Possible helper modules:

```text
controller/
├─ button
├─ stick
└─ tilt
```

These helpers should only format and send messages.

They should not be required for basic communication.

Browser integration helpers are optional and should stay separate from
networking code. They should forward browser input into the existing controller
helpers instead of formatting or sending messages directly.

Controller-specific code lives under:

```text
src/extensions/controller/
```

---

## Utilities

Utilities contain small reusable functions.

Examples:

* ID generation
* JSON safety helpers
* base64url encoding
* type guards
* debug logging
* timeout helpers

Utilities should remain small.

Avoid creating large utility modules too early.

---

# Suggested Folder Structure

Early project structure:

```text
src/
├─ index.ts
├─ host.ts
├─ client.ts
├─ connection.ts
├─ signaling.ts
├─ events.ts
└─ utils.ts
```

Later project structure:

```text
src/
├─ index.ts
│
├─ host/
│  └─ Host.ts
│
├─ client/
│  └─ Client.ts
│
├─ connection/
│  ├─ Connection.ts
│  └─ ConnectionState.ts
│
├─ signaling/
│  ├─ encodeSignal.ts
│  ├─ decodeSignal.ts
│  └─ signalTypes.ts
│
├─ events/
│  └─ EventEmitter.ts
│
├─ controller/
│  ├─ button.ts
│  ├─ stick.ts
│  └─ tilt.ts
│
└─ utils/
   ├─ id.ts
   ├─ json.ts
   └─ debug.ts
```

Do not start with the large structure.

Begin small.

Split files only when the code clearly needs separation.

---

# Data Flow

## Host Creates Offer

```text
Host
 ↓
Connection creates RTCPeerConnection
 ↓
Connection creates RTCDataChannel
 ↓
RTCPeerConnection creates offer
 ↓
Signaling encodes offer
 ↓
User copies offer string
```

---

## Client Accepts Offer

```text
User pastes offer string
 ↓
Signaling decodes offer
 ↓
Client creates Connection
 ↓
Client sets remote description
 ↓
Client creates answer
 ↓
Signaling encodes answer
 ↓
User copies answer string
```

---

## Host Accepts Answer

```text
User pastes answer string
 ↓
Signaling decodes answer
 ↓
Host sets remote description
 ↓
WebRTC connection completes
 ↓
DataChannel opens
```

---

## Data Messaging

```text
Client.send(data)
 ↓
JSON.stringify(data)
 ↓
RTCDataChannel.send(message)
 ↓
Host receives message
 ↓
JSON.parse(message)
 ↓
Host emits "data"
```

The reverse direction works the same way.

---

# Multi-Client Architecture

Multi-client support is built by creating one WebRTC connection per client.

Do not try to make one RTCDataChannel serve multiple clients.

Correct model:

```text
Host
├─ clientId: client-a → Connection
├─ clientId: client-b → Connection
└─ clientId: client-c → Connection
```

Public Host methods:

```ts
const offer = await host.createOffer(clientId);

await host.acceptAnswer(clientId, answerText);

host.send(clientId, data);

host.broadcast(data);

host.disconnect(clientId);
```

Host events include the stable `clientId` associated with each connection:

```ts
host.on("clientConnected", (clientId) => {});

host.on("clientDisconnected", (clientId) => {});

host.on("data", (data, clientId) => {});
```

Each client must complete manual signaling separately.

This means each client needs its own offer/answer pair.

---

# Error Handling Policy

PasteRTC should never crash the app because of user input.

Handle errors such as:

* Empty signal string
* Invalid prefix
* Invalid JSON
* Offer pasted into answer field
* Answer pasted into offer field
* WebRTC connection failure
* DataChannel not open
* Malformed incoming message

Errors should be emitted through:

```ts
on("error", handler)
```

and also returned or thrown when appropriate.

---

# What Should Stay Internal

Users should not need to touch:

* RTCPeerConnection
* RTCDataChannel
* RTCSessionDescription
* ICE candidates
* Raw SDP

These details should remain inside the library.

---

# What Should Be Public

When consumed as a package, the official public Core entry point is:

```ts
import { Host, Client } from "paste-rtc";
```

The official public Controller extension entry point is:

```ts
import * as Controller from "paste-rtc/controller";
```

When working from local source files inside this repository, use
`src/index.js` for the same public exports. `src/index.js` also re-exports a
`Controller` namespace for compatibility, but new package consumers should
prefer the `paste-rtc/controller` subpath for controller-specific imports.

The public API should stay intentionally small.

## Public Core API

Core exports:

```ts
Host
Client
```

`Host` public methods:

```ts
host.createOffer(clientId?)
host.acceptAnswer(answerText)
host.acceptAnswer(clientId, answerText)
host.send(data)
host.send(clientId, data)
host.broadcast(data)
host.disconnect(clientId?)
host.close()
host.on(eventName, handler)
```

Core `Host` public events:

```text
connected
data
statechange
error
clientConnected
clientDisconnected
```

`Client` public methods:

```ts
client.acceptOffer(offerText)
client.send(data)
client.close()
client.on(eventName, handler)
```

Core `Client` public events:

```text
connected
data
statechange
error
```

## Public Controller Extension API

Controller extension APIs are exposed through the `Controller` namespace:

```ts
Controller.Host
Controller.Client
Controller.createTiltController(client, options?)
Controller.bindButton(client, element, key, options?)
```

`Controller.Host` supports the Core `Host` API and adds controller events:

```text
button
stick
tilt
```

`Controller.Client` supports the Core `Client` API and adds:

```ts
client.sendButton(key, pressed)
client.sendStick({ x, y })
client.sendTilt({ alpha, beta, gamma })
client.createTiltController(options?)
client.bindButton(element, key, options?)
```

Top-level files such as `src/host.js` and `src/client.js` are compatibility
entry points for earlier phases. New library consumers should use the package
exports, or `src/index.js` when importing directly from local source files.

Do not expose internal implementation details from `src/index.js`.

Internal modules include:

* Connection
* Signaling utilities
* Peer internals
* Event internals
* Utility modules
* Controller helper implementation classes such as `ButtonBinding` and `TiltController`

---

# Design Rules

1. Start with a working demo before creating abstractions.
2. Keep the first implementation small.
3. Avoid dependencies unless they solve a real problem.
4. Keep signaling manual and serverless.
5. Keep copy-paste signaling available even if QR is added later.
6. Host and Client should be simple to understand.
7. Connection should hide raw WebRTC complexity.
8. Multi-client support uses one Connection per client.
9. Controller helpers should be optional.
10. Do not build production infrastructure into the library.

---

# First Implementation Target

The first implementation should only prove this:

```text
Browser A creates offer.
Browser B accepts offer and creates answer.
Browser A accepts answer.
Browser A and Browser B exchange JSON messages.
```

Everything else comes later.
