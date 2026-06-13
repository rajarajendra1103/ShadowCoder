import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/postgres.js';
import { authLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', authLimit, async (req, res) => {
  const { name, email, password, orgName } = req.body;

  if (!name || !email || !password || !orgName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const checkEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Using transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orgResult = await client.query(
        'INSERT INTO organizations (name, created_at) VALUES ($1, NOW()) RETURNING id',
        [orgName]
      );
      const orgId = orgResult.rows[0].id;

      const userResult = await client.query(
        `INSERT INTO users (org_id, name, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, 'admin', NOW()) RETURNING id, name, email, org_id, role`,
        [orgId, name, email, passwordHash]
      );
      const user = userResult.rows[0];

      await client.query('COMMIT');

      const token = jwt.sign(
        { userId: user.id, orgId: user.org_id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, orgId: user.org_id, role: user.role } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', authLimit, async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, name, email, password_hash, org_id, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, orgId: user.org_id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email, orgId: user.org_id, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
