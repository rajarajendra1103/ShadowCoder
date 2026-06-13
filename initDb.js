import 'dotenv/config';
import { pool } from './src/db/postgres.js';
import fs from 'fs';

async function init() {
  try {
    const schema = fs.readFileSync('./src/db/schema.sql', 'utf-8');
    console.log('Connecting to Aurora database securely...');
    await pool.query(schema);
    console.log('Schema executed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to execute schema:', error);
    process.exit(1);
  }
}

init();
