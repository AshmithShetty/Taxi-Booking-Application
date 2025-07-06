// backend/controllers/vehicleController.js
const db = require('../db');

// --- Get ALL Vehicles with Driver Assignment Status ---
const getAllVehicles = async (req, res) => {
    // TODO: Add Admin Authorization Check
    try {
        // LEFT JOIN Driver to see if a driver is assigned to the vehicle
        const query = `
            SELECT
                v.vehicle_id,
                v.name,
                v.type,
                d.driver_id AS assigned_driver_id
            FROM Vehicle v
            LEFT JOIN Driver d ON v.vehicle_id = d.vehicle_id
            ORDER BY v.vehicle_id ASC
        `;
        const [vehicles] = await db.query(query);
        res.status(200).json(vehicles);
    } catch (error) {
        console.error("Error fetching all vehicles:", error);
        res.status(500).json({ message: "Internal server error fetching vehicles." });
    }
};

// --- Add a New Vehicle ---
const addVehicle = async (req, res) => {
    const { name, type } = req.body;
    // TODO: Add Admin Authorization Check

    // Basic Validation
    if (!name || !type) {
        return res.status(400).json({ message: "Vehicle name and type are required." });
    }
    const validTypes = ['sedan', 'hatchback', 'suv'];
    if (!validTypes.includes(type.toLowerCase())) {
        return res.status(400).json({ message: "Invalid vehicle type provided." });
    }

    try {
        // Check if vehicle name already exists (optional but good practice)
        const [existing] = await db.query('SELECT vehicle_id FROM Vehicle WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(409).json({ message: `Vehicle with name "${name}" already exists.` });
        }

        // Insert new vehicle
        const insertQuery = 'INSERT INTO Vehicle (name, type) VALUES (?, ?)';
        const [result] = await db.query(insertQuery, [name, type.toLowerCase()]);

        const newVehicleId = result.insertId;
        console.log(`New vehicle added with ID: ${newVehicleId}`);

        res.status(201).json({
            message: 'Vehicle added successfully!',
            vehicleId: newVehicleId,
            name: name,
            type: type.toLowerCase()
        });

    } catch (error) {
         console.error("Error adding vehicle:", error);
         // Handle potential duplicate entry error if unique constraint exists on name
         if (error.code === 'ER_DUP_ENTRY') {
              return res.status(409).json({ message: `Vehicle with name "${name}" already exists.` });
         }
         res.status(500).json({ message: "Internal server error adding vehicle." });
    }
};

// --- Get Unassigned Vehicles ---
const getUnassignedVehicles = async (req, res) => {
    // TODO: Admin Auth
    try {
        // Select vehicles NOT assigned to any ACTIVE driver
        const query = `
            SELECT v.vehicle_id, v.name, v.type
            FROM Vehicle v
            LEFT JOIN Driver d ON v.vehicle_id = d.vehicle_id AND d.is_active = TRUE
            WHERE d.driver_id IS NULL
            ORDER BY v.name ASC
        `;
        const [vehicles] = await db.query(query);
        res.status(200).json(vehicles);
    } catch (error) {
        console.error("Error fetching unassigned vehicles:", error);
        res.status(500).json({ message: "Internal server error fetching unassigned vehicles." });
    }
};

// ---  Get Vehicle Options for Editing a Specific Driver ---
const getVehicleOptionsForDriver = async (req, res) => {
    const driverId = req.params.driverId;
    // TODO: Admin Auth

    if (!driverId) {
        return res.status(400).json({ message: 'Driver ID is required.' });
    }

    try {
        // Select vehicles that are either unassigned OR assigned to THIS driver
        const query = `
            SELECT v.vehicle_id, v.name, v.type
            FROM Vehicle v
            LEFT JOIN Driver d ON v.vehicle_id = d.vehicle_id AND d.is_active = TRUE
            WHERE d.driver_id IS NULL OR d.driver_id = ?
            ORDER BY v.name ASC
        `;
        const [vehicles] = await db.query(query, [driverId]);
        res.status(200).json(vehicles);
    } catch (error) {
         console.error(`Error fetching vehicle options for driver ${driverId}:`, error);
         res.status(500).json({ message: "Internal server error fetching vehicle options." });
    }
};

// --- NEW: Delete a Vehicle ---
const deleteVehicle = async (req, res) => {
    const vehicleId = req.params.id;
    // TODO: Add Admin Authorization Check

    if (!vehicleId) {
        return res.status(400).json({ message: "Vehicle ID is required." });
    }

    try {
        // 1. Check if the vehicle exists and if it's assigned to ANY driver (active or inactive)
        //    We prevent deletion even if assigned to an inactive driver to avoid potential issues
        //    if that driver is reactivated before the vehicle is reassigned/deleted.
        //    A LEFT JOIN is suitable here.
        const checkQuery = `
            SELECT v.vehicle_id, d.driver_id
            FROM Vehicle v
            LEFT JOIN Driver d ON v.vehicle_id = d.vehicle_id
            WHERE v.vehicle_id = ?
        `;
        const [vehicleCheck] = await db.query(checkQuery, [vehicleId]);

        if (vehicleCheck.length === 0) {
            return res.status(404).json({ message: "Vehicle not found." });
        }

        // 2. Check if assigned to ANY driver
        if (vehicleCheck[0].driver_id !== null) {
            console.log(`Attempted delete vehicle ${vehicleId}, but it's assigned to driver ${vehicleCheck[0].driver_id}.`);
            // Use 409 Conflict as the state prevents the deletion
            return res.status(409).json({ message: "Cannot delete vehicle: It is currently assigned to a driver. Unassign it first." });
        }

        // 3. If unassigned, proceed with deletion
        const deleteQuery = 'DELETE FROM Vehicle WHERE vehicle_id = ?';
        const [result] = await db.query(deleteQuery, [vehicleId]);

        if (result.affectedRows > 0) {
            console.log(`Vehicle ID: ${vehicleId} deleted successfully.`);
            res.status(200).json({ message: "Vehicle deleted successfully." }); // Or 204 No Content
        } else {
            // Should not happen if the check found it, but safety net
             return res.status(404).json({ message: "Vehicle not found (unexpected error during deletion)." });
        }

    } catch (error) {
         console.error(`Error deleting vehicle ${vehicleId}:`, error);
         // Check for specific foreign key errors if Vehicle is referenced elsewhere unexpectedly
         // if (error.code === '...') { ... }
         res.status(500).json({ message: "Internal server error deleting vehicle." });
    }
};
// --- End NEW function ---



module.exports = {
    getAllVehicles,
    addVehicle,
    getUnassignedVehicles,     
    getVehicleOptionsForDriver, 
    deleteVehicle,
    // Add updateVehicle, deleteVehicle later if needed
};