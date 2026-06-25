import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  decodeAnswer,
  decodeOffer,
  encodeAnswer,
  encodeOffer,
} from "../src/signaling.js";

describe("signaling", () => {
  const offer = { type: "offer", sdp: "offer-sdp" };
  const answer = { type: "answer", sdp: "answer-sdp" };

  test("encodes and decodes offers", () => {
    assert.equal(encodeOffer(offer), JSON.stringify(offer));
    assert.deepEqual(decodeOffer(encodeOffer(offer)), offer);
  });

  test("encodes and decodes answers", () => {
    assert.equal(encodeAnswer(answer), JSON.stringify(answer));
    assert.deepEqual(decodeAnswer(encodeAnswer(answer)), answer);
  });

  test("rejects invalid JSON signaling", () => {
    assert.throws(() => decodeOffer("{invalid"), /not valid JSON/);
    assert.throws(() => decodeAnswer("{invalid"), /not valid JSON/);
  });

  test("rejects empty signaling strings", () => {
    assert.throws(() => decodeOffer("  "), /Paste a offer first/);
    assert.throws(() => decodeAnswer(""), /Paste a answer first/);
  });

  test("rejects signals with an unsupported prefix", () => {
    assert.throws(
      () => decodeOffer(`PASTERTC_OFFER:${JSON.stringify(offer)}`),
      /not valid JSON/,
    );
  });

  test("rejects the wrong signaling type", () => {
    assert.throws(() => decodeOffer(JSON.stringify(answer)), /valid offer/);
    assert.throws(() => decodeAnswer(JSON.stringify(offer)), /valid answer/);
  });

  test("rejects signaling without an SDP string", () => {
    assert.throws(
      () => decodeOffer(JSON.stringify({ type: "offer" })),
      /valid offer/,
    );
  });
});
