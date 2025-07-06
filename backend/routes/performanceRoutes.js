// backend/routes/performanceRoutes.js
const express = require('express');
const { getDailyStats, getGraphData } = require('../controllers/performanceController');

// --- Create the router FIRST ---
const router = express.Router({ mergeParams: true });

// --- THEN add the logging middleware ---
router.use((req, res, next) => {
    console.log(`>>> Performance Route Hit. DriverID Param: ${req.params.driverId}, Query:`, req.query); // Log query too
    next();
});
// --- End log ---

// Define the specific routes
router.get('/daily', getDailyStats);
router.get('/graph', getGraphData);

module.exports = router;