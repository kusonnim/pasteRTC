import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("controller example demonstrates motion helpers through the public API", async () => {
  const source = await readFile(
    new URL("../examples/controller/main.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /from "\.\.\/\.\.\/src\/index\.js"/);
  assert.match(source, /\.on\("motion"/);
  assert.match(source, /\.sendMotion\(/);
  assert.match(source, /\.createMotionController\(/);
  assert.match(source, /motionController\.start\(\)/);
  assert.match(source, /motionController\?\.stop\(\)/);
  assert.doesNotMatch(source, /src\/core\//);
  assert.doesNotMatch(source, /src\/extensions\/controller\//);
});

