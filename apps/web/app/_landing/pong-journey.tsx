"use client";

import { useRef } from "react";
import { usePongScroll } from "./use-pong-scroll";
import styles from "./landing.module.css";

const cups = [
  styles.cupBackLeft,
  styles.cupBackMid,
  styles.cupBackRight,
  styles.cupMidLeft,
  styles.cupMidRight,
  styles.cupTarget,
];

function Cup({ position, target = false }: { position: string; target?: boolean }) {
  return (
    <div className={`${styles.cup} ${position} ${target ? styles.targetCup : ""}`}>
      <div className={styles.cupRim} data-target-rim={target || undefined}>
        <i />
      </div>
      <div className={styles.cupBody}>
        <span />
      </div>
      <div className={styles.cupFoot} />
    </div>
  );
}

export function PongJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  usePongScroll(sectionRef);

  return (
    <section ref={sectionRef} className={styles.journey} aria-labelledby="journey-title">
      <div className={styles.journeySticky}>
        <div className={styles.arenaLights} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className={styles.journeyCopy}>
          <p>ONE SHOT CHANGES THE BRACKET</p>
          <h2 id="journey-title">Follow it in.</h2>
        </div>
        <div className={styles.camera} aria-hidden="true">
          <div className={styles.table} />
          <div className={styles.cupRack}>
            {cups.map((position, index) => (
              <Cup key={position} position={position!} target={index === 5} />
            ))}
          </div>
        </div>
        <div className={styles.ball} data-pong-ball aria-hidden="true">
          <span />
        </div>
        <div className={styles.impactRing} aria-hidden="true" />
        <div className={styles.liquidPortal} aria-hidden="true">
          <div className={styles.liquidLight} />
          <div className={styles.bubbles}>
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <span>
            WELCOME TO
            <br />
            <strong>MATCH NIGHT</strong>
          </span>
        </div>
        <div className={styles.progressRail} aria-hidden="true">
          <i />
        </div>
      </div>
    </section>
  );
}
