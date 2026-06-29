import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  Client,
  Controller,
  Host,
} from "../src/index.js";

describe("Core entry point", () => {
  test("re-exports only the stable public API", async () => {
    const publicApi = await import("../src/index.js");

    assert.equal(typeof Host, "function");
    assert.equal(typeof Client, "function");
    assert.equal(typeof Controller, "object");
    assert.equal(typeof Controller.Host, "function");
    assert.equal(typeof Controller.Client, "function");
    assert.equal(typeof Controller.createMotionController, "function");
    assert.equal(typeof Controller.createTiltController, "function");
    assert.equal(typeof Controller.bindButton, "function");

    assert.deepEqual(Object.keys(Controller).sort(), [
      "Client",
      "Host",
      "bindButton",
      "createMotionController",
      "createTiltController",
    ]);

    assert.deepEqual(Object.keys(publicApi).sort(), [
      "Client",
      "Controller",
      "Host",
    ]);
  });
});
