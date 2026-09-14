// Shared shapes + fallback copy for the three SiteContent keys the landing
// page reads and /admin/content writes. Defaults live here once so the
// admin form's placeholders and the page's actual fallback (when no row
// exists yet) can never drift apart.

export interface HeroContent {
  eyebrow: string;
  headline: string;
  headlineEm: string;
  body: string;
}

export interface StepsContent {
  title: string;
  steps: { title: string; body: string }[];
}

export interface FinalCtaContent {
  eyebrow: string;
  headline: string;
}

export const DEFAULT_HERO: HeroContent = {
  eyebrow: "PLAY. SCORE. REPEAT.",
  headline: "Your tournament.",
  headlineEm: "Your team.",
  body: "Join the bracket, find your table and settle the score — without leaving the party.",
};

export const DEFAULT_STEPS: StepsContent = {
  title: "Three taps to the table.",
  steps: [
    { title: "Join", body: "Scan the table code, form your team, and you're on the bracket." },
    {
      title: "Play",
      body: "Get the push the second a table opens. No waiting around, no shouting over the bar.",
    },
    { title: "Win", body: "Report the score, your opponent confirms, the bracket updates itself." },
  ],
};

export const DEFAULT_FINAL_CTA: FinalCtaContent = {
  eyebrow: "READY FOR YOUR NEXT NIGHT?",
  headline: "Bring the bracket to the table.",
};
