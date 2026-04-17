import eslint from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".claude/**",
      "dist/**",
      "src/client/**",
      "docs/**",
      "coverage/**",
      "scripts/**",
      "patches/**",
      "test/**",
      // Most test files are excluded from linting, but a few are fully migrated
      // to typed mock factories (see src/test-utils/mocks.ts) and are lint-gated
      // below to catch regressions to `as any`.
      "**/*.test.ts",
      "**/*.test.tsx",
      "!src/react/useChat.test.tsx",
      "!src/react/useChat.toolLoop.test.tsx",
      "**/*.security.test.ts",
      "*.config.*",
      ".prettierrc.mjs",
      ".dependency-cruiser.cjs",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "src/react/useChat.test.tsx",
            "src/react/useChat.toolLoop.test.tsx",
          ],
        },
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
  // Enforce strict typing for test files that have been migrated off `as any`.
  // Keeping the scope narrow lets us ratchet the project one file at a time.
  // Placed last so this rule wins over the project-wide `warn` default.
  {
    files: ["src/react/useChat.test.tsx", "src/react/useChat.toolLoop.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  }
);
