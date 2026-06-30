# AI Guide for PasteRTC

This guide is for future AI/Codex sessions working on PasteRTC. It summarizes
the project context, boundaries, workflow, and decision rules so changes can
continue safely without rediscovering the architecture from scratch.

Read this guide together with:

* `PROJECT.md`
* `ROADMAP.md`
* `ARCHITECTURE.md`
* `EXTENSIONS.md`
* `CONTRIBUTING.md`
* `README.md`
* `CHANGELOG.md`, if present

If those documents conflict, prefer the more specific and more recent document,
then update stale documentation as part of the task if the user asked for an
architecture or API change.

---

## Project summary

PasteRTC is a small JavaScript library for direct browser-to-browser
communication over native WebRTC DataChannels.

The project is intentionally static and serverless:

* No backend server.
* No Firebase.
* No Supabase.
* No WebSocket signaling server.
* No hosted signaling service.

Initial signaling is manual. A user transfers offer and answer strings between
browsers by copy-paste, or by optional helpers such as the QR Extension. After
signaling completes, browsers communicate directly through WebRTC.

The library should remain generic. Phone-controller features, QR helpers, and
future domain-specific features belong in optional extensions unless they are
truly generic browser-to-browser communication primitives.

---

## Non-negotiables

Keep these rules visible while working:

* Core must never import from Extensions.
* Extensions may import from Core.
* Copy-paste signaling is the baseline.
* QR is optional.
* Controller is optional.
* Do not add backend services.
* Do not add Firebase.
* Do not add Supabase.
* Do not add WebSocket signaling.
* Do not add npm publishing or build tooling unless explicitly requested.
* Prefer small phase-based changes.
* One task should have one primary goal.
* Update docs when architecture changes.
* Keep tests passing.

---

## Current project status

As of this guide:

* Core Host and Client APIs exist.
* Core supports manual offer/answer signaling.
* Core supports one Host with multiple independent Client connections.
* Messages are sent through RTCDataChannel as strings, commonly JSON strings.
* The Controller Extension exists.
* The Controller Extension supports button, stick, tilt, and motion helpers.
* The Controller Host can route typed controller events such as `button`,
  `stick`, `tilt`, and `motion`.
* Browser input helpers exist for button binding, device orientation, and
  device motion.
* The QR Extension exists and is complete for basic optional QR transfer.
* QR can render strings and scan QR codes back into strings.
* QR does not replace copy-paste signaling.
* Examples exist under `examples/`.
* Tests use Node's built-in test runner through `npm test`.
* PasteRTC has package metadata, but it is not intended for npm publishing yet.

Do not assume the roadmap phase names perfectly reflect all completed work.
Always inspect source, tests, and docs before deciding what is already done.

---

## Current architecture

The important structure is:

```text
src/
+-- index.js
+-- core/
|   +-- host.js
|   +-- client.js
|   +-- connection.js
|   +-- peer.js
|   `-- signaling.js
`-- extensions/
    +-- controller/
    |   +-- index.js
    |   +-- host.js
    |   +-- client.js
    |   `-- browser-input.js
    `-- qr/
        +-- index.js
        +-- generate.js
        `-- scan.js
