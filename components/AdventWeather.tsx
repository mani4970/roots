import type { CSSProperties } from "react";
import styles from "./AdventWeather.module.css";

const BETHLEHEM_STAR = "/images/seasonal/christmas-2026/bethlehem-star.webp";

const snowStyles = Array.from({ length: 40 }, (_, index) => {
  const duration = 8 + (index * 5 % 11);
  return {
    "--snow-x": `${(index * 37 + 7) % 100}%`,
    "--snow-size": `${2 + (index * 3 % 4)}px`,
    "--snow-speed": `${duration}s`,
    "--snow-offset": `${-duration * ((index * 19 % 40) / 40)}s`,
    "--snow-sway": index % 2 ? "12px" : "-12px",
  } as CSSProperties;
});

export function AdventHomeStar() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Reuse the loader's pixel artwork at its header size.
    <img className={styles.homeStar} src={BETHLEHEM_STAR} alt="" aria-hidden="true" draggable={false} />
  );
}

export function AdventSnow() {
  return (
    <div className={styles.snowfall} aria-hidden="true">
      {snowStyles.map((style, index) => <span key={index} style={style} />)}
    </div>
  );
}
