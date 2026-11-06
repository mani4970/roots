import Image from "next/image";
import { t, type Lang } from "@/lib/i18n";
import styles from "./HomeLoadingScreen.module.css";

type Props = { lang: Lang; christmas?: boolean };

// Presentation only: the caller still owns loading, authentication and rewards.
export default function HomeLoadingScreen({ lang, christmas = false }: Props) {
  const loader = (
    <div className="roots-native-tablet-viewport roots-native-centered-loader" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <img
          src="/roots-logo-transparent-160.png"
          alt="Roots sprout"
          width={82}
          height={82}
          style={{ objectFit: "contain" }}
        />
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 6 }}>Roots</h1>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>{t("home_loading_sub", lang)}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sage)", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );

  // No wrapper, images or resource hints outside the selected dates.
  if (!christmas) return loader;

  return (
    <div className={styles.frame}>
      {loader}
      <div className={styles.decoration} aria-hidden="true">
        <Image className={styles.star} src="/images/seasonal/christmas-2026/bethlehem-star.webp"
          width={1254} height={1254} sizes="(min-width: 600px) 120px, 80px"
          alt="" draggable={false} loading="eager" decoding="async" fetchPriority="low" />
        <div className={styles.snowScene}>
          <Image className={styles.hills} src="/images/seasonal/christmas-2026/snow-hills.webp"
            width={2172} height={724} sizes="(min-width: 600px) 645px, 100vw"
            alt="" draggable={false} loading="eager" decoding="async" fetchPriority="low" />
          <Image className={styles.trees} src="/images/seasonal/christmas-2026/snowy-trees.webp"
            width={1312} height={1199} sizes="(min-width: 600px) 258px, 40vw"
            alt="" draggable={false} loading="eager" decoding="async" fetchPriority="low" />
          <Image className={styles.snowmen} src="/images/seasonal/christmas-2026/snowmen.webp"
            width={1371} height={1147} sizes="(min-width: 600px) 232px, 36vw"
            alt="" draggable={false} loading="eager" decoding="async" fetchPriority="low" />
        </div>
      </div>
    </div>
  );
}
