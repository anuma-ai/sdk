import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CLIENT_COMPAT_REEXPORT = `
// Backwards-compat shims — see ../clientCompat.ts. These named re-exports
// override the generated LlmapiChatCompletionResponse / LlmapiResponseResponse
// (and supply aliases that are not present in types.gen) for the public client
// entry.
export type {
  LlmapiChatCompletionResponse,
  LlmapiChatCompletionTool,
  LlmapiChatCompletionToolChoice,
  LlmapiChatCompletionUsage,
  LlmapiChoice,
  LlmapiResponseResponse,
} from '../clientCompat';
`;

const OVERRIDDEN_GENERATED_TYPES = new Set([
  "LlmapiChatCompletionResponse",
  "LlmapiResponseResponse",
]);

const CLIENT_COMPAT_MARKER = "from '../clientCompat'";

function patchClientIndex(absolute) {
  const original = readFileSync(absolute, "utf-8");

  if (original.includes(CLIENT_COMPAT_MARKER)) {
    return false;
  }

  let next = original;

  const namedTypesExport = /export type \{([\s\S]*?)\} from '\.\/types\.gen';/;
  if (namedTypesExport.test(next)) {
    next = next.replace(namedTypesExport, (_full, names) => {
      const filtered = names
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name && !OVERRIDDEN_GENERATED_TYPES.has(name))
        .join(", ");
      return `export type { ${filtered} } from './types.gen';`;
    });
  } else if (
    !next.includes("export type * from './types.gen';") &&
    !next.includes('export type * from "./types.gen";')
  ) {
    console.error(
      "patch-generated-client: could not locate types.gen re-export in src/client/index.ts. " +
        "The upstream template may have changed; review and update scripts/patch-generated-client.mjs."
    );
    return "failed";
  }

  if (!next.endsWith("\n")) {
    next += "\n";
  }
  next += CLIENT_COMPAT_REEXPORT;

  writeFileSync(absolute, next);
  return true;
}

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
  const request: Client['request'] = async (options) => {`,
    replace: `  // \`Client['request']\` is a generic \`RequestFn\`; the runtime implementation
  // cannot be written as a generic arrow, so we assign to a non-generic
  // signature and cast at the single point of return (\`as Client\`) instead of
  // papering over the mismatch with \`@ts-expect-error\` on every line.
  const request = async (options: RequestOptions) => {`,
  },
];

let failed = false;

const indexResult = patchClientIndex(path.join(PROJECT_ROOT, "src/client/index.ts"));
if (indexResult === "failed") {
  failed = true;
} else if (indexResult) {
  console.log("patch-generated-client: patched src/client/index.ts");
}

for (const patch of patches) {
  const absolute = path.join(PROJECT_ROOT, patch.file);
  const original = readFileSync(absolute, "utf-8");

  if (original.includes(patch.replace)) {
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

  const patched = original.replaceAll(patch.find, patch.replace);
  writeFileSync(absolute, patched);
  console.log(`patch-generated-client: patched ${patch.file}`);
}

if (failed) {
  process.exit(1);
}
