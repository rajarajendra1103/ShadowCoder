import express from 'express';
import { pool } from '../db/postgres.js';
import { requireAuth } from '../middleware/auth.js';
import { validateUuidParam } from '../middleware/validateUuid.js';

const router = express.Router();

router.use(requireAuth);

router.patch('/:id/notes', validateUuidParam('id'), async (req, res) => {
  const { notes } = req.body;
  
  try {
    const sessionRes = await pool.query('SELECT id FROM sessions WHERE id = $1 AND org_id = $2', [req.params.id, req.user.orgId]);
    if (sessionRes.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized or session not found' });
    }

    await pool.query(
      'UPDATE sessions SET recruiter_notes = $1, notes_updated_at = NOW() WHERE id = $2',
      [notes, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
