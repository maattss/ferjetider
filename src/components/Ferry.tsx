/** The ferry drawn facing right, 90 wide, from its funnel at y=-3 down to the waterline at y=26. */
function FerryShape(): JSX.Element {
  return (
    <>
      <path d="M 0 18 L 4 26 L 84 26 L 90 18 Z" fill="var(--ink-3)" />
      <rect x="8" y="10" width="70" height="8" fill="var(--ink)" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={12 + i * 6.5} y="12" width="4" height="3" fill="var(--bg)" />
      ))}
      <rect x="20" y="4" width="45" height="6" fill="var(--ink-2)" />
      <rect x="40" y="-3" width="5" height="7" fill="var(--blue)" />
    </>
  );
}

/**
 * The brand mark: a small ferry crossing a hairline fjord and turning at each
 * quay. Pure CSS transforms, so the compositor runs it without React.
 */
export function FerryMark(): JSX.Element {
  return (
    <svg className="ferry-mark" width="114" height="36" viewBox="0 0 228 72" aria-hidden="true">
      <line x1="0" y1="66" x2="228" y2="66" className="ferry-water" />
      <g className="ferry-mark-sail">
        <g className="ferry-mark-turn">
          <g className="ferry-mark-bob">
            <g transform="translate(-45 36)">
              <FerryShape />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Where the ferry is on its crossing right now, from departure to arrival. */
export function CrossingTrack({
  fromLabel,
  toLabel,
  progress,
}: {
  fromLabel: string;
  toLabel: string;
  /** 0 at the departure quay, 1 at the arrival quay. */
  progress: number;
}): JSX.Element {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="crossing" aria-label={`${Math.round(pct)} % av overfarten`}>
      <span className="crossing-quay">{fromLabel}</span>
      <div className="crossing-track">
        <div className="crossing-done" style={{ width: `${pct}%` }} />
        <svg
          className="crossing-ferry"
          style={{ left: `${pct}%` }}
          width="60"
          height="22"
          viewBox="0 -4 90 34"
          aria-hidden="true"
        >
          <g className="ferry-mark-bob">
            <FerryShape />
          </g>
        </svg>
      </div>
      <span className="crossing-quay">{toLabel}</span>
    </div>
  );
}
