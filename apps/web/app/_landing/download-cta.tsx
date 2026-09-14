import { AppStoreButton } from "./app-store-button";
import type { FinalCtaContent } from "./content-defaults";
import styles from "./landing.module.css";

export function DownloadCta({ content }: { content: FinalCtaContent }) {
  return (
    <main className={styles.features} id="features">
      <div className={styles.featureBubbles} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className={styles.featuresInner}>
        <div className={styles.finalCta} id="app-store">
          <p>{content.eyebrow}</p>
          <h2>{content.headline}</h2>
          <AppStoreButton />
          {!process.env.NEXT_PUBLIC_APP_STORE_URL && (
            <small>App Store link will be added at launch.</small>
          )}
        </div>
      </div>
    </main>
  );
}
