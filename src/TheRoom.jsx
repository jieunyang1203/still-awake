// TheRoom.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineCount } from './hooks/useOnlineCount';
import { DashedRect, DashedEllipse } from './components/DashedBorder';
import FilmGrain from './components/FilmGrain';
import sunSvg from './assets/sun.svg';
import moonSvg from './assets/moon.svg';
import memoSvg from './assets/memo.svg';
import memo2Svg from './assets/memo2.svg';
import photo1 from './assets/room-photos/1.jpg';
import photo2 from './assets/room-photos/2.jpg';
import photo3 from './assets/room-photos/3.jpg';
import photo4 from './assets/room-photos/4.jpg';
import photo5 from './assets/room-photos/5.jpg';
import photo6 from './assets/room-photos/6.jpg';
import photo7 from './assets/room-photos/7.jpg';
import './TheRoom.css';

const DESIGN_WIDTH = 1650;

// Mobile canvas geometry (px, designed around a ~390px-wide screen). Same
// free-drag canvas as desktop, just scattered to fit a portrait phone — sizes
// kept similar with slight variation (no rotation).
const MOBILE_GEO = {
  mock1: { x: 8,   y: 118, width: 172, height: 172 }, // circle
  mock2: { x: 198, y: 150, width: 178, height: 122 }, // rect
  mock3: { x: 214, y: 298, width: 152, height: 152 }, // circle
  mock4: { x: 16,  y: 318, width: 168, height: 128 }, // rect
  mock5: { x: 178, y: 452, width: 182, height: 142 }, // rect
  mock6: { x: 12,  y: 470, width: 160, height: 160 }, // circle
  mock7: { x: 92,  y: 624, width: 186, height: 132 }, // rect
};
const MINE_MOBILE_GEO = { x: 212, y: 612, width: 158, height: 150 };

const INITIAL_MOCK = [
  { id: 'mock1', username: 'miwoo', shape: 'circle', x: 80, y: 90, width: 450, height: 290, text: 'look at my cat!', image: photo4 },
  { id: 'mock2', username: '@nn', shape: 'rect', x: 540, y: 70, width: 480, height: 265, text: '카페인 좋아', image: photo1 },
  { id: 'mock3', username: 'teddy', shape: 'circle', x: 1090, y: 120, width: 400, height: 340, text: '', image: photo6 },
  { id: 'mock4', username: 'jen', shape: 'rect', x: 180, y: 430, width: 430, height: 300, text: 'doodling', image: photo3 },
  { id: 'mock5', username: 'owo', shape: 'rect', x: 1110, y: 450, width: 410, height: 320, text: 'a little snack for the night\n<33', image: photo7 },
  { id: 'mock6', username: 'h1234', shape: 'circle', x: 640, y: 390, width: 470, height: 270, text: '', image: photo2 },
  { id: 'mock7', username: 'user23', shape: 'rect', x: 440, y: 600, width: 460, height: 280, text: '오늘 산책하다가 찍은 꽃잎', image: photo5 },
];

