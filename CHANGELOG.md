# Changelog

## Unreleased

### Added

* Added the optional QR Extension under `src/extensions/qr/`.
* Added `generate(target, text)` for rendering strings as QR codes.
* Added `scan(videoElement, options?)` for scanning QR codes back into strings.
* Added the `paste-rtc/qr` package export.
* Added `examples/qr/` to demonstrate Core and QR Extension integration.
* Added QR example coverage to confirm the example uses public entry points.
* Added Controller motion support with `sendMotion()`, `createMotionController()`,
  and `host.on("motion", ...)`.
* Updated the controller example to demonstrate Device Motion start/stop and
  motion event logging.

### Notes

* Copy-paste signaling remains the baseline.
* QR is optional and separate from Core.
* Core, signaling, WebRTC behavior, Host APIs, and Client APIs are unchanged.
* QR chunking and compression are not implemented.
