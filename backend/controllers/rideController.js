// backend/controllers/rideController.js
const crypto = require('crypto'); // Make sure crypto is imported
const db = require('../db');

// --- Helper Function to Generate Code ---
function generateVerificationCode(length = 6) {
    const characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let code = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        code += characters[bytes[i] % characters.length];
    }
    return code;
}
// --- End Helper ---

// --- getCustomerRidesByStatus function ---
const getCustomerRidesByStatus = async (req, res) => {
    const customerId = req.params.customerId;
    const statusQuery = req.query.statuses;

    if (!customerId || !statusQuery) {
        return res.status(400).json({ message: 'Customer ID and statuses query parameter are required.' });
    }

    const requestedStatuses = statusQuery.split(',').map(s => s.trim().toLowerCase());
    // Keep valid statuses definition consistent with your schema/logic
    const validStatuses = ['drafted', 'payment done', 'request accepted', 'destination reached'];
    const statusesToQuery = requestedStatuses.filter(s => validStatuses.includes(s));

    if (statusesToQuery.length === 0) {
         return res.status(400).json({ message: 'No valid statuses provided for query.' });
    }

    try {
        // *** MODIFIED QUERY: Added CASE statement for verification_code ***
        const query = `
            SELECT
                r.ride_id,
                r.pickup_location,
                r.dropoff_location,
                r.ride_status,
                r.booking_date_time,
                r.driver_id,
                d.name AS driver_name,
                rt.rating_id,
                rt.score AS rating_score,
                -- Select code only if status allows customer to see it
                CASE
                    WHEN r.ride_status IN ('payment done', 'request accepted') THEN r.verification_code
                    ELSE NULL
                END AS verification_code
            FROM Ride r
            LEFT JOIN Driver d ON r.driver_id = d.driver_id
            LEFT JOIN Rating rt ON r.ride_id = rt.ride_id
            WHERE r.customer_id = ? AND r.ride_status IN (?)
            ORDER BY r.booking_date_time DESC
        `;
        // *** END MODIFICATION ***

        const [rides] = await db.query(query, [customerId, statusesToQuery]);
        res.status(200).json(rides);

    } catch (error) {
        console.error('Error fetching customer rides:', error);
        res.status(500).json({ message: 'Internal server error fetching rides.' });
    }
};
// --- End UPDATED getCustomerRidesByStatus ---


// --- bookRide function (includes code generation) ---
const bookRide = async (req, res) => {
    const {
        customerId, pickupLocation, dropoffLocation, distance, taxiType
    } = req.body;

    if (!customerId || !pickupLocation || !dropoffLocation || distance == null || !taxiType) { return res.status(400).json({ message: 'Missing required fields.'});}
    if (isNaN(parseFloat(distance)) || parseFloat(distance) <= 0) { return res.status(400).json({ message: 'Invalid distance.'}); }
    const validTypes = ['sedan', 'hatchback', 'suv'];
    if (!validTypes.includes(taxiType.toLowerCase())) { return res.status(400).json({ message: 'Invalid taxi type.'}); }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const insertRideQuery = `
            INSERT INTO Ride (
                customer_id, driver_id, pickup_location, dropoff_location,
                distance, taxi_type, ride_status, booking_date_time, verification_code
            ) VALUES (?, NULL, ?, ?, ?, ?, 'drafted', NOW(), NULL)
        `;
        const [rideResult] = await connection.query(insertRideQuery, [
            customerId, pickupLocation, dropoffLocation, parseFloat(distance), taxiType.toLowerCase()
        ]);
        const newRideId = rideResult.insertId;
        const verificationCode = generateVerificationCode(6);
        const updateCodeQuery = 'UPDATE Ride SET verification_code = ? WHERE ride_id = ?';
        await connection.query(updateCodeQuery, [verificationCode, newRideId]);
        await connection.commit();

        console.log(`Drafted ride created ID: ${newRideId} for customer ${customerId}. Code: ${verificationCode}`);
        const calculatedFare = 50 + (parseFloat(distance) * 10);
        res.status(201).json({
            message: 'Ride drafted successfully!', rideId: newRideId, fare: calculatedFare
        });
    } catch (error) {
        console.error('Error drafting ride:', error);
        if (connection) await connection.rollback();
        if (error.code === 'ER_NO_REFERENCED_ROW_2') { return res.status(400).json({ message: 'Invalid customer ID.' }); }
        res.status(500).json({ message: 'Internal server error creating ride draft.' });
    } finally {
        if (connection) connection.release();
    }
};

