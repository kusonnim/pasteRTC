import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  Client,
  Connection,
  decodeAnswer,
  decodeOffer,
  encodeAnswer,
  encodeOffer,
  Host,
} from "../src/index.js";

describe("Core entry point", () => {
  test("re-exports the generic core public API", () => {
    assert.equal(typeof Host, "function");
    assert.equal(typeof Client, "function");
    assert.equal(typeof Connection, "function");
    assert.equal(typeof encodeOffer, "function");
    assert.equal(typeof decodeOffer, "function");
    assert.equal(typeof encodeAnswer, "function");
    assert.equal(typeof decodeAnswer, "function");
  });
});
