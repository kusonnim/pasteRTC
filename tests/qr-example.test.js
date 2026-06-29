import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("QR example uses only public Core and QR extension entry points", async () => {
  const source = await readFile(new URL("../examples/qr/main.js", import.meta.url), "utf8");

  assert.match(source, /from "\.\.\/\.\.\/src\/index\.js"/);
  assert.match(source, /from "\.\.\/\.\.\/src\/extensions\/qr\/index\.js"/);
  assert.doesNotMatch(source, /src\/core\//);
  assert.doesNotMatch(source, /src\/extensions\/qr\/(?:generate|scan)\.js/);
});