// --- deleteDraftRide function ---
const deleteDraftRide = async (req, res) => {
    const rideId = req.params.rideId;
    if (!rideId) { return res.status(400).json({ message: 'Ride ID is required.' }); }
    try {
        const deleteQuery = `DELETE FROM Ride WHERE ride_id = ? AND ride_status = 'drafted'`;
        const [result] = await db.query(deleteQuery, [rideId]);
        if (result.affectedRows > 0) {
            console.log(`Drafted ride ID: ${rideId} deleted.`);
            res.status(200).json({ message: 'Ride draft cancelled successfully.' });
        } else {
            console.log(`Attempted delete ride ${rideId}, not found or not drafted.`);
            res.status(404).json({ message: 'Ride draft not found or cannot be cancelled.' });
        }
    } catch (error) {
        console.error('Error deleting draft ride:', error);
        res.status(500).json({ message: 'Internal server error cancelling ride draft.' });
    }
};

// --- cancelRide function ---
const cancelRide = async (req, res) => {
    const rideId = req.params.rideId;
    // TODO: Add customer ownership verification from auth
    if (!rideId) { return res.status(400).json({ message: 'Ride ID required.' }); }
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [rides] = await connection.query('SELECT ride_id, customer_id, ride_status FROM Ride WHERE ride_id = ?', [rideId]);
        if (rides.length === 0) { await connection.rollback(); connection.release(); return res.status(404).json({ message: 'Ride not found.' }); }
        const ride = rides[0];
        if (ride.ride_status !== 'drafted' && ride.ride_status !== 'payment done') { await connection.rollback(); connection.release(); return res.status(400).json({ message: `Cannot cancel ride in status (${ride.ride_status}).` }); }
        if (ride.ride_status === 'payment done') {
            const [deletePaymentResult] = await connection.query('DELETE FROM Payment WHERE ride_id = ?', [rideId]);
            console.log(`Deleted ${deletePaymentResult.affectedRows} payment record(s) for ride ${rideId}.`);
        }
        const [deleteRideResult] = await connection.query('DELETE FROM Ride WHERE ride_id = ?', [rideId]);
        if (deleteRideResult.affectedRows === 0) { throw new Error('Failed to delete ride after checking status.'); }
        await connection.commit();
        console.log(`Customer cancelled ride ID: ${rideId} (Status: ${ride.ride_status})`);
        res.status(200).json({ message: 'Ride cancelled successfully.' });
    } catch (error) {
        console.error(`Error cancelling ride ${rideId}:`, error);
        if (connection) await connection.rollback();
        res.status(500).json({ message: 'Internal server error cancelling ride.' });
    } finally {
        if (connection) connection.release();
    }
};

