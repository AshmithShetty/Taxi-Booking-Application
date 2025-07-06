// backend/db.js
const mysql = require('mysql2/promise'); // Using promise wrapper for async/await

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', // Default to 'localhost' if not set
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // Default MySQL port
  waitForConnections: true,
  connectionLimit: 10, // Adjust as needed
  queueLimit: 0
});

// Optional: Check connection on module load (can be removed if checked in server.js)
// pool.getConnection()
//   .then(connection => {
//     console.log('MySQL DB Connected Successfully (Pool)!');
//     connection.release(); // Release the connection back to the pool
//   })
//   .catch(err => {
//     console.error('Error connecting to MySQL DB (Pool):', err);
//   });

// Export the pool to be used in other parts of the application
module.exports = pool;