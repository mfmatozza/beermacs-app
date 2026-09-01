// Shared flat ESLint config for the Beermacs monorepo (ESLint 10, flat config).
// Consume from a package's own eslint.config.js:
//
//   import beermacs from "@beermacs/config/eslint";
//   export default [...beermacs];
//
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/node_modules/**",
      "**/*.generated.*",
      "**/src/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  }
);
