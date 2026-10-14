import eslint from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

const appGenerationTests = [
  "src/tools/appBuilderPrompt.test.ts",
  "src/tools/appGeneration.test.ts",
];

const memoryTelemetryTests = [
  "src/lib/memory/decayWorker.test.ts",
  "src/lib/memory/recallTool.telemetry.test.ts",
  "src/lib/memory/topicExtract.telemetry.test.ts",
  "src/lib/memoryEngine/generate.taskType.test.ts",
  "src/lib/memoryVault/searchTool.telemetry.test.ts",
  "src/lib/memoryVault/searchToolExecutor.store.test.ts",
];

const checkedTestFiles = [
  "src/lib/chatStore/remote.test.ts",
  "src/lib/memory/store/remoteMigration.test.ts",
  ...appGenerationTests,
  ...memoryTelemetryTests,
  "src/expo/useChatStorage.sendHistoryRead.test.tsx",
  "src/lib/memory/reliability.integration.test.ts",
  "src/lib/memory/retain.test.ts",
  "src/lib/backup/icloud/backup.test.ts",
  "src/lib/chat/toolLoop.detach.test.ts",
  "src/lib/chat/toolLoop.idleTimeout.test.ts",
  "src/lib/db/chat/operations.chunkText.test.ts",
  "src/lib/db/chat/operations.embeddingEncryption.test.ts",
  "src/lib/db/chat/operations.eventIdIndex.test.ts",
  "src/lib/db/memoryVault/operations.sweeps.test.ts",
  "src/lib/db/memoryVault/operations.test.ts",
  "src/lib/memory/portalLlm.test.ts",
  "src/lib/memoryVault/searchTool.concurrent.test.ts",
  "src/lib/memoryVault/searchTool.test.ts",
  "src/lib/memory/decay.test.ts",
  "src/lib/processors/preprocessor.remoteUrls.test.ts",
  "src/react/useChatStorage.fileSize.test.tsx",
  "src/react/useChatStorage.queueIdentifiers.test.tsx",
  "src/react/useChatStorage.runHooks.test.tsx",
  "src/react/useChatStorage.sendHistoryRead.test.tsx",
  "src/react/useEncryption.import.test.ts",
  "src/react/useEncryption.refresh.test.ts",
  "src/react/useTools.test.tsx",
  "src/server/pg-adapter.inequality.test.ts",
  "src/server/pg-adapter.integration.test.ts",
  "src/server/pg-adapter.test.ts",
];

export default tseslint.config(
  {
    ignores: [
      ".claude/**",
      "dist/**",
      "src/client/**",
      "docs/**",
      "coverage/**",
      "scripts/**/*",
      "patches/**",
      "packages/**",
      "test/**/*",
      "!test/tools/",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.security.test.ts",
      "*.config.*",
      ".prettierrc.mjs",
      ".dependency-cruiser.cjs",
      "!eslint.config.mjs",
      "!scripts/excluded-test-suites.mjs",
      "!test/",
      "!test/**/",
      ...checkedTestFiles.map((file) => `!${file}`),
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/only-throw-error": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      "@typescript-eslint/prefer-promise-reject-errors": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "preserve-caught-error": "warn",
      "no-useless-assignment": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: "warn",
    },
  },
  {
    files: checkedTestFiles,
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tsconfig.test.json",
      },
    },
  },
  {
    files: ["eslint.config.mjs", "scripts/excluded-test-suites.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["src/react/**/*.{ts,tsx}"],
    ...react.configs.flat.recommended,
    ...react.configs.flat["jsx-runtime"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["src/lib/db/manager.ts", "src/lib/chat/useChat/utils.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  }
);
