import jwt from 'jsonwebtoken';
import { pool } from '../db/postgres.js';

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function registerSocketHandlers(io) {
  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow candidates (they don't have JWT, just session tokens)
      socket.isCandidate = true;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.isCandidate = false;
      next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    
    socket.on('session:join', ({ sessionId }) => {
      if (!sessionId) return;
      socket.join(`session:${sessionId}`);
      socket.sessionId = sessionId;
    });

    socket.on('events:batch', async ({ sessionId, events }) => {
      if (!sessionId || !events || !Array.isArray(events) || events.length === 0) return;
      if (events.length > 200) return; // reject oversized batches

      // Batch insert into PostgreSQL events table
      const chunks = chunkArray(events, 50); // Split into chunks of 50 to avoid massive query string limits if any
      
      for (const chunk of chunks) {
        try {
          // Construct parameterized query for batch insert
          // INSERT INTO events (session_id, ts, type, text, "offset", len, line, col) VALUES ...
          const values = [];
          const queryParams = [];
          
          chunk.forEach((e, i) => {
            const baseIdx = i * 8;
            values.push(`($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, $${baseIdx + 8})`);
            
            queryParams.push(
              sessionId,
              e.ts,
              e.type,
              e.text || '',
              e.offset || 0,
              e.len || 0,
              e.line || 1,
              e.col || 1
            );
          });

          const query = `
            INSERT INTO events 
            (session_id, ts, type, text, "offset", len, line, col) 
            VALUES ${values.join(', ')}
          `;

          await pool.query(query, queryParams);
        } catch (error) {
          console.error('Socket batch write chunk error:', error);
          // Do not crash the socket server on failed write
        }
      }
    });

    socket.on('disconnect', () => {
      // Optional logging
    });
  });
}
