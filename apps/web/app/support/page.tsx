import { PageFooter } from "../_ui/page-footer";
import { PageHeader } from "../_ui/page-header";
import { SupportForm } from "./support-form";

export const metadata = { title: "Support · Beermacs" };

/**
 * App Store guideline 1.5 requires a reachable support URL, and guideline 1.2
 * requires a published way to contact us about user-generated content once chat
 * ships. This page is that URL.
 *
 * The form below posts to the same /api/support inbox the mobile app's "?"
 * help button writes to (apps/web/app/admin/(dashboard)/support) — one
 * backoffice queue for both entry points, not a mailbox nobody reads.
 */
export default function SupportPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-beer-100">Support</h1>
        <div className="mt-4 space-y-4 text-beer-100/70">
          <p className="leading-relaxed">
            Something wrong, or a question? Send us a message below and we&rsquo;ll reply by email —
            if it&rsquo;s about a specific tournament, mention the venue and roughly what time it
            happened.
          </p>
        </div>

        <SupportForm />

        <div className="mt-10 space-y-4 border-t border-beer-100/15 pt-8 text-sm text-beer-100/70">
          <p className="leading-relaxed">
            To report a message or a player in the app, use the report control on the message itself
            instead — venue staff can mute or remove anyone from their own tournament immediately.
          </p>
          <p className="leading-relaxed">
            To delete your account and everything attached to it, email{" "}
            <a
              className="text-beer-500 underline underline-offset-2"
              href="mailto:support@beermacs.com"
            >
              support@beermacs.com
            </a>
            .
          </p>
        </div>
      </main>
      <PageFooter />
    </>
  );
}
