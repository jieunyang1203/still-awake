// Whisper.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashedRect } from './components/DashedBorder';
import FilmGrain from './components/FilmGrain';
import { useWrittenCount } from './hooks/useOnlineCount';
import sunSvg from './assets/sun.svg';
import moonSvg from './assets/moon.svg';
import './Whisper.css';

const STORAGE_KEY = 'whisper-chars-v6';
const TODAY_KEY = new Date().toDateString();
const getCharWidth = (c) => /[가-힣ᄀ-ᇿ㄰-㆏]/.test(c) ? 20 : 10;

// A few characters that are always scattered at the bottom, even before
// anyone types anything, so the page never looks completely empty.
const DEFAULT_LANDED = [
  { id: 'd1', char: 'h', left: '6%', top: '88%', rotation: -6 },
  { id: 'd2', char: 'i', left: '9%', top: '92%', rotation: 4 },
  { id: 'd3', char: '.', left: '14%', top: '90%', rotation: 0 },
  { id: 'd4', char: 's', left: '24%', top: '94%', rotation: -3 },
  { id: 'd5', char: 'o', left: '29%', top: '89%', rotation: 5 },
  { id: 'd6', char: 'm', left: '35%', top: '93%', rotation: -2 },
  { id: 'd7', char: 'e', left: '41%', top: '90%', rotation: 3 },
  { id: 'd8', char: 'o', left: '54%', top: '92%', rotation: -4 },
  { id: 'd9', char: 'n', left: '60%', top: '88%', rotation: 2 },
  { id: 'd10', char: 'e', left: '67%', top: '93%', rotation: -5 },
  { id: 'd11', char: '.', left: '75%', top: '90%', rotation: 0 },
  { id: 'd12', char: 'h', left: '81%', top: '94%', rotation: 4 },
  { id: 'd13', char: 'e', left: '87%', top: '89%', rotation: -3 },
  { id: 'd14', char: 'r', left: '92%', top: '92%', rotation: 2 },
  { id: 'd15', char: 'e', left: '96%', top: '90%', rotation: -2 },
];

function Whisper() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [animChars, setAnimChars] = useState([]);
  const [writtenCount, incrementWritten] = useWrittenCount();
  const [landedChars, setLandedChars] = useState(() => {
    try {
      // clear old keys
      ['whisper-chars', 'whisper-chars-v2', 'whisper-chars-v3',
       'whisper-chars-v4', 'whisper-chars-v5'].forEach(k => localStorage.removeItem(k));
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.date === TODAY_KEY) return saved.chars;
    } catch (_) {}
    return [];
  });

  const composingRef = useRef(false);
  const landQueueRef = useRef([]);
  const landRafRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
    document.body.classList.remove('landing');
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: TODAY_KEY, chars: landedChars }));
  }, [landedChars]);

  // Batch land — collect all animationend events firing in the same frame
  const handleAnimEnd = useCallback((char) => {
    landQueueRef.current.push(char);
    if (!landRafRef.current) {
      landRafRef.current = requestAnimationFrame(() => {
        const batch = [...landQueueRef.current];
        landQueueRef.current = [];
        landRafRef.current = null;
        const ids = new Set(batch.map(c => c.id));
        setLandedChars(l => [...l, ...batch]);
        setAnimChars(prev => prev.filter(x => !ids.has(x.id)));
      });
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.isComposing || composingRef.current) return;
    if (e.key !== 'Enter') return;
    const text = e.target.value.trim();
    if (!text) return;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const chars = text.split('');

    const charWidths = chars.map(getCharWidth);
    const totalWidth = charWidths.reduce((a, b) => a + b, 0);
    let curX = cx - totalWidth / 2;
    const startXs = charWidths.map(w => { const x = curX; curX += w; return x; });

    // Each char scatters independently across the full width (minus a small
    // side margin) so accumulated whispers spread evenly over time instead
    // of repeating the same narrow band every message.
    const sidePadding = window.innerWidth * 0.04;
    const usableWidth = window.innerWidth - sidePadding * 2;

    const newChars = chars.map((char, i) => ({
      id: `${Date.now()}-${i}`,
      char,
      startX: startXs[i],
      startY: cy,
      endX: sidePadding + Math.random() * usableWidth,
      endY: window.innerHeight * 0.88 + Math.random() * (window.innerHeight * 0.06),
      landDelay: Math.random() * 0.2,
      rotation: (Math.random() - 0.5) * 6,
      fallDelay: Math.random() * 0.35,
      fallDuration: 1.1 + Math.random() * 1.1,
    }));

    setAnimChars(prev => [...prev, ...newChars]);
    incrementWritten();

    const saved = JSON.parse(localStorage.getItem('whispers') || '[]');
    localStorage.setItem('whispers', JSON.stringify([...saved, text]));
    e.target.value = '';
  };

  const charColor = isDarkMode ? '#F3F3F3' : '#000';

  return (
    <div className={`archive-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <FilmGrain intensityScale={0.5} />
      <div className="archive-header">
        <span className="archive-title">Whisper..</span>
        <span className="archive-description">say something. it doesn't have to reach anyone. words left here fade slowly, but they were here.</span>
      </div>

      <div className="archive-online">
        <span className="online-star">*</span>
        <span className="online-label">{String(writtenCount).padStart(2, '0')} written</span>
      </div>

      <div className="whisper-area">
        <div className="whisper-input-wrap">
          <DashedRect rx={0} />
          <input
            className="whisper-input"
            placeholder=""
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {animChars.map(c => (
        <span
          key={c.id}
          className="whisper-falling-char"
          style={{
            left: c.startX,
            top: c.startY,
            color: charColor,
            animationDelay: `${c.fallDelay}s`,
            animationDuration: `${c.fallDuration}s`,
          }}
          onAnimationEnd={() => handleAnimEnd(c)}
        >
          {c.char}
        </span>
      ))}

      {landedChars.map(c => (
        <span
          key={c.id}
          className="whisper-landed-char"
          style={{
            left: c.endX,
            top: c.endY,
            transform: `rotate(${c.rotation}deg)`,
            color: charColor,
            animationDelay: `${c.landDelay ?? 0}s`,
          }}
        >
          {c.char}
        </span>
      ))}

      {DEFAULT_LANDED.map(c => (
        <span
          key={c.id}
          className="whisper-landed-char"
          style={{
            left: c.left,
            top: c.top,
            transform: `rotate(${c.rotation}deg)`,
            color: charColor,
          }}
        >
          {c.char}
        </span>
      ))}

      <div className="mode-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
        <img src={isDarkMode ? sunSvg : moonSvg} width="30" height="30" alt="" style={{ display: 'block' }} />
      </div>

      <div className="home-btn" onClick={() => navigate('/home')}>back</div>
    </div>
  );
}

export default Whisper;
