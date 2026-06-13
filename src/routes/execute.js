import express from 'express';
import { executeLimit } from '../middleware/rateLimit.js';
import { runCode } from '../services/executeService.js';
import { pool } from '../db/postgres.js';

const router = express.Router();

router.post('/', executeLimit, async (req, res) => {
  const { code, language, inviteToken } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  try {
    let testCases = [];
    if (inviteToken) {
      const inviteRes = await pool.query('SELECT problem_id, status FROM invites WHERE session_token = $1', [inviteToken]);
      if (inviteRes.rows.length > 0) {
        const invite = inviteRes.rows[0];
        if (invite.status !== 'submitted') {
          const tcRes = await pool.query('SELECT * FROM test_cases WHERE problem_id = $1 ORDER BY order_index', [invite.problem_id]);
          testCases = tcRes.rows;
        }
      }
    }

    // 1. Open Run (no input, just to get stdout of the code if any)
    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    let status = 'success';
    let time = null;

    try {
      const openRun = await runCode({ code, language, stdin: '' });
      stdout = openRun.stdout;
      stderr = openRun.stderr;
      exitCode = openRun.exitCode;
      status = openRun.status;
      time = openRun.time;
    } catch (err) {
      return res.json({ status: 'error', stderr: err.message, stdout: '', exitCode: 1 });
    }

    // 2. Test Cases Run
    const testResults = [];
    let testsPassed = 0;

    if (testCases.length > 0 && status === 'success') {
      for (const tc of testCases) {
        try {
          const tcRun = await runCode({ code, language, stdin: tc.input });
          const actual = tcRun.stdout.trim();
          const expected = tc.expected_output.trim();
          const passed = actual === expected;
          
          if (passed) testsPassed++;

          testResults.push({
            input: tc.input,
            actual,
            passed
          });
        } catch (err) {
          testResults.push({
            input: tc.input,
            actual: err.message,
            passed: false
          });
        }
      }
    }

    res.json({
      stdout,
      stderr,
      exitCode,
      status,
      time,
      testResults,
      testsPassed,
      testsTotal: testCases.length
    });

  } catch (error) {
    console.error('Execute code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
