import type { Metadata } from "next";
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

export default function HomePage() {
  return (
    <div className={styles.siteShell}>
      <Hero />
      <HowItWorks />
      <FeaturesGrid />
      <DownloadCta />
      <LandingFooter />
    </div>
  );
}
