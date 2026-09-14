import styles from "./landing.module.css";

export function PhoneMockup() {
  return (
    <div className={styles.phoneStage} aria-label="Beermacs app preview placeholder">
      <div className={styles.phoneGlow} />
      <div className={styles.phone}>
        <div className={styles.phoneButtons} aria-hidden="true" />
        <div className={styles.phoneScreen}>
          {/* Replace this block with the final app screenshot. */}
          <div className={styles.phoneIsland} />
          <div className={styles.previewTop}>
            <span>LIVE TOURNAMENT</span>
            <b>17</b>
          </div>
          <div className={styles.previewHero}>
            <small>YOU&apos;RE UP</small>
            <strong>TABLE 03</strong>
            <span>Macs Attack vs. Cup Fiction</span>
          </div>
          <div className={styles.previewBracket}>
            <div>
              <span>Macs Attack</span>
              <b>10</b>
            </div>
            <div>
              <span>Cup Fiction</span>
              <b>7</b>
            </div>
          </div>
          <div className={styles.previewRows}>
            <i />
            <i />
            <i />
          </div>
          <p className={styles.replaceNote}>
            APP SCREENSHOT
            <br />
            PLACEHOLDER
          </p>
        </div>
      </div>
      <div className={styles.phoneShadow} />
    </div>
  );
}
