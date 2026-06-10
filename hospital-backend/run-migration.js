const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const sqlFile = path.join(__dirname, 'migrations', '004_phase1_market.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by semicolons, filter empty/comment lines
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .map(s => {
            // Remove leading comment lines
            const lines = s.split('\n').filter(l => !l.trim().startsWith('--'));
            return lines.join('\n').trim();
        })
        .filter(s => s.length > 0);

    console.log(`Running migration: 004_phase1_market.sql (${statements.length} statements)`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
        try {
            await db.execute(stmt);
            console.log(`  [${i + 1}/${statements.length}] OK: ${preview}...`);
        } catch (err) {
            // Skip duplicate column errors (already migrated)
            if (err.message.includes('Duplicate column') || err.message.includes('already exists')) {
                console.log(`  [${i + 1}/${statements.length}] SKIP (already done): ${preview}...`);
            } else {
                console.error(`  [${i + 1}/${statements.length}] FAIL: ${preview}...`);
                console.error(`    Error: ${err.message}`);
            }
        }
    }

    console.log('Migration complete!');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
