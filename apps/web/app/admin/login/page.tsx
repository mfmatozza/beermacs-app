"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../_ui/button";
import { Field, Input } from "../_ui/field";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="mb-1 font-display text-xl uppercase tracking-wide text-beer-600">Beermacs admin</p>
        <p className="mb-6 text-sm text-gray-500">
          {step === "password" ? "Sign in to the platform console." : "Enter the code sent to your email."}
        </p>

        {step === "password" ? (
          <form onSubmit={submitPassword} className="flex flex-col gap-3.5">
            <Field label="Username">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Password">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={busy || !username || !password} block className="mt-1">
              {busy ? "Checking…" : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitOtp} className="flex flex-col gap-3.5">
            <Field label="6-digit code">
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-lg tracking-[0.4em]"
              />
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={busy || otp.length !== 6} block className="mt-1">
              {busy ? "Verifying…" : "Sign in"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
