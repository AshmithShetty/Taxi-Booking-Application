// backend/routes/driverRoutes.js
const express = require('express');
const { getDriverDetails, updateDriver,checkActiveRides, deactivateDriver, activateDriver } = require('../controllers/driverController');
// TODO: Add authentication/authorization middleware

const router = express.Router();

// GET /api/drivers/:id
router.get('/:id', /* authMiddleware, */ getDriverDetails);

// PUT /api/drivers/:driverId - Update driver details
router.put('/:driverId', /* adminAuthMiddleware, */ updateDriver); // Likely requires admin auth

// GET /api/drivers/:driverId/active-rides-check - Check for active rides
router.get('/:driverId/active-rides-check', /* adminAuthMiddleware, */ checkActiveRides);

// PUT /api/drivers/:driverId/deactivate - Soft delete (deactivate) driver
router.put('/:driverId/deactivate', /* adminAuthMiddleware, */ deactivateDriver);

// PUT /api/drivers/:driverId/activate - Reactivate driver
router.put('/:driverId/activate', /* adminAuthMiddleware, */ activateDriver);

module.exports = router;