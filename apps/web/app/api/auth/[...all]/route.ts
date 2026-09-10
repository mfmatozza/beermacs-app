// Better Auth mounts its whole surface here: /api/auth/*
//   - POST /api/auth/sign-in/email
//   - POST /api/auth/sign-up/email
//   - POST /api/auth/sign-out
//   - GET  /api/auth/get-session
//   - POST /api/auth/delete-user
// See apps/web/lib/auth.ts for config. `getAuth()` is called inside the
// handlers (not at module scope) so the instance — and its BETTER_AUTH_SECRET
// check — is built on first request, not during `next build`'s page-data
// collection.

import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

export function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}
