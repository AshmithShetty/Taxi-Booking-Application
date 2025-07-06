// backend/routes/analysisRoutes.js
const express = require('express');
const { getCompanyDailyStats, getCompanyGraphData } = require('../controllers/analysisController');
// TODO: Add Admin authentication middleware

const router = express.Router();

// GET /api/analysis/daily?date=YYYY-MM-DD
router.get('/daily', /* adminAuthMiddleware, */ getCompanyDailyStats);

// GET /api/analysis/graph?mode=...&year=...&month=...
router.get('/graph', /* adminAuthMiddleware, */ getCompanyGraphData);

module.exports = router;