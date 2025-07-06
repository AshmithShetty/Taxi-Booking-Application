// backend/controllers/driverController.js
const db = require('../db');

const getDriverDetails = async (req, res) => {
    const driverId = req.params.id;
    // TODO: Add authorization - Ensure the logged-in user IS this driver or an admin.

    if (!driverId) {
        return res.status(400).json({ message: 'Driver ID is required.' });
    }

    try {
        const query = `
            SELECT
                d.driver_id,
                d.name AS driver_name,
                d.email AS driver_email,
                d.phone_number AS driver_phone,
                d.vehicle_id,
                v.name AS vehicle_name,
                v.type AS vehicle_type, -- Needed for filtering ride requests
                a.admin_id,
                a.name AS admin_name,
                a.email AS admin_email,
                a.phone_number AS admin_phone
            FROM Driver d
            JOIN Vehicle v ON d.vehicle_id = v.vehicle_id
            JOIN Admin a ON d.admin_id = a.admin_id
            WHERE d.driver_id = ?
        `;
        const [results] = await db.query(query, [driverId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        res.status(200).json(results[0]);

    } catch (error) {
        console.error('Error fetching driver details:', error);
        res.status(500).json({ message: 'Internal server error fetching driver details.' });
    }
};


// --- Get Drivers managed by a specific Admin ---
const getAdminDrivers = async (req, res) => {
    const adminId = req.params.adminId;
    // TODO: Authorization: Ensure logged-in admin IS adminId

    if (!adminId) {
        return res.status(400).json({ message: 'Admin ID is required.' });
    }

    try {
        // Select drivers managed by this admin, include vehicle info and active status
        const query = `
            SELECT
                d.driver_id,
                d.name,
                d.phone_number,
                d.email,
                d.is_active, -- Include the active status
                v.vehicle_id,
                v.name AS vehicle_name,
                v.type AS vehicle_type
            FROM Driver d
            LEFT JOIN Vehicle v ON d.vehicle_id = v.vehicle_id
            WHERE d.admin_id = ?
            ORDER BY d.driver_id ASC
        `;
        const [drivers] = await db.query(query, [adminId]);
        res.status(200).json(drivers);

    } catch (error) {
        console.error(`Error fetching drivers for admin ${adminId}:`, error);
        res.status(500).json({ message: "Internal server error fetching drivers." });
    }
};

// --- Add a Driver (associated with the calling admin) ---
const addDriver = async (req, res) => {
    const adminId = req.params.adminId;
    const { name, phone, email, password, vehicle_id } = req.body;
    // TODO: Authorization: Ensure logged-in admin IS adminId

    // Validation
    if (!name || !phone || !email || !password || !vehicle_id) {
        return res.status(400).json({ message: 'Name, Phone, Email, Password, and Vehicle ID are required.' });
    }
    // Add regex checks for phone/email
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) return res.status(400).json({ message: 'Invalid phone format (10 digits).' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Invalid email format.' });

    try {
        // Check uniqueness for email/phone
        const [existing] = await db.query(
            'SELECT driver_id FROM Driver WHERE email = ? OR phone_number = ?',
            [email, phone]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Driver with this Email or Phone already exists.' });
        }

        // Check if vehicle exists and is unassigned (to an *active* driver)
         const [vehicleCheck] = await db.query(
             `SELECT d.driver_id
              FROM Vehicle v
              LEFT JOIN Driver d ON v.vehicle_id = d.vehicle_id AND d.is_active = TRUE
              WHERE v.vehicle_id = ?`,
             [vehicle_id]
         );
         if (vehicleCheck.length === 0) {
             return res.status(404).json({ message: 'Selected vehicle not found.' });
         }
         if (vehicleCheck[0].driver_id !== null) {
              return res.status(409).json({ message: 'Selected vehicle is already assigned to an active driver.' });
         }


        // Insert new driver (storing plain password as requested)
        const insertQuery = `
            INSERT INTO Driver (name, phone_number, email, password, vehicle_id, admin_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, TRUE)
        `;
        const [result] = await db.query(insertQuery, [name, phone, email, password, vehicle_id, adminId]);
        const newDriverId = result.insertId;

        console.log(`Admin ${adminId} added new driver ID: ${newDriverId}`);
        res.status(201).json({
            message: 'Driver added successfully!',
            driverId: newDriverId
        });

    } catch (error) {
        console.error(`Error adding driver for admin ${adminId}:`, error);
        // Check for foreign key violations (e.g., bad vehicle_id, bad admin_id)
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Invalid Vehicle ID or Admin ID provided.' });
        }
        res.status(500).json({ message: 'Internal server error adding driver.' });
    }
};

// --- Update Driver Details ---
const updateDriver = async (req, res) => {
    const driverIdToUpdate = req.params.driverId;
    const { name, phone, email, vehicle_id } = req.body;
    // TODO: Authorization: Ensure logged-in admin can update this driver

    // Validation (Keep as is)
    if (!name || !phone || !email || !vehicle_id) { /* ... */ }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) { /* ... */ }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { /* ... */ }

    try {
        // --- Check for active rides BEFORE proceeding ---
        const activeStatuses = ['payment done', 'request accepted']; // Statuses indicating an ongoing ride
        const activeRideCheckQuery = `
            SELECT COUNT(*) as activeRideCount
            FROM Ride
            WHERE driver_id = ? AND ride_status IN (?)
        `;
        const [activeCheck] = await db.query(activeRideCheckQuery, [driverIdToUpdate, activeStatuses]);

        if (activeCheck[0].activeRideCount > 0) {
            console.log(`Update failed for driver ${driverIdToUpdate}: Driver has ongoing rides.`);
            // Use 409 Conflict as the state prevents the desired action
            return res.status(409).json({ message: 'Cannot update driver details while they have an ongoing ride.' });
        }
        // --- END ACTIVE RIDE CHECK ---


        // 1. Check for Uniqueness Conflicts (against OTHER drivers - Keep as is)
        const [existing] = await db.query( /* ... uniqueness query ... */ );
        if (existing.length > 0) { /* ... handle conflict ... */ }

        // 2. Check if the NEW vehicle is available (Keep as is)
         const [vehicleCheck] = await db.query( /* ... vehicle availability query ... */ );
         if (vehicleCheck.length === 0) { /* ... handle vehicle not found ... */ }
         if (vehicleCheck[0].driver_id !== null && vehicleCheck[0].driver_id != driverIdToUpdate) { /* ... handle vehicle assigned to other driver ... */ }


        // 3. Update the driver record (only if no active rides and checks pass)
        const updateQuery = `
            UPDATE Driver SET name = ?, phone_number = ?, email = ?, vehicle_id = ?
            WHERE driver_id = ?
        `;
        const [result] = await db.query(updateQuery, [name, phone, email, vehicle_id, driverIdToUpdate]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Driver not found for update.' });
        }

        console.log(`Driver ID: ${driverIdToUpdate} updated.`);
        res.status(200).json({ message: 'Driver updated successfully!' });

    } catch (error) {
         console.error(`Error updating driver ${driverIdToUpdate}:`, error);
         // Keep existing specific error handling (e.g., FK violations)
         if (error.code === 'ER_NO_REFERENCED_ROW_2') { /* ... */ }
         res.status(500).json({ message: 'Internal server error updating driver.' });
    }
};


// ---  Check if a driver has active rides ---
const checkActiveRides = async (req, res) => {
    const driverId = req.params.driverId;
    // TODO: Authorization check

    if (!driverId) {
        return res.status(400).json({ message: 'Driver ID is required.' });
    }
    try {
        const activeStatuses = ['payment done', 'request accepted']; // Define statuses preventing deactivation
        const query = `
            SELECT COUNT(*) as activeRideCount
            FROM Ride
            WHERE driver_id = ? AND ride_status IN (?)
        `;
        const [results] = await db.query(query, [driverId, activeStatuses]);
        const hasActive = results[0].activeRideCount > 0;
        res.status(200).json({ hasActiveRides: hasActive });

    } catch (error) {
         console.error(`Error checking active rides for driver ${driverId}:`, error);
         res.status(500).json({ message: 'Internal server error checking active rides.' });
    }
};


// --- Deactivate Driver (Soft Delete) ---
const deactivateDriver = async (req, res) => {
    const driverId = req.params.driverId;
    // TODO: Authorization check

    if (!driverId) {
        return res.status(400).json({ message: 'Driver ID is required.' });
    }

    let connection; // Define connection outside try
    try {
        // Ensure no active rides before proceeding
        const [activeCheck] = await db.query(
            "SELECT COUNT(*) as activeRideCount FROM Ride WHERE driver_id = ? AND ride_status IN ('payment done', 'request accepted')",
            [driverId]
         );
         if (activeCheck[0].activeRideCount > 0) {
             return res.status(400).json({ message: 'Cannot deactivate driver with ongoing rides.' });
         }

        // Use a transaction to update both status and vehicle
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Set is_active to FALSE and vehicle_id to NULL
        const updateQuery = 'UPDATE Driver SET is_active = FALSE, vehicle_id = NULL WHERE driver_id = ? AND is_active = TRUE'; // Only deactivate active drivers
        const [result] = await connection.query(updateQuery, [driverId]);

        if (result.affectedRows > 0) {
             await connection.commit(); // Commit transaction
             console.log(`Driver ID: ${driverId} deactivated and unassigned from vehicle.`);
            res.status(200).json({ message: 'Driver deactivated successfully.' });
        } else {
             await connection.rollback(); // Rollback if driver not found or already inactive
             res.status(404).json({ message: 'Driver not found or already inactive.' });
        }
    } catch (error) {
         console.error(`Error deactivating driver ${driverId}:`, error);
         if (connection) await connection.rollback(); // Rollback on error
         res.status(500).json({ message: 'Internal server error deactivating driver.' });
    } finally {
        if (connection) connection.release(); // Release connection
    }
};

// --- Activate Driver ---
const activateDriver = async (req, res) => {
    const driverId = req.params.driverId;
    const { vehicle_id } = req.body; // Expect vehicle_id in body
    // TODO: Authorization check

    if (!driverId) {
        return res.status(400).json({ message: 'Driver ID is required.' });
    }
    if (!vehicle_id) {
         return res.status(400).json({ message: 'Vehicle ID is required for activation.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Check if driver exists and is INACTIVE
        const [driverCheck] = await connection.query('SELECT is_active FROM Driver WHERE driver_id = ?', [driverId]);
        if (driverCheck.length === 0) {
             await connection.rollback(); connection.release();
             return res.status(404).json({ message: 'Driver not found.' });
        }
        if (driverCheck[0].is_active) { // Check if already active
             await connection.rollback(); connection.release();
             return res.status(400).json({ message: 'Driver is already active.' });
        }


        // 2. Check if the selected vehicle exists and is unassigned (to another ACTIVE driver)
        const [vehicleCheck] = await connection.query(
             `SELECT d.driver_id
              FROM Vehicle v
              LEFT JOIN Driver d ON v.vehicle_id = d.vehicle_id AND d.is_active = TRUE
              WHERE v.vehicle_id = ?`,
             [vehicle_id]
         );
         if (vehicleCheck.length === 0) {
              await connection.rollback(); connection.release();
             return res.status(404).json({ message: `Selected vehicle (ID: ${vehicle_id}) not found.` });
         }
         if (vehicleCheck[0].driver_id !== null) {
              await connection.rollback(); connection.release();
              return res.status(409).json({ message: 'Selected vehicle is already assigned to another active driver.' });
         }

        // 3. Activate the driver and assign the vehicle
        const updateQuery = 'UPDATE Driver SET is_active = TRUE, vehicle_id = ? WHERE driver_id = ?';
        const [result] = await connection.query(updateQuery, [vehicle_id, driverId]);

        if (result.affectedRows === 0) {
            // Should not happen if driver exists, but safety check
             throw new Error('Failed to update driver status or vehicle assignment.');
        }

        await connection.commit();
        console.log(`Driver ID: ${driverId} reactivated and assigned vehicle ID: ${vehicle_id}.`);
        res.status(200).json({ message: 'Driver reactivated successfully.' });

    } catch (error) {
         console.error(`Error activating driver ${driverId}:`, error);
         if (connection) await connection.rollback();
          if (error.code === 'ER_NO_REFERENCED_ROW_2') { // Catch bad vehicle_id FK error potentially
            return res.status(400).json({ message: 'Invalid Vehicle ID provided.' });
         }
         res.status(500).json({ message: 'Internal server error activating driver.' });
    } finally {
         if (connection) connection.release();
    }
};



module.exports = {
    getDriverDetails,
    getAdminDrivers,
    addDriver,
    updateDriver,
    checkActiveRides,
    deactivateDriver,
    activateDriver,
};