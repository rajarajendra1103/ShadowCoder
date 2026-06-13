// Prompt 05 — hooks/useRecorder.js
// Keystroke recorder hook for Shadow Coder
'use client';

import { useRef, useCallback, useEffect } from 'react';
import useSocket from './useSocket';

export default function useRecorder(sessionId) {
  const bufferRef = useRef([]);
  const intervalRef = useRef(null);
  const totalEventsRef = useRef(0);
  const { emit } = useSocket();

  // Flush buffer to backend via socket
  const flush = useCallback(() => {
    if (bufferRef.current.length > 0 && sessionId) {
      emit('events:batch', { sessionId, events: [...bufferRef.current] });
      totalEventsRef.current += bufferRef.current.length;
      bufferRef.current = [];
    }
  }, [sessionId, emit]);

  // Start flush interval
  useEffect(() => {
    intervalRef.current = setInterval(flush, 2000);
    return () => {
      flush(); // Flush remaining on unmount
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [flush]);

  // Monaco editor mount handler
  const handleMount = useCallback((editor, monaco) => {
    const model = editor.getModel();

    // Track content changes
    if (model) {
      model.onDidChangeContent((event) => {
        event.changes.forEach((change) => {
          bufferRef.current.push({
            ts: Date.now(),
            type: change.text === '' ? 'delete' : 'insert',
            text: change.text,
            offset: change.rangeOffset,
            len: change.rangeLength,
            line: change.range.startLineNumber,
            col: change.range.startColumn,
          });
        });
      });
    }

    // Track paste events
    editor.onDidPaste((e) => {
      bufferRef.current.push({
        ts: Date.now(),
        type: 'paste',
        line: e.range.startLineNumber,
      });
    });
  }, []);

  return {
    handleMount,
    totalEvents: totalEventsRef.current,
    flush,
  };
}
