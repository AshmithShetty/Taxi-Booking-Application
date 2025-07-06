// backend/routes/authRoutes.js
const express = require('express');
// Import both controller functions
const { loginUser, registerCustomer } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginUser);

// POST /api/auth/register/customer 
router.post('/register/customer', registerCustomer);

module.exports = router;