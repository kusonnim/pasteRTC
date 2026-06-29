# PasteRTC Examples

These examples show how to use PasteRTC through the public API exported from
`src/index.js`.

Run them from a local static server so browser ES module imports work:

```sh
npx serve .
```

Then open one of the example pages:

* `examples/basic/` — Core Host and Client with manual signaling and JSON messages.
* `examples/controller/` — Controller extension helpers and typed host events.
* `examples/multi-client/` — One Host managing multiple Clients with send and broadcast.

* `examples/qr/` - Core Host and Client with optional QR signaling helpers.

Each example keeps signaling manual:

1. Open a Host page.
2. Create an offer and copy it.
3. Open a Client page, paste the offer, and create an answer.
4. Copy the answer back to the Host.
5. Accept the answer.

For multi-client testing, repeat the offer/answer flow once per client using a
different client ID.

For QR testing, keep the text areas available as a copy-paste fallback while
using the QR canvases and camera scanners to transfer the same offer and answer
strings.
