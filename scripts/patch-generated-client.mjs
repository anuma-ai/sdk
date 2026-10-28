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
    file: "src/client/core/bodySerializer.gen.ts",
    find: "JSON.stringify(body, (_key, value) =>",
    replace: "JSON.stringify(body, (_key, value: unknown) =>",
  },
  {
    file: "src/client/core/bodySerializer.gen.ts",
    find: `export const urlSearchParamsBodySerializer = {
  bodySerializer: (body: unknown): string => {`,
    replace: `export const urlSearchParamsBodySerializer = {
  bodySerializer: (body: unknown): string => {
    if (typeof body === 'string') {
      return body;
    }
`,
  },
  {
    file: "src/client/types.gen.ts",
    find: `export type PostOauthConsentData = {
    /**
     * Daily spending cap in USD
     */
    body?: number;`,
    replace: `export type PostOauthConsentData = {
    body?: string;`,
  },
  {
    file: "src/client/sdk.gen.ts",
    find: "import { client } from './client.gen';",
    replace: `import { client } from './client.gen';
import { normalizeHeaders } from '../clientHeaders';`,
  },
  {
    file: "src/client/sdk.gen.ts",
    find: "...options.headers",
    replace: "...normalizeHeaders(options.headers)",
  },
  {
    file: "src/client/sdk.gen.ts",
    find: "...options?.headers",
    replace: "...normalizeHeaders(options?.headers)",
  },
  {
    file: "src/client/client/utils.gen.ts",
    find: "    const iterator = header instanceof Headers ? headersEntries(header) : Object.entries(header);",
    replace: `    const iterator =
      Array.isArray(header) || header instanceof Headers
        ? headersEntries(new Headers(header))
        : Object.entries(header);`,
  },
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

  if (
    original.includes(patch.replace) &&
    (!original.includes(patch.find) || patch.replace.includes(patch.find))
  ) {
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
