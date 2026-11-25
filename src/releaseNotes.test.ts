import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, it } from "vitest";

it("documents how to handle public SSE cancellation in the v11.4.6 release notes", () => {
  const notes = readFileSync(join(__dirname, "../RELEASE_NOTES.md"), "utf8");
  const version = notes.split(/^## /m).find((section) => section.startsWith("v11.4.6\n"));
  const integration = version
    ?.split(/^### /m)
    .find((section) => section.startsWith("Integration\n"));

  expect(integration).toContain("`@anuma/sdk/client`");
  expect(integration).toMatch(/throws\s+`AbortError`[\s\S]*calls\s+`onSseError`/);
  expect(integration).toMatch(/ignore `AbortError` in\s+`onSseError` for user cancellations/i);
});
