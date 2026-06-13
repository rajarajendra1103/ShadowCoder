import express from 'express';
import { pool } from '../db/postgres.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT p.*, COUNT(tc.id) as test_case_count,
             u.name as created_by_name
      FROM problems p
      LEFT JOIN test_cases tc ON tc.problem_id = p.id
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.org_id = $1 AND p.deleted_at IS NULL
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [req.user.orgId]);
    
    // Convert count to integer, handle nulls for languages
    const problems = result.rows.map(row => ({
      ...row,
      test_case_count: parseInt(row.test_case_count, 10)
    }));

    res.json(problems);
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const { title, description, timeLimit, languages, starterCode, testCases, visibility } = req.body;

  if (!title || !description || !languages || languages.length === 0 || !testCases || testCases.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const probResult = await client.query(
      `INSERT INTO problems
        (org_id, created_by, title, description, time_limit, languages,
         starter_code, visibility, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [req.user.orgId, req.user.userId, title, description, timeLimit, JSON.stringify(languages), JSON.stringify(starterCode), visibility || 'private']
    );
    
    const problemId = probResult.rows[0].id;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      await client.query(
        'INSERT INTO test_cases (problem_id, input, expected_output, order_index) VALUES ($1, $2, $3, $4)',
        [problemId, tc.input, tc.expectedOutput || tc.expected_output, tc.orderIndex || i]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ problem: probResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create problem error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const { title, description, timeLimit, languages, starterCode, testCases, visibility } = req.body;
  const problemId = req.params.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify ownership
    const check = await client.query('SELECT id FROM problems WHERE id = $1 AND org_id = $2', [problemId, req.user.orgId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized to edit this problem' });
    }

    const updateRes = await client.query(
      `UPDATE problems SET title=$1, description=$2, time_limit=$3, languages=$4,
        starter_code=$5, visibility=$6, updated_at=NOW() WHERE id=$7 AND org_id=$8 RETURNING *`,
      [title, description, timeLimit, JSON.stringify(languages), JSON.stringify(starterCode), visibility, problemId, req.user.orgId]
    );

    // Re-insert test cases
    await client.query('DELETE FROM test_cases WHERE problem_id = $1', [problemId]);
    
    if (testCases && testCases.length > 0) {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        await client.query(
          'INSERT INTO test_cases (problem_id, input, expected_output, order_index) VALUES ($1, $2, $3, $4)',
          [problemId, tc.input, tc.expectedOutput || tc.expected_output, tc.orderIndex || i]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ problem: updateRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update problem error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE problems SET deleted_at = NOW() WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, req.user.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete problem error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
