// Better Auth mounts its whole surface here: /api/auth/*
//   - POST /api/auth/sign-in/anonymous     (players)
//   - POST /api/auth/sign-in/email         (staff)
//   - POST /api/auth/sign-up/email         (staff, invited)
//   - POST /api/auth/sign-out
//   - GET  /api/auth/get-session
// See apps/web/lib/auth.ts for config.

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
