// backend/routes/ratingRoutes.js
const express = require('express');
const { addRating } = require('../controllers/ratingController');

const router = express.Router();

// POST /api/ratings
router.post('/', addRating);

module.exports = router;