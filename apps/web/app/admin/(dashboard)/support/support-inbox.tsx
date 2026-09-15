"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "../../_ui/badge";
import { Button } from "../../_ui/button";
import { Card } from "../../_ui/card";
import { EmptyState } from "../../_ui/empty-state";
import { MailIcon } from "../../_ui/icons";
import type { SupportMessageData } from "./page";

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

async function resolveToggle(id: string) {
  const res = await fetch(`/api/admin/support/${id}/resolve`, { method: "POST" });
  if (!res.ok) throw new Error("http_" + res.status);
}

export function SupportInbox({ messages }: { messages: readonly SupportMessageData[] }) {
  const router = useRouter();
  const open = messages.filter((m) => !m.resolvedAt);
  const resolved = messages.filter((m) => m.resolvedAt);

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<MailIcon size={28} />}
        title="Nothing yet"
        description="Messages from the web contact form and the mobile app's help button land here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Open{open.length > 0 ? ` (${open.length})` : ""}
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing open — you&rsquo;re caught up.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {open.map((m) => (
              <MessageCard key={m.id} message={m} onChanged={() => router.refresh()} />
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Resolved ({resolved.length})
          </h2>
          <div className="flex flex-col gap-3">
            {resolved.map((m) => (
              <MessageCard key={m.id} message={m} onChanged={() => router.refresh()} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MessageCard({
  message: m,
  onChanged,
}: {
  message: SupportMessageData;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await resolveToggle(m.id);
      onChanged();
    } catch {
      setError("Couldn't update that — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={m.resolvedAt ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{m.name}</span>
            <Badge tone={m.source === "MOBILE" ? "brand" : "neutral"}>
              {m.source === "MOBILE" ? "App" : "Web"}
            </Badge>
            {m.userId ? <span className="text-xs text-gray-400">has an account</span> : null}
          </div>
          <a href={`mailto:${m.email}`} className="text-sm text-beer-700 hover:underline">
            {m.email}
          </a>
          {m.phone ? <span className="ml-2 text-sm text-gray-400">{m.phone}</span> : null}
        </div>
        <span className="shrink-0 whitespace-nowrap text-xs text-gray-400">
          {fmt.format(m.createdAt)}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{m.body}</p>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <div className="mt-4 flex items-center gap-3">
        <Button
          variant={m.resolvedAt ? "secondary" : "primary"}
          onClick={() => void toggle()}
          disabled={busy}
        >
          {busy ? "…" : m.resolvedAt ? "Reopen" : "Mark resolved"}
        </Button>
        <a
          href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Beermacs")}`}
          className="text-sm text-gray-500 hover:text-beer-700 hover:underline"
        >
          Reply by email
        </a>
      </div>
    </Card>
  );
}
