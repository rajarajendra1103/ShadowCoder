import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/postgres.js';
import { requireAuth } from '../middleware/auth.js';
import { validateUuidParam } from '../middleware/validateUuid.js';

const router = express.Router();

router.post('/:id/share', requireAuth, validateUuidParam('id'), async (req, res) => {
  try {
    const sessionRes = await pool.query('SELECT id FROM sessions WHERE id = $1 AND org_id = $2', [req.params.id, req.user.orgId]);
    if (sessionRes.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized or session not found' });
    }

    const existingRes = await pool.query('SELECT token FROM share_links WHERE session_id = $1', [req.params.id]);
    let shareToken;

    if (existingRes.rows.length > 0) {
      shareToken = existingRes.rows[0].token;
    } else {
      shareToken = uuidv4();
      await pool.query(
        'INSERT INTO share_links (session_id, token, created_by, created_at) VALUES ($1, $2, $3, NOW())',
        [req.params.id, shareToken, req.user.userId]
      );
    }

    res.json({
      shareToken,
      shareUrl: `${process.env.FRONTEND_URL}/playback/${shareToken}`
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:token', validateUuidParam('token'), async (req, res) => {
  try {
    const linkRes = await pool.query('SELECT session_id FROM share_links WHERE token = $1', [req.params.token]);
    if (linkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid share link' });
    }

    const sessionId = linkRes.rows[0].session_id;

    const sessionRes = await pool.query(
      `SELECT id, candidate_name, language, submitted_at, run_attempts, tests_passed, tests_total, final_code, stats 
       FROM sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const eventsRes = await pool.query(
      'SELECT ts, type, text, "offset", len, line, col FROM events WHERE session_id = $1 ORDER BY ts ASC',
      [sessionId]
    );

    res.json({
      session: sessionRes.rows[0],
      events: eventsRes.rows
    });
  } catch (error) {
    console.error('Get shared session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