// --- getCustomerRideHistory function ---
const getCustomerRideHistory = async (req, res) => {
    const customerId = req.params.customerId;
    // TODO: Verify customerId matches auth
    const { pickup, dropoff, taxiType, minDistance, maxDistance, minFare, maxFare, minRating, maxRating, startDate, endDate } = req.query;
    if (!customerId) { return res.status(400).json({ message: 'Customer ID required.' }); }
    try {
        let queryParams = [customerId];
        let baseQuery = ` SELECT r.ride_id, r.booking_date_time, r.taxi_type, r.pickup_location, r.dropoff_location, d.name AS driver_name, r.distance, CalculateRideFare(r.distance) AS fare, rt.score AS rating_score FROM Ride r LEFT JOIN Driver d ON r.driver_id = d.driver_id LEFT JOIN Rating rt ON r.ride_id = rt.ride_id WHERE r.customer_id = ? AND r.ride_status = 'destination reached' `;
        // Dynamically add filters (keep as before)
        if (pickup) { baseQuery += ' AND r.pickup_location LIKE ?'; queryParams.push(`%${pickup}%`); }
        if (dropoff) { baseQuery += ' AND r.dropoff_location LIKE ?'; queryParams.push(`%${dropoff}%`); }
        if (taxiType) { baseQuery += ' AND r.taxi_type = ?'; queryParams.push(taxiType); }
        if (minDistance) { baseQuery += ' AND r.distance >= ?'; queryParams.push(parseFloat(minDistance)); }
        if (maxDistance) { baseQuery += ' AND r.distance <= ?'; queryParams.push(parseFloat(maxDistance)); }
        if (minFare) { baseQuery += ' AND CalculateRideFare(r.distance) >= ?'; queryParams.push(parseFloat(minFare)); }
        if (maxFare) { baseQuery += ' AND CalculateRideFare(r.distance) <= ?'; queryParams.push(parseFloat(maxFare)); }
        if (minRating) { baseQuery += ' AND rt.score >= ?'; queryParams.push(parseInt(minRating, 10)); }
        if (maxRating) { baseQuery += ' AND rt.score <= ?'; queryParams.push(parseInt(maxRating, 10)); }
        if (startDate) { baseQuery += ' AND r.booking_date_time >= ?'; queryParams.push(startDate); }
        if (endDate) { baseQuery += ' AND r.booking_date_time <= ?'; queryParams.push(endDate); }
        baseQuery += ' ORDER BY r.booking_date_time DESC';
        const [history] = await db.query(baseQuery, queryParams);
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching customer ride history:', error);
        res.status(500).json({ message: 'Internal server error fetching ride history.' });
    }
};

// --- getAvailableRideRequests function ---
const getAvailableRideRequests = async (req, res) => {
     const { vehicleType } = req.query;
     if (!vehicleType) { return res.status(400).json({ message: 'Vehicle type required.' }); }
     const validTypes = ['sedan', 'hatchback', 'suv'];
     if (!validTypes.includes(vehicleType.toLowerCase())) { return res.status(400).json({ message: 'Invalid vehicle type.' }); }
     try {
         const query = ` SELECT r.ride_id, r.pickup_location, r.dropoff_location, r.distance, CalculateDriverCommission(r.distance) AS potential_commission FROM Ride r WHERE r.ride_status = 'payment done' AND r.driver_id IS NULL AND r.taxi_type = ? ORDER BY r.booking_date_time ASC `;
         const [requests] = await db.query(query, [vehicleType.toLowerCase()]);
         res.status(200).json(requests);
     } catch (error) {
         console.error('Error fetching available ride requests:', error);
         res.status(500).json({ message: 'Internal server error fetching ride requests.' });
     }
};

