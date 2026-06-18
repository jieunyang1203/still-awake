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
    <svg
      ref={svgRef}
      style={{
        // 100vw/100vh (large viewport) — NOT width/height:100%, which on iOS
        // resolves to the safe-area-excluded height and left the grain cut off
        // at the top/bottom. vh = the large viewport, so the grain always fills
        // the whole device including the status-bar / home-indicator areas.
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.18 * intensityScale,
        willChange: 'opacity',
      }}
    >
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
  );
}

export default FilmGrain;
