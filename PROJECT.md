# PasteRTC

A lightweight TypeScript/JavaScript library for fully static, serverless WebRTC communication between browsers.

## Vision

PasteRTC allows two or more browsers to establish direct peer-to-peer communication without requiring a backend server, Firebase, WebSocket server, PeerJS server, or any hosted signaling service.

The initial connection is established through manual copy-paste signaling.

After signaling is complete, browsers communicate directly through WebRTC DataChannels.

The primary use case is turning a phone browser into a controller for a desktop browser, but the library should remain generic and reusable.

PasteRTC is organized as a generic browser-to-browser communication core with optional extensions layered on top. The core should stay useful without any controller, QR, debug, file-transfer, or gamepad-specific features.

---

# Core Principles

## Serverless

The project must not require:

* Backend servers
* Firebase
* Supabase
* PeerJS servers
* WebSocket signaling servers
* Hosted signaling services

The only allowed signaling mechanism is manual transfer of signaling data.

Examples:

* Copy and paste
* QR codes (future)
* File transfer (future)

---

## Static Deployment

The entire project must work when deployed as a static website.

Examples:

* GitHub Pages
* Vercel static export
* Netlify
* Local HTML files

---

## Native WebRTC

Prefer native browser APIs:

* RTCPeerConnection
* RTCDataChannel

Avoid unnecessary abstractions.

The goal is to understand and expose WebRTC behavior clearly.

---

# Target Architecture

## Host

The host acts as the central node.

Responsibilities:

* Create offers
* Accept answers
* Manage connected clients
* Send data to individual clients
* Broadcast data to all clients

Future API:

```ts
const host = new PasteRTC.Host();

const offer = await host.createOffer();

await host.acceptAnswer(answerText);

host.send(clientId, data);

host.broadcast(data);
```

## Client

The client connects to a host.

Responsibilities:

* Accept offers
* Generate answers
* Send data
* Receive data

Future API:

```ts
const client = new PasteRTC.Client();

const answer = await client.acceptOffer(offerText);

client.send(data);
```

---

# Connection Model

## Phase 1

One host.

One client.

```text
Host <-> Client
```

## Phase 2

One host.

Multiple clients.

```text
        Client A
             |
Client B -- Host -- Client C
             |
        Client D
```

The host maintains a separate WebRTC connection for each client.

Clients do not communicate directly with each other.

---

# Data Transport

Communication uses RTCDataChannel.

The library should support:

* JSON messages
* Strings
* Binary messages (future)

Default behavior:

```ts
connection.send({
    type: "button",
    key: "A"
});
```

Automatic serialization and deserialization should be provided.

---

# Planned Features

## Core

* Manual signaling
* Host mode
* Client mode
* Connection events
* JSON messaging
* Error handling
* Disconnect handling

## Networking

* Multi-client host
* Broadcast messaging
* Latency measurement
* Connection diagnostics

## Controller Helpers

* Button events
* D-pad events
* Analog stick events
* Device orientation
* Tilt streaming

Example:

```ts
client.sendButton("A", true);

client.sendTilt({
    alpha,
    beta,
    gamma
});
```

Controller helpers are an optional extension built on top of the generic communication core.

---

# Demo Application

A simple demo application should be included.

The same page should support both modes.

Startup screen:

```text
[ Host ]
[ Client ]
```

Host mode:

* Generate offer
* Display offer
* Accept answer
* Show connected clients
* Send test messages

Client mode:

* Paste offer
* Generate answer
* Send test messages
* Display received messages

---

# Development Roadmap

## Step 1

Create a minimal proof-of-concept.

Goals:

* Manual signaling
* One host
* One client
* Basic DataChannel communication

No abstraction yet.

No library API yet.

Focus only on proving that the connection works.

---

## Step 2

Extract reusable Host and Client classes.

Goals:

* Clean API
* Event system
* Reusable architecture

---

## Step 3

Add reliability features.

Goals:

* Error handling
* Connection state tracking
* Validation
* Debug logging

---

## Step 4

Add multi-client support.

Goals:

* One host
* Multiple clients
* Broadcast functionality

---

## Step 5

Add controller-focused features.

Goals:

* Buttons
* Joystick
* Device orientation
* Input streaming

---

## Step 6

Improve signaling UX.

Possible future additions:

* QR-based signaling
* Compression
* Signal chunking

These features must remain optional.

Manual copy-paste signaling must continue to work.

---

# Non-Goals

The project should NOT include:

* Backend infrastructure
* Authentication systems
* User accounts
* Databases
* Matchmaking
* Online discovery services

PasteRTC focuses only on direct browser-to-browser communication.

Everything else should be built on top of it.

---

# Philosophy

Connection setup may be manual.

Communication should be simple.

The project prioritizes:

1. Simplicity
2. Transparency
3. Serverless operation
4. Educational value
5. Extensibility

The first milestone is not a production-ready networking framework.

The first milestone is proving that two browsers can connect and exchange real-time messages using only copy-paste signaling and WebRTC.
