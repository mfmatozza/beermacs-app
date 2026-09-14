// The platform admin's session — thin re-export of the cookie primitives
// (lib/admin-cookie.ts, split out to avoid a circular import with
// lib/session.ts) plus the API route guard, which DOES need HttpError from
// session.ts.

import { isAdminSession } from "./admin-cookie";
import { HttpError } from "./session";

export {
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  ADMIN_COOKIE_NAME,
  createAdminSessionCookieValue,
  isAdminSession,
} from "./admin-cookie";

/** Guard for /api/admin/* route handlers — mirrors requireViewer()'s shape
 *  so these routes read the same as every other guarded route in this app. */
export async function requireAdminApi(): Promise<void> {
  if (!(await isAdminSession())) throw new HttpError(401, "not_admin");
}
