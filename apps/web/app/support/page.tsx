import { PageFooter } from "../_ui/page-footer";
import { PageHeader } from "../_ui/page-header";

export const metadata = { title: "Support · Beermacs" };

/**
 * App Store guideline 1.5 requires a reachable support URL, and guideline 1.2
 * requires a published way to contact us about user-generated content once chat
 * ships. This page is that URL.
 */
export default function SupportPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-stout-900">Support</h1>
        <div className="mt-6 space-y-4 text-stout-700/85">
          <p className="leading-relaxed">
            Something wrong during a tournament? Email{" "}
            <a
              className="text-beer-700 underline underline-offset-2"
              href="mailto:support@beermacs.com"
            >
              support@beermacs.com
            </a>{" "}
            and tell us the venue and roughly what time it happened — that is usually enough for us
            to find the tournament.
          </p>
          <p className="leading-relaxed">
            To report a message or a player in the app, use the report control on the message
            itself. Venue staff can mute or remove anyone from their own tournament immediately.
          </p>
          <p className="leading-relaxed">
            To delete your account and everything attached to it, email the same address.
          </p>
        </div>
      </main>
      <PageFooter />
    </>
  );
}
