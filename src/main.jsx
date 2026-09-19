import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Home from './Home.jsx'
import TheRoom from './TheRoom.jsx'
import Whisper from './Whisper.jsx'
import Scribble from './Scribble.jsx'
import './index.css'

// Kick the two big route-specific downloads off at boot, before React renders.
// Both used to start only once a component effect ran, which put them behind
// mount + first paint; the landing's clock was the worst case, because its
// chain was fully serial — effect, then p5, then (only then) the Dotline face
// it draws the numerals in, which meant Dotline's request did not even begin
// until ~2.3s in.
// Split by route on purpose: p5 (~260K gzipped) is the landing clock's alone,
// and JSoye (333K) is the Korean face every OTHER page shows immediately.
// Requesting both everywhere would just make them compete.
{
  const hash = window.location.hash;
  const onLanding = !hash || /^#\/?(\?|$)/.test(hash);
  if (onLanding) {
    import('p5');
    // Runs in parallel with p5 now instead of after it.
    try { document.fonts.load('1em Dotline'); } catch (_) {}
  } else {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = '';
    link.href = `${import.meta.env.BASE_URL}fonts/JSoye-Light.woff2`;
    document.head.appendChild(link);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/home" element={<Home />} />
        <Route path="/the-room" element={<TheRoom />} />
        <Route path="/whisper" element={<Whisper />} />
        <Route path="/scribble" element={<Scribble />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)