"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The platform admin's own sign-in — nothing to do with player/venue
 * accounts (lib/admin-auth.ts). Two steps: password, then an emailed OTP
 * (skipped locally unless ADMIN_2FA_ENABLED=true — see admin2faEnabled()).
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "otp">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { needsOtp?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error === "invalid_credentials" ? "Wrong username or password." : "Couldn't sign in.");
        return;
      }
      if (data.needsOtp) {
        setStep("otp");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      if (!res.ok) {
        setError("That code is wrong or expired.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stout-900 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-stout-800 p-8">
        <h1 className="mb-1 font-display text-2xl uppercase tracking-wide text-beer-500">
          Beermacs admin
        </h1>
        <p className="mb-6 text-sm text-beer-100/60">
          {step === "password" ? "Sign in to the platform console." : "Enter the code sent to your email."}
        </p>

        {step === "password" ? (
          <form onSubmit={submitPassword} className="flex flex-col gap-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="rounded-lg border border-white/15 bg-stout-900 px-3 py-2.5 text-sm text-beer-100 outline-none focus:border-beer-500"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className="rounded-lg border border-white/15 bg-stout-900 px-3 py-2.5 text-sm text-beer-100 outline-none focus:border-beer-500"
            />
            {error ? <p className="text-sm text-dispute">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || !username || !password}
              className="mt-2 rounded-lg bg-beer-500 py-2.5 text-sm font-semibold uppercase tracking-wide text-stout-900 disabled:opacity-40"
            >
              {busy ? "Checking…" : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitOtp} className="flex flex-col gap-3">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="rounded-lg border border-white/15 bg-stout-900 px-3 py-2.5 text-center text-lg tracking-[0.4em] text-beer-100 outline-none focus:border-beer-500"
            />
            {error ? <p className="text-sm text-dispute">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="mt-2 rounded-lg bg-beer-500 py-2.5 text-sm font-semibold uppercase tracking-wide text-stout-900 disabled:opacity-40"
            >
              {busy ? "Verifying…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
