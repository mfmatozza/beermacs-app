import { Card } from "./_ui/card";
import { PageFooter } from "./_ui/page-footer";
import { PageHeader } from "./_ui/page-header";

/**
 * The landing page. Written for a bar owner, not for a beer pong player — the
 * buyer is the person paying for it, and what they buy is not having to run the
 * night themselves.
 */
export default function HomePage() {
  return (
    <>
      <PageHeader />

      <main className="mx-auto max-w-5xl px-6">
        {/* ── hero ─────────────────────────────────────────────────────── */}
        <section className="py-20 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-beer-700">
            Beer pong nights, run properly
          </p>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-stout-900 sm:text-5xl">
            Stop shouting across the room.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stout-700/85">
            Beermacs runs the bracket, hands out the tables and settles the results — on the phones
            already in your customers&rsquo; hands. Your staff pour drinks instead of refereeing.
          </p>
          <p className="mt-8 text-sm text-stout-700/70">In development. Piloting in Milano.</p>
        </section>

        {/* ── what it does ─────────────────────────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <h2 className="text-base font-semibold text-stout-900">Tables call themselves</h2>
            <p className="mt-2 text-sm leading-relaxed text-stout-700/85">
              Three tables and sixteen matches is a queue, not a whiteboard. The moment a table
              frees up, the next two teams get a notification telling them which one to walk to.
            </p>
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-stout-900">Both teams sign off</h2>
            <p className="mt-2 text-sm leading-relaxed text-stout-700/85">
              One captain reports the score, the other confirms it. Nobody can confirm their own
              win. When the two disagree, it goes to whoever is behind the bar — not to an argument.
            </p>
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-stout-900">The bracket on your screen</h2>
            <p className="mt-2 text-sm leading-relaxed text-stout-700/85">
              Put the live bracket on the TV you already have. Everyone can see who is up next, so
              nobody has to ask.
            </p>
          </Card>
        </section>

        {/* ── the honest bit ───────────────────────────────────────────── */}
        <section className="py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-stout-900">
            Built from running the nights
          </h2>
          <div className="mt-4 max-w-2xl space-y-4 text-stout-700/85">
            <p className="leading-relaxed">
              Beermacs started as a web page for one bar&rsquo;s tournament. It worked, until a
              semifinal pairing needed fixing at 11pm and the only way to do it was a developer
              writing SQL against the live database. Four times in one night.
            </p>
            <p className="leading-relaxed">
              That is the whole design brief. Anything a manager needs to change mid-tournament —
              swap two teams, drop a no-show, override a disputed result — takes ten seconds on a
              phone, and leaves a record of who changed it.
            </p>
          </div>
        </section>
      </main>

      <PageFooter />
    </>
  );
}
