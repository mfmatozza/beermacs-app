// Expo push notifications. SERVER-ONLY.
//
// Sends via Expo's push service (no SDK — just their HTTP endpoint).

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Send to an explicit list of Expo push tokens, reporting what actually
 * happened. Does NOT swallow errors — every call site here is a direct
 * consequence of a real event (a table assignment, a message send), not a
 * background broadcast, so the caller is owed the truth rather than a
 * silently-dropped notification.
 */
export async function sendPushToTokens(
  tokens: readonly string[],
  payload: { title: string; body: string; data?: Record<string, unknown> }
): Promise<{ accepted: number; failed: number; errors: string[] }> {
  const valid = tokens.filter(
    (t) => t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken")
  );
  if (valid.length === 0) return { accepted: 0, failed: 0, errors: [] };

  let accepted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const batch of chunk(valid, 100)) {
    const messages = batch.map((to) => ({
      to,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(messages),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { status: string; message?: string }[];
      } | null;
      if (!res.ok || !json?.data) {
        failed += batch.length;
        errors.push(`Expo returned ${res.status}`);
        continue;
      }
      for (const ticket of json.data) {
        if (ticket.status === "ok") accepted += 1;
        else {
          failed += 1;
          // Expo reports per-message problems (most often DeviceNotRegistered,
          // i.e. the app was uninstalled). Keep a couple as a sample rather
          // than one line per dead device.
          if (errors.length < 5 && ticket.message) errors.push(ticket.message);
        }
      }
    } catch (e) {
      failed += batch.length;
      errors.push(e instanceof Error ? e.message : "Could not reach Expo");
    }
  }
  return { accepted, failed, errors };
}
