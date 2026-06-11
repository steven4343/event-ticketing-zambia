require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dbDir = path.join(__dirname, '..', 'database');

async function run() {
  const files = [
    'schema.sql',
    'migrations/001_security_and_realtime.sql',
    'migrations/002_enterprise_features.sql',
    'seed.sql',
  ];

  for (const file of files) {
    const filePath = path.join(dbDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} (not found)`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running ${file}...`);
    try {
      await pool.query(sql);
      console.log('  Done.');
    } catch (err) {
      console.error(`  Error in ${file}:`, err.message);
    }
  }

  await pool.end();
  console.log('Migration complete.');
}

run().catch(err => { console.error(err); process.exit(1); });
