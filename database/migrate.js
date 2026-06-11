const fs = require('fs');
const path = require('path');

// Load .env from backend
const envPath = path.join(__dirname, '..', 'backend', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
});

const { Pool } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const files = [
    'schema.sql',
    'migrations/001_security_and_realtime.sql',
    'migrations/002_enterprise_features.sql',
    'seed.sql',
  ];

  for (const file of files) {
    const filePath = path.join(__dirname, file);
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
