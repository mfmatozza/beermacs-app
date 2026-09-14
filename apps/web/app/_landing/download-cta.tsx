import { AppStoreButton } from "./app-store-button";
import styles from "./landing.module.css";

export function DownloadCta() {
  return (
    <main className={styles.features} id="features">
      <div className={styles.featureBubbles} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className={styles.featuresInner}>
        <div className={styles.finalCta} id="app-store">
          <p>READY FOR YOUR NEXT NIGHT?</p>
          <h2>
            Bring the bracket
            <br />
            to the table.
          </h2>
          <AppStoreButton />
          {!process.env.NEXT_PUBLIC_APP_STORE_URL && (
            <small>App Store link will be added at launch.</small>
          )}
        </div>
      </div>
    </main>
  );
}
