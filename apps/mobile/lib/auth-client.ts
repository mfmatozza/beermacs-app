// Better Auth client for the app.
//
// The session token lives in expo-secure-store (Keychain / Android Keystore),
// not AsyncStorage — it is a bearer credential, and AsyncStorage is plain text
// readable by anything with filesystem access on a rooted device.
//
// Players sign in anonymously (docs/DECISIONS.md D3): the app opens, gets a real
// session, and nobody sees a sign-up form. Staff sign in with email + password.

import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "beermacs",
      storagePrefix: "beermacs",
      storage: SecureStore,
    }),
    anonymousClient(),
  ],
});

/**
 * Make sure this device has a session, creating an anonymous one if not.
 *
 * Idempotent and safe to call on every boot: an existing session short-circuits.
 * Returns false when the API is unreachable, so the caller can carry on in a
 * degraded state rather than blocking the whole app on a bar's wifi.
 */
export async function ensureSession(): Promise<boolean> {
  try {
    const existing = await authClient.getSession();
    if (existing.data?.session) return true;
    const created = await authClient.signIn.anonymous();
    return !created.error;
  } catch {
    return false;
  }
}
