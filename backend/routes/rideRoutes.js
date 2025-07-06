// backend/routes/rideRoutes.js
const express = require('express');
// Import both controller functions
const { getCustomerRidesByStatus, bookRide, deleteDraftRide, cancelRide, getCustomerRideHistory,
    getAvailableRideRequests, acceptRideRequest, getCurrentDriverRide, markRideCompleted, getDriverCompletedRides} = require('../controllers/rideController');
// TODO: Add authentication middleware

const router = express.Router();

// GET /api/rides/customer/:customerId/status?statuses=...
router.get('/customer/:customerId/status', getCustomerRidesByStatus);

// GET /api/rides/customer/:customerId/history  <- NEW ROUTE for filtered history
router.get('/customer/:customerId/history', /* authMiddleware, */ getCustomerRideHistory);

// POST /api/rides/book  <- NEW ROUTE for creating a draft ride
router.post('/book', bookRide);

// DELETE /api/rides/draft/:rideId  <- NEW ROUTE for cancelling a draft
router.delete('/draft/:rideId', deleteDraftRide);

router.delete('/cancel/:rideId', /* authMiddleware, */ cancelRide); 
// Add other ride routes later


// GET available requests (filtered by vehicle type)
router.get('/available', /* driverAuthMiddleware, */ getAvailableRideRequests);
// PUT to accept a request
router.put('/accept/:rideId', /* driverAuthMiddleware, */ acceptRideRequest);
// GET the driver's current active ride
router.get('/driver/current/:driverId', /* driverAuthMiddleware, */ getCurrentDriverRide); // Pass driverId or get from token
// PUT to mark a ride as completed
router.put('/complete/:rideId', /* driverAuthMiddleware, */ markRideCompleted);
// --- NEW: Driver Completed Rides Route ---
router.get('/driver/:driverId/completed', /* driverAuthMiddleware, */ getDriverCompletedRides);

module.exports = router;