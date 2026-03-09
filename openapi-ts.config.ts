import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import { defineConfig } from "@hey-api/openapi-ts";

const require = createRequire(import.meta.url);

function resolvePortalSpec(): string {
  const localSpec = path.join(process.cwd(), "openapi", "portal.swagger.json");

  if (existsSync(localSpec)) {
    return localSpec;
  }

  const packageJsonPath = require.resolve("@anuma/portal/package.json");
  const packageDir = path.dirname(packageJsonPath);
  const packagedSpec = path.join(packageDir, "swagger.json");

  if (existsSync(packagedSpec)) {
    return packagedSpec;
  }

  const repoSpec = path.join(packageDir, "docs", "swagger.json");

  if (existsSync(repoSpec)) {
    return repoSpec;
  }

  throw new Error(
    "Unable to find @anuma/portal swagger spec. Expected swagger.json or docs/swagger.json beside @anuma/portal/package.json."
  );
}

// Support both local file and URL-based swagger specs
// Usage: OPENAPI_URL=http://localhost:8080/api/v1/docs/swagger.json npm run generate
const input = process.env.OPENAPI_URL || resolvePortalSpec();

export default defineConfig({
  input,
  output: "src/client",
  plugins: [
    {
      name: "@hey-api/client-next",
      runtimeConfigPath: "../clientConfig",
    },
  ],
});
