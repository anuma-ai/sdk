import { defineConfig } from "@hey-api/openapi-ts";
import SPEC from "@reverbia/portal/swagger.json";

export default defineConfig({
  input: SPEC,
  output: "src/client",
  plugins: [
    {
      name: "@hey-api/client-next",
      runtimeConfigPath: "../clientConfig",
    },
  ],
});
