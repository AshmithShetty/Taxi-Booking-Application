// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const rideRoutes = require('./routes/rideRoutes');      
const ratingRoutes = require('./routes/ratingRoutes');    
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
app.use('/api/customers', customerRoutes);
app.use('/api/rides', rideRoutes);       
app.use('/api/ratings', ratingRoutes);    
app.use('/api/payments', paymentRoutes);
app.use('/api/drivers', driverRoutes); 
app.use('/api/drivers/:driverId/performance', performanceRoutes); 
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