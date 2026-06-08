const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const db = require('../config/db');

const execFileAsync = promisify(execFile);
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const ensureBackupDir = () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
};

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const escapeSql = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
};

async function exportDatabaseSql() {
    const dbName = process.env.DB_NAME || 'hospital_db';
    const [tables] = await db.execute('SHOW TABLES');
    const tableKey = `Tables_in_${dbName}`;

    let sql = `-- LifeLine HMS Database Backup\n-- Generated: ${new Date().toISOString()}\n\n`;
    sql += `CREATE DATABASE IF NOT EXISTS \`${dbName}\`;\nUSE \`${dbName}\`;\n\n`;
    sql += 'SET FOREIGN_KEY_CHECKS=0;\n\n';

    for (const row of tables) {
        const table = row[tableKey];
        const [createRows] = await db.execute(`SHOW CREATE TABLE \`${table}\``);
        sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        sql += `${createRows[0]['Create Table']};\n\n`;

        const [dataRows] = await db.execute(`SELECT * FROM \`${table}\``);
        if (dataRows.length > 0) {
            const columns = Object.keys(dataRows[0]);
            const colList = columns.map((c) => `\`${c}\``).join(', ');
            for (const dataRow of dataRows) {
                const values = columns.map((c) => escapeSql(dataRow[c])).join(', ');
                sql += `INSERT INTO \`${table}\` (${colList}) VALUES (${values});\n`;
            }
            sql += '\n';
        }
    }

    sql += 'SET FOREIGN_KEY_CHECKS=1;\n';
    return sql;
}

async function tryMysqldump() {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const pass = process.env.DB_PASS || '';
    const dbName = process.env.DB_NAME || 'hospital_db';

    const args = [`-h${host}`, `-u${user}`, dbName, '--single-transaction', '--routines', '--triggers'];
    if (pass) args.splice(2, 0, `-p${pass}`);

    const { stdout } = await execFileAsync('mysqldump', args, {
        maxBuffer: 50 * 1024 * 1024,
        env: { ...process.env, MYSQL_PWD: pass }
    });
    return stdout;
}

async function createDatabaseBackup() {
    ensureBackupDir();
    const filename = `database-${timestamp()}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    let sql;
    try {
        sql = await tryMysqldump();
    } catch {
        sql = await exportDatabaseSql();
    }

    fs.writeFileSync(filepath, sql, 'utf8');
    const stat = fs.statSync(filepath);
    return {
        filename,
        type: 'database',
        size: stat.size,
        created_at: stat.birthtime.toISOString()
    };
}

async function zipDirectory(sourceDir, outPath) {
    const { ZipArchive } = await import('archiver');
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(sourceDir)) {
            fs.mkdirSync(sourceDir, { recursive: true });
        }
        const output = fs.createWriteStream(outPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(sourceDir, 'uploads');
        archive.finalize();
    });
}

async function createFilesBackup() {
    ensureBackupDir();
    const filename = `files-${timestamp()}.zip`;
    const filepath = path.join(BACKUP_DIR, filename);
    await zipDirectory(UPLOADS_DIR, filepath);
    const stat = fs.statSync(filepath);
    return {
        filename,
        type: 'files',
        size: stat.size,
        created_at: stat.birthtime.toISOString()
    };
}

async function createFullBackup() {
    ensureBackupDir();
    const dbMeta = await createDatabaseBackup();
    const dbPath = path.join(BACKUP_DIR, dbMeta.filename);
    const filename = `full-${timestamp()}.zip`;
    const filepath = path.join(BACKUP_DIR, filename);

    const { ZipArchive } = await import('archiver');
    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(filepath);
        const archive = new ZipArchive({ zlib: { level: 9 } });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.file(dbPath, { name: 'database.sql' });
        if (fs.existsSync(UPLOADS_DIR)) {
            archive.directory(UPLOADS_DIR, 'uploads');
        }
        archive.append(JSON.stringify({
            created_at: new Date().toISOString(),
            hospital: process.env.HOSPITAL_NAME || 'LifeLine Hospital',
            db_file: 'database.sql'
        }, null, 2), { name: 'manifest.json' });
        archive.finalize();
    });

    fs.unlinkSync(dbPath);
    const stat = fs.statSync(filepath);
    return {
        filename,
        type: 'full',
        size: stat.size,
        created_at: stat.birthtime.toISOString()
    };
}

function listBackups() {
    ensureBackupDir();
    return fs.readdirSync(BACKUP_DIR)
        .filter((f) => !f.startsWith('.'))
        .map((filename) => {
            const filepath = path.join(BACKUP_DIR, filename);
            const stat = fs.statSync(filepath);
            let type = 'unknown';
            if (filename.startsWith('database-')) type = 'database';
            else if (filename.startsWith('files-')) type = 'files';
            else if (filename.startsWith('full-')) type = 'full';
            return {
                filename,
                type,
                size: stat.size,
                created_at: stat.birthtime.toISOString()
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function resolveBackupPath(filename) {
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new Error('Invalid backup filename');
    }
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) throw new Error('Backup not found');
    return filepath;
}

function deleteBackup(filename) {
    const filepath = resolveBackupPath(filename);
    fs.unlinkSync(filepath);
}

async function restoreDatabaseFromFile(filename) {
    const filepath = resolveBackupPath(filename);
    if (!filename.endsWith('.sql')) {
        throw new Error('Only .sql database backups can be restored');
    }

    const sql = fs.readFileSync(filepath, 'utf8');
    const connection = await db.getConnection();
    try {
        await connection.query('SET FOREIGN_KEY_CHECKS=0');
        const statements = sql
            .split(/;\s*\n/)
            .map((s) => s.trim())
            .filter((s) => s && !s.startsWith('--'));

        for (const stmt of statements) {
            if (stmt.length < 3) continue;
            try {
                await connection.query(stmt);
            } catch (e) {
                if (!e.message.includes('already exists') && !e.message.includes('Duplicate')) {
                    console.warn('Restore statement skipped:', e.message.slice(0, 80));
                }
            }
        }
        await connection.query('SET FOREIGN_KEY_CHECKS=1');
    } finally {
        connection.release();
    }
}

function getUploadsStats() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        return { fileCount: 0, totalSize: 0 };
    }
    let fileCount = 0;
    let totalSize = 0;
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else {
                fileCount += 1;
                totalSize += fs.statSync(full).size;
            }
        }
    };
    walk(UPLOADS_DIR);
    return { fileCount, totalSize };
}

module.exports = {
    BACKUP_DIR,
    createDatabaseBackup,
    createFilesBackup,
    createFullBackup,
    listBackups,
    resolveBackupPath,
    deleteBackup,
    restoreDatabaseFromFile,
    getUploadsStats
};
