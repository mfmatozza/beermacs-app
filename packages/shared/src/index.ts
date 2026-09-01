// @beermacs/shared — the tournament rules, and the contract between the app
// and the database.
//
// Everything here is pure TypeScript with no React and no database import, for
// one reason: these rules have to run in two places and agree in both. The
// mobile app renders them; the route handlers in apps/web enforce them. The
// tests exercise the same code.
//
// That matters more here than it would with a client-accessible database. The
// phone holds no database credentials, so there are no row-level policies to
// fall back on — the API layer IS the security boundary. A rule that lives only
// in a screen is decoration: a losing captain just calls the endpoint.
//
// Keep these barrels as the only public surface.

export * from "./result";
export * from "./domain";
export * from "./bracket";
export * from "./approval";
export * from "./dispatcher";
export * from "./join-code";
export * from "./geo";
export * from "./schemas";
