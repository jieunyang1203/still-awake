import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Home from './Home.jsx'
import TheRoom from './TheRoom.jsx'
import Whisper from './Whisper.jsx'
import Scribble from './Scribble.jsx'
import './index.css'

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