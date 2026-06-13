import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/postgres.js';
import { requireAuth } from '../middleware/auth.js';
import { validateUuidParam, validateUuidBody } from '../middleware/validateUuid.js';

const router = express.Router();

// PUBLIC routes (Candidates)
router.post('/init', validateUuidBody('inviteToken'), async (req, res) => {
  const { inviteToken } = req.body;
  try {
    const inviteRes = await pool.query('SELECT * FROM invites WHERE session_token = $1', [inviteToken]);
    if (inviteRes.rows.length === 0) return res.status(404).json({ error: 'Invalid token' });
    
    const invite = inviteRes.rows[0];
    if (new Date(invite.expires_at) < new Date() || invite.status === 'submitted') {
      return res.status(400).json({ error: 'Token expired or used' });
    }

    const sessionId = uuidv4();

    // Begin session
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE invites SET status = 'started' WHERE id = $1", [invite.id]);
      await client.query(
        `INSERT INTO sessions 
          (id, invite_id, org_id, candidate_name, candidate_email, role, problem_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress', NOW())`,
        [sessionId, invite.id, invite.org_id, invite.candidate_name, invite.candidate_email, invite.role, invite.problem_id]
      );
      await client.query('COMMIT');
      res.json({ sessionId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Init session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validateUuidBody('inviteToken'), async (req, res) => {
  const { inviteToken, finalCode, language, runAttempts, testResults } = req.body;
  try {
    const inviteRes = await pool.query('SELECT * FROM invites WHERE session_token = $1', [inviteToken]);
    if (inviteRes.rows.length === 0) return res.status(404).json({ error: 'Invalid token' });
    const invite = inviteRes.rows[0];

    const sessionRes = await pool.query('SELECT * FROM sessions WHERE invite_id = $1 ORDER BY created_at DESC LIMIT 1', [invite.id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];

    if (session.status === 'submitted') return res.status(409).json({ error: 'Already submitted' });

    const testsPassed = testResults?.filter(t => t.passed).length || 0;
    const testsTotal = testResults?.length || 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE sessions SET 
          final_code = $1, language = $2, run_attempts = $3, 
          tests_passed = $4, tests_total = $5, status = 'submitted', submitted_at = NOW()
         WHERE id = $6`,
        [finalCode, language, runAttempts, testsPassed, testsTotal, session.id]
      );
      await client.query("UPDATE invites SET status = 'submitted' WHERE id = $1", [invite.id]);
      await client.query('COMMIT');
      res.json({ success: true, sessionId: session.id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Submit session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PROTECTED routes (Recruiters)
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const ids = req.query.ids;
    if (ids) {
      const idArray = ids.split(',');
      const result = await pool.query(
        'SELECT s.*, p.title as problem_title FROM sessions s LEFT JOIN problems p ON p.id = s.problem_id WHERE s.id = ANY($1) AND s.org_id = $2',
        [idArray, req.user.orgId]
      );
      return res.json({ sessions: result.rows });
    }

    // List sessions
    const { role, language, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT s.*, p.title as problem_title FROM sessions s LEFT JOIN problems p ON p.id = s.problem_id WHERE s.org_id = $1';
    const params = [req.user.orgId];
    
    if (role) {
      params.push(role);
      query += ` AND s.role = $${params.length}`;
    }
    if (language) {
      params.push(language);
      query += ` AND s.language = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM sessions WHERE org_id = $1';
    const countParams = [req.user.orgId];
    if (role) { countParams.push(role); countQuery += ` AND role = $${countParams.length}`; }
    if (language) { countParams.push(language); countQuery += ` AND language = $${countParams.length}`; }
    if (status) { countParams.push(status); countQuery += ` AND status = $${countParams.length}`; }
    
    const countRes = await pool.query(countQuery, countParams);

    res.json({
      sessions: result.rows,
      total: parseInt(countRes.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });

  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', validateUuidParam('id'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, p.title as problem_title FROM sessions s LEFT JOIN problems p ON p.id = s.problem_id WHERE s.id = $1 AND s.org_id = $2',
      [req.params.id, req.user.orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', validateUuidParam('id'), async (req, res) => {
  try {
    const sessionRes = await pool.query(
      'SELECT invite_id FROM sessions WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.orgId]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { invite_id } = sessionRes.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (invite_id) {
        await client.query('DELETE FROM invites WHERE id = $1 AND org_id = $2', [invite_id, req.user.orgId]);
      }
      await client.query('DELETE FROM sessions WHERE id = $1 AND org_id = $2', [req.params.id, req.user.orgId]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
