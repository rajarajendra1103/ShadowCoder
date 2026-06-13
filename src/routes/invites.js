import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { parse } from 'csv-parse';
import { pool } from '../db/postgres.js';
import { requireAuth } from '../middleware/auth.js';
import { inviteLimit } from '../middleware/rateLimit.js';
import { sendInvite, sendBulkInvites } from '../services/emailService.js';
import { validateUuidParam } from '../middleware/validateUuid.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public route to fetch invite details
router.get('/:token', validateUuidParam('token'), async (req, res) => {
  try {
    const inviteRes = await pool.query(
      `SELECT i.*, p.title, p.description, p.languages, p.starter_code 
       FROM invites i 
       JOIN problems p ON p.id = i.problem_id 
       WHERE session_token = $1`,
      [req.params.token]
    );

    if (inviteRes.rows.length === 0) {
      return res.json({ valid: false, reason: 'not_found' });
    }

    const invite = inviteRes.rows[0];

    if (new Date(invite.expires_at) < new Date()) {
      return res.json({ valid: false, reason: 'expired' });
    }
    if (invite.status === 'submitted') {
      return res.json({ valid: false, reason: 'already_used' });
    }

    // Fetch test cases (input only)
    const tcRes = await pool.query(
      'SELECT input, order_index FROM test_cases WHERE problem_id = $1 ORDER BY order_index',
      [invite.problem_id]
    );

    res.json({
      valid: true,
      invite: {
        id: invite.id,
        candidateName: invite.candidate_name,
        role: invite.role,
        timeLimit: invite.time_limit
      },
      problem: {
        id: invite.problem_id,
        title: invite.title,
        description: invite.description,
        languages: invite.languages,
        starterCode: invite.starter_code,
        testCases: tcRes.rows // only input and order
      }
    });
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes below
router.use(requireAuth);

router.post('/', inviteLimit, async (req, res) => {
  const { candidateName, candidateEmail, role, problemId, timeLimitOverride, expiryHours, linkExpiry } = req.body;

  try {
    const probRes = await pool.query('SELECT id, time_limit FROM problems WHERE id = $1 AND org_id = $2', [problemId, req.user.orgId]);
    if (probRes.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const problem = probRes.rows[0];
    const timeLimit = timeLimitOverride || problem.time_limit;
    const sessionToken = uuidv4();
    const hours = expiryHours || linkExpiry || 48;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

    const insertRes = await pool.query(
      `INSERT INTO invites 
        (org_id, created_by, candidate_name, candidate_email, role, problem_id, time_limit, session_token, expires_at, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW()) RETURNING id`,
      [req.user.orgId, req.user.userId, candidateName, candidateEmail, role, problemId, timeLimit, sessionToken, expiresAt]
    );

    let emailSent = true;
    let emailErrorMsg = null;
    try {
      await sendInvite(candidateEmail, candidateName, sessionToken, timeLimit);
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      emailSent = false;
      emailErrorMsg = emailError.message || String(emailError);
    }

    res.status(201).json({
      inviteId: insertRes.rows[0].id,
      sessionToken,
      inviteLink: `${process.env.FRONTEND_URL}/interview/${sessionToken}`,
      emailSent,
      emailError: emailErrorMsg
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

router.post('/bulk', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const { problemId, timeLimitOverride, expiryHours, linkExpiry } = req.body;

  try {
    const probRes = await pool.query('SELECT id, time_limit FROM problems WHERE id = $1 AND org_id = $2', [problemId, req.user.orgId]);
    if (probRes.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    const problem = probRes.rows[0];
    const timeLimit = timeLimitOverride || problem.time_limit;
    
    const records = [];
    parse(req.file.buffer, { columns: true, skip_empty_lines: true }, async (err, data) => {
      if (err) return res.status(400).json({ error: 'Invalid CSV' });
      
      try {
        const invitesToProcess = [];
        const hours = expiryHours || linkExpiry || 48;
        const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

        for (const row of data) {
          if (!row.name || !row.email || !row.role) continue;
          
          const sessionToken = uuidv4();
          await pool.query(
            `INSERT INTO invites 
              (org_id, created_by, candidate_name, candidate_email, role, problem_id, time_limit, session_token, expires_at, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())`,
            [req.user.orgId, req.user.userId, row.name, row.email, row.role, problemId, timeLimit, sessionToken, expiresAt]
          );
          
          invitesToProcess.push({
            email: row.email,
            name: row.name,
            sessionToken,
            timeLimitMinutes: timeLimit
          });
        }

        // Send emails asynchronously
        sendBulkInvites(invitesToProcess).catch(console.error);

        res.json({
          total: data.length,
          sent: invitesToProcess.length,
          failed: data.length - invitesToProcess.length
        });
      } catch (innerError) {
        console.error('Bulk invite CSV processing database error:', innerError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', message: innerError.message });
        }
      }
    });

  } catch (error) {
    console.error('Bulk invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