// --- acceptRideRequest function (includes active ride check) ---
const acceptRideRequest = async (req, res) => {
    const rideId = req.params.rideId;
    const { driverId } = req.body;
    if (!rideId || !driverId) { return res.status(400).json({ message: 'Ride/Driver ID required.' }); }
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const activeRideCheckQuery = ` SELECT ride_id FROM Ride WHERE driver_id = ? AND ride_status = 'request accepted' LIMIT 1 `;
        const [activeRides] = await connection.query(activeRideCheckQuery, [driverId]);
        if (activeRides.length > 0) { await connection.rollback(); connection.release(); console.log(`Driver ${driverId} has active ride ${activeRides[0].ride_id}.`); return res.status(409).json({ message: 'Cannot accept ride: You already have an active ride.' }); }
        const updateQuery = ` UPDATE Ride SET driver_id = ?, ride_status = 'request accepted' WHERE ride_id = ? AND ride_status = 'payment done' AND driver_id IS NULL `;
        const [result] = await connection.query(updateQuery, [driverId, rideId]);
        if (result.affectedRows > 0) {
            await connection.commit(); console.log(`Driver ${driverId} accepted Ride ID: ${rideId}`); res.status(200).json({ message: 'Ride accepted successfully.' });
        } else {
            await connection.rollback(); console.log(`Driver ${driverId} failed accept Ride ID: ${rideId}.`);
            const [currentRide] = await connection.query('SELECT ride_status, driver_id FROM Ride WHERE ride_id = ?', [rideId]); // Use connection for check
            if (currentRide.length === 0) { return res.status(404).json({ message: 'Ride not found or cancelled.' }); }
            if (currentRide[0].driver_id) { return res.status(409).json({ message: 'Ride already accepted.' }); }
            if (currentRide[0].ride_status !== 'payment done') { return res.status(409).json({ message: `Ride unavailable (Status: ${currentRide[0].ride_status}).` }); }
            return res.status(400).json({ message: 'Failed to accept ride.' });
        }
    } catch (error) {
        console.error(`Error accepting ride ${rideId} by ${driverId}:`, error);
        if (connection) await connection.rollback(); res.status(500).json({ message: 'Internal server error.' });
    } finally {
         if (connection) connection.release();
    }
};

// --- getCurrentDriverRide function ---
const getCurrentDriverRide = async (req, res) => {
    const driverId = req.params.driverId;
     if (!driverId) { return res.status(400).json({ message: 'Driver ID required.' }); }
     try {
         const query = ` SELECT r.ride_id, r.pickup_location, r.dropoff_location, r.distance, c.name AS customer_name, CalculateDriverCommission(r.distance) AS commission FROM Ride r JOIN Customer c ON r.customer_id = c.customer_id WHERE r.driver_id = ? AND r.ride_status = 'request accepted' LIMIT 1 `;
         const [results] = await db.query(query, [driverId]);
         res.status(200).json(results.length > 0 ? results[0] : null);
     } catch (error) {
          console.error(`Error fetching current ride for driver ${driverId}:`, error);
          res.status(500).json({ message: 'Internal server error.' });
     }
};

// --- markRideCompleted function (includes verification) ---
const markRideCompleted = async (req, res) => {
    const rideId = req.params.rideId;
    const { verificationCode } = req.body;
    // TODO: Verify driverId from auth matches ride.driver_id
    if (!rideId) { return res.status(400).json({ message: 'Ride ID required.' }); }
    if (!verificationCode) { return res.status(400).json({ message: 'Verification code required.' }); }
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [rides] = await connection.query('SELECT ride_id, driver_id, distance, ride_status, verification_code FROM Ride WHERE ride_id = ?', [rideId]);
        if (rides.length === 0) { await connection.rollback(); connection.release(); return res.status(404).json({ message: 'Ride not found.' }); }
        const ride = rides[0];
        if (ride.ride_status !== 'request accepted') { await connection.rollback(); connection.release(); return res.status(400).json({ message: `Ride status is '${ride.ride_status}'.` }); }
        if (!ride.verification_code || verificationCode.toLowerCase() !== ride.verification_code.toLowerCase()) { await connection.rollback(); connection.release(); console.log(`Verification fail ride ${rideId}. Exp:${ride.verification_code}, Got:${verificationCode}`); return res.status(403).json({ message: 'Invalid verification code.' }); }
        const updateRideQuery = `UPDATE Ride SET ride_status = 'destination reached', verification_code = NULL WHERE ride_id = ?`;
        const [updateResult] = await connection.query(updateRideQuery, [rideId]);
        if (updateResult.affectedRows === 0) { throw new Error('Failed update ride status.'); }
        const calculateCommissionQuery = 'SELECT CalculateDriverCommission(?) AS commissionAmount';
        const [commissionResult] = await connection.query(calculateCommissionQuery, [ride.distance]);
        const commissionAmount = commissionResult[0].commissionAmount;
        if (commissionAmount !== null) {
            const insertCommissionQuery = ` INSERT INTO Commission (ride_id, commission_amount, commission_date_time) VALUES (?, ?, NOW()) `;
            await connection.query(insertCommissionQuery, [rideId, commissionAmount]);
        } else { console.warn(`Null commission for ride ${rideId}.`); }
        await connection.commit();
        console.log(`Ride ${rideId} verified & completed. Commission recorded.`);
        res.status(200).json({ message: 'Ride completed and verified successfully.' });
    } catch (error) {
        console.error(`Error marking ride ${rideId} complete:`, error);
        if (connection) await connection.rollback(); res.status(500).json({ message: 'Internal server error.' });
    } finally {
        if (connection) connection.release();
    }
};

