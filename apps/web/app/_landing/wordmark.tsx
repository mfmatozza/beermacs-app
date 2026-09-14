import styles from "./landing.module.css";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${styles.wordmark} ${compact ? styles.wordmarkCompact : ""}`}>
      <span aria-hidden="true">BEERMACS</span>
      <span className={styles.srOnly}>Beermacs</span>
    </span>
  );
}
