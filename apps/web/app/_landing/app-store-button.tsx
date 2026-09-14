import { APP_STORE_URL } from "./config";
import styles from "./landing.module.css";

export function AppStoreButton({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`${styles.appStoreButton} ${compact ? styles.appStoreCompact : ""}`}
      href={APP_STORE_URL}
      aria-label="Download Beermacs on the App Store"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M17.05 12.54c.02-2.2 1.8-3.26 1.88-3.31a4.04 4.04 0 0 0-3.18-1.72c-1.34-.14-2.64.8-3.32.8-.7 0-1.74-.78-2.88-.76a4.2 4.2 0 0 0-3.54 2.16c-1.54 2.66-.4 6.57 1.08 8.72.74 1.06 1.6 2.25 2.74 2.2 1.12-.04 1.54-.7 2.9-.7 1.33 0 1.73.7 2.9.68 1.2-.02 1.96-1.06 2.67-2.13a8.7 8.7 0 0 0 1.22-2.48 3.8 3.8 0 0 1-2.47-3.46ZM14.88 6.1a3.86 3.86 0 0 0 .88-2.77 3.94 3.94 0 0 0-2.56 1.32 3.7 3.7 0 0 0-.9 2.67 3.27 3.27 0 0 0 2.58-1.22Z"
        />
      </svg>
      <span>
        <small>Download on the</small>
        <strong>App Store</strong>
      </span>
    </a>
  );
}
