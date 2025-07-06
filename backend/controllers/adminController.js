// backend/controllers/adminController.js
const db = require('../db');

const getAdminById = async (req, res) => {
    const adminId = req.params.id;
    // TODO: Add authorization - Ensure logged-in user IS this admin or has super-admin rights.

    if (!adminId) {
        return res.status(400).json({ message: 'Admin ID is required.' });
    }

    try {
        // Select relevant admin details (excluding password)
        const query = 'SELECT admin_id, name, email, phone_number FROM Admin WHERE admin_id = ?';
        const [results] = await db.query(query, [adminId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Admin not found.' });
        }

        res.status(200).json(results[0]);

    } catch (error) {
        console.error('Error fetching admin data:', error);
        res.status(500).json({ message: 'Internal server error fetching admin data.' });
    }
};

module.exports = {
    getAdminById,
    // Add other admin controllers later (e.g., addDriver, addVehicle)
};