// Prompt 08 — utils/segmentSession.js
// Segments a coding session into thinking, coding, debugging, testing phases

const IDLE_THRESHOLD = 5000; // 5 seconds

/**
 * Segments session events into time phases.
 * @param {Array} events - Array of delta events with ts, type fields
 * @returns {{ thinking: number, coding: number, debugging: number, testing: number }} Time in ms per phase
 */
export function segmentSession(events) {
  const phases = { thinking: 0, coding: 0, debugging: 0, testing: 0 };

  if (!events || events.length < 2) return phases;

  for (let i = 1; i < events.length; i++) {
    const gap = events[i].ts - events[i - 1].ts;

    if (gap > IDLE_THRESHOLD) {
      phases.thinking += gap;
    } else if (events[i].type === 'run') {
      phases.testing += gap;
    } else {
      // Look at last 10 events to determine if debugging
      const windowStart = Math.max(0, i - 10);
      const window = events.slice(windowStart, i + 1);
      const deletes = window.filter(e => e.type === 'delete').length;
      const deleteRatio = deletes / window.length;

      if (deleteRatio > 0.5) {
        phases.debugging += gap;
      } else {
        phases.coding += gap;
      }
    }
  }

  return phases;
}

/**
 * Formats phase data for Recharts consumption.
 * @param {{ thinking: number, coding: number, debugging: number, testing: number }} phases - Phases in ms
 * @returns {Array} Recharts-ready array with values in seconds
 */
export function formatPhases(phases) {
  return [
    {
      name: 'Session',
      thinking: Math.round(phases.thinking / 1000),
      coding: Math.round(phases.coding / 1000),
      debugging: Math.round(phases.debugging / 1000),
      testing: Math.round(phases.testing / 1000),
    },
  ];
}
