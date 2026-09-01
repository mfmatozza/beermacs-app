import beermacs from "@beermacs/config/eslint";

export default [
  ...beermacs,
  {
    // Expo/React Native globals & JSX are handled by the base config.
    // Add RN-specific overrides here as the app grows.
  },
  {
    // Build-time tooling, loaded by Node rather than bundled into the app.
    // Expo config plugins in particular MUST be CommonJS — prebuild requires
    // them directly — so `require()` is correct there, not a lapse.
    files: ["metro.config.js", "tailwind.config.js", "plugins/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
