import { defineConfig } from "@hey-api/openapi-ts";
import SPEC from "@reverbia/portal/swagger.json";

// Support both local file and URL-based swagger specs
// Usage: OPENAPI_URL=http://localhost:8080/api/v1/docs/swagger.json npm run generate
const input = process.env.OPENAPI_URL || SPEC;

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
