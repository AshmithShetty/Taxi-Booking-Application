// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes'); // <-- NEW
const rideRoutes = require('./routes/rideRoutes');       // <-- NEW
const ratingRoutes = require('./routes/ratingRoutes');     // <-- NEW
const paymentRoutes = require('./routes/paymentRoutes');
const driverRoutes = require('./routes/driverRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

const app = express();
const PORT = process.env.BACKEND_PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// --- NEW: Middleware to disable caching for ALL API routes ---
// Place this BEFORE any '/api' route definitions
app.use('/api', (req, res, next) => {
  console.log(`Applying no-cache headers to: ${req.method} ${req.originalUrl}`); // Optional: Log requests hitting this middleware
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache'); // HTTP 1.0 fallback
  res.setHeader('Expires', '0'); // Proxies
  res.setHeader('Surrogate-Control', 'no-store');
  next(); // Continue to the next middleware or route handler
});



// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes); // <-- Mount customer routes
app.use('/api/rides', rideRoutes);       // <-- Mount ride routes
app.use('/api/ratings', ratingRoutes);     // <-- Mount rating routes
app.use('/api/payments', paymentRoutes); 
app.use('/api/drivers', driverRoutes); // <-- MOUNT Driver Routes
app.use('/api/drivers/:driverId/performance', performanceRoutes); // <-- MOUNT Performance Routes
app.use('/api/admins', adminRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Basic Test Route
app.get('/', (req, res) => {
  res.send('Hello from Bengaluru Taxi Company Backend!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  db.query('SELECT 1')
    .then(() => console.log('MySQL DB Connected Successfully!'))
    .catch(err => console.error('Error connecting to MySQL DB:', err));
});