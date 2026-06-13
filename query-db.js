import 'dotenv/config';
import { pool } from './src/db/postgres.js';

async function run() {
  try {
    console.log('Querying existing organizations...');
    const orgs = await pool.query('SELECT * FROM organizations');
    console.log('Orgs:', orgs.rows);

    console.log('Querying existing users...');
    const users = await pool.query('SELECT * FROM users');
    console.log('Users:', users.rows);

    console.log('Querying existing problems...');
    const problems = await pool.query('SELECT * FROM problems');
    console.log('Problems:', problems.rows);
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await pool.end();
  }
}

run();
