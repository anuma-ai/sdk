#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const [format, restriction] = process.argv.slice(2);
if (!format) {
  for (const childFormat of ["cjs", "esm"]) {
    for (const childRestriction of [undefined, "preventExtensions", "seal", "freeze"]) {
      const args =
        childFormat === "esm"
          ? ["--loader", new URL("./watermelondb-esm-test-loader.mjs", import.meta.url).href]
          : [];
      args.push(fileURLToPath(import.meta.url), childFormat);
      if (childRestriction) args.push(childRestriction);
      const child = spawnSync(process.execPath, args, { stdio: "inherit", timeout: 30_000 });
      assert.equal(child.error, undefined, "The logger export check child must start.");
      assert.equal(
        child.status,
        0,
        `${childFormat} ${childRestriction ?? "shared"}: the logger check must pass`
      );
    }
  }
  process.exit(0);
}
assert.ok(["cjs", "esm"].includes(format), "The logger check format must be cjs or esm.");
assert.ok(
  restriction === undefined || ["preventExtensions", "seal", "freeze"].includes(restriction),
  "The logger check restriction must be supported."
);

const require = createRequire(import.meta.url);
const load = async (specifier) => (format === "esm" ? import(specifier) : require(specifier));
const originalConsoleError = console.error;
const originalFetch = globalThis.fetch;
const originalConsoleWarn = console.warn;
const consoleErrors = [];
const consoleWarnings = [];
console.error = (...args) => consoleErrors.push(args);
console.warn = (...args) => consoleWarnings.push(args);
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
  root = await load("@anuma/sdk");
  const stateKey = Symbol.for("@anuma/sdk/logger/v1");
  assert.equal(
    Object.hasOwn(globalThis, stateKey),
    false,
    "Import must not initialize logger state."
  );

  if (restriction) {
    const react = await load("@anuma/sdk/react");
    const expo = await load("@anuma/sdk/expo");
    assert.equal(Object.hasOwn(globalThis, stateKey), false);
    Object[restriction](globalThis);
    for (const [label, entrypoint] of [
      ["root", root],
      ["React", react],
      ["Expo", expo],
    ]) {
      const previous = entrypoint.getLogger();
      assert.equal(previous, entrypoint.consoleLogger);
      const sink = makeSink();
      entrypoint.setLogger(sink.logger);
      assert.equal(
        entrypoint.getLogger(),
        sink.logger,
        `${label}: the fallback must retain its sink`
      );
      if (entrypoint.chunkAndEmbedAllMessages)
        await assertGuard(entrypoint, `${label} fallback`, sink);
      entrypoint.setLogger(previous);
      assert.equal(
        entrypoint.getLogger(),
        previous,
        `${label}: the fallback must restore the previous logger`
      );
    }
    assert.equal(
      Object.hasOwn(globalThis, stateKey),
      false,
      "The restricted global must retain no logger slot."
    );
    assert.equal(consoleWarnings.length, 3, "Each entrypoint must warn once about the fallback.");
    for (const [message] of consoleWarnings) {
      assert.match(message, /rejects new properties/);
    }
    assert.equal(await react.chunkAndEmbedAllMessages(context, {}), 0);
    assert.deepEqual(consoleErrors, [expectedError]);
    expo.setLogger(expo.noopLogger);
    assert.equal(expo.getLogger(), expo.noopLogger);
    assert.equal(await expo.chunkAndEmbedAllMessages(context, {}), 0);
    assert.deepEqual(consoleErrors, [expectedError]);
    console.log(`${format}: ${restriction} keeps the entrypoint-local logger functional.`);
  } else {
    assert.equal(root.getLogger(), root.consoleLogger);

    const rootSink = makeSink();
    root.setLogger(rootSink.logger);
    const react = await load("@anuma/sdk/react");
    await assertGuard(react, "root to React after import", rootSink);
    assert.equal(react.getLogger(), rootSink.logger);

    const expo = await load("@anuma/sdk/expo");
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
    console.log(`${format}: the root, React, and Expo package exports share the logger.`);
  }
} finally {
  root?.setLogger(root.consoleLogger);
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  if (!restriction) globalThis.fetch = originalFetch;
}
