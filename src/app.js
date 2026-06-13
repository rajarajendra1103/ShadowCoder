import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import problemsRoutes from './routes/problems.js';
import invitesRoutes from './routes/invites.js';
import sessionsRoutes from './routes/sessions.js';
import eventsRoutes from './routes/events.js';
import notesRoutes from './routes/notes.js';
import executeRoutes from './routes/execute.js';
import shareRoutes from './routes/share.js';
import { registerSocketHandlers } from './socket/eventHandler.js';

const app = express();
const httpServer = createServer(app);

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/sessions', eventsRoutes);
app.use('/api/sessions', notesRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/share', shareRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
});

const io = new Server(httpServer, {
  cors: {
    ...corsOptions,
    methods: ['GET', 'POST']
  }
});

registerSocketHandlers(io);

export { app, httpServer };
