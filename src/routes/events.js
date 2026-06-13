import express from 'express';
import { pool } from '../db/postgres.js';
import { requireAuth } from '../middleware/auth.js';
import { validateUuidParam } from '../middleware/validateUuid.js';

const router = express.Router();

router.get('/:id/events', requireAuth, validateUuidParam('id'), async (req, res) => {
  try {
    const sessionRes = await pool.query('SELECT id FROM sessions WHERE id = $1 AND org_id = $2', [req.params.id, req.user.orgId]);
    if (sessionRes.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized or session not found' });
    }

    const eventsRes = await pool.query(
      'SELECT ts, type, text, "offset", len, line, col FROM events WHERE session_id = $1 ORDER BY ts ASC',
      [req.params.id]
    );

    res.json({ events: eventsRes.rows });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
