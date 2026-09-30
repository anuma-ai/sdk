#!/usr/bin/env node
/** Verify the logger through the built CommonJS package exports. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const originalConsoleError = console.error;
const originalFetch = globalThis.fetch;
const consoleErrors = [];
console.error = (...args) => consoleErrors.push(args);
globalThis.fetch = () => {
  throw new Error("The logger export check must not send a network request.");
};

const makeSink = () => {
  const errors = [];
  return {
    errors,
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: (...args) => errors.push(args),
    },
  };
};

const collection = (rows) => ({
  query: () => ({ unsafeFetchRaw: async () => rows }),
});
const context = {
  conversationsCollection: collection([
    {
      id: "logger-conversation-row",
      conversation_id: "logger-conversation",
      title: "Logger export check",
      is_deleted: false,
      created_at: 0,
      updated_at: 0,
    },
  ]),
  messagesCollection: collection([
    {
      id: "logger-message-row",
      conversation_id: "logger-conversation",
      message_id: 1,
      role: "user",
      content: `enc:v3:${"a".repeat(64)}`,
      created_at: 0,
      updated_at: 0,
    },
  ]),
};
const expectedError = [
  "memoryEngine: messages still encrypted (key unavailable?) — excluded from embedding",
  undefined,
  { stillEncrypted: 1, considered: 1, sealedRowsSeen: 1, rowsSeen: 1 },
];

async function assertGuard(entrypoint, label, sink) {
  const sinkCount = sink.errors.length;
  const consoleCount = consoleErrors.length;
  const embedded = await entrypoint.chunkAndEmbedAllMessages(context, {});
  assert.equal(embedded, 0, `${label}: the encrypted row must not be embedded`);
  assert.equal(sink.errors.length, sinkCount + 1, `${label}: the sink must receive the error`);
  assert.deepEqual(
    sink.errors.at(-1),
    expectedError,
    `${label}: the error must retain its context`
  );
  assert.equal(
    consoleErrors.length,
    consoleCount,
    `${label}: the console must not receive the error`
  );
}

let root;
try {
  root = require("@anuma/sdk");
  assert.equal(root.getLogger(), root.consoleLogger);

  const rootSink = makeSink();
  root.setLogger(rootSink.logger);
  const react = require("@anuma/sdk/react");
  await assertGuard(react, "root to React after import", rootSink);
  assert.equal(react.getLogger(), rootSink.logger);

  const expo = require("@anuma/sdk/expo");
  await assertGuard(expo, "root to Expo after import", rootSink);
  assert.equal(expo.getLogger(), rootSink.logger);

  const reactSink = makeSink();
  react.setLogger(reactSink.logger);
  await assertGuard(expo, "React to Expo", reactSink);
  await assertGuard(react, "React to React", reactSink);

  const expoSink = makeSink();
  expo.setLogger(expoSink.logger);
  await assertGuard(react, "Expo to React", expoSink);
  await assertGuard(expo, "Expo to Expo", expoSink);
  for (const entrypoint of [root, react, expo]) {
    assert.equal(entrypoint.getLogger(), expoSink.logger);
  }
  assert.equal(rootSink.errors.length, 2);
  assert.equal(reactSink.errors.length, 2);
  assert.equal(expoSink.errors.length, 2);
  assert.equal(consoleErrors.length, 0);

  expo.setLogger(expo.consoleLogger);
  for (const entrypoint of [root, react, expo]) {
    assert.equal(entrypoint.getLogger(), expo.consoleLogger);
  }
  assert.equal(await react.chunkAndEmbedAllMessages(context, {}), 0);
  assert.deepEqual(consoleErrors, [expectedError]);
  assert.equal(expoSink.errors.length, 2);

  react.setLogger(react.noopLogger);
  for (const entrypoint of [root, react, expo]) {
    assert.equal(entrypoint.getLogger(), react.noopLogger);
  }
  assert.equal(await expo.chunkAndEmbedAllMessages(context, {}), 0);
  assert.deepEqual(consoleErrors, [expectedError]);
  assert.equal(expoSink.errors.length, 2);
  console.log("The root, React, and Expo package exports share the logger.");
} finally {
  root?.setLogger(root.consoleLogger);
  console.error = originalConsoleError;
  globalThis.fetch = originalFetch;
}
