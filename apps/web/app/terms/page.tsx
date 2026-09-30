import { PageFooter } from "../_ui/page-footer";
import { PageHeader } from "../_ui/page-header";

export const metadata = { title: "Terms · Beermacs" };

/** Guideline 1.2: users must agree to terms that make clear there is no
 *  tolerance for objectionable content or abusive users. The app links here
 *  from the Create account button. */
export default function TermsPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-beer-100">Terms of use</h1>
        <div className="mt-6 space-y-4 text-beer-100/70">
          <h2 className="pt-2 text-lg font-semibold text-beer-100">Using Beermacs</h2>
          <p className="leading-relaxed">
            Beermacs helps venues run social beer pong tournaments and helps players join them. Follow venue
            rules and only take part if you meet the legal drinking age where the event takes place.
            Beermacs has no entry fees, prizes or wagering.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-beer-100">Zero tolerance for abuse</h2>
          <p className="leading-relaxed">
            There is no tolerance for objectionable content or abusive users. Don&rsquo;t post anything
            hateful, harassing, sexual, threatening or illegal, and don&rsquo;t impersonate anyone. You can
            report any chat message or block any player from inside the chat. Venue staff can remove
            messages and mute players, and we review reports within 24 hours. Accounts that break these rules
            are removed.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-beer-100">Fair play</h2>
          <p className="leading-relaxed">
            Don&rsquo;t manipulate results or interfere with a tournament. Venue staff may remove
            participants or correct results when needed.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-beer-100">Questions</h2>
          <p className="leading-relaxed">
            Contact{" "}
            <a className="text-beer-500 underline underline-offset-2" href="mailto:support@beermacs.com">
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
