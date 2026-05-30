const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const auditLogger = require('../utils/auditLogger');
const backupService = require('../services/backupService');

const ALLOWED_SETTING_KEYS = new Set([
    'hospital_name',
    'hospital_address',
    'hospital_phone',
    'hospital_email',
    'lobby_announcement',
    'opd_hours',
    'currency_symbol',
    'maintenance_mode'
]);

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM hospital_settings');
        const settings = {};
        rows.forEach((r) => { settings[r.setting_key] = r.setting_value; });
        sendResponse(res, 200, 'Settings fetched', settings);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.getSystemInfo = async (req, res) => {
    try {
        const uploads = backupService.getUploadsStats();
        const backups = backupService.listBackups();
        const [tableRows] = await db.execute('SHOW TABLES');
        const dbName = process.env.DB_NAME || 'hospital_db';
        const tableKey = `Tables_in_${dbName}`;

        sendResponse(res, 200, 'System info', {
            nodeVersion: process.version,
            database: dbName,
            dbHost: process.env.DB_HOST || 'localhost',
            storageProvider: process.env.STORAGE_PROVIDER || 'local',
            uploads,
            backupCount: backups.length,
            backupTotalSize: backups.reduce((s, b) => s + b.size, 0),
            tableCount: tableRows.length,
            uptime: process.uptime(),
            env: process.env.NODE_ENV || 'development'
        });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.update = async (req, res) => {
    try {
        const entries = Object.entries(req.body).filter(([key]) => ALLOWED_SETTING_KEYS.has(key));
        for (const [key, value] of entries) {
            await db.execute(
                'INSERT INTO hospital_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, String(value), String(value)]
            );
        }
        if (req.user?.id) {
            await auditLogger.log(req.user.id, 'settings_update', 'settings', null, Object.fromEntries(entries));
        }
        sendResponse(res, 200, 'Settings updated');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.listBackups = async (req, res) => {
    try {
        const backups = backupService.listBackups();
        const uploads = backupService.getUploadsStats();
        sendResponse(res, 200, 'Backups listed', { backups, uploads });
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

exports.createBackup = async (req, res) => {
    try {
        const { type } = req.body;
        let meta;
        if (type === 'files') meta = await backupService.createFilesBackup();
        else if (type === 'full') meta = await backupService.createFullBackup();
        else meta = await backupService.createDatabaseBackup();

        await auditLogger.log(req.user.id, 'backup_create', 'backup', null, { type: meta.type, filename: meta.filename });
        sendResponse(res, 201, 'Backup created', meta);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, err.message || 'Backup failed');
    }
};

exports.downloadBackup = async (req, res) => {
    try {
        const filepath = backupService.resolveBackupPath(req.params.filename);
        res.download(filepath);
    } catch (err) {
        sendResponse(res, 404, err.message || 'Not found');
    }
};

exports.deleteBackup = async (req, res) => {
    try {
        backupService.deleteBackup(req.params.filename);
        await auditLogger.log(req.user.id, 'backup_delete', 'backup', null, { filename: req.params.filename });
        sendResponse(res, 200, 'Backup deleted');
    } catch (err) {
        sendResponse(res, 404, err.message || 'Not found');
    }
};

exports.restoreBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename.endsWith('.sql')) {
            return sendResponse(res, 400, 'Restore supports .sql database backups only. Extract full zip manually for files.');
        }
        await backupService.restoreDatabaseFromFile(filename);
        await auditLogger.log(req.user.id, 'backup_restore', 'backup', null, { filename });
        sendResponse(res, 200, 'Database restored from backup');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, err.message || 'Restore failed');
    }
};
