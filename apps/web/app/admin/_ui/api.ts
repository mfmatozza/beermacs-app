// The one fetch wrapper for admin client components. A 401 means the 8h
// admin cookie expired — send the browser to login instead of showing
// "couldn't save". Error codes from lib/http.ts become readable text.

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("not_admin");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `http_${res.status}`);
  }
  return res.json().catch(() => ({}));
}

const MESSAGES: Record<string, string> = {
  match_changed: "Someone else just changed this match. Reload and check it.",
  winner_already_in_next_match:
    "The old winner has already been drawn into a next-round match. Settle or delete that match first.",
  tournament_ended: "This tournament has ended. Reopen it first.",
  table_not_open: "That table is no longer free.",
  already_on_a_team: "That player is already on another team in this tournament.",
  cannot_target_admin: "That is the admin account itself.",
  format_locked_after_first_match: "The format can't change once a match exists.",
  invalid_body: "Some fields aren't valid.",
  not_found: "It no longer exists. Reload the page.",
  conflict: "That clashes with something that already exists (a duplicate name?).",
};

export function errorText(e: unknown, fallback: string): string {
  const code = e instanceof Error ? e.message : "";
  return MESSAGES[code] ?? (code ? `${fallback} (${code})` : `${fallback} Check your connection.`);
}
