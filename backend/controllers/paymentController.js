// backend/controllers/paymentController.js
const db = require('../db');

const processPayment = async (req, res) => {
    const { rideId, amount, paymentMethod } = req.body;
    // In a real app, verify the customer ID from auth token matches the ride's customer

    // Basic Validation
    if (!rideId || amount == null || !paymentMethod) {
        return res.status(400).json({ message: 'Missing rideId, amount, or paymentMethod.' });
    }
    const validMethods = ['credit card', 'debit card', 'net banking'];
    if (!validMethods.includes(paymentMethod.toLowerCase())) {
        return res.status(400).json({ message: 'Invalid payment method specified.' });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'Invalid payment amount.' });
    }

    let connection; // Declare connection outside try block

    try {
        connection = await db.getConnection(); // Get connection from pool
        await connection.beginTransaction(); // Start transaction

        // 1. Update Ride status from 'drafted' to 'payment done'
        const updateRideQuery = `
            UPDATE Ride
            SET ride_status = 'payment done'
            WHERE ride_id = ? AND ride_status = 'drafted'
        `;
        const [updateResult] = await connection.query(updateRideQuery, [rideId]);

        // Check if the ride was actually updated (means it existed and was 'drafted')
        if (updateResult.affectedRows === 0) {
            await connection.rollback(); // Rollback transaction
            connection.release();       // Release connection
            // console.log(`Payment failed: Ride ${rideId} not found or not in 'drafted' state.`);
            return res.status(404).json({ message: 'Ride not found or payment already processed.' });
        }

        // 2. Insert Payment record
        const insertPaymentQuery = `
            INSERT INTO Payment (ride_id, amount, payment_method, payment_status, payment_date_time)
            VALUES (?, ?, ?, 'complete', NOW())
        `;
        const [paymentResult] = await connection.query(insertPaymentQuery, [
            rideId,
            parseFloat(amount),
            paymentMethod.toLowerCase()
        ]);

        // If we reach here, both queries were successful
        await connection.commit(); // Commit the transaction
        console.log(`Payment successful for Ride ID: ${rideId}. New Payment ID: ${paymentResult.insertId}`);

        res.status(201).json({
            message: 'Payment successful!',
            paymentId: paymentResult.insertId,
            rideId: rideId,
            status: 'payment done'
        });

    } catch (error) {
        console.error('Error processing payment:', error);
        // Rollback transaction in case of any error during the process
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({ message: 'Internal server error during payment processing.' });
    } finally {
        // Always release the connection back to the pool
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    processPayment,
    // Add other payment controllers if needed (e.g., getPaymentHistory)
};