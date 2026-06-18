import { useEffect, useRef, useState } from 'react';

function FilmGrain({ intensityScale = 1 }) {
  const svgRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Defer rendering so the clock and page content load first
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const svg = svgRef.current;
    if (!svg) return;
    const turb = svg.querySelector('feTurbulence');

    let seed = 0;
    let timerId;
    let resizeTimer;

    timerId = setInterval(() => {
      seed = (seed + 1) % 9999;
      turb.setAttribute('seed', seed);
    }, 500);

    // Hide during resize to prevent per-pixel filter recomputation on every resize event
    const handleResize = () => {
      svg.style.display = 'none';
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (svg) svg.style.display = '';
      }, 250);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      clearInterval(timerId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    // A fixed div with inset:0 reliably fills the full viewport including the
    // iOS safe areas (same as the gradient bg layers). The SVG just fills that
    // div at 100% — avoids the SVG-intrinsic-sizing quirk that left the grain
    // cut off at the top/bottom when sized directly.
    <div
      style={{
        // Extend BEYOND the viewport by the safe-area insets so the grain
        // physically covers the iOS status-bar / home-indicator strips,
        // regardless of whether fixed top:0 maps to the absolute top or the
        // safe-area top.
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) * -1)',
        left: 'calc(env(safe-area-inset-left, 0px) * -1)',
        right: 'calc(env(safe-area-inset-right, 0px) * -1)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) * -1)',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.18 * intensityScale,
        willChange: 'opacity',
      }}
    >
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }}>
        <filter id="film-grain" x="0%" y="0%" width="100%" height="100%"
          colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="2"
            seed="0"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#film-grain)" />
      </svg>
    </div>
  );
}

export default FilmGrain;
