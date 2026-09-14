import { PageFooter } from "../_ui/page-footer";
import { PageHeader } from "../_ui/page-header";

export const metadata = { title: "Terms · Beermacs" };

export default function TermsPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-stout-900">Terms</h1>
        <p className="mt-4 rounded-xl border border-beer-200 bg-beer-100/50 px-4 py-3 text-sm text-stout-700">
          Draft. To be reviewed before the app is submitted to the App Store.
        </p>
        <div className="mt-6 space-y-4 text-stout-700/85">
          <h2 className="pt-2 text-lg font-semibold text-stout-900">Using Beermacs</h2>
          <p className="leading-relaxed">
            Beermacs helps players and venues organize social beer pong tournaments. Follow venue
            rules, play responsibly, and only participate if you meet the legal drinking age where
            the event takes place.
          </p>
          <h2 className="pt-2 text-lg font-semibold text-stout-900">Fair play</h2>
          <p className="leading-relaxed">
            Do not manipulate results, impersonate another player, harass others, or interfere with
            a tournament. Venue staff may remove participants or correct results when needed.
          </p>
          <h2 className="pt-2 text-lg font-semibold text-stout-900">Questions</h2>
          <p className="leading-relaxed">
            Contact{" "}
            <a
              className="text-beer-700 underline underline-offset-2"
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
