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

const WAVE_COUNT = 5;
const WAVE_K = 0.02;
/** One full wavelength in viewBox units; shifting by this is seamless. */
const WAVELENGTH = (2 * Math.PI) / WAVE_K;

/**
 * Each wave is drawn once, one wavelength wider than the scene, and slid
 * sideways by a CSS animation. The browser composites that without React
 * re-rendering anything, which matters on slow in-car browsers.
 */
const WAVES = Array.from({ length: WAVE_COUNT }, (_, i) => {
  const y = 182 + i * 14;
  const amp = 1.5 + i * 0.3;
  const pts: string[] = [];
  for (let x = 0; x <= 1200 + WAVELENGTH + 20; x += 20) {
    pts.push(`${x},${(y + Math.sin(x * WAVE_K) * amp).toFixed(1)}`);
  }
  // Phase speed in rad/s, as in the original hand-tuned scene.
  const speed = 0.3 + i * 0.08;
  return {
    points: pts.join(" "),
    opacity: 0.12 + i * 0.04,
    durationS: ((2 * Math.PI) / speed).toFixed(2),
  };
});

export function SeaScene(): JSX.Element {
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
      {WAVES.map((wave, i) => (
        <polyline
          key={i}
          className="sea-wave"
          style={{
            animationDuration: `${wave.durationS}s`,
            ["--wavelength" as string]: `${-WAVELENGTH}px`,
          }}
          points={wave.points}
          fill="none"
          stroke={p.wave}
          strokeWidth="0.7"
          opacity={wave.opacity}
        />
      ))}
      <g className="sea-ferry">
        <g className="sea-ferry-bob">
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
