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

Provide an optional controller extension on top of the generic communication core.

Tasks:

* Button events
* D-pad
* Analog stick
* Device orientation
* Tilt streaming
* Browser input bindings
* Controller event routing
* Extension architecture cleanup

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
* Controller-specific code lives outside the generic core.
* The core does not depend on the controller extension.

---

## Phase 4-D — Extension Architecture Refactor

Goal:

Separate generic communication code from optional extension code.

Tasks:

* Move generic WebRTC communication into `src/core/`.
* Move controller-specific behavior into `src/extensions/controller/`.
* Preserve existing public imports through compatibility re-exports.
* Keep dependencies flowing only from extensions to core.

Exit Criteria:

* Core remains generic and reusable.
* Controller functionality lives entirely under the controller extension.
* Existing demo behavior remains unchanged.
* All tests continue passing.

---

## Phase 5 — Library Packaging

Goal:

Prepare PasteRTC to be consumed as a library.

Tasks:

* Define public entry points.
* Add package metadata.
* Preserve browser-friendly static usage.
* Document import paths.
* Keep core and extensions separately understandable.

Exit Criteria:

* Developers can clearly import the core library and optional extensions.
* Existing static demo behavior remains unchanged.

---

# Phase 6 — Improve Signaling — Complete

Status:

Complete.

Goal:

Improve manual signaling usability while remaining serverless, with QR as an
optional signaling extension.

Completed Scope:

* Copy-paste signaling remains the baseline.
* QR is an optional UI/helper layer for transferring existing offer/answer
  strings.
* QR code must live under `src/extensions/qr/`.
* QR is exposed through `paste-rtc/qr`.
* QR can render strings as QR codes.
* QR can scan QR codes back into strings.
* QR may be used with Core-generated offer/answer strings.
* Core must not depend on QR.
* Signal chunking may be needed later if offer/answer strings are too long for
  practical QR transfer.

Do NOT implement:

* Replacement of copy-paste signaling
* Runtime Core dependency on QR
* Public Core API changes
* New examples before the QR example phase
* New dependencies during planning

Requirements:

* Copy-paste signaling must always remain available.
* QR signaling is optional.

Exit Criteria:

* Users can choose between copy-paste and QR signaling.
* Copy-paste signaling remains available and unchanged.

## Phase 6-A — QR Extension Planning — Complete

Goal:

Define QR as an optional extension before implementation begins.

Tasks:

* Document `src/extensions/qr/` as the QR Extension home.
* Document that QR depends on Core.
* Document that Core must not depend on QR.
* Document that copy-paste signaling remains the baseline.
* Document that QR only transfers existing offer/answer strings.
* Identify that chunking may be needed later for long signal strings.

Exit Criteria:

* Project documentation clearly defines QR Extension scope and boundaries.
* No runtime source code, dependencies, public APIs, or examples are changed.

## Phase 6-B — QR Encode/Display Helper — Complete

Goal:

Add a small optional helper for rendering existing offer/answer strings as QR
codes.

Tasks:

* Add QR encoding/display code under `src/extensions/qr/`.
* Keep the helper focused on converting signal text into a displayable QR code.
* Accept existing Core-generated offer/answer strings as input.
* Avoid changing Core signaling behavior.
* Keep copy-paste UI available wherever QR is introduced.

Exit Criteria:

* An application can display a Core offer or answer string as a QR code.
* Copy-paste signaling remains unchanged.
* Core imports no QR code.

## Phase 6-C — QR Scan/Decode Helper — Complete

Goal:

Add a small optional helper for scanning or decoding QR codes back into signal
text.

Tasks:

* Add scan/decode helper code under `src/extensions/qr/`.
* Return decoded offer/answer text for existing Core APIs to consume.
* Validate decoded text enough to fail clearly on invalid QR contents.
* Keep scanner/browser integration optional.
* Avoid changing Core Host or Client APIs.

Exit Criteria:

* An application can decode QR contents back into a signal string.
* Decoded strings can be passed to existing Core methods.
* Core imports no QR code.

## Phase 6-D — QR Example and Tests — Complete

Goal:

Demonstrate and test the optional QR Extension after helper behavior exists.

Tasks:

* Add a QR-focused example without changing existing examples.
* Keep copy-paste controls visible in the QR example.
* Add tests for QR helper behavior where practical.
* Add tests or checks that QR remains extension-only.
* Document any known signal length limits and future chunking needs.

Exit Criteria:

* QR usage is demonstrated as optional.
* Existing examples continue to behave unchanged.
* Tests cover the new QR helpers.
* Copy-paste signaling remains the reliable fallback.

Final Phase 6 Result:

* QR Extension lives under `src/extensions/qr/`.
* Public QR API is available from `paste-rtc/qr`.
* `generate(target, text)` renders any string to a canvas or image element.
* `scan(videoElement, options?)` scans a QR code and returns decoded text
  through `scanner.result`.
* `scanner.stop()` releases the camera.
* `examples/qr/` demonstrates Core and QR Extension integration.
* Core, signaling, WebRTC behavior, Host APIs, and Client APIs remain unchanged.

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
* Release checklist

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
* Compression
* Reliable/unreliable channel configuration
* Plugin system
* QR chunking
* Optional signaling adapters
* Browser compatibility improvements

These are intentionally excluded from the first stable version.
