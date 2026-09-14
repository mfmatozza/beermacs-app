import type { StepsContent } from "./content-defaults";
import { DotGrid, SplatterStar, ZigZag } from "./graffiti-marks";
import styles from "./landing.module.css";

const ACCENTS = [styles.stepGreen, styles.stepYellow, styles.stepOrange];

/**
 * Replaces the old scroll-driven pong-ball physics section (usePongScroll)
 * — real, hand-tuned custom animation code, but exactly the kind of thing
 * that reads as janky the moment a viewport, a frame drop, or reduced-motion
 * catches it wrong. A poster doesn't need to move to hit; three loud,
 * static steps in the same graffiti language as the hero do the job with
 * nothing left to go wrong.
 */
export function HowItWorks({ content }: { content: StepsContent }) {
  return (
    <section className={styles.howItWorks} aria-labelledby="how-title">
      <SplatterStar className={styles.howStar} />
      <DotGrid className={styles.howDots} />
      <p className={styles.eyebrow}>
        <span /> HOW IT WORKS
      </p>
      <h2 id="how-title" className={styles.howTitle}>
        {content.title}
      </h2>
      <div className={styles.stepRow}>
        {content.steps.map((step, i) => (
          <div key={step.title} className={styles.stepCardWrap}>
            <div className={`${styles.stepCard} ${ACCENTS[i % ACCENTS.length]}`}>
              <span className={styles.stepNumber}>{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
            {i < content.steps.length - 1 ? <ZigZag className={styles.stepZigZag} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
