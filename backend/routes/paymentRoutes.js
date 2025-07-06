// backend/routes/paymentRoutes.js
const express = require('express');
const { processPayment } = require('../controllers/paymentController');
// Add authentication middleware here later if needed

const router = express.Router();

// POST /api/payments/process
router.post('/process', processPayment);

// Add other payment routes later (e.g., GET /api/payments/ride/:rideId)

module.exports = router;