import { AppStoreButton } from "./app-store-button";
import type { HeroContent } from "./content-defaults";
import { DotGrid, SpiralMark, SplatterStar, Squiggle } from "./graffiti-marks";
import { PhoneMockup } from "./phone-mockup";
import { Wordmark } from "./wordmark";
import styles from "./landing.module.css";

export function Hero({ content }: { content: HeroContent }) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroMarks} aria-hidden="true">
        <Squiggle className={styles.markSquiggle} />
        <SplatterStar className={styles.markStarLeft} />
        <SplatterStar className={styles.markStarRight} />
        <SpiralMark className={styles.markSpiral} />
        <DotGrid className={styles.markDotsLeft} />
        <DotGrid className={styles.markDotsRight} />
      </div>
      <nav className={styles.nav} aria-label="Main navigation">
        <a href="#top" className={styles.navBrand} aria-label="Beermacs home">
          <Wordmark compact />
        </a>
        <span className={styles.navRule} />
        <span className={styles.navTag}>THE NIGHT IS YOURS</span>
      </nav>
      <div className={styles.heroGrid} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span /> {content.eyebrow}
          </p>
          <h1>
            <Wordmark />
          </h1>
          <p className={styles.heroLine}>
            {content.headline} <em>{content.headlineEm}</em>
            <br />
            Every shot, live.
          </p>
          <p className={styles.heroBody}>{content.body}</p>
          <div className={styles.heroActions}>
            <AppStoreButton />
            <span>Made for match night</span>
          </div>
        </div>
        <PhoneMockup />
      </div>
    </header>
  );
}
