// Prompt 04 — hooks/useSocket.js
// Socket.io client hook for Shadow Coder
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Module-level singleton socket
let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    socketInstance = io(url, {
      auth: {
        token: typeof window !== 'undefined' ? localStorage.getItem('hiretrace_token') : null,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export default function useSocket() {
  const listenersRef = useRef([]);

  const socket = getSocket();

  const emit = useCallback((event, data) => {
    socket.emit(event, data);
  }, [socket]);

  const on = useCallback((event, handler) => {
    socket.on(event, handler);
    listenersRef.current.push({ event, handler });
  }, [socket]);

  const off = useCallback((event) => {
    socket.off(event);
    listenersRef.current = listenersRef.current.filter(l => l.event !== event);
  }, [socket]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
      listenersRef.current = [];
    };
  }, [socket]);

  return { socket, emit, on, off };
}
