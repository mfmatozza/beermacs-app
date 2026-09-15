"use client";

import { useState } from "react";

/** POSTs straight to /api/support — the same inbox the mobile app's "?"
 *  help button writes to, so there's one backoffice queue, not two. */
export function SupportForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        setError(
          "Couldn't send that — try again in a moment, or email support@beermacs.com directly."
        );
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="mt-6 rounded-xl border border-beer-500/30 bg-beer-500/10 px-4 py-3 text-sm text-beer-100">
        Sent. We&rsquo;ll get back to you at {email}.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-beer-100">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className="rounded-lg border border-beer-100/15 bg-stout-800 px-3.5 py-2.5 text-beer-100 outline-none transition-colors placeholder:text-beer-100/35 focus:border-beer-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-beer-100">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-beer-100/15 bg-stout-800 px-3.5 py-2.5 text-beer-100 outline-none transition-colors placeholder:text-beer-100/35 focus:border-beer-500"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-beer-100">Message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          maxLength={2000}
          placeholder="Tell us the venue and roughly what time it happened, if that's relevant — that's usually enough for us to find the tournament."
          className="rounded-lg border border-beer-100/15 bg-stout-800 px-3.5 py-2.5 text-beer-100 outline-none transition-colors placeholder:text-beer-100/35 focus:border-beer-500"
        />
      </label>
      {error ? <p className="text-sm text-dispute">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !name.trim() || !email.trim() || !body.trim()}
        className="self-start rounded-xl bg-beer-500 px-5 py-2.5 text-sm font-semibold text-stout-900 transition-opacity disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
