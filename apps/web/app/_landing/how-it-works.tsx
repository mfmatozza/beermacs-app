import { DotGrid, SplatterStar, ZigZag } from "./graffiti-marks";
import styles from "./landing.module.css";

const STEPS = [
  {
    n: "01",
    title: "Join",
    body: "Scan the table code, form your team, and you're on the bracket.",
    color: styles.stepGreen,
  },
  {
    n: "02",
    title: "Play",
    body: "Get the push the second a table opens. No waiting around, no shouting over the bar.",
    color: styles.stepYellow,
  },
  {
    n: "03",
    title: "Win",
    body: "Report the score, your opponent confirms, the bracket updates itself.",
    color: styles.stepOrange,
  },
] as const;

/**
 * Replaces the old scroll-driven pong-ball physics section (usePongScroll)
 * — real, hand-tuned custom animation code, but exactly the kind of thing
 * that reads as janky the moment a viewport, a frame drop, or reduced-motion
 * catches it wrong. A poster doesn't need to move to hit; three loud,
 * static steps in the same graffiti language as the hero do the job with
 * nothing left to go wrong.
 */
export function HowItWorks() {
  return (
    <section className={styles.howItWorks} aria-labelledby="how-title">
      <SplatterStar className={styles.howStar} />
      <DotGrid className={styles.howDots} />
      <p className={styles.eyebrow}>
        <span /> HOW IT WORKS
      </p>
      <h2 id="how-title" className={styles.howTitle}>
        Three taps to
        <br />
        the table.
      </h2>
      <div className={styles.stepRow}>
        {STEPS.map((step, i) => (
          <div key={step.n} className={styles.stepCardWrap}>
            <div className={`${styles.stepCard} ${step.color}`}>
              <span className={styles.stepNumber}>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
            {i < STEPS.length - 1 ? <ZigZag className={styles.stepZigZag} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
