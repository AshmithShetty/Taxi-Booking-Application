// backend/routes/adminRoutes.js
const express = require('express');
const { getAdminById } = require('../controllers/adminController');
const { getAdminDrivers, addDriver } = require('../controllers/driverController'); // Import driver functions

// TODO: Add admin-specific authentication/authorization middleware

const router = express.Router();

// GET /api/admins/:id
router.get('/:id', /* adminAuthMiddleware, */ getAdminById);

// --- Driver Management Routes Nested Under Admin ---
// GET /api/admins/:adminId/drivers - Get drivers for this admin
router.get('/:adminId/drivers', /* adminAuthMiddleware, */ getAdminDrivers);

// POST /api/admins/:adminId/drivers - Add a new driver under this admin
router.post('/:adminId/drivers', /* adminAuthMiddleware, */ addDriver);

module.exports = router;