import { useState, useEffect, useCallback } from 'react';

// Counts belong to one "night session". They persist across room navigations
// and reloads (so leaving and coming back doesn't reset them) and only roll
// over when the session changes — a new day, where anything before 5 AM still
// counts as the previous night (matching the app's 1–5 AM hours).
function sessionKey() {
  const now = new Date();
  if (now.getHours() < 5) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return prev.toDateString();
  }
  return now.toDateString();
}

function readStored(key) {
  try {
    const o = JSON.parse(localStorage.getItem(key) || 'null');
    // Accept any numeric value from the current session — NOT bounded by
    // [min,max], because increment() can legitimately push it past max.
    if (o && o.date === sessionKey() && typeof o.value === 'number') return o.value;
  } catch (_) {}
  return null;
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ date: sessionKey(), value }));
  } catch (_) {}
}

function getOrInit(key, min, max) {
  const existing = readStored(key);
  if (existing !== null) return existing;
  const initial = Math.floor(Math.random() * (max - min + 1)) + min;
  writeStored(key, initial);
  return initial;
}

function useFluctuatingCount(key, min, max) {
  const [count, setCount] = useState(() => getOrInit(key, min, max));

  useEffect(() => {
    const tick = () => {
      setCount(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        // Only nudge within the ambient band when we're inside it; never drag a
        // user-incremented value (above max) back down.
        const next = prev > max ? prev : Math.min(max, Math.max(min, prev + delta));
        writeStored(key, next);
        return next;
      });
    };
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, [key, min, max]);

  const increment = useCallback(() => {
    setCount(prev => {
      const next = prev + 1;
      writeStored(key, next);
      return next;
    });
  }, [key]);

  return [count, increment];
}

export function useOnlineCount() {
  return useFluctuatingCount('onlineCount', 3, 18)[0];
}

export function useWrittenCount() {
  return useFluctuatingCount('writtenCount', 2, 6);
}

export function useDrawnCount() {
  return useFluctuatingCount('drawnCount', 2, 6);
}
