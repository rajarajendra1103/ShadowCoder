// Prompt 14 — shared/CountdownTimer.jsx
// Countdown timer for Shadow Coder interview sessions
'use client';

import { useState, useEffect, useRef } from 'react';

export default function CountdownTimer({ durationSeconds, onExpire, onTick }) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current);
          onExpire?.();
          return 0;
        }
        onTick?.(next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [durationSeconds, onExpire, onTick]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isWarning = remaining < 300; // < 5 min
  const isCritical = remaining < 60;  // < 1 min

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span
          className={`font-mono text-lg font-bold transition-colors ${
            isCritical
              ? 'text-red-500 animate-pulse'
              : isWarning
                ? 'text-red-400 animate-pulse'
                : 'text-white'
          }`}
        >
          {display}
        </span>
      </div>
      {isCritical && (
        <span className="text-xs text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full">
          Less than 1 minute!
        </span>
      )}
    </div>
  );
}
