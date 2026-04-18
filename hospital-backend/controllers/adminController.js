const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const db = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await Admin.getStats();
        sendResponse(res, 200, 'Dashboard statistics fetched', stats);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get All Doctors
exports.getAllDoctors = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT d.*, u.name, u.email, u.phone 
      FROM doctors d 
      JOIN users u ON d.user_id = u.id
    `);
        sendResponse(res, 200, 'Doctors fetched successfully', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Get All Patients
exports.getAllPatients = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT p.*, u.name, u.email, u.phone 
      FROM patients p 
      JOIN users u ON p.user_id = u.id
    `);
        sendResponse(res, 200, 'Patients fetched successfully', rows);
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};

// Delete User (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
        sendResponse(res, 200, 'User deleted successfully');
    } catch (err) {
        console.error(err);
        sendResponse(res, 500, 'Internal Server Error');
    }
};
