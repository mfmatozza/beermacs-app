import { AppStoreButton } from "./app-store-button";
import { PhoneMockup } from "./phone-mockup";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";
import styles from "./landing.module.css";

export function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.ambient} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <nav className={styles.nav} aria-label="Main navigation">
        <a href="#top" className={styles.navBrand} aria-label="Beermacs home">
          <Wordmark compact />
        </a>
        <span className={styles.navRule} />
        <span className={styles.navTag}>THE NIGHT IS YOURS</span>
        <ThemeToggle />
      </nav>
      <div className={styles.heroGrid} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span /> PLAY. SCORE. REPEAT.
          </p>
          <h1>
            <Wordmark />
          </h1>
          <p className={styles.heroLine}>
            Your tournament. <em>Your team.</em>
            <br />
            Every shot, live.
          </p>
          <p className={styles.heroBody}>
            Join the bracket, find your table and settle the score — without leaving the party.
          </p>
          <div className={styles.heroActions}>
            <AppStoreButton />
            <span>Made for match night</span>
          </div>
        </div>
        <PhoneMockup />
      </div>
      <div className={styles.scrollCue} aria-hidden="true">
        <span>SCROLL TO TAKE THE SHOT</span>
        <i />
      </div>
    </header>
  );
}
