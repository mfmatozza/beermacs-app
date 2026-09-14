import { prisma } from "@beermacs/db";
import type { Metadata } from "next";
import {
  DEFAULT_FINAL_CTA,
  DEFAULT_HERO,
  DEFAULT_STEPS,
  type FinalCtaContent,
  type HeroContent,
  type StepsContent,
} from "./_landing/content-defaults";
import { DownloadCta } from "./_landing/download-cta";
import { FeaturesGrid } from "./_landing/features-grid";
import { Hero } from "./_landing/hero";
import { HowItWorks } from "./_landing/how-it-works";
import { LandingFooter } from "./_landing/landing-footer";
import styles from "./_landing/landing.module.css";

export const metadata: Metadata = {
  title: "Beermacs — Beer pong. Properly played.",
  description:
    "Create a team, follow the live bracket and settle every score from your phone with Beermacs.",
};

// Editable from /admin/content — falls back to the hardcoded copy above
// when no row exists yet (a fresh environment, or a key nobody's touched).
export const revalidate = 0;

export default async function HomePage() {
  const rows = await prisma.siteContent.findMany({
    where: { key: { in: ["landing.hero", "landing.steps", "landing.finalCta"] } },
  });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const hero = (byKey["landing.hero"] as HeroContent | undefined) ?? DEFAULT_HERO;
  const steps = (byKey["landing.steps"] as StepsContent | undefined) ?? DEFAULT_STEPS;
  const finalCta = (byKey["landing.finalCta"] as FinalCtaContent | undefined) ?? DEFAULT_FINAL_CTA;

  return (
    <div className={styles.siteShell}>
      <Hero content={hero} />
      <HowItWorks content={steps} />
      <FeaturesGrid />
      <DownloadCta content={finalCta} />
      <LandingFooter />
    </div>
  );
}
