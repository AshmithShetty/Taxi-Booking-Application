// backend/routes/customerRoutes.js
const express = require('express');
// --- IMPORT BOTH controller functions ---
const { getCustomerById, updateCustomer } = require('../controllers/customerController');
// TODO: Add authentication/authorization middleware later

const router = express.Router();

// GET /api/customers/:id
router.get('/:id', /* authMiddleware, */ getCustomerById);


// PUT /api/customers/:id
router.put('/:id', /* authMiddleware, */ updateCustomer); // Ensure user can only update their own account

module.exports = router;