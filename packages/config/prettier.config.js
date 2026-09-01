// Shared Prettier config for the Beermacs monorepo.
// Consume from a package's own prettier.config.js:
//
//   export { default } from "@beermacs/config/prettier";
//
/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  printWidth: 100,
  tabWidth: 2,
};
