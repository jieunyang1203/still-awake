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
  const [tool, setTool] = useState('pen'); // 'pen' | 'brush' | 'eraser'
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
    document.body.classList.remove('landing');
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const drawStroke = (ctx, stroke) => {
    if (stroke.points.length < 2) return;
    const pts = stroke.points;
    // Back-compat: older saved strokes only stored an `eraser` flag.
    const tool = stroke.tool || (stroke.eraser ? 'eraser' : 'pen');

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw the bezier-smoothed path, optionally offset (for the pen's texture pass).
    const path = (ox = 0, oy = 0) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x + ox, pts[0].y + oy);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2 + ox;
        const my = (pts[i].y + pts[i + 1].y) / 2 + oy;
        ctx.quadraticCurveTo(pts[i].x + ox, pts[i].y + oy, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x + ox, pts[pts.length - 1].y + oy);
      ctx.stroke();
    };

    if (tool === 'eraser') {
      ctx.globalAlpha = 1;
      ctx.lineWidth = stroke.size;
      path();
    } else if (tool === 'brush') {
      // Soft brush — a few translucent passes of decreasing width feather the
      // edge into a soft, blended stroke (no crisp outline like the pen).
      const passes = [[1.8, 0.06], [1.3, 0.10], [0.85, 0.22], [0.5, 0.30]];
      for (const [wm, a] of passes) {
        ctx.globalAlpha = a;
        ctx.lineWidth = Math.max(0.5, stroke.size * wm);
        path();
      }
    } else {
      // Pen — original crisp stroke + a thin offset crayon-texture pass.
      ctx.globalAlpha = 0.82;
      ctx.lineWidth = stroke.size;
      path();
      if (stroke.size > 1) {
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = stroke.size * 0.45;
        path(1.2, 0.6);
      }
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
    currentStrokeRef.current = { points: [getPoint(e)], color, size: tool === 'eraser' ? eraserSize : brushSize, tool };
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
        <div className="scribble-online">
          <span className="online-star">*</span>
          <span className="online-label">{String(drawnCount).padStart(2, '0')} marks</span>
        </div>
        <span className="scribble-description">make a mark on the shared page. it belongs to everyone who's here tonight.</span>
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
        <div className="scribble-tools">
          <div className="tool-selector">
            <button
              className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
              onClick={() => setTool('pen')}
            >pen</button>
            <span className="tool-sep">/</span>
            <button
              className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
              onClick={() => setTool('brush')}
            >brush</button>
            <span className="tool-sep">/</span>
            <button
              className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
            >eraser</button>
          </div>

          <div className={`scribble-colors ${tool === 'eraser' ? 'is-dimmed' : ''}`}>
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`pen-blob-btn ${tool !== 'eraser' && color === c ? 'active' : ''}`}
                style={{
                  color: c,
                  WebkitMaskImage: `url(${penSvg})`,
                  maskImage: `url(${penSvg})`,
                }}
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="scribble-size">
          <div className="size-slider-row">
            <span className="size-sign">−</span>
            <div className="slider-track-wrap">
              <input
                type="range"
                className="scribble-slider"
                min={tool === 'eraser' ? 5 : 1}
                max={tool === 'eraser' ? 40 : 20}
                value={tool === 'eraser' ? eraserSize : brushSize}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (tool === 'eraser') setEraserSize(v);
                  else setBrushSize(v);
                }}
              />
            </div>
            <span className="size-sign">+</span>
          </div>
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
