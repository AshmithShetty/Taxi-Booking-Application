// backend/controllers/analysisController.js
const db = require('../db');

// --- Get Company-Wide Daily Stats ---
const getCompanyDailyStats = async (req, res) => {
    const { date } = req.query; // Expecting YYYY-MM-DD

    // TODO: Add Admin Authorization Check

    if (!date) {
        return res.status(400).json({ message: 'Date query parameter is required.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    try {
        // Query joins Commission (for date), Ride (for distance/status),
        // Payment (for amount), and Rating (for score).
        // Filters by commission date and completed ride status.
        const query = `
            SELECT
                COUNT(DISTINCT r.ride_id) AS totalRides,
                COALESCE(SUM(r.distance), 0) AS totalDistance,
                COALESCE(SUM(p.amount), 0) AS totalPaymentAmount,
                -- Calculate Company Income (60% of total payment)
                COALESCE(SUM(p.amount), 0) * 0.60 AS totalCompanyIncome,
                COALESCE(AVG(r.distance), 0) AS averageDistance,
                COALESCE(AVG(p.amount), 0) AS averagePayment,
                -- Need count of rated rides to calculate average rating accurately
                COUNT(rt.rating_id) AS ratedRidesCount,
                COALESCE(SUM(rt.score), 0) AS totalRatingScore
            FROM Commission c
            JOIN Ride r ON c.ride_id = r.ride_id
            JOIN Payment p ON r.ride_id = p.ride_id -- Assuming payment exists if commission does for completed rides
            LEFT JOIN Rating rt ON r.ride_id = rt.ride_id
            WHERE DATE(c.commission_date_time) = ?
              AND r.ride_status = 'destination reached'
              AND p.payment_status = 'complete' -- Ensure payment was successful
        `;
        const [results] = await db.query(query, [date]);

        const stats = results[0]; // Aggregate query always returns one row

        // Calculate average rating safely
        if (stats.ratedRidesCount > 0) {
            stats.averageRating = parseFloat(stats.totalRatingScore) / parseInt(stats.ratedRidesCount, 10);
        } else {
            stats.averageRating = null; // No ratings for the day
        }

        // Ensure correct types
        stats.totalRides = parseInt(stats.totalRides, 10);
        stats.totalDistance = parseFloat(stats.totalDistance);
        stats.totalPaymentAmount = parseFloat(stats.totalPaymentAmount);
        stats.totalCompanyIncome = parseFloat(stats.totalCompanyIncome);
        stats.averageDistance = parseFloat(stats.averageDistance);
        stats.averagePayment = parseFloat(stats.averagePayment);
        delete stats.totalRatingScore; // Remove helper field

        res.status(200).json(stats);

    } catch (error) {
        console.error(`Error fetching company daily stats for date ${date}:`, error);
        res.status(500).json({ message: 'Internal server error fetching company daily stats.' });
    }
};

// --- Get Company-Wide Aggregated Data for Graphs ---
const getCompanyGraphData = async (req, res) => {
    const { mode, year, month } = req.query;

    // TODO: Add Admin Authorization Check

    if (!mode) {
        return res.status(400).json({ message: 'Mode is required.' });
    }

    let timeSelectExpr = '';
    let groupByExpr = '';
    let orderByExpr = '';
    let whereClauses = ["r.ride_status = 'destination reached'", "p.payment_status = 'complete'"];
    let queryParams = [];

    // Determine SELECT, GROUP BY, ORDER BY, and WHERE clauses based on mode
    switch (mode.toLowerCase()) {
        case 'month':
            if (!year || !month) return res.status(400).json({ message: 'Year and Month required.' });
            timeSelectExpr = "DATE(c.commission_date_time)"; // Select DATE object
            groupByExpr = "DATE(c.commission_date_time)";   // Group by DATE object
            orderByExpr = "DATE(c.commission_date_time)";   // Order by DATE object
            whereClauses.push('YEAR(c.commission_date_time) = ?');
            whereClauses.push('MONTH(c.commission_date_time) = ?');
            queryParams.push(year, month);
            break;
        case 'year':
            if (!year) return res.status(400).json({ message: 'Year required.' });
            timeSelectExpr = "DATE_FORMAT(c.commission_date_time, '%Y-%m')"; // Select YYYY-MM
            groupByExpr = "DATE_FORMAT(c.commission_date_time, '%Y-%m')";   // Group by YYYY-MM
            orderByExpr = "DATE_FORMAT(c.commission_date_time, '%Y-%m')";   // Order by YYYY-MM
            whereClauses.push('YEAR(c.commission_date_time) = ?');
            queryParams.push(year);
            break;
        case 'overall':
            timeSelectExpr = "YEAR(c.commission_date_time)"; // Select YYYY
            groupByExpr = "YEAR(c.commission_date_time)";   // Group by YYYY
            orderByExpr = "YEAR(c.commission_date_time)";   // Order by YYYY
            break;
        default:
            return res.status(400).json({ message: 'Invalid mode specified.' });
    }

    const groupByClause = `GROUP BY ${groupByExpr}`;
    const orderByClause = `ORDER BY ${orderByExpr} ASC`;

    try {
        // Query aggregates company-wide data based on commission completion time
        const finalQuery = `
            SELECT
                ${timeSelectExpr} AS timeLabel,
                COUNT(DISTINCT r.ride_id) AS rideCount,
                COALESCE(SUM(p.amount), 0) AS totalPaymentAmount,
                -- Calculate Company Income (60% of total payment) per period
                COALESCE(SUM(p.amount), 0) * 0.60 AS totalCompanyIncome,
                COALESCE(AVG(rt.score), NULL) AS averageRating
            FROM Commission c
            JOIN Ride r ON c.ride_id = r.ride_id
            JOIN Payment p ON r.ride_id = p.ride_id
            LEFT JOIN Rating rt ON r.ride_id = rt.ride_id
            WHERE ${whereClauses.join(' AND ')}
            ${groupByClause}
            ${orderByClause}
        `;

        const [results] = await db.query(finalQuery, queryParams);

        // Process results (format dates, ensure numbers)
        const processedResults = results.map(row => {
            let finalTimeLabel;
            if (typeof row.timeLabel === 'object' && row.timeLabel !== null && row.timeLabel instanceof Date) {
                 const year = row.timeLabel.getFullYear();
                 const month = (row.timeLabel.getMonth() + 1).toString().padStart(2, '0');
                 const day = row.timeLabel.getDate().toString().padStart(2, '0');
                 finalTimeLabel = `${year}-${month}-${day}`;
            } else {
                 finalTimeLabel = String(row.timeLabel);
            }
            return {
                timeLabel: finalTimeLabel,
                rideCount: parseInt(row.rideCount, 10),
                totalPaymentAmount: parseFloat(row.totalPaymentAmount),
                totalCompanyIncome: parseFloat(row.totalCompanyIncome),
                averageRating: row.averageRating === null ? null : parseFloat(row.averageRating)
            };
        });

        res.status(200).json(processedResults);

    } catch (error) {
         console.error(`Error fetching company graph data for mode ${mode}:`, error);
         res.status(500).json({ message: 'Internal server error fetching company graph data.' });
    }
};

module.exports = {
    getCompanyDailyStats,
    getCompanyGraphData,
};