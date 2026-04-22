import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// The generated OpenAPI client ships with two hard-coded type-safety escapes
// that defeat compile-time checking on the streaming hot path:
//
//   - src/client/core/serverSentEvents.gen.ts   — `yield data as any`
//   - src/client/client/client.gen.ts           — `@ts-expect-error` on request
//
// These live inside `@hey-api/openapi-ts`'s upstream templates, so patching the
// `.gen.ts` files by hand is not durable: `pnpm run spec` will overwrite them.
// This script runs after generation and rewrites those specific lines with
// typed equivalents that surface shape drift at the call site instead of
// silently erasing it.
//
// Keep this script narrowly scoped: every patch is a literal string match and
// fails loudly if the upstream template changes shape, so a future update to
// `@hey-api/openapi-ts` cannot silently reintroduce the escape.

// `fileURLToPath` handles the Windows edge case where `new URL(...).pathname`
// returns `/C:/...` with a leading slash, which would break path.resolve.
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const patches = [
  {
    file: "src/client/core/serverSentEvents.gen.ts",
    find: `              if (dataLines.length) {
                yield data as any;
              }`,
    replace: `              if (dataLines.length) {
                // The SSE generator yields the parsed event payload. The actual
                // shape is dictated by the caller via TData; we assert the
                // declared yield type here instead of using \`any\` so that shape
                // drift surfaces at the call site rather than vanishing.
                yield data as TData extends Record<string, unknown>
                  ? TData[keyof TData]
                  : TData;
              }`,
  },
  {
    file: "src/client/client/client.gen.ts",
    find: `  // @ts-expect-error
  const request: Client['request'] = async (options) => {
    // @ts-expect-error
    const { opts, url } = await beforeRequest(options);`,
    replace: `  // \`Client['request']\` is a generic \`RequestFn\`; the runtime implementation
  // cannot be written as a generic arrow, so we assign to a non-generic
  // signature and cast at the single point of return (\`as Client\`) instead of
  // papering over the mismatch with \`@ts-expect-error\` on every line.
  const request = async (options: RequestOptions) => {
    const { opts, url } = await beforeRequest(options);`,
  },
];

let failed = false;

for (const patch of patches) {
  const absolute = path.join(PROJECT_ROOT, patch.file);
  const original = readFileSync(absolute, "utf-8");

  if (original.includes(patch.replace)) {
    // Already patched — idempotent no-op.
    continue;
  }

  if (!original.includes(patch.find)) {
    console.error(
      `patch-generated-client: could not locate expected snippet in ${patch.file}. ` +
        `The upstream template may have changed; review and update scripts/patch-generated-client.mjs.`
    );
    failed = true;
    continue;
  }

  // Use replaceAll so a future upstream template with the same snippet
  // repeated would be fully patched instead of silently leaving the second
  // occurrence in place.
  const patched = original.replaceAll(patch.find, patch.replace);
  writeFileSync(absolute, patched);
  console.log(`patch-generated-client: patched ${patch.file}`);
}

if (failed) {
  process.exit(1);
}
