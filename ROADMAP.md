# ROADMAP

This document defines the implementation order of the project.

Each step should be completed before moving to the next one.

Do **not** skip ahead.

The goal is to validate each layer before introducing new abstractions.

---

# Phase 1 — Proof of Concept

Goal:

Prove that two browsers can establish a WebRTC DataChannel connection without any backend server.

Requirements:

* Single webpage
* Host mode
* Client mode
* Manual copy-paste signaling
* Create Offer
* Create Answer
* Complete WebRTC connection
* Exchange simple JSON messages

Do NOT implement:

* Library architecture
* Multi-client support
* QR signaling
* Compression
* Controller helpers

Exit Criteria:

* Two browsers can exchange messages successfully.

---

# Phase 2 — Extract Core Library

Goal:

Move the working prototype into reusable classes.

Tasks:

* Create Host class
* Create Client class
* Separate connection logic
* Remove duplicated code
* Create clean public API

Target API:

```ts
const host = new Host();
const client = new Client();
```

Exit Criteria:

* Demo uses only library APIs.
* Demo no longer contains raw WebRTC logic.

---

# Phase 2.5 — Testing Infrastructure

Goal:

Build basic automated tests for the current core library behavior.

Tasks:

* Choose or document a lightweight JavaScript testing framework.
* Add a test directory.
* Add tests for signaling encode/decode behavior.
* Add tests for Host and Client public API shape.
* Add tests for basic Connection behavior where practical.
* Ensure tests can be run with a simple npm script.

Exit Criteria:

* The project has a working test command.
* Core modules have basic tests.
* Existing demo behavior remains unchanged.
* No new runtime features are added.

---

# Phase 3 — Stabilize Connection

Goal:

Make the library reliable.

Tasks:

* Connection state events
* Error handling
* Invalid signaling detection
* Disconnect detection
* Safe JSON serialization
* Safe JSON parsing

Events:

* connected
* disconnected
* data
* error
* statechange

Exit Criteria:

* Invalid input never crashes the application.

---

# Phase 4 — Multiple Clients

Goal:

Support one Host and multiple Clients.

Architecture:

```text
        Client
           |
Client --- Host --- Client
           |
        Client
```

Tasks:

* Client registry
* Client IDs
* Send to one client
* Broadcast to all clients
* Client connect/disconnect events

Exit Criteria:

* One Host communicates with multiple Clients simultaneously.

---

# Phase 5 — Controller API

Goal:

Provide higher-level APIs for controller applications.

Tasks:

* Button events
* D-pad
* Analog stick
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

Exit Criteria:

* Building a phone controller requires almost no manual message formatting.

---

# Phase 6 — Improve Signaling

Goal:

Improve usability while remaining serverless.

Tasks:

* Better signaling format
* Optional compression
* Optional QR signaling
* Signal validation

Requirements:

* Copy-paste signaling must always remain available.
* QR signaling is optional.

Exit Criteria:

* Users can choose between copy-paste and QR signaling.

---

# Phase 7 — Developer Experience

Goal:

Make the library pleasant to use.

Tasks:

* TypeScript types
* Better error messages
* Debug mode
* Logging
* Documentation
* Examples

Exit Criteria:

* A new developer can use the library by reading the documentation only.

---

# Phase 8 — Demo Applications

Goal:

Show practical uses of the library.

Demo ideas:

* Phone game controller
* Device tilt demo
* Remote presentation clicker
* Multi-phone controller
* Shared drawing canvas

Exit Criteria:

* The library is demonstrated through multiple real-world examples.

---

# Future Ideas

Possible future features:

* Binary messaging
* File transfer
* Reliable/unreliable channel configuration
* Plugin system
* Automatic QR scanning
* Optional signaling adapters
* Browser compatibility improvements

These are intentionally excluded from the first stable version.
