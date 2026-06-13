// Modified Prompt 07/11 — hooks/useCodingMetrics.js
// Comprehensive coding metrics tracker for Shadow Coder
// Replaces useHeatmap + HeatmapOverlay with full metric tracking
'use client';

import { useRef, useCallback } from 'react';

/**
 * Computes comprehensive coding metrics from recorded events.
 * Tracks: total time, typing speed, pause duration, backspace/delete counts,
 * copy-paste attempts, compilation errors, executions, time before first code,
 * code completion time.
 */
export default function useCodingMetrics() {
  const decorationIdsRef = useRef([]);

  /**
   * Compute all metrics from events array
   * @param {Array} events - Array of recorded delta events
   * @param {Object} sessionData - Optional session data { startTime, endTime, compilationErrors, runAttempts }
   * @returns {Object} Comprehensive metrics
   */
  const computeMetrics = useCallback((events, sessionData = {}) => {
    if (!events || events.length === 0) {
      return {
        totalTimeTaken: 0,
        typingSpeed: 0,
        pauseDuration: 0,
        backspaceCount: 0,
        deleteCount: 0,
        copyPasteAttempts: 0,
        compilationErrors: sessionData.compilationErrors || 0,
        numberOfExecutions: sessionData.runAttempts || 0,
        timeBeforeFirstCode: 0,
        codeCompletionTime: 0,
      };
    }

    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const totalTimeTaken = lastEvent.ts - firstEvent.ts;

    // Typing speed: count insert events with actual text
    const insertEvents = events.filter(e => e.type === 'insert' && e.text && e.text.length > 0);
    const totalCharsTyped = insertEvents.reduce((sum, e) => sum + (e.text?.length || 0), 0);
    const totalMinutes = totalTimeTaken / 60000;
    const typingSpeed = totalMinutes > 0 ? Math.round(totalCharsTyped / totalMinutes) : 0;

    // Pause duration: sum of gaps > 3 seconds
    let pauseDuration = 0;
    const PAUSE_THRESHOLD = 3000;
    for (let i = 1; i < events.length; i++) {
      const gap = events[i].ts - events[i - 1].ts;
      if (gap > PAUSE_THRESHOLD) {
        pauseDuration += gap;
      }
    }

    // Backspace count: delete events where rangeLength === 1 (single char delete)
    const backspaceCount = events.filter(e => e.type === 'delete' && e.len === 1).length;

    // Delete count: all delete events
    const deleteCount = events.filter(e => e.type === 'delete').length;

    // Copy-paste attempts
    const copyPasteAttempts = events.filter(e => e.type === 'paste').length;

    // Time before first code written
    const firstCodeEvent = events.find(e => e.type === 'insert' && e.text && e.text.trim().length > 0);
    const timeBeforeFirstCode = firstCodeEvent ? firstCodeEvent.ts - firstEvent.ts : 0;

    // Code completion time (time from first code to last code event)
    const codeEvents = events.filter(e => e.type === 'insert' || e.type === 'delete');
    const codeCompletionTime = codeEvents.length > 1
      ? codeEvents[codeEvents.length - 1].ts - codeEvents[0].ts
      : 0;

    return {
      totalTimeTaken,
      typingSpeed,            // chars per minute
      pauseDuration,          // ms
      backspaceCount,
      deleteCount,
      copyPasteAttempts,
      compilationErrors: sessionData.compilationErrors || 0,
      numberOfExecutions: sessionData.runAttempts || 0,
      timeBeforeFirstCode,    // ms
      codeCompletionTime,     // ms
    };
  }, []);

  /**
   * Apply heatmap decorations to Monaco editor based on edit intensity per line
   */
  const applyHeatmap = useCallback((editor, monaco, events) => {
    if (!editor || !monaco || !events || events.length === 0) return [];

    // Count edits per line
    const lineCounts = {};
    events.forEach(e => {
      if (e.line && (e.type === 'insert' || e.type === 'delete')) {
        lineCounts[e.line] = (lineCounts[e.line] || 0) + 1;
      }
    });

    const maxCount = Math.max(...Object.values(lineCounts), 1);
    const decorations = [];

    Object.entries(lineCounts).forEach(([line, count]) => {
      const ratio = count / maxCount;
      let className = 'heatLow';
      if (ratio > 0.7) className = 'heatHigh';
      else if (ratio > 0.3) className = 'heatMid';

      decorations.push({
        range: new monaco.Range(Number(line), 1, Number(line), 1),
        options: {
          isWholeLine: true,
          className,
        },
      });
    });

    const ids = editor.deltaDecorations(decorationIdsRef.current, decorations);
    decorationIdsRef.current = ids;
    return ids;
  }, []);

  /**
   * Clear heatmap decorations
   */
  const clearHeatmap = useCallback((editor) => {
    if (editor && decorationIdsRef.current.length > 0) {
      editor.deltaDecorations(decorationIdsRef.current, []);
      decorationIdsRef.current = [];
    }
  }, []);

  return { computeMetrics, applyHeatmap, clearHeatmap };
}