// --- getDriverCompletedRides function ---
const getDriverCompletedRides = async (req, res) => {
    const driverId = req.params.driverId;
    // TODO: Verify driverId
    const { pickup, dropoff, taxiType, minDistance, maxDistance, minCommission, maxCommission, minFare, maxFare, minRating, maxRating, startDate, endDate } = req.query;
    if (!driverId) { return res.status(400).json({ message: 'Driver ID required.' }); }
    try {
        let queryParams = [driverId];
        let baseQuery = ` SELECT r.ride_id, r.booking_date_time, r.taxi_type, r.pickup_location, r.dropoff_location, r.distance, CalculateDriverCommission(r.distance) AS commission, rt.score AS rating_score FROM Ride r LEFT JOIN Rating rt ON r.ride_id = rt.ride_id WHERE r.driver_id = ? AND r.ride_status = 'destination reached' `;
        // Filters (keep as before)
        if (pickup) { baseQuery += ' AND r.pickup_location LIKE ?'; queryParams.push(`%${pickup}%`); }
        if (dropoff) { baseQuery += ' AND r.dropoff_location LIKE ?'; queryParams.push(`%${dropoff}%`); }
        if (taxiType) { baseQuery += ' AND r.taxi_type = ?'; queryParams.push(taxiType); }
        if (minDistance) { baseQuery += ' AND r.distance >= ?'; queryParams.push(parseFloat(minDistance)); }
        if (maxDistance) { baseQuery += ' AND r.distance <= ?'; queryParams.push(parseFloat(maxDistance)); }
        const finalMinCommission = minCommission ?? minFare; const finalMaxCommission = maxCommission ?? maxFare;
        if (finalMinCommission) { baseQuery += ' AND CalculateDriverCommission(r.distance) >= ?'; queryParams.push(parseFloat(finalMinCommission)); }
        if (finalMaxCommission) { baseQuery += ' AND CalculateDriverCommission(r.distance) <= ?'; queryParams.push(parseFloat(finalMaxCommission)); }
        if (minRating) { baseQuery += ' AND rt.score >= ?'; queryParams.push(parseInt(minRating, 10)); }
        if (maxRating) { baseQuery += ' AND rt.score <= ?'; queryParams.push(parseInt(maxRating, 10)); }
        if (startDate) { baseQuery += ' AND r.booking_date_time >= ?'; queryParams.push(startDate); }
        if (endDate) { baseQuery += ' AND r.booking_date_time <= ?'; queryParams.push(endDate); }
        baseQuery += ' ORDER BY r.booking_date_time DESC';
        const [completedRides] = await db.query(baseQuery, queryParams);
        res.status(200).json(completedRides);
    } catch (error) {
        console.error(`Error fetching completed rides for driver ${driverId}:`, error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};


// --- Module Exports ---
module.exports = {
    getCustomerRidesByStatus,
    bookRide,
    deleteDraftRide,
    cancelRide,
    getCustomerRideHistory,
    getAvailableRideRequests,
    acceptRideRequest,
    getCurrentDriverRide,
    markRideCompleted,
    getDriverCompletedRides
};