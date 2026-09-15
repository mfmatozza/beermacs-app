import { PageFooter } from "../_ui/page-footer";
import { PageHeader } from "../_ui/page-header";

export const metadata = { title: "Terms · Beermacs" };

export default function TermsPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-beer-100">Terms</h1>
        <div className="mt-6 space-y-4 text-beer-100/70">
          <h2 className="pt-2 text-lg font-semibold text-beer-100">Using Beermacs</h2>
          <p className="leading-relaxed">
            Beermacs helps players and venues organize social beer pong tournaments. Follow venue
            rules, play responsibly, and only participate if you meet the legal drinking age where
            the event takes place.
          </p>
          <h2 className="pt-2 text-lg font-semibold text-beer-100">Fair play</h2>
          <p className="leading-relaxed">
            Do not manipulate results, impersonate another player, harass others, or interfere with
            a tournament. Venue staff may remove participants or correct results when needed.
          </p>
          <h2 className="pt-2 text-lg font-semibold text-beer-100">Questions</h2>
          <p className="leading-relaxed">
            Contact{" "}
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
