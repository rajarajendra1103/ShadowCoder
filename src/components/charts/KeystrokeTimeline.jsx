// Prompt 13 — components/charts/KeystrokeTimeline.jsx
// Horizontal timeline showing paste events and keystroke density for Shadow Coder
'use client';

import { useMemo } from 'react';
import { formatTime } from '@/src/utils/formatTime';

export default function KeystrokeTimeline({ events, duration, onFlagClick, currentTime }) {
  const t0 = useMemo(() => {
    if (!events || events.length === 0) return 0;
    return Number(events[0].ts);
  }, [events]);

  const pasteEvents = useMemo(() => {
    if (!events || events.length === 0 || duration <= 0) return [];
    return events
      .filter(e => e.type === 'paste')
      .map(e => ({
        ...e,
        position: ((Number(e.ts) - t0) / duration) * 100,
        timeFormatted: formatTime(Number(e.ts) - t0),
      }));
  }, [events, duration, t0]);

  // Compute typing activity density in 80 time buckets
  const densityBars = useMemo(() => {
    if (!events || events.length === 0 || duration <= 0) return [];
    
    const BINS_COUNT = 80;
    const bins = new Array(BINS_COUNT).fill(0);
    
    events.forEach(e => {
      if (e.type === 'insert' || e.type === 'delete') {
        const elapsed = Number(e.ts) - t0;
        const binIndex = Math.min(
          Math.floor((elapsed / duration) * BINS_COUNT),
          BINS_COUNT - 1
        );
        if (binIndex >= 0) {
          bins[binIndex]++;
        }
      }
    });
    
    const maxVal = Math.max(...bins, 1);
    return bins.map((count) => ({
      height: (count / maxVal) * 100,
      opacity: count > 0 ? 0.2 + (count / maxVal) * 0.6 : 0.02,
    }));
  }, [events, duration, t0]);

  const progressPosition = useMemo(() => {
    if (!currentTime || !duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Keystroke Activity Timeline</h3>
        <span className="text-xs text-gray-500">Visualizes typing density &amp; paste alerts</span>
      </div>

      {/* Timeline bar */}
      <div className="relative w-full h-14 bg-gray-950/80 border border-gray-800 rounded-lg overflow-hidden mb-3 flex items-end px-1.5">
        {/* Background Keystroke Density Waves */}
        <div className="absolute inset-0 flex items-end justify-between pointer-events-none py-1">
          {densityBars.map((bar, i) => (
            <div
              key={i}
              className="bg-blue-500 rounded-t-[1px]"
              style={{
                width: `${100 / densityBars.length}%`,
                height: `${Math.max(bar.height, 4)}%`, // minimum height for visibility
                opacity: bar.opacity,
                marginRight: '1.5px',
              }}
            />
          ))}
        </div>

        {/* Progress indicator */}
        {currentTime > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-blue-400 z-10 transition-all duration-100"
            style={{ left: `${progressPosition}%` }}
          />
        )}

        {/* Paste markers */}
        {pasteEvents.map((e, i) => (
          <div
            key={i}
            className="absolute top-1 bottom-1 w-1 bg-amber-500 rounded-full cursor-pointer hover:bg-amber-400 hover:w-1.5 transition-all group z-20"
            style={{ left: `${e.position}%` }}
            onClick={() => onFlagClick?.(e)}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30">
              <div className="bg-gray-800 border border-gray-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap shadow-lg">
                Paste at {e.timeFormatted}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paste events list */}
      {pasteEvents.length > 0 ? (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {pasteEvents.map((e, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-3 text-xs py-1.5 px-2 rounded-md hover:bg-gray-800/50 text-left transition-colors"
              onClick={() => onFlagClick?.(e)}
            >
              <span className="text-amber-400 font-mono font-medium">{e.timeFormatted}</span>
              <span className="text-gray-400">
                Paste event flagged at line {e.line || '?'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">No paste events flagged during this session</p>
      )}
    </div>
  );
}
