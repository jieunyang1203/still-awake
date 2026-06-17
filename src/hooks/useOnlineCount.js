import { useState, useEffect, useCallback } from 'react';

function getOrInit(key, min, max) {
  const stored = localStorage.getItem(key);
  if (stored !== null) {
    const n = parseInt(stored, 10);
    if (n >= min && n <= max) return n;
  }
  const initial = Math.floor(Math.random() * (max - min + 1)) + min;
  localStorage.setItem(key, String(initial));
  return initial;
}

function useFluctuatingCount(key, min, max) {
  const [count, setCount] = useState(() => getOrInit(key, min, max));

  useEffect(() => {
    const tick = () => {
      setCount(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = Math.min(max, Math.max(min, prev + delta));
        localStorage.setItem(key, String(next));
        return next;
      });
    };
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, [key, min, max]);

  const increment = useCallback(() => {
    setCount(prev => {
      const next = prev + 1;
      localStorage.setItem(key, String(next));
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
