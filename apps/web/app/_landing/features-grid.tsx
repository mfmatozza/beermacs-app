import { SplatterStar, Squiggle } from "./graffiti-marks";
import styles from "./landing.module.css";

const FEATURES = [
  {
    title: "Live bracket",
    body: "Every match, every table, updated the second something happens — no refreshing, no asking staff.",
    accent: styles.featGreen,
  },
  {
    title: "Instant call-up",
    body: "A push the moment your table's free. Stay at the bar, not hovering by the board.",
    accent: styles.featYellow,
  },
  {
    title: "Fair calls",
    body: "Both teams report the score. They have to agree — staff settle it when they don't.",
    accent: styles.featOrange,
  },
  {
    title: "Team chat",
    body: "Trash talk your opponent, coordinate your team, right where the bracket already is.",
    accent: styles.featGreen,
  },
] as const;

/** Fills the gap between the hero's three steps and the final CTA with what
 *  the app actually does, rather than leaving that space empty. */
export function FeaturesGrid() {
  return (
    <section className={styles.featuresGrid} aria-labelledby="features-title">
      <Squiggle className={styles.featSquiggle} />
      <SplatterStar className={styles.featStar} />
      <p className={styles.eyebrow}>
        <span /> WHY BEERMACS
      </p>
      <h2 id="features-title" className={styles.featTitle}>
        Built for match night,
        <br />
        not a spreadsheet.
      </h2>
      <div className={styles.featGrid}>
        {FEATURES.map((f) => (
          <div key={f.title} className={`${styles.featCard} ${f.accent}`}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
