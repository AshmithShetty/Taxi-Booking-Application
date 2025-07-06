// backend/controllers/authController.js
const db = require('../db');
// NOTE: No password hashing (bcrypt) is used, as previously instructed. Passwords stored/compared as plain text.


const loginUser = async (req, res) => {
    const { name, password, role } = req.body;

    // Basic validation
    if (!name || !password || !role) {
        return res.status(400).json({ message: 'Name, password, and role are required.' });
    }

    let tableName = '';
    let idColumn = '';
    let nameColumn = 'name';
    let query = ''; // Define query variable
    let columnsToSelect = ''; // Define columns to select

    // Determine table, ID column, and select columns based on role
    switch (role.toLowerCase()) {
        case 'customer':
            tableName = 'Customer';
            idColumn = 'customer_id';
            columnsToSelect = `${idColumn}, name, password`; // No is_active check needed
            break;
        case 'driver':
            tableName = 'Driver';
            idColumn = 'driver_id';
            // Select is_active flag ONLY for drivers
            columnsToSelect = `${idColumn}, name, password, is_active`;
            break;
        case 'admin':
            tableName = 'Admin';
            idColumn = 'admin_id';
            columnsToSelect = `${idColumn}, name, password`; // No is_active check needed (yet)
            break;
        default:
            return res.status(400).json({ message: 'Invalid role specified.' });
    }

    // Construct the final query
    query = `SELECT ${columnsToSelect} FROM ${tableName} WHERE ${nameColumn} = ?`;

    try {
        // Execute the query
        const [results] = await db.query(query, [name]);

        // Check if user exists
        if (results.length === 0) {
            console.log(`Login failed for ${name} (${role}): Account does not exist.`);
            // Use a generic message for security (don't reveal if username exists)
            return res.status(401).json({ message: 'Invalid credentials or account does not exist.' });
        }

        const user = results[0];
        const storedPassword = user.password;

        // --- CHECK if DRIVER is INACTIVE ---
        // This check only applies if the role is 'driver'
        // MySQL BOOLEAN/TINYINT(1) often returns 0 for false, 1 for true from the database driver
        if (role.toLowerCase() === 'driver' && user.is_active === 0) {
             console.log(`Login failed for driver ${name}: Account inactive.`);
             // Send a specific status code (403 Forbidden) for inactive accounts
             return res.status(403).json({ message: 'Account is inactive. Please contact administrator.' });
        }
        // --- END INACTIVE CHECK ---

        // Check password (Plain text comparison)
        const passwordMatch = (password === storedPassword);

        if (passwordMatch) {
            // Password matches (and if driver, they are active)
            console.log(`${role} login successful for: ${name}`);
            // Send only necessary user info back to the frontend
            res.status(200).json({
                message: 'Login successful!',
                userId: user[idColumn],
                name: user.name,
                role: role.toLowerCase()
                // DO NOT send back password or is_active status
            });
        } else {
            // Password does not match
            console.log(`Login failed for ${name} (${role}): Incorrect password.`);
            // Use the same generic message as user not found
            return res.status(401).json({ message: 'Invalid credentials or account does not exist.' });
        }
    } catch (error) {
        console.error(`Login error for ${role} ${name}:`, error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
};


// --- registerCustomer function (remains unchanged from your provided version) ---
const registerCustomer = async (req, res) => {
    const { name, email, phone, password } = req.body;

    // Backend Validation
    if (!name || !email || !phone || !password) { /* ... */ }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) { /* ... */ }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { /* ... */ }

    try {
        // Uniqueness check
        const checkUserQuery = 'SELECT customer_id, email, phone_number FROM Customer WHERE email = ? OR phone_number = ?';
        const [existingUsers] = await db.query(checkUserQuery, [email, phone]);

        if (existingUsers.length > 0) { /* ... handle conflict ... */ }

        // Insert new customer (plain text password)
        const insertQuery = 'INSERT INTO Customer (name, email, phone_number, password) VALUES (?, ?, ?, ?)';
        const [result] = await db.query(insertQuery, [name, email, phone, password]);

        console.log(`New customer created with ID: ${result.insertId}`);
        res.status(201).json({ message: 'Customer account created successfully!', customerId: result.insertId });

    } catch (error) {
        console.error('Error registering customer:', error);
        if (error.code === 'ER_DUP_ENTRY') { /* ... */ }
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
};


module.exports = {
    loginUser,
    registerCustomer
};