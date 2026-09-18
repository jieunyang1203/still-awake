// TheRoom.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineCount } from './hooks/useOnlineCount';
import { DashedRect, DashedEllipse } from './components/DashedBorder';
import FilmGrain from './components/FilmGrain';
import sunSvg from './assets/sun.svg';
import moonSvg from './assets/moon.svg';
import photo1 from './assets/room-photos/1.jpg';
import photo2 from './assets/room-photos/2.jpg';
import photo3 from './assets/room-photos/3.jpg';
import photo4 from './assets/room-photos/4.jpg';
import photo5 from './assets/room-photos/5.jpg';
import photo6 from './assets/room-photos/6.jpg';
import photo7 from './assets/room-photos/7.jpg';
import './TheRoom.css';

const DESIGN_WIDTH = 1650;

// Mobile canvas geometry (px, designed around a ~390px-wide screen). One wide
// card per row, each overlapping the previous a little (stacked-paper feel);
// slight x jitter keeps it from looking like a strict list. Fixed canvas (no
// scroll), so the stack must stay inside ~840px of height.
// Mobile board: a single scrolling column. y is relative to .room-canvas, which
// starts below the fixed header — so 0 is the first card, not a page coordinate.
// The x offsets and the ~30-40px vertical overlaps are what keep it reading as a
// hand-placed collage rather than a list.
const MOBILE_GEO = {
  mock1: { x: 96,  y: 0,   width: 216, height: 130 }, // circle
  mock2: { x: 12,  y: 100, width: 238, height: 138 }, // rect  — tucks under mock1
  mock3: { x: 166, y: 192, width: 220, height: 134 }, // circle — beside mock2's tail
  mock4: { x: 34,  y: 284, width: 252, height: 122 }, // rect  — wide left
  mock5: { x: 150, y: 374, width: 226, height: 132 }, // rect  — right
  mock6: { x: 8,   y: 456, width: 224, height: 136 }, // circle — beside mock5
  mock7: { x: 84,  y: 534, width: 244, height: 112 }, // rect  — centre
};
// Your own card goes at the TOP of the column and pushes the mocks down. Sized
// to the mock range (216-252 wide, 112-138 tall) rather than the old 168x106,
// which made a new card visibly smaller than everything around it.
const MINE_MOBILE_GEO = {
  circle: { x: 62, y: 0, width: 220, height: 132 },
  rect:   { x: 42, y: 0, width: 240, height: 130 },
};
// How far the mocks drop to make room: mine's height plus its name strip, minus
// the overlap the rest of the stack uses.
const MINE_PUSH = 114;

// Drop snapping. The board is meant to look hand-placed, so cards are NOT
// forced onto a grid while dragging — they only settle on release: if an edge
// (or center) lands close to another card's matching edge it clicks flush,
// otherwise it rounds to a coarse grid. Enough alignment to stop the board
// drifting into noise, loose enough that it still reads as free placement.
const SNAP_TOLERANCE = 14; // design px — within this, edges click together
const SNAP_GRID = 20;      // fallback rounding when nothing is nearby
// Travel a pointer must cover before it counts as a drag rather than a tap.
// A finger never holds still, so a plain tap reports a pixel or two; without
// this, merely touching a card stored a position for it.
const DRAG_THRESHOLD = 3;

// Strip the am/pm for the on-card label: the room only exists between 1 and
// 5 am, so four digits are unambiguous there and stay a tidy fixed width. The
// stored value keeps its suffix — this is display only.
const hhmm = (t = '') => t.replace(/(am|pm)$/i, '');

