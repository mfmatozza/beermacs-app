// @beermacs/shared — the tournament rules, and the contract between the app
// and the database.
//
// Everything here is pure TypeScript with no React and no Supabase import, for
// one reason: these rules have to run in three places and agree in all of them.
// The app renders them, the Postgres edge functions enforce them, and the tests
// exercise them. A rule that lives only in a screen is decoration — a losing
// captain just calls the endpoint directly.
//
// Keep these barrels as the only public surface.

export * from "./result";
export * from "./domain";
export * from "./bracket";
export * from "./approval";
export * from "./dispatcher";
export * from "./join-code";
export * from "./schemas";
