// App.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FilmGrain from './components/FilmGrain';
import './App.css';

function App() {
  const sketchRef = useRef();
  const p5Ref = useRef(null);
  const navigate = useNavigate();

  const [timeUntilOpen, setTimeUntilOpen] = useState('');
  const [showNicknameInput, setShowNicknameInput] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 480);
  const sizerRef = useRef(null);
  const composingRef = useRef(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Background oscillation and text color are now CSS animations (compositor thread, zero JS overhead)

  // p5 clock — dynamic import keeps p5 out of the main bundle so the page
  // renders immediately; p5 loads in the background then the clock appears
  useEffect(() => {
    let cancelled = false;
    let resizeTimer;
    const handleResize = () => {
      if (p5Ref.current) p5Ref.current.noLoop();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (p5Ref.current) p5Ref.current.loop();
      }, 200);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    import('p5').then(async ({ default: p5 }) => {
      if (cancelled || !sketchRef.current) return;
      try { await document.fonts.load('1em Dotline'); } catch(e) {}
      if (cancelled || !sketchRef.current) return;
      const sketch = (p) => {
      let targetAngle = 30;
      let currentAngle = 30;
      let direction = 1;
      let canvasSize;
      let lastTickMs = 0;
      const tickIntervalMs = 767; // ~23 frames at 30fps, but now time-based
      let overshoot = 0;
      let springVelocity = 0;

      p.setup = () => {
        // Match the container's rendered size so the canvas isn't CSS-scaled —
        // non-integer upscaling resamples the hairline rim into broken segments
        canvasSize = sketchRef.current?.offsetWidth || 890;
        const canvas = p.createCanvas(canvasSize, canvasSize);
        canvas.parent(sketchRef.current);
        p.angleMode(p.DEGREES);
        p.frameRate(30);
        p.textAlign(p.CENTER, p.CENTER);
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        p.textFont('Dotline');
      };

      p.windowResized = () => {
        const w = sketchRef.current?.offsetWidth;
        if (w && Math.abs(w - canvasSize) > 1) {
          canvasSize = w;
          p.resizeCanvas(w, w);
        }
      };

      p.draw = () => {
        p.clear();

        p.push();
        p.translate(p.width / 2, p.height / 2);

        p.fill('rgba(255,255,255,0.65)');
        // 0.55 keeps the hairline feel but stays above the subpixel threshold
        // where antialiasing makes the rim look dashed
        p.strokeWeight(0.55);
        p.stroke('rgba(0,0,0,0.8)');
        p.ellipse(0, 0, p.width * 0.997, p.height * 0.997);

        const numbers = [
          { num: 1, angle: -60 },
          { num: 2, angle: -30 },
          { num: 3, angle: 0 },
          { num: 4, angle: 30 },
          { num: 5, angle: 60 },
        ];
        const tickR = canvasSize * 0.39;
        p.textFont('Dotline');
        p.textSize(canvasSize * 0.18);
        p.textAlign(p.CENTER, p.CENTER);

        numbers.forEach(({ num, angle }) => {
          const x = tickR * p.cos(angle);
          const y = tickR * p.sin(angle);
          p.erase();
          p.fill(255);
          p.noStroke();
          p.text(num, x, y);
          p.noErase();
          p.noFill();
          p.stroke('rgba(0,0,0,0.8)');
          p.strokeWeight(0.4);
          p.text(num, x, y);
        });

        p.pop();

        p.push();
        p.translate(p.width / 2, p.height / 2);

        if (p.millis() - lastTickMs >= tickIntervalMs) {
          lastTickMs = p.millis();
          targetAngle += direction * 8;
          overshoot = direction * 3;
          springVelocity = 0;
          if (targetAngle >= 150) { targetAngle = 150; direction = -1; }
          else if (targetAngle <= 30) { targetAngle = 30; direction = 1; }
        }

        const springForce = -0.2 * overshoot;
        springVelocity += springForce;
        springVelocity *= 0.85;
        overshoot += springVelocity;
        currentAngle += (targetAngle - currentAngle) * 0.25;

        p.rotate(currentAngle + overshoot);

        const needleLength = canvasSize * 0.25;
        const counterbalanceLength = canvasSize * 0.032;
        const needleBase = canvasSize * 0.0021;
        const needleTip = canvasSize * 0.00094;

        p.fill('#000000');
        p.noStroke();
        p.beginShape();
        p.vertex(-needleBase, 0);
        p.vertex(-needleTip, counterbalanceLength);
        p.vertex(needleTip, counterbalanceLength);
        p.vertex(needleBase, 0);
        p.vertex(needleTip, -needleLength);
        p.vertex(-needleTip, -needleLength);
        p.endShape(p.CLOSE);

        p.fill('#000000');
        p.noStroke();
        p.ellipse(0, 0, canvasSize * 0.031, canvasSize * 0.031);

        p.pop();
      };
    };

      p5Ref.current = new p5(sketch, sketchRef.current);
    });

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      if (p5Ref.current) { p5Ref.current.remove(); p5Ref.current = null; }
    };
  }, []);

  // Landing is always the light gradient — clear any dark backdrop and tag the
  // body so its background (which fills the iOS safe areas) matches the gradient.
  useEffect(() => {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('landing');
    return () => document.body.classList.remove('landing');
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      if (h >= 1 && h < 5) { setTimeUntilOpen('Open now'); return; }
      // Opens at 1 AM. Counting down to the next 1:00:00 — the minute/second
      // borrows below already add the final hour, so the base is (target-h-1):
      // 24-h after 5 AM (next-day 1 AM = 25h), -h before 1 AM (today's 1 AM).
      let hoursUntil = h >= 5 ? 24 - h : 0 - h;
      let minutesUntil = 60 - m - 1;
      let secondsUntil = 60 - s;
      if (secondsUntil === 60) { secondsUntil = 0; minutesUntil += 1; }
      if (minutesUntil === 60) { minutesUntil = 0; hoursUntil += 1; }
      setTimeUntilOpen(
        `${String(hoursUntil).padStart(2,'0')}:${String(minutesUntil).padStart(2,'0')}:${String(secondsUntil).padStart(2,'0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // The "tonight, you are:" label color-cycles purely via the base/white CSS
  // layers (identical to "To workspace"), so there's nothing to sync in JS —
  // just reveal the input.
  const handleNavigateHome = () => {
    setShowNicknameInput(true);
  };

  // Mobile gets a ~half-length summary of the landing copy; desktop keeps the
  // full text. Rendered twice (base + white color-cycle layers), so shared here.
  const landingDescription = isMobile
    ? "Still Awake* opens at 1 AM and closes at 5. In between, a few people are here, working or sitting quietly with their thoughts. You can leave a note, send a word to someone you'll never know, or just stay, in the same quiet."
    : "Still Awake* opens at 1 AM and closes at 5. In between, a few people are here, working on something, listening to something, or just sitting quietly with their thoughts for a while. You can leave a note about what you're up to tonight. You can send a word to someone you'll never know. Or you can just stay, and be here, in the same quiet as everyone else who is still awake.";

  const handleNicknameKeyDown = (e) => {
    if (e.isComposing || composingRef.current) return;
    if (e.key === 'Enter' && e.target.value.trim()) {
      localStorage.setItem('nickname', e.target.value.trim());
      navigate('/home');
    }
  };

  return (
    <div className="app-page">
      <div className="app-bg-light" />
      <div className="app-bg-dark" />
      <FilmGrain intensityScale={1.28} />


      <div className="container">
        <div className="clock-container" onClick={handleNavigateHome}>
          <div ref={sketchRef} className="clock-canvas" />
        </div>
      </div>

      <p className="description landing-description text-base-layer">
        {landingDescription}
      </p>

      {/* Base layer */}
      <div className="landing-bottom-left text-base-layer">
        <span className="nav-workspace" onClick={handleNavigateHome}>To workspace</span>
        {showNicknameInput && !isMobile && (
          <span className="tonight-label">↘ tonight, you are:</span>
        )}
      </div>

      <span className="nav-time landing-bottom-right text-base-layer">
        {timeUntilOpen === 'Open now' ? 'Open now' : <><span className="time-prefix">Hours until opening: </span>{timeUntilOpen}</>}
      </span>

      <p className="description landing-description text-white-layer" aria-hidden="true">
        {landingDescription}
      </p>
      {/* White text layer — opacity only, compositor-safe */}
      <div className="landing-bottom-left text-white-layer" aria-hidden="true">
        <span className="nav-workspace">To workspace</span>
        {showNicknameInput && !isMobile && (
          <span className="tonight-label">↘ tonight, you are:</span>
        )}
      </div>
      <span className="nav-time landing-bottom-right text-white-layer" aria-hidden="true">
        {timeUntilOpen === 'Open now' ? 'Open now' : <><span className="time-prefix">Hours until opening: </span>{timeUntilOpen}</>}
      </span>

      {/* Nickname layer (desktop) — only the input is visible here; the label
          is a hidden spacer so the input lines up after the real (color-cycling)
          label rendered in the base/white layers above. Mobile uses the
          centered modal below instead. */}
      {showNicknameInput && !isMobile && (
        <div className="landing-bottom-left nickname-layer">
          <span className="nav-workspace" style={{ visibility: 'hidden' }} aria-hidden="true">To workspace</span>
          <div className="nickname-box">
            <span className="tonight-label" style={{ visibility: 'hidden' }} aria-hidden="true">↘ tonight, you are:</span>
            <div className="nickname-sizer" data-value="a name for tonight." ref={sizerRef}>
              <input
                className="nickname-input"
                placeholder="a name for tonight."
                maxLength={6}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  if (e.target.value.length > 6) e.target.value = e.target.value.slice(0, 6);
                  if (sizerRef.current) sizerRef.current.dataset.value = e.target.value || 'a name for tonight.';
                }}
                onInput={(e) => {
                  if (!composingRef.current && e.target.value.length > 6) e.target.value = e.target.value.slice(0, 6);
                  if (sizerRef.current) sizerRef.current.dataset.value = e.target.value || 'a name for tonight.';
                }}
                onKeyDown={handleNicknameKeyDown}
                autoFocus
                size={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile: a centered, blurred modal instead of the tiny bottom input
          (which was too low and triggered iOS zoom). */}
      {showNicknameInput && isMobile && (
        <div className="nickname-modal-overlay" onClick={() => setShowNicknameInput(false)}>
          <div className="nickname-modal" onClick={e => e.stopPropagation()}>
            <span className="nickname-modal-label">tonight, you are:</span>
            <input
              className="nickname-modal-input"
              placeholder="a name for tonight."
              maxLength={6}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                if (e.target.value.length > 6) e.target.value = e.target.value.slice(0, 6);
              }}
              onInput={(e) => {
                if (!composingRef.current && e.target.value.length > 6) e.target.value = e.target.value.slice(0, 6);
              }}
              onKeyDown={handleNicknameKeyDown}
              autoFocus
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
