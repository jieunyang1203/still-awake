// Scribble.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FilmGrain from './components/FilmGrain';
import { DashedRect } from './components/DashedBorder';
import sunSvg from './assets/sun.svg';
import moonSvg from './assets/moon.svg';
import penSvg from './assets/pen.svg';
import { useDrawnCount } from './hooks/useOnlineCount';
import './Scribble.css';

const STORAGE_KEY = 'scribble-canvas-v2';
function getSessionKey() {
  const now = new Date();
  if (now.getHours() < 5) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return prev.toDateString();
  }
  return now.toDateString();
}
const TODAY_KEY = getSessionKey();

// Swap these to restyle the board — nothing else needs to change.
const PALETTE = [
  '#2FCB67', '#76B0FF', '#ACADB0', '#C7892B',
  '#F1819F', '#F3FA6F', '#FF6033',
];

function Scribble() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [color, setColor] = useState(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(14);
  const [isEraser, setIsEraser] = useState(false);
  const [drawnCount, incrementDrawn] = useDrawnCount();

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  // Local stand-in for the shared board. Every finished stroke lands here and
  // in localStorage. A real multi-user version would also broadcast the
  // stroke to other clients here, and push incoming remote strokes into this
  // same array via addStroke() when they arrive.
  const strokesRef = useRef([]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const drawStroke = (ctx, stroke) => {
    if (stroke.points.length < 2) return;
    const pts = stroke.points;

    ctx.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Primary pass — slightly translucent, bezier curves for organic shape
    ctx.globalAlpha = stroke.eraser ? 1 : 0.82;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();

    // Secondary pass — thin offset layer for crayon/marker texture
    if (!stroke.eraser && stroke.size > 1) {
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = stroke.size * 0.45;
      ctx.beginPath();
      ctx.moveTo(pts[0].x + 1.2, pts[0].y + 0.6);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2 + 1.2;
        const my = (pts[i].y + pts[i + 1].y) / 2 + 0.6;
        ctx.quadraticCurveTo(pts[i].x + 1.2, pts[i].y + 0.6, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x + 1.2, pts[pts.length - 1].y + 0.6);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  };

  const redrawAll = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
  }, []);

  const addStroke = useCallback((stroke) => {
    strokesRef.current.push(stroke);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: TODAY_KEY, strokes: strokesRef.current }));
    } catch (_) {}
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.date === TODAY_KEY) strokesRef.current = saved.strokes || [];
    } catch (_) {}

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawAll();
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, [redrawAll]);

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const j = 0.7;
    return {
      x: e.clientX - rect.left + (Math.random() - 0.5) * j,
      y: e.clientY - rect.top  + (Math.random() - 0.5) * j,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    currentStrokeRef.current = { points: [getPoint(e)], color, size: isEraser ? eraserSize : brushSize, eraser: isEraser };
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    const point = getPoint(e);
    const stroke = currentStrokeRef.current;
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push(point);
    drawStroke(ctxRef.current, { ...stroke, points: [prev, point] });
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      addStroke(currentStrokeRef.current);
      incrementDrawn();
    }
    currentStrokeRef.current = null;
  };


  return (
    <div className={`scribble-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <FilmGrain intensityScale={0.5} />

      <div className="scribble-header">
        <span className="scribble-title">Scribble</span>
        <span className="scribble-description">make a mark on the shared page. it belongs to everyone who's here tonight.</span>
      </div>

      <div className="scribble-online">
        <span className="online-star">*</span>
        <span className="online-label">{String(drawnCount).padStart(2, '0')} marks</span>
      </div>

      <div className="scribble-canvas-frame">
        <DashedRect rx={4} />
        <canvas
          ref={canvasRef}
          className="scribble-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className="scribble-toolbar">
        <div className="scribble-pen-group">
          <input
            type="range"
            className="scribble-slider"
            min={1} max={20}
            value={brushSize}
            onChange={e => { setBrushSize(Number(e.target.value)); setIsEraser(false); }}
          />
          <div className="scribble-colors">
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`pen-blob-btn ${!isEraser && color === c ? 'active' : ''}`}
                style={{
                  color: c,
                  WebkitMaskImage: `url(${penSvg})`,
                  maskImage: `url(${penSvg})`,
                }}
                onClick={() => { setColor(c); setIsEraser(false); }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="scribble-erase-group">
          <input
            type="range"
            className="scribble-slider scribble-slider--erase"
            min={5} max={40}
            value={eraserSize}
            onChange={e => setEraserSize(Number(e.target.value))}
          />
          <button
            className={`scribble-erase-btn ${isEraser ? 'active' : ''}`}
            onClick={() => setIsEraser(v => !v)}
          >
            erase
          </button>
        </div>

      </div>

      <div className="mode-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
        <img src={isDarkMode ? sunSvg : moonSvg} width="30" height="30" alt="" style={{ display: 'block' }} />
      </div>

      <div className="home-btn" onClick={() => navigate('/home')}>back</div>
    </div>
  );
}

export default Scribble;