```

The dependency rule is strict:

```text
extensions -> core
```

That means:

* Core must never import from Extensions.
* Extensions may import from Core.
* Extensions should use public or stable Core behavior rather than reaching
  deeper into low-level internals unless the task explicitly requires it.
* A future extension should live under `src/extensions/<name>/`.

Compatibility files may exist at the top level of `src/`, such as
`src/host.js`, `src/client.js`, or `src/browser-input.js`. Treat those as
compatibility entry points. New code should prefer the official public entry
points described below.

---

## Core vs Extensions

Core is for generic communication.

Core owns:

* Host
* Client
* Peer/Connection wrappers
* Manual signaling string encode/decode
* Generic events
* DataChannel send/receive behavior
* Multi-client host connection management

Core must not know about:

* Controller buttons
* Sticks
* Tilt
* Motion
* QR rendering or scanning
* Debug UI
* File transfer helpers
* Gamepad APIs
* Any browser input API that is not needed for generic communication

Extensions are optional feature layers.

Extensions may provide:

* Higher-level message helpers
* Browser API integrations
* Optional signaling UX
* Debugging helpers
* Domain-specific utilities

Current extensions:

* `controller`: phone/controller-oriented message helpers and browser input
  bindings.
* `qr`: optional QR rendering/scanning helpers for transferring existing signal
  strings.

---

## Public API rules

The public package API is intentionally small.

Core package import:

```js
import { Host, Client } from "paste-rtc";
```

Controller Extension import:

```js
import * as Controller from "paste-rtc/controller";
```

QR Extension import:

```js
import { generate, scan } from "paste-rtc/qr";
```

Local examples may import from local source files:

```js
import { Host, Client, Controller } from "../../src/index.js";
```

Do not expose internal implementation details casually.

Keep these internal unless a task explicitly promotes them:

* `Connection`
* `Peer`
* signaling utilities
* private event internals
* browser helper implementation classes such as `TiltController`,
  `MotionController`, or `ButtonBinding`
* QR implementation details below the QR public entry point

When adding a public method or event:

1. Update the implementation.
2. Add or update tests.
3. Update README/API docs.
4. Update `ARCHITECTURE.md` or `EXTENSIONS.md` if the API affects
   architecture or extension boundaries.
5. Update `CHANGELOG.md` if present.

Do not remove or rename public methods unless the user explicitly requests a
breaking change.

---

## Signaling rules

Copy-paste signaling is the baseline.

This is non-negotiable unless the user explicitly changes the project vision.

Preserve these rules:

* Core creates offer and answer strings.
* Core accepts offer and answer strings.
* Manual copy-paste must continue to work.
* QR is optional and only helps transfer existing strings.
* QR must not replace copy-paste signaling.
* QR must not change Core signaling formats.
* Core must not import QR code.

Do not add:

* Firebase signaling
* Supabase signaling
* WebSocket signaling
* PeerJS signaling servers
* hosted discovery
* matchmaking
* backend services

If a user asks for any of these, pause and explain that it changes the project
scope unless they explicitly want a new architecture direction.

---

## How to decide Core vs Extension

Ask: "Would this feature still make sense for any generic browser-to-browser
data channel app?"

If yes, it might belong in Core.

Examples that may belong in Core:

* Connection state handling
* Safe send/close behavior
* Generic Host/Client events
* Multi-client connection management
* Generic serialization policy if already part of public Core behavior

Ask: "Is this feature a convenience layer, UI helper, browser input integration,
or domain-specific protocol?"

If yes, it belongs in an Extension.

Examples that belong in Extensions:

* Controller button/stick/tilt/motion helpers
* Device Orientation API
* Device Motion API
* QR rendering/scanning
* File transfer helpers
* Gamepad helpers
* Debug UI

If uncertain, prefer Extension. Core should stay small and generic.

---

## Development workflow

Use small, phase-based changes.

Default workflow:

1. Read the requested docs.
2. Inspect the current source and tests.
3. Confirm the task scope.
4. Modify only files required for that scope.
5. Keep the public API stable unless the task asks for a public API addition or
   breaking change.
6. Add or update tests for behavior changes.
7. Update docs for API or architecture changes.
8. Run relevant checks.
9. Commit the focused change.

One task should have one primary goal.

Avoid combining unrelated work. For example:

* Good: add Controller motion support.
* Bad: add Controller motion support, QR chunking, build tooling, and packaging
  changes in one task.

If the working tree has unrelated changes, do not overwrite them. Inspect
`git status` and work around unrelated edits.

---

## Testing expectations

Run tests after implementation:

```sh
npm test
```

The current test setup uses Node's built-in test runner.

When adding behavior:

* Add unit tests for the new public API.
* Test event routing when adding events.
* Test generic `data` events still fire when adding typed extension events.
* Test unsupported browser API handling for browser integration helpers.
* Test permission-denied behavior where browser APIs expose permissions.
* Test examples when they are meant to demonstrate public entry points.

For browser helper tests, prefer fake `EventTarget` objects and synthetic
events. Do not require a real browser, camera, motion sensor, or network.

For QR code behavior, keep QR tests extension-only and confirm Core does not
import QR.

For docs-only changes, running `git diff --check` is usually enough, but running
`npm test` is still acceptable when risk is unclear.

---

## Documentation update rules

Update documentation when:

* A public API is added, removed, or renamed.
* A new extension is added.
* An existing extension gains new public behavior.
* Dependency direction or architecture changes.
* Package exports change.
* Examples change how users should consume the library.

Likely documents to update:

* `README.md` for user-facing usage.
* `ARCHITECTURE.md` for structure, dependency flow, and public/internal API.
* `EXTENSIONS.md` for extension rules and extension public APIs.
* `ROADMAP.md` when the phase plan changes.
* `PROJECT.md` when the project vision or principles change.
* `CHANGELOG.md` when present and user-visible behavior changes.

Do not update docs just to churn wording. Keep documentation changes tied to
the task.

---

## What not to change casually

Do not casually change:

* Core WebRTC behavior.
* Core signaling format.
* Public Host/Client APIs.
* Package exports.
* Dependency direction.
* Existing examples' baseline behavior.
* Copy-paste signaling.
* QR optionality.
* Controller optionality.
* Test framework.
* Package metadata.
* npm publishing workflow.
* Build tooling.
* Generated `dist/` files.

Do not add unless explicitly requested:

* Backend services.
* Firebase.
* Supabase.
* WebSocket signaling.
* PeerJS servers.
* Authentication.
* User accounts.
* Matchmaking.
* Online discovery.
* Automatic reconnection.
* Compression.
* QR chunking.
* npm publishing setup.
* bundlers/build systems.

If a requested feature seems to require one of these, ask for confirmation or
document the architectural tradeoff before implementing.

---

## Recommended prompt style for future Codex tasks

Good prompts for this repo are specific and phase-scoped.

Recommended template:

```text
Read PROJECT.md, ROADMAP.md, ARCHITECTURE.md, EXTENSIONS.md,
CONTRIBUTING.md, README.md, and CHANGELOG.md if present.

