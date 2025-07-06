// backend/routes/vehicleRoutes.js
const express = require('express');
const { getAllVehicles, addVehicle, getUnassignedVehicles, getVehicleOptionsForDriver, deleteVehicle  } = require('../controllers/vehicleController');
// TODO: Add Admin authentication middleware

const router = express.Router();

// GET /api/vehicles - Get all vehicles
router.get('/', /* adminAuthMiddleware, */ getAllVehicles);

// POST /api/vehicles - Add a new vehicle
router.post('/', /* adminAuthMiddleware, */ addVehicle);

// GET /api/vehicles/unassigned - Get vehicles not assigned to active drivers
router.get('/unassigned', /* adminAuthMiddleware, */ getUnassignedVehicles);

// GET /api/vehicles/options-for-driver/:driverId - Get vehicles for edit dropdown
router.get('/options-for-driver/:driverId', /* adminAuthMiddleware, */ getVehicleOptionsForDriver);

// DELETE /api/vehicles/:id
router.delete('/:id', /* adminAuthMiddleware, */ deleteVehicle);

module.exports = router;