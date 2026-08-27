import { useEffect, useState } from "react";

const MIDNIGHT_PALETTE = {
  skyTop: "#0d1a2c",
  skyBottom: "#1a2f4a",
  seaTop: "#081425",
  seaBottom: "#030912",
  mountainFar: "#162a42",
  mountainNear: "#0a1b2e",
  wave: "#6b9bcc",
  ferryHull: "#000000",
  ferryBody: "#c8d2dc",
  ferryWindow: "#ffd15c",
  ferryAccent: "#ffd15c",
};

/** ~20fps — plenty for slow wave motion, a third of the renders of full rAF. */
const FRAME_INTERVAL_MS = 50;

interface SeaSceneProps {
  reducedMotion: boolean;
}

export function SeaScene({ reducedMotion }: SeaSceneProps): JSX.Element {
  const [t, setT] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    let raf = 0;
    const start = performance.now();
    let lastFrame = 0;
    const loop = (now: number) => {
      // The waves and the ferry both move slowly; re-rendering the whole SVG at
      // display refresh rate burns battery for no visible gain.
      if (now - lastFrame >= FRAME_INTERVAL_MS) {
        lastFrame = now;
        setT((now - start) / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const period = 70;
  const progress = reducedMotion ? 0.35 : (t % period) / period;
  const ferryX = -80 + progress * 1280;
  const p = MIDNIGHT_PALETTE;

  return (
    <svg
      className="sea-scene"
      viewBox="0 0 1200 260"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.skyTop} />
          <stop offset="100%" stopColor={p.skyBottom} />
        </linearGradient>
        <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.seaTop} />
          <stop offset="100%" stopColor={p.seaBottom} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="170" fill="url(#skyGrad)" />
      <polygon
        points="0,170 120,130 200,150 310,120 420,145 540,128 660,150 780,132 900,148 1040,120 1200,140 1200,170"
        fill={p.mountainFar}
        opacity="0.5"
      />
      <polygon
        points="0,170 80,150 180,158 260,144 380,156 500,148 620,158 740,152 880,158 1000,148 1200,154 1200,170"
        fill={p.mountainNear}
        opacity="0.75"
      />
      <rect x="0" y="170" width="1200" height="90" fill="url(#seaGrad)" />
      {Array.from({ length: 5 }).map((_, i) => {
        const y = 182 + i * 14;
        const phase = (t * (0.3 + i * 0.08)) % (Math.PI * 2);
        const amp = 1.5 + i * 0.3;
        const pts: string[] = [];
        for (let x = 0; x <= 1200; x += 20) {
          const yy = y + Math.sin(x * 0.02 + phase) * amp;
          pts.push(`${x},${yy.toFixed(1)}`);
        }
        return (
          <polyline
            key={i}
            points={pts.join(" ")}
            fill="none"
            stroke={p.wave}
            strokeWidth="0.7"
            opacity={0.12 + i * 0.04}
          />
        );
      })}
      <g transform={`translate(${ferryX.toFixed(1)}, 162)`}>
        <g transform={`translate(0, ${(Math.sin(t * 1.2) * 1.2).toFixed(2)})`}>
          <path d="M 0 8 L 4 16 L 84 16 L 90 8 Z" fill={p.ferryHull} />
          <rect x="8" y="0" width="70" height="8" fill={p.ferryBody} />
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x={11 + i * 5.5}
              y="2"
              width="3.5"
              height="3"
              fill={p.ferryWindow}
            />
          ))}
          <rect x="20" y="-6" width="45" height="6" fill={p.ferryBody} />
          <rect x="55" y="-11" width="12" height="5" fill={p.ferryBody} />
          <rect x="40" y="-14" width="5" height="8" fill={p.ferryAccent} />
        </g>
      </g>
    </svg>
  );
}
