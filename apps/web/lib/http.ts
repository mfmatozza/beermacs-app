import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "./session";

/**
 * Parse a request body against a Zod schema from @beermacs/shared.
 *
 * Every endpoint validates with the same schema the app used to build the
 * payload, so a client that skips validation still cannot get past the server.
 */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  try {
    return schema.parse(raw);
  } catch (e) {
    if (e instanceof ZodError) {
      throw new HttpError(422, "invalid_body", JSON.stringify(e.issues));
    }
    throw e;
  }
}

/**
 * One place that turns a thrown error into a response, so handlers can use
 * `requireVenueRole(...)` as a guard instead of threading result types.
 *
 * Unexpected errors are logged and answered with a bare 500 — never the
 * message, which on a database error can contain a connection string.
 */
export function handleError(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.code, detail: e.message }, { status: e.status });
  }
  console.error("[api] unhandled", e);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
