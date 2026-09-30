"use client"; // Error boundaries must be Client Components

import { Button } from "../_ui/button";
import { Card } from "../_ui/card";

/** One boundary for every admin page: a DB hiccup shows this inside the
 *  shell (nav still works) instead of Next's bare error screen. */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Card className="max-w-md">
      <h2 className="text-lg font-semibold text-gray-900">This page didn't load</h2>
      <p className="mt-1 text-sm text-gray-500">
        Usually a brief connection problem with the database. Try again; if it keeps happening, check the Vercel
        logs{error.digest ? ` for error ${error.digest}` : ""}.
      </p>
      <Button className="mt-4" onClick={() => retry()}>
        Try again
      </Button>
    </Card>
  );
}
