import beermacs from "@beermacs/config/eslint";

export default [
  ...beermacs,
  {
    // Route handlers under app/api are server-only; nothing there should import
    // client React. Keep this file as the place to enforce that boundary as the
    // API grows. See docs/ARCHITECTURE.md.
  },
];
