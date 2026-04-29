"use client";

type ConfettiBurstProps = {
  variant?: "fixed" | "absolute";
  zIndex?: number;
};

const COLORS = ["#7A9D7A", "#C4956A", "#E8C547", "#D4E6D9", "#F4EFE0", "#9AB89A", "#F7D9A5"];

const PIECES = Array.from({ length: 104 }, (_, i) => {
  const side = i % 2 === 0 ? 1 : -1;
  const spread = 6 + ((i * 17) % 42);
  const x = side * spread + (((i * 13) % 15) - 7);
  const y = -(34 + ((i * 19) % 52));
  return {
    id: i,
    x,
    y,
    fall: 18 + ((i * 11) % 34),
    delay: ((i * 7) % 24) / 100,
    duration: 1.55 + ((i * 5) % 18) / 20,
    size: 5 + ((i * 3) % 9),
    rotate: 220 + ((i * 47) % 620),
    color: COLORS[i % COLORS.length],
    radius: i % 4 === 0 ? 999 : i % 4 === 1 ? 4 : 1,
    originX: 46 + ((i * 29) % 9),
    originY: 5 + ((i * 11) % 10),
    opacity: 0.74 + ((i * 17) % 24) / 100,
  };
});

const SPARKS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: ((i * 37) % 70) - 35,
  y: -(18 + ((i * 23) % 42)),
  delay: ((i * 13) % 18) / 100,
  size: 3 + (i % 4),
  color: COLORS[(i + 2) % COLORS.length],
}));

export default function ConfettiBurst({ variant = "absolute", zIndex = 1 }: ConfettiBurstProps) {
  const position = variant === "fixed" ? "fixed" : "absolute";

  return (
    <div aria-hidden="true" style={{ position, inset: 0, zIndex, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        @keyframes rootsBottomBurst {
          0% {
            transform: translate3d(0, 0, 0) scale(0.35) rotate(0deg);
            opacity: 0;
          }
          8% {
            opacity: var(--piece-opacity);
          }
          46% {
            transform: translate3d(var(--burst-x), var(--burst-y), 0) scale(1) rotate(calc(var(--burst-rotate) * 0.58));
            opacity: var(--piece-opacity);
          }
          100% {
            transform: translate3d(var(--burst-x), calc(var(--burst-y) + var(--fall-y)), 0) scale(0.78) rotate(var(--burst-rotate));
            opacity: 0;
          }
        }

        @keyframes rootsBottomSpark {
          0% { transform: translate3d(0, 0, 0) scale(0.2); opacity: 0; }
          12% { opacity: 1; }
          80% { opacity: 0.84; }
          100% { transform: translate3d(var(--spark-x), var(--spark-y), 0) scale(1.1); opacity: 0; }
        }

        @keyframes rootsBurstGlow {
          0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
          22% { opacity: 0.38; }
          100% { transform: translateX(-50%) scale(1.45); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .roots-bottom-confetti,
          .roots-bottom-spark,
          .roots-burst-glow {
            animation: none !important;
            opacity: 0.14 !important;
          }
        }
      `}</style>

      <span
        className="roots-burst-glow"
        style={{
          position: "absolute",
          left: "50%",
          bottom: "3vh",
          width: 210,
          height: 88,
          borderRadius: "999px 999px 0 0",
          background: "radial-gradient(circle, rgba(232,197,71,0.42) 0%, rgba(122,157,122,0.22) 38%, transparent 72%)",
          filter: "blur(4px)",
          opacity: 0,
          animation: "rootsBurstGlow 1.2s ease-out forwards",
        }}
      />

      {SPARKS.map((spark) => (
        <span
          key={`spark-${spark.id}`}
          className="roots-bottom-spark"
          style={{
            position: "absolute",
            left: "50%",
            bottom: "8vh",
            width: spark.size,
            height: spark.size,
            borderRadius: 999,
            background: spark.color,
            boxShadow: "0 0 12px rgba(255,255,255,0.35)",
            opacity: 0,
            animation: `rootsBottomSpark 0.9s ease-out ${spark.delay}s forwards`,
            ["--spark-x" as any]: `${spark.x}vw`,
            ["--spark-y" as any]: `${spark.y}vh`,
          }}
        />
      ))}

      {PIECES.map((piece) => (
        <span
          key={piece.id}
          className="roots-bottom-confetti"
          style={{
            position: "absolute",
            left: `${piece.originX}%`,
            bottom: `${piece.originY}vh`,
            width: piece.size,
            height: piece.id % 5 === 0 ? piece.size * 2 : piece.size,
            borderRadius: piece.radius,
            background: piece.color,
            opacity: 0,
            boxShadow: "0 0 8px rgba(255,255,255,0.12)",
            animation: `rootsBottomBurst ${piece.duration}s cubic-bezier(0.12, 0.86, 0.16, 1) ${piece.delay}s forwards`,
            ["--burst-x" as any]: `${piece.x}vw`,
            ["--burst-y" as any]: `${piece.y}vh`,
            ["--fall-y" as any]: `${piece.fall}vh`,
            ["--burst-rotate" as any]: `${piece.rotate}deg`,
            ["--piece-opacity" as any]: piece.opacity,
          }}
        />
      ))}
    </div>
  );
}