function TheRoom() {
  const navigate = useNavigate();
  const nickname = localStorage.getItem('nickname') || '';
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const onlineCount = useOnlineCount();

  const [myWindow, setMyWindow] = useState(() => {
    const saved = localStorage.getItem('myRoomWindow');
    return saved ? JSON.parse(saved) : null;
  });

  const [positions, setPositions] = useState(() => {
    const saved = localStorage.getItem('roomPositions-v2');
    return saved ? JSON.parse(saved) : {};
  });
  // Mobile drags are stored separately so they don't corrupt the desktop
  // canvas coordinates (different layout / coordinate space).
  const [mobilePositions, setMobilePositions] = useState(() => {
    const saved = localStorage.getItem('roomPositionsMobile');
    return saved ? JSON.parse(saved) : {};
  });
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 480);

  const [activeWinId, setActiveWinId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftImage, setDraftImage] = useState(null);
  const [draftShape, setDraftShape] = useState('circle');
  const fileInputRef = useRef(null);
  const dragRef = useRef(null);

  const scaleRef = useRef(1);
  const canvasInnerRef = useRef(null);

  useEffect(() => {
    const MIN_SCALE = 0.62;
    let raf = null;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const mobile = window.innerWidth <= 480;
        setIsMobile(mobile);
        // Mobile uses a 1:1 canvas (cards are already sized for the screen);
        // desktop scales the 1650px design down to fit the window width.
        const s = mobile ? 1 : Math.min(1, Math.max(MIN_SCALE, window.innerWidth / DESIGN_WIDTH));
        scaleRef.current = s;
        if (canvasInnerRef.current) {
          canvasInnerRef.current.style.transform = mobile ? 'none' : `scale(${s})`;
        }
      });
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
    document.body.classList.remove('landing');
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);
  useEffect(() => { localStorage.setItem('roomPositions-v2', JSON.stringify(positions)); }, [positions]);
  useEffect(() => { localStorage.setItem('roomPositionsMobile', JSON.stringify(mobilePositions)); }, [mobilePositions]);

  const posMap = isMobile ? mobilePositions : positions;
  const setPosMap = isMobile ? setMobilePositions : setPositions;

  const getPos = (win) => ({
    x: posMap[win.id]?.x ?? win.x,
    y: posMap[win.id]?.y ?? win.y,
  });

  // Pointer events unify mouse + touch, so the same drag works on the
  // desktop canvas and the mobile canvas.
  const handlePointerDown = (e, winId, winX, winY) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    setActiveWinId(winId);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}

    // Don't let a card be dragged up over the header text. Measure the
    // header's real bottom (includes the iOS safe-area inset) and convert it
    // into the canvas coordinate space (design px on desktop = screen px /
    // scale; screen px on mobile where scale is 1).
    const headerEl = document.querySelector('.room-header');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 0;
    const minY = (headerBottom + 6) / scaleRef.current;

    const pos = posMap[winId] ?? { x: winX, y: winY };
    dragRef.current = { id: winId, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, latestX: e.clientX, latestY: e.clientY, minY };

    let rafId = null;

    const onMove = (ev) => {
      if (!dragRef.current) return;
      dragRef.current.latestX = ev.clientX;
      dragRef.current.latestY = ev.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!dragRef.current) return;
        const dx = (dragRef.current.latestX - dragRef.current.startX) / scaleRef.current;
        const dy = (dragRef.current.latestY - dragRef.current.startY) / scaleRef.current;
        setPosMap(prev => ({
          ...prev,
          [dragRef.current.id]: {
            x: dragRef.current.origX + dx,
            y: Math.max(dragRef.current.minY, dragRef.current.origY + dy),
          },
        }));
      });
    };

    const onUp = () => {
      dragRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDraftImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    const win = {
      username: nickname || 'you',
      shape: draftShape,
      text: draftText,
      image: draftImage,
      x: 60,
      y: 60,
      width: draftShape === 'circle' ? 458 : 450,
      height: draftShape === 'circle' ? 278 : 278,
    };
    setMyWindow(win);
    localStorage.setItem('myRoomWindow', JSON.stringify(win));
    setShowCreateModal(false);
  };

  const handleDelete = () => {
    setMyWindow(null);
    localStorage.removeItem('myRoomWindow');
    setPositions(prev => { const next = { ...prev }; delete next['mine']; return next; });
    setMobilePositions(prev => { const next = { ...prev }; delete next['mine']; return next; });
  };

  const allWindows = [
    ...INITIAL_MOCK.map(w => (isMobile && MOBILE_GEO[w.id]) ? { ...w, ...MOBILE_GEO[w.id] } : w),
    ...(myWindow ? [{ id: 'mine', ...myWindow, ...(isMobile ? MINE_MOBILE_GEO : {}) }] : []),
  ];

  return (
    <div className={`light-work-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <FilmGrain intensityScale={0.5} />

      <div className="room-header">
        <span className="room-title">The Room</span>
        <span className="room-description">{isMobile
          ? "a room for the night. it disappears by 5 am."
          : "a room for the night. leave a note about what you're working on, what you're listening to, or just that you're here. it disappears by 5 am."}</span>
      </div>

      <div className="room-online">
        <span className="online-star">*</span>
        <span className="online-label">{onlineCount} online</span>
      </div>

      <div className="room-canvas">
        <div
          className="room-canvas-inner"
          ref={canvasInnerRef}
        >
          {allWindows.map((win) => {
            const pos = getPos(win);
            const isCircle = win.shape === 'circle';

            return (
              <div
                key={win.id}
                className="window-wrapper"
                style={{ left: pos.x, top: pos.y, width: win.width, height: win.height + 24, zIndex: activeWinId === win.id ? 10 : 1 }}
                onPointerDown={(e) => handlePointerDown(e, win.id, win.x, win.y)}
              >
                <span className={`window-username ${isCircle ? 'username-center' : 'username-right'}`}>
                  {win.username}
                </span>

                {win.id === 'mine' && (
                  <button className="window-delete" onClick={handleDelete}>×</button>
                )}
                {isCircle ? (
                  <div className="circle-window-wrap" style={{ position: 'relative', width: win.width, height: win.height, flexShrink: 0 }}>
                    <div className="user-window circle-window" style={{ width: win.width, height: win.height }}>
                      {(win.image || win.text) && (
                        <div className="window-content">
                          {win.image && <img src={win.image} alt="" className="window-image" />}
                          {win.text && <p className="window-text">{win.text}</p>}
                        </div>
                      )}
                    </div>
                    <DashedEllipse />
                  </div>
                ) : (
                  <div className="user-window rect-window" style={{ width: win.width, height: win.height }}>
                    <DashedRect />
                    {(win.image || win.text) && (
                      <div className="window-content">
                        {win.image && <img src={win.image} alt="" className="window-image" />}
                        {win.text && <p className="window-text">{win.text}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!myWindow && (
        <button className="create-window-btn" onClick={() => setShowCreateModal(true)}>
          + share
        </button>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="create-modal"
            onClick={e => e.stopPropagation()}
            style={{ backgroundImage: `url(${isDarkMode ? memo2Svg : memoSvg})` }}
          >
            {/* runs along the right roof line */}
            <p className="modal-title">share something{nickname ? `, ${nickname}` : ''}</p>

            <div className="modal-body">
              <div className="shape-picker">
                <span className="shape-label">choose a shape:</span>
                <button className="shape-btn" onClick={() => setDraftShape('circle')} aria-label="circle">
                  <svg width="34" height="21" viewBox="0 0 48 30" fill="none">
                    <ellipse className="shape-outline" cx="24" cy="15" rx="21" ry="12"
                      strokeWidth={draftShape === 'circle' ? '0.7' : '1'}
                      strokeDasharray={draftShape === 'circle' ? undefined : '4 3'}
                    />
                  </svg>
                </button>
                <button className="shape-btn" onClick={() => setDraftShape('rect')} aria-label="rect">
                  <svg width="28" height="21" viewBox="0 0 40 30" fill="none">
                    <rect className="shape-outline" x="1.5" y="1.5" width="37" height="27" rx="1"
                      strokeWidth={draftShape === 'rect' ? '0.7' : '1'}
                      strokeDasharray={draftShape === 'rect' ? undefined : '4 3'}
                    />
                  </svg>
                </button>
              </div>

              <div className="draft-text-wrap">
                <textarea
                  className="draft-text"
                  placeholder="what are you up to tonight?"
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                />
                <div className="modal-lines" aria-hidden="true">
                  <div className="note-line-row"><hr className="modal-divider" /></div>
                </div>
              </div>

              <div className="image-upload-area" onClick={() => fileInputRef.current?.click()}>
                {draftImage
                  ? <img src={draftImage} alt="" className="draft-image-preview" />
                  : <span>add a photo</span>}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>

              <div className="modal-actions">
                <button className="modal-cancel" onClick={() => setShowCreateModal(false)}>cancel</button>
                <button className="modal-submit" onClick={handleCreate}>save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mode-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
        <img src={isDarkMode ? sunSvg : moonSvg} width="30" height="30" alt="" style={{ display: 'block' }} />
      </div>

      <div className="home-btn" onClick={() => navigate('/home')}>back</div>
    </div>
  );
}

export default TheRoom;
