import Link from "next/link";
import { AppStoreButton } from "./app-store-button";
import { Wordmark } from "./wordmark";
import styles from "./landing.module.css";

export function LandingFooter() {
  return (
    <footer className={styles.landingFooter}>
      <div className={styles.footerBrand}>
        <Wordmark compact />
        <span>PLAY THE NIGHT.</span>
      </div>
      <div className={styles.footerLinks}>
        <span>© {new Date().getFullYear()} BEERMACS</span>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
      <AppStoreButton compact />
    </footer>
  );
}
