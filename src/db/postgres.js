import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: { 
    ca: fs.readFileSync('./global-bundle.pem').toString(),
    rejectUnauthorized: true 
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('PG pool error', err);
});

export { pool };
