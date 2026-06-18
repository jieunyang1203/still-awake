// Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FilmGrain from './components/FilmGrain';
import { DashedEllipse } from './components/DashedBorder';
import { useOnlineCount } from './hooks/useOnlineCount';
import './Home.css';
import houseSvg from './assets/house.svg';
import sunSvg from './assets/sun.svg';
import moonSvg from './assets/moon.svg';

function Home() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilOpen, setTimeUntilOpen] = useState('');
  const [starStates, setStarStates] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Get dark mode from localStorage
    return localStorage.getItem('darkMode') === 'true';
  });
  const nickname = localStorage.getItem('nickname') || '';
  const onlineCount = useOnlineCount();

  // Keep the body backdrop (iOS status-bar / safe-area region) in sync with theme
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);

      // Calculate time until 1:00 AM
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();

      let hoursUntil, minutesUntil, secondsUntil;

      if (currentHour >= 1 && currentHour < 5) {
        // Currently open (1 AM - 5 AM)
        setTimeUntilOpen('Open now');
      } else {
        // Calculate time until 1:00 AM
        if (currentHour >= 5) {
          // After 5 AM, count to next day's 1 AM
          hoursUntil = (25 - currentHour);
        } else {
          // Before 1 AM (midnight to 1 AM), count to today's 1 AM
          hoursUntil = (1 - currentHour);
        }

        minutesUntil = 60 - currentMinute - 1;
        secondsUntil = 60 - currentSecond;

        if (secondsUntil === 60) {
          secondsUntil = 0;
          minutesUntil += 1;
        }

        if (minutesUntil === 60) {
          minutesUntil = 0;
          hoursUntil += 1;
        }

        // Format as HH:MM:SS
        const formatted = `${String(hoursUntil).padStart(2, '0')}:${String(minutesUntil).padStart(2, '0')}:${String(secondsUntil).padStart(2, '0')}`;
        setTimeUntilOpen(formatted);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  // Total 8 stars but max 5 visible at once
  const stars = Array.from({ length: 8 }, (_, i) => i);

  // Initialize star animation states
  useEffect(() => {
    let visibleCount = 0;
    const initialStates = stars.map((_, index) => {
      // Determine initial visibility (max 5)
      const shouldBeVisible = visibleCount < 5 && Math.random() > 0.4;
      if (shouldBeVisible) visibleCount++;

      // House SVG is centered and VERY wide (140vw max), so only use very top and edges
      // Only use TOP 15% and far edges to completely avoid SVG
      const zones = [
        // Very top-left corner only
        () => ({ top: 3 + Math.random() * 12, left: 2 + Math.random() * 8 }),
        // Very top-right corner only (below clock)
        () => ({ top: 18 + Math.random() * 10, left: 88 + Math.random() * 10 }),
        // Top center-left edge
        () => ({ top: 3 + Math.random() * 12, left: 15 + Math.random() * 15 }),
        // Top center-right edge (avoiding clock)
        () => ({ top: 3 + Math.random() * 12, left: 60 + Math.random() * 15 }),
      ];

      // Pick zone based on index for even distribution
      const zoneIndex = index % zones.length;
      const safeZones = [zones[zoneIndex]];

      const position = safeZones[index % safeZones.length]();

      return {
        opacity: shouldBeVisible ? 1 : 0,
        top: position.top,
        left: position.left,
        lastChange: Date.now(),
      };
    });
    setStarStates(initialStates);
  }, []);

  // Animate stars - max 5 visible at once
  useEffect(() => {
    const zones = [
      () => ({ top: 3 + Math.random() * 12, left: 2 + Math.random() * 8 }),
      () => ({ top: 18 + Math.random() * 10, left: 88 + Math.random() * 10 }),
      () => ({ top: 3 + Math.random() * 12, left: 15 + Math.random() * 15 }),
      () => ({ top: 3 + Math.random() * 12, left: 60 + Math.random() * 15 }),
    ];

    const interval = setInterval(() => {
      setStarStates(prevStates => {
        const currentTime = Date.now();
        const visibleCount = prevStates.filter(s => s.opacity === 1).length;
        let changed = false;

        const next = prevStates.map((state) => {
          if (currentTime - state.lastChange < 2000) return state;
          if (state.opacity === 1 && Math.random() > 0.75) {
            changed = true;
            return { ...state, opacity: 0, lastChange: currentTime };
          }
          if (state.opacity === 0 && visibleCount < 5 && Math.random() > 0.7) {
            changed = true;
            const position = zones[Math.floor(Math.random() * zones.length)]();
            return { opacity: 1, top: position.top, left: position.left, lastChange: currentTime };
          }
          return state;
        });

        return changed ? next : prevStates;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`home-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <FilmGrain intensityScale={0.5} />
      <div className="home-container">
        {/* Background stars in the sky with teleport animation */}
        {stars.map((_, index) => (
          <span
            key={index}
            className={`star ${isDarkMode ? 'dark-mode-star' : ''}`}
            style={{
              position: 'absolute',
              top: `${starStates[index]?.top || 10}%`,
              left: `${starStates[index]?.left || 50}%`,
              fontSize: '25px',
              fontFamily: 'PPEditorialNew',
              color: isDarkMode ? '#F3F3F3' : 'black',
              opacity: starStates[index]?.opacity || 0,
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0,
              transition: 'opacity 0.1s step-end',
            }}
          >
            *
          </span>
        ))}

        <div className="top-content">
          <p className="access-text">
            <span className="access-restricted">Access restricted to 1:00 AM - 5:00 AM.&nbsp;&nbsp;</span>Current time: [{formatTime(currentTime)}].{timeUntilOpen !== 'Open now' && ` Hours until opening: [${timeUntilOpen}]`}
          </p>
          {nickname && (
            <span className="home-greeting">Hello, {nickname}</span>
          )}
        </div>
        {/* 여기에 나중에 콘텐츠 추가 */}
        <div className="house-container">
          <img src={houseSvg} alt="House" className="house-icon" />
          {/* Mobile-only inline SVG — drawn to fit container, no distortion */}
          <svg
            className="house-mobile-svg"
            viewBox="0 0 393 596"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="0" y1="192.4" x2="196.5" y2="0" strokeWidth="0.75" vectorEffect="non-scaling-stroke"/>
            <line x1="393" y1="192.4" x2="196.5" y2="0" strokeWidth="0.75" vectorEffect="non-scaling-stroke"/>
            <line x1="20.5" y1="209" x2="20.5" y2="595" strokeWidth="0.75" vectorEffect="non-scaling-stroke"/>
            <line x1="372.5" y1="209" x2="372.5" y2="595" strokeWidth="0.75" vectorEffect="non-scaling-stroke"/>
            <line x1="20.5" y1="595" x2="372.5" y2="595" strokeWidth="0.75" vectorEffect="non-scaling-stroke"/>
          </svg>
          <div className="house-online-count">
            <span className="online-text">({onlineCount} online)</span>
          </div>
          <div className="dashed-boxes">
            <div className="dashed-box dashed-box-top" onClick={() => navigate('/the-room')}>
              <DashedEllipse />
              <span className="box-text">The Room</span>
            </div>
            <div className="dashed-boxes-bottom">
              <div className="dashed-box" onClick={() => navigate('/whisper')}>
                <DashedEllipse />
                <span className="box-text">Whisper..</span>
              </div>
              <div className="dashed-box" onClick={() => navigate('/scribble')}>
                <DashedEllipse />
                <span className="box-text">Scribble</span>
              </div>
            </div>
          </div>
        </div>
        {/* Dark/Light mode toggle */}
        <div className="mode-toggle" onClick={() => { setIsDarkMode(!isDarkMode); localStorage.setItem('darkMode', !isDarkMode ? 'true' : 'false'); }}>
          <img src={isDarkMode ? sunSvg : moonSvg} width="30" height="30" alt="" style={{ display: 'block' }} />
        </div>
      </div>
    </div>
  );
}

export default Home;