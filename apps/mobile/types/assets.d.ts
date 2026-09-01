// Static asset imports.
//
// Metro resolves `import logo from "./logo.png"` to an asset id at bundle time,
// but TypeScript needs telling these modules exist — `expo/types` covers the
// Expo runtime, not image files. Declaring them lets components use a normal ES
// import instead of `require()`, which keeps `@typescript-eslint/no-require-imports`
// on everywhere except the build tooling that genuinely needs CommonJS.

declare module "*.png" {
  const asset: number;
  export default asset;
}

declare module "*.jpg" {
  const asset: number;
  export default asset;
}

declare module "*.ttf" {
  const asset: number;
  export default asset;
}