// Format a Date as "01:20pm" — zero-padded 12-hour, no space before am/pm.
const fmtTime = (d = new Date()) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${ap}`;
};

const INITIAL_MOCK = [
  { id: 'mock1', username: 'miwoo', shape: 'circle', x: 80, y: 90, width: 450, height: 290, text: 'look at my cat!', image: photo4, time: '01:12am' },
  { id: 'mock2', username: '@nn', shape: 'rect', x: 540, y: 70, width: 480, height: 265, text: 'love caffeine', image: photo1, time: '02:03am' },
  { id: 'mock3', username: 'teddy', shape: 'circle', x: 1090, y: 120, width: 400, height: 340, text: '', image: photo6, time: '01:47am' },
  { id: 'mock4', username: 'jen', shape: 'rect', x: 180, y: 430, width: 430, height: 300, text: 'doodling', image: photo3, time: '03:20am' },
  { id: 'mock5', username: 'owo', shape: 'rect', x: 1110, y: 450, width: 410, height: 320, text: 'a little snack for the night\n<33', image: photo7, time: '04:05am' },
  { id: 'mock6', username: 'h1234', shape: 'circle', x: 640, y: 390, width: 470, height: 270, text: '', image: photo2, time: '02:38am' },
  { id: 'mock7', username: 'user23', shape: 'rect', x: 440, y: 600, width: 460, height: 280, text: 'a petal from my walk today', image: photo5, time: '03:55am' },
];

function TheRoom() {
  const navigate = useNavigate();
  const nickname = localStorage.getItem('nickname') || '';
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const onlineCount = useOnlineCount();

  const [myWindow, setMyWindow] = useState(() => {
    try { return JSON.parse(localStorage.getItem('myRoomWindow') || 'null'); }
    catch (_) { return null; }
  });

  const [positions, setPositions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('roomPositions-v2') || '{}'); }
    catch (_) { return {}; }
  });
  // Mobile drags are stored separately so they don't corrupt the desktop
  // canvas coordinates (different layout / coordinate space).
  const [mobilePositions, setMobilePositions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('roomPositionsMobile-v3') || '{}'); }
    catch (_) { return {}; }
  });
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 480);

  const [activeWinId, setActiveWinId] = useState(null);
  // Separate from activeWinId (which stays set after a drop to keep the card on
  // top): this drives the snap transition, so it must clear on release.
  const [draggingId, setDraggingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftImage, setDraftImage] = useState(null);
  const [draftShape, setDraftShape] = useState('circle');
  const fileInputRef = useRef(null);
  const dragRef = useRef(null);
  // True while a Korean (or any IME) syllable is mid-composition — see the
  // textarea below.
  const composingRef = useRef(false);

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
        // desktop scales the 1650px design down to fit the window. The board is
        // a composed layout, so cropping it would break the composition — it
        // shrinks instead.
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
  useEffect(() => { try { localStorage.setItem('roomPositions-v2', JSON.stringify(positions)); } catch (_) {} }, [positions]);
  useEffect(() => { try { localStorage.setItem('roomPositionsMobile-v3', JSON.stringify(mobilePositions)); } catch (_) {} }, [mobilePositions]);

  const posMap = isMobile ? mobilePositions : positions;
  const setPosMap = isMobile ? setMobilePositions : setPositions;

  const getPos = (win) => ({
    x: posMap[win.id]?.x ?? win.x,
    y: posMap[win.id]?.y ?? win.y,
  });

  // A drag's pointerup handler outlives the render it was created in, so it
  // can't read posMap / allWindows from that closure (they'd be stale by the
  // time the card is dropped). Refs, refreshed every render, stay current.
  const posMapRef = useRef(posMap);
  posMapRef.current = posMap;
  const windowsRef = useRef([]);

  // Where a card comes to rest: nearest matching edge on a neighbour if one is
  // within tolerance (left/right/center on each axis), else the coarse grid.
  const snapPosition = (id, raw, minY) => {
    const me = windowsRef.current.find(w => w.id === id);
    if (!me) return raw;

    const others = windowsRef.current
      .filter(w => w.id !== id)
      .map(w => {
        const p = posMapRef.current[w.id] ?? { x: w.x, y: w.y };
        return { x: p.x, y: p.y, w: w.width, h: w.height };
      });

    const pick = (value, candidates) => {
      let best = null;
      let bestDist = SNAP_TOLERANCE;
      for (const c of candidates) {
        const d = Math.abs(value - c);
        if (d < bestDist) { bestDist = d; best = c; }
      }
      return best ?? Math.round(value / SNAP_GRID) * SNAP_GRID;
    };

    const x = pick(raw.x, others.flatMap(o => [
      o.x,                              // left edges flush
      o.x + o.w - me.width,             // right edges flush
      o.x + o.w / 2 - me.width / 2,     // centers aligned
    ]));
    const y = pick(raw.y, others.flatMap(o => [
      o.y,
      o.y + o.h - me.height,
      o.y + o.h / 2 - me.height / 2,
    ]));

    return { x, y: Math.max(minY, y) };
  };

  // Drop every card back onto the composed layout — clearing the stored
  // positions makes getPos fall through to each card's authored x/y.
  const handleTidy = () => {
    setPosMap({});
    setActiveWinId(null);
  };

  // Pointer events unify mouse + touch, so the same drag works on the
  // desktop canvas and the mobile canvas.
  const handlePointerDown = (e, winId, winX, winY) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    setActiveWinId(winId);
    setDraggingId(winId);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}

    // Floor for a card's y, so nothing can be dragged up over the header text.
    // It MUST be expressed in the same coordinate space as the card's y:
    //   desktop — .room-canvas is inset:0, so canvas y is viewport y / scale
    //             and the header's viewport bottom converts straight across.
    //   mobile  — .room-canvas starts BELOW the header and scrolls, so a card's
    //             y is already relative to that. There is no header inside the
    //             canvas to avoid and the floor is simply 0.
    // Using the viewport value on mobile mixed the two spaces: every touched
    // card was clamped to y >= ~125 (the header's height) inside a canvas whose
    // own origin was already at 119px, shoving it down by a header's worth and
    // pushing the whole column with it — indistinguishable from a new card
    // being inserted, and permanent, because the clamped value was stored.
    const headerEl = document.querySelector('.room-header');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 0;
    const minY = isMobile ? 0 : (headerBottom + 6) / scaleRef.current;

    const pos = posMap[winId] ?? { x: winX, y: winY };
    dragRef.current = { id: winId, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, latestX: e.clientX, latestY: e.clientY, minY, moved: false };

    let rafId = null;

    const onMove = (ev) => {
      const live = dragRef.current;
      if (!live) return;
      live.latestX = ev.clientX;
      live.latestY = ev.clientY;
      // Tap-vs-drag is decided HERE, synchronously, not in the rAF callback
      // below: a quick flick can deliver all of its moves and the pointerup
      // inside a single frame, and by the time the frame ran dragRef was
      // already cleared — so the flag never got set and the whole drag was
      // thrown away. Only the setState needs to be throttled to a frame.
      if (!live.moved) {
        const mdx = (ev.clientX - live.startX) / scaleRef.current;
        const mdy = (ev.clientY - live.startY) / scaleRef.current;
        if (Math.abs(mdx) < DRAG_THRESHOLD && Math.abs(mdy) < DRAG_THRESHOLD) return;
        live.moved = true;
      }
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        // Snapshot before setState: the updater runs later, and a fast tap can
        // null dragRef (pointerup) in between — dereferencing it there crashed
        // the whole app to a white screen on mobile.
        const drag = dragRef.current;
        if (!drag) return;
        if (!drag.moved) return;
        const dx = (drag.latestX - drag.startX) / scaleRef.current;
        const dy = (drag.latestY - drag.startY) / scaleRef.current;
        const next = {
          x: drag.origX + dx,
          y: Math.max(drag.minY, drag.origY + dy),
        };
        setPosMap(prev => ({ ...prev, [drag.id]: next }));
      });
    };

    const onUp = () => {
      // Snapshot before clearing, for the same reason as in onMove.
      const drag = dragRef.current;
      dragRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDraggingId(null);
      if (!drag) return;

      // A tap must not move anything, and must not write a stored position
      // either — same flag onMove uses, so the two can't disagree.
      if (!drag.moved) return;

      // Settle the card: recompute where the pointer left it, then snap.
      const dx = (drag.latestX - drag.startX) / scaleRef.current;
      const dy = (drag.latestY - drag.startY) / scaleRef.current;
      const raw = { x: drag.origX + dx, y: Math.max(drag.minY, drag.origY + dy) };
      setPosMap(prev => ({ ...prev, [drag.id]: snapPosition(drag.id, raw, drag.minY) }));
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Downscale to a small JPEG before storing — full-res phone photos as
      // base64 blow past the localStorage quota and the memory budget on iOS
      // (which crashes the tab to a white screen).
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        let { width, height } = img;
        if (width >= height && width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        else if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          setDraftImage(canvas.toDataURL('image/jpeg', 0.82));
        } catch (_) {
          setDraftImage(ev.target.result);
        }
      };
      img.onerror = () => setDraftImage(ev.target.result);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const openCreate = () => {
    setDraftText('');
    setDraftImage(null);
    setDraftShape('circle');
    setShowCreateModal(true);
  };

  const handleEdit = () => {
    if (!myWindow) return;
    setDraftText(myWindow.text || '');
    setDraftImage(myWindow.image || null);
    setDraftShape(myWindow.shape || 'circle');
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
  };

  const handleCreate = () => {
    // A card with neither a photo nor any text renders as an empty dashed
    // outline: easy to miss, but it still takes its full height and pushes the
    // rest of the mobile column down by MINE_PUSH, which reads as a big blank
    // gap under the header rather than as a card. Save just does nothing —
    // there is deliberately no hint text.
    if (!draftText.trim() && !draftImage) return;
    // Editing keeps the card's existing canvas position (stored separately in
    // the positions map under 'mine'); only the content/shape changes.
    const win = {
      username: nickname || 'you',
      shape: draftShape,
      text: draftText,
      image: draftImage,
      x: myWindow?.x ?? 60,
      y: myWindow?.y ?? 60,
      width: draftShape === 'circle' ? 458 : 450,
      height: 278,
      // Keep the original post time when editing; stamp it once on create.
      time: myWindow?.time ?? fmtTime(),
    };
    setMyWindow(win);
    try { localStorage.setItem('myRoomWindow', JSON.stringify(win)); } catch (_) {}
    closeModal();
  };

  // Buttons inside a card must not start a drag (the wrapper's pointerdown
  // otherwise captures the pointer and swallows the click).
  const stopDrag = (e) => e.stopPropagation();

  const handleDelete = () => {
    setMyWindow(null);
    localStorage.removeItem('myRoomWindow');
    setPositions(prev => { const next = { ...prev }; delete next['mine']; return next; });
    setMobilePositions(prev => { const next = { ...prev }; delete next['mine']; return next; });
  };

  // On mobile your card is inserted at the top of the column, so everything else
  // shifts down by MINE_PUSH. It still comes LAST in the array, which keeps it
  // painting above its neighbours where they overlap.
  const minePush = isMobile && myWindow ? MINE_PUSH : 0;
  const allWindows = [
    ...INITIAL_MOCK.map(w => (isMobile && MOBILE_GEO[w.id])
      ? { ...w, ...MOBILE_GEO[w.id], y: MOBILE_GEO[w.id].y + minePush }
      : w),
    ...(myWindow ? [{
      id: 'mine',
      ...myWindow,
      ...(isMobile ? MINE_MOBILE_GEO[myWindow.shape === 'circle' ? 'circle' : 'rect'] : {}),
    }] : []),
  ];
  // Sizes the snap needs on drop (mobile geometry already merged in).
  windowsRef.current = allWindows;

  const mobileStackHeight = isMobile
    ? Math.max(...allWindows.map(w => getPos(w).y + w.height)) + 48
    : undefined;

  return (
    <div className={`light-work-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <FilmGrain intensityScale={0.5} />

      <div className="room-header">
        <span className="room-title">The Room</span>
        <div className="room-online">
          <span className="online-star">*</span>
          <span className="online-label">{String(onlineCount).padStart(2, '0')} online</span>
        </div>
        <span className="room-description">a room for the night. leave a note about what you're working on, what you're listening to, or just that you're here. it disappears by 5 am.</span>
      </div>

      <div className="room-canvas">
        <div
          className="room-canvas-inner"
          ref={canvasInnerRef}
          /* Absolutely positioned cards contribute nothing to their parent's
             height, so the scroll container needs it measured from the cards
             themselves — including any they've been dragged to. */
          style={isMobile ? { height: mobileStackHeight } : undefined}
        >
          {allWindows.map((win) => {
            const pos = getPos(win);
            const isCircle = win.shape === 'circle';

            return (
              <div
                key={win.id}
                className={`window-wrapper${draggingId === win.id ? ' dragging' : ''}`}
                style={{ left: pos.x, top: pos.y, width: win.width, height: win.height + 24, zIndex: activeWinId === win.id ? 10 : 1 }}
                onPointerDown={(e) => handlePointerDown(e, win.id, win.x, win.y)}
              >
                <div className="window-namebar">
                  <span className="window-username">{win.username}</span>
                  <span className="window-time">[{hhmm(win.time)}]</span>
                </div>

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
                    {win.id === 'mine' && (
                      <>
                        <button className="card-btn card-x circle-x" onPointerDown={stopDrag} onClick={handleDelete} aria-label="delete">×</button>
                        <button className="card-btn card-edit circle-edit" onPointerDown={stopDrag} onClick={handleEdit}>edit</button>
                      </>
                    )}
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
                    {win.id === 'mine' && (
                      <>
                        <button className="card-btn card-x rect-x" onPointerDown={stopDrag} onClick={handleDelete} aria-label="delete">×</button>
                        <button className="card-btn card-edit rect-edit" onPointerDown={stopDrag} onClick={handleEdit}>edit</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Only offered once something has actually been moved — the room starts
          in its composed layout, so an always-visible "tidy" would be noise. */}
      {Object.keys(posMap).length > 0 && (
        <button className="tidy-btn" onClick={handleTidy}>tidy up</button>
      )}

      {!myWindow && (
        <button className="create-window-btn" onClick={openCreate}>
          share
        </button>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`create-modal ${draftShape === 'circle' ? 'is-circle' : 'is-rect'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-top">
              {/* Shape selector. The glyph is the shape you GET by pressing it,
                  so it always shows the alternative to the frame below — which
                  is why the mockup pairs a round glyph with a square frame. */}
              <button
                className="shape-toggle"
                onClick={() => setDraftShape(sh => (sh === 'circle' ? 'rect' : 'circle'))}
                aria-label={draftShape === 'circle' ? 'use a rectangular card' : 'use a round card'}
              >
                {draftShape === 'circle' ? (
                  <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                    <rect className="shape-outline" x="0.5" y="0.5" width="25" height="19" rx="1"
                      strokeWidth="1" strokeDasharray="3 2.4" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle className="shape-outline" cx="11" cy="11" r="10.5"
                      strokeWidth="1" strokeDasharray="3 2.4" />
                  </svg>
                )}
              </button>
            </div>

            {/* Dashed frame follows the selected shape, so the panel previews
                the card you are about to put on the board. */}
            <div className="image-upload-area" onClick={() => fileInputRef.current?.click()}>
              {draftShape === 'circle'
                ? <DashedEllipse strokeWidth={1} dash="5.5 4" />
                : <DashedRect strokeWidth={1} dash="5.5 4" rx={1} />}
              {draftImage
                ? <img src={draftImage} alt="" className="draft-image-preview" />
                : <span className="upload-label">add a photo</span>}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </div>

            <div className="draft-text-wrap">
              <textarea
                className="draft-text"
                placeholder="what are you up to tonight?"
                value={draftText}
                /* IME handling. This is a CONTROLLED textarea, so React writes
                   the state back into the DOM on every render. While a Hangul
                   syllable is being composed the DOM holds a partial glyph, and
                   a re-render that puts a stale value back cancels or doubles
                   the composition — the field "won't take Korean".
                   The rule is: never transform the value, and always mirror
                   exactly what the DOM has, including mid-composition. The
                   compositionend handler re-syncs because Safari fires it AFTER
                   the last input event, so the final syllable would otherwise
                   be dropped. This was the only text field in the app with no
                   composition handling at all. */
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={e => { composingRef.current = false; setDraftText(e.target.value); }}
                onChange={e => setDraftText(e.target.value)}
              />
              {/* One rule under each of the three note lines */}
              <div className="modal-lines" aria-hidden="true">
                <div className="note-line-row"><hr className="modal-divider" /></div>
                <div className="note-line-row"><hr className="modal-divider" /></div>
                <div className="note-line-row"><hr className="modal-divider" /></div>
              </div>
            </div>

            {/* Same slots as the page behind: close where "back" sits,
                save where "share" sits. */}
            <div className="modal-actions">
              <button className="modal-close" onClick={closeModal}>close</button>
              <button className="modal-submit" onClick={handleCreate}>save</button>
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
