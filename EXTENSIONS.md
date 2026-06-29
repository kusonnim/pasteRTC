# EXTENSIONS

PasteRTC is organized around a small generic core with optional extensions.

The core provides browser-to-browser communication. Extensions add focused
feature layers on top of that core.

---

# What Is an Extension?

An extension is optional functionality that builds on PasteRTC Core without
changing the underlying networking model.

Extensions may add:

* Higher-level message helpers
* Browser API integrations
* Developer tools
* Alternate signaling UX
* Domain-specific features

Extensions should not be required for basic WebRTC communication.

---

# Core Relationship

Core owns generic communication responsibilities:

* Host
* Client
* Connection
* Signaling
* Events
* Utilities

Extensions use Core APIs to add behavior.

The dependency rule is strict:

```text
extensions → core
```

Core must never import from extensions.

---

# Current Extension: Controller

The Controller extension is the first extension.

It provides:

* Client controller helpers such as `sendButton()`, `sendStick()`, and `sendTilt()`
* Host controller event routing such as `button`, `stick`, and `tilt`
* Browser input helpers such as button bindings and tilt controllers

Controller code lives under:

```text
src/extensions/controller/
```

The official public Controller surface is exposed through `src/index.js`:

```ts
import { Controller } from "./src/index.js";
```

Public Controller exports:

```ts
Controller.Host
Controller.Client
Controller.createTiltController(client, options?)
Controller.bindButton(client, element, key, options?)
```

Implementation classes and low-level helpers should stay internal unless they
are intentionally promoted into the public API.

---

# Future Extension Examples

Possible future extensions include:

* Debug tools
* File transfer
* Gamepad input
* Diagnostics
* Alternate input helpers

Each extension should be optional and should build on Core rather than changing
Core behavior.

---

# Current Extension: QR

The QR Extension provides QR generation and scanning helpers.

Its purpose is to make manual signaling easier without changing the underlying
signaling model. Copy-paste signaling remains the baseline and must continue to
work without QR.

QR code should live under:

```text
src/extensions/qr/
```

The QR Extension may provide:

* Encode/display helpers for any string.
* Encode/display helpers for Core-generated offer strings.
* Encode/display helpers for Core-generated answer strings.
* Scan/decode helpers that return text from QR codes.
* Small UI helpers that applications may opt into.

Public QR API:

```js
import { generate, scan } from "paste-rtc/qr";

generate(canvasElement, text);
generate(imageElement, text);

const scanner = scan(videoElement);
const decodedText = await scanner.result;
scanner.stop();
```

The QR Extension is demonstrated in:

```text
examples/qr/
```

The QR Extension must not:

* Replace copy-paste signaling.
* Change Core Host or Client APIs.
* Change Core signaling formats.
* Add a Core dependency on QR code.
* Require existing examples to use QR.

Dependency flow remains:

```text
qr extension -> core
```

Core must never import from `src/extensions/qr/`.

The current QR implementation is intentionally simple and optional. It does not
include compression or chunking. If signal strings are too long for reliable
single-code transfer, QR-specific chunking can be planned later inside the QR
Extension.

---

# Rules for Adding Extensions

When adding a new extension:

1. Keep the extension under `src/extensions/<extension-name>/`.
2. Depend only on Core or lower-level utility code.
3. Do not import extension code from Core.
4. Preserve existing public APIs unless a breaking change is explicitly planned.
5. Add tests for extension behavior.
6. Keep networking, signaling, and WebRTC behavior unchanged unless the phase explicitly allows it.
7. Document the extension and its public API.
8. Export only stable extension APIs through the public entry point.

Extensions should be small, focused, and removable without breaking Core.