Implement <one specific phase or feature> only.

Goal:
<one clear goal>

Requirements:
- <specific public API or behavior>
- <specific tests>
- <specific docs>

Rules:
- Do not modify Core networking behavior unless explicitly required.
- Do not modify signaling unless explicitly required.
- Do not modify QR/Controller unless this task is about that extension.
- Keep Core independent from Extensions.
- Keep all tests passing.
```

Good examples:

* "Add a Controller Gamepad Extension helper only."
* "Add QR chunking planning docs only."
* "Add tests for Host disconnect behavior only."
* "Refactor Controller browser-input helpers without behavior changes."

Weak prompts:

* "Make it production ready."
* "Add online rooms."
* "Improve everything."
* "Publish it."

For broad prompts, first narrow the scope into a small phase.

---

## Next-step decision rules

When deciding the next step, use this order:

1. If a user names a phase, implement only that phase.
2. If docs and code disagree, inspect source and tests, then update stale docs
   if the task permits documentation changes.
3. If a feature is generic communication, consider Core.
4. If a feature is optional, UI-oriented, browser-API-specific, or
   domain-specific, put it in an Extension.
5. If the feature changes public API, add tests and docs.
6. If the feature changes architecture, update `ARCHITECTURE.md` and possibly
   `EXTENSIONS.md`.
7. If the feature is user-visible and `CHANGELOG.md` exists, update it.
8. If the change would require backend infrastructure, stop and ask unless the
   user explicitly requested a scope change.

Prefer the smallest change that leaves the project working.

---

## Quick safety checklist

Before finishing a task:

* Did Core import from an Extension? If yes, fix it.
* Does copy-paste signaling still work?
* Is QR still optional?
* Is Controller still optional?
* Did public imports remain stable?
* Did you avoid backend services and hosted signaling?
* Did you avoid build tooling and npm publishing unless requested?
* Did you add or update tests for behavior changes?
* Did you update docs for API or architecture changes?
* Did `npm test` pass when behavior changed?
* Is the final diff focused on one primary goal?
