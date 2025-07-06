// backend/controllers/ratingController.js
const db = require('../db');

const addRating = async (req, res) => {
    const { rideId, score } = req.body;
    // In a real app, also get customerId from authenticated user session/token
    // and verify they actually took this ride.

    if (!rideId || score === undefined || score === null) {
        return res.status(400).json({ message: 'Ride ID and score are required.' });
    }

    const ratingScore = parseInt(score, 10);
    if (isNaN(ratingScore) || ratingScore < 1 || ratingScore > 5) {
        return res.status(400).json({ message: 'Score must be an integer between 1 and 5.' });
    }

    try {
        // 1. Check if the ride exists and its status allows rating (e.g., 'destination reached')
        const [rideCheck] = await db.query('SELECT ride_status, customer_id FROM Ride WHERE ride_id = ?', [rideId]);
        if (rideCheck.length === 0) {
            return res.status(404).json({ message: 'Ride not found.' });
        }
        // Optional: Add check if rideCheck[0].customer_id matches logged-in user
        if (rideCheck[0].ride_status !== 'destination reached') {
            return res.status(400).json({ message: 'Ride cannot be rated yet (status is not "destination reached").' });
        }


        // 2. Check if a rating for this ride already exists
        const [existingRating] = await db.query('SELECT rating_id FROM Rating WHERE ride_id = ?', [rideId]);
        if (existingRating.length > 0) {
            return res.status(409).json({ message: 'This ride has already been rated.' }); // 409 Conflict
        }

        // 3. Insert the new rating
        const insertQuery = 'INSERT INTO Rating (ride_id, score) VALUES (?, ?)';
        const [result] = await db.query(insertQuery, [rideId, ratingScore]);

        console.log(`Rating added for ride ID ${rideId} with score ${ratingScore}. New rating ID: ${result.insertId}`);
        res.status(201).json({ message: 'Rating added successfully!', ratingId: result.insertId });

    } catch (error) {
        console.error('Error adding rating:', error);
        if (error.code === 'ER_DUP_ENTRY') { // Should be caught by the check above, but as fallback
             return res.status(409).json({ message: 'Rating for this ride already exists.' });
        }
        res.status(500).json({ message: 'Internal server error adding rating.' });
    }
};

module.exports = {
    addRating,
};