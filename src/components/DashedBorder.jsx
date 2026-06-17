// DashedBorder.jsx
// SVG-based dashed borders — consistent across Safari and Chrome.
// Uses CSS custom property --dash-color (set on parent) for stroke color.

export function DashedRect({ strokeWidth = 0.8, dash = '4.3 3', rx = 2 }) {
  const h = strokeWidth / 2;
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', overflow: 'visible',
      }}
    >
      <rect
        x={h} y={h}
        width={`calc(100% - ${strokeWidth}px)`}
        height={`calc(100% - ${strokeWidth}px)`}
        rx={rx}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeLinecap="round"
        style={{ stroke: 'var(--dash-color, #000)' }}
      />
    </svg>
  );
}

export function DashedEllipse({ strokeWidth = 0.8, dash = '4.3 3' }) {
  const h = strokeWidth / 2;
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', overflow: 'visible',
      }}
    >
      <ellipse
        cx="50%" cy="50%"
        rx={`calc(50% - ${h}px)`}
        ry={`calc(50% - ${h}px)`}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeLinecap="round"
        style={{ stroke: 'var(--dash-color, #000)' }}
      />
    </svg>
  );
}
