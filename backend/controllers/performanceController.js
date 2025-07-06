// backend/controllers/performanceController.js
const db = require('../db');

// --- Get Daily Performance Stats (with logging) ---
const getDailyStats = async (req, res) => {
    console.log(`>>> ENTERING getDailyStats for date: ${req.query.date}, driver: ${req.params.driverId}`); // Log entry
    const driverId = req.params.driverId;
    const { date } = req.query; // Expecting YYYY-MM-DD format

    // TODO: Verify driverId matches authenticated user

    if (!driverId || !date) {
        console.log(">>> getDailyStats: Missing driverId or date.");
        return res.status(400).json({ message: 'Driver ID and Date are required.' });
    }

    // Basic date validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
         console.log(`>>> getDailyStats: Invalid date format: ${date}`);
         return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Define the SQL query for daily stats
    const query = `
        SELECT
            COUNT(DISTINCT c.ride_id) AS totalRides,
            COALESCE(SUM(r.distance), 0) AS totalDistance,
            COALESCE(SUM(c.commission_amount), 0) AS totalCommission,
            COALESCE(AVG(r.distance), 0) AS averageDistance,
            COALESCE(AVG(c.commission_amount), 0) AS averageCommission,
            -- We need rated rides count separately to calculate average correctly
            COUNT(rt.rating_id) AS ratedRidesCount,
            COALESCE(SUM(rt.score), 0) AS totalRatingScore -- Get sum to calculate average manually
        FROM Commission c
        JOIN Ride r ON c.ride_id = r.ride_id
        LEFT JOIN Rating rt ON r.ride_id = rt.ride_id
        WHERE r.driver_id = ?
          AND DATE(c.commission_date_time) = ? -- Filter by date part of commission timestamp
          AND r.ride_status = 'destination reached' -- Ensure we only count completed rides
        -- No GROUP BY needed as we are aggregating for a single driver on a single day
    `;

    try {
        console.log(`>>> getDailyStats: Preparing to execute query for date ${date}...`); // Log before query
        console.log(`>>> getDailyStats SQL: ${query.replace(/\s+/g, ' ').trim()}`); // Log the query itself
        console.log(`>>> getDailyStats Params: [${driverId}, ${date}]`); // Log the parameters
        const [results] = await db.query(query, [driverId, date]);
        console.log(`>>> getDailyStats: Query finished. Results count: ${results.length}`); // Log after query

        // Check if results exist (should always return one row due to aggregate functions)
        if (!results || results.length === 0) {
            // This case is unlikely but possible if joins fail unexpectedly
             console.log(">>> getDailyStats: No results row returned from query.");
             // Return zero stats or handle as appropriate
             return res.status(200).json({
                totalRides: 0, totalDistance: 0, totalCommission: 0,
                averageDistance: 0, averageCommission: 0, averageRating: null, ratedRidesCount: 0
            });
        }

        const stats = results[0];
        console.log(">>> getDailyStats: Raw stats from DB:", stats); // Log raw stats

        // Calculate average rating safely
        if (stats.ratedRidesCount > 0) {
            // Calculate average based on SUM and COUNT fetched
            stats.averageRating = parseFloat(stats.totalRatingScore) / parseInt(stats.ratedRidesCount, 10);
        } else {
            stats.averageRating = null; // Represent as null if no rides were rated
        }

        // Ensure other averages and counts are numbers
        stats.totalRides = parseInt(stats.totalRides, 10);
        stats.totalDistance = parseFloat(stats.totalDistance);
        stats.totalCommission = parseFloat(stats.totalCommission);
        stats.averageDistance = parseFloat(stats.averageDistance);
        stats.averageCommission = parseFloat(stats.averageCommission);
        // Remove helper fields before sending response
        delete stats.totalRatingScore;
        // ratedRidesCount could optionally be sent if the frontend wants it

        console.log(">>> getDailyStats: Processed stats:", stats); // Log processed stats
        console.log(">>> getDailyStats: Sending response..."); // Log before send
        res.status(200).json(stats);
        console.log(">>> getDailyStats: Response SENT."); // Log after send (might not show if hangs before)

    } catch (error) {
        console.error(`>>> ERROR in getDailyStats for driver ${driverId}, date ${date}:`, error); // Enhanced Error Log
        res.status(500).json({ message: 'Internal server error fetching daily stats.' });
    } finally {
         console.log(">>> EXITING getDailyStats finally block."); // Log finally
    }
};


// --- Get Aggregated Data for Graphs (Corrected for only_full_group_by) ---
const getGraphData = async (req, res) => {
    console.log(`>>> ENTERING getGraphData for mode: ${req.query.mode}, driver: ${req.params.driverId}`); // Log entry
    const driverId = req.params.driverId;
    const { mode, year, month } = req.query;

    if (!driverId || !mode) {
        console.log(">>> getGraphData: Missing driverId or mode.");
        return res.status(400).json({ message: 'Driver ID and Mode are required.' });
    }

    let timeSelectExpr = '';
    let groupByExpr = '';
    let orderByExpr = '';
    let whereClauses = ['r.driver_id = ?', "r.ride_status = 'destination reached'"];
    let queryParams = [driverId];

    // Determine expressions based on mode
    switch (mode.toLowerCase()) {
        case 'month':
            if (!year || !month) return res.status(400).json({ message: 'Year and Month are required.' });
            timeSelectExpr = "DATE(c.commission_date_time)"; // SELECT the DATE object
            groupByExpr = "DATE(c.commission_date_time)";   // GROUP BY the DATE object
            orderByExpr = "DATE(c.commission_date_time)";   // ORDER BY the DATE object
            whereClauses.push('YEAR(c.commission_date_time) = ?');
            whereClauses.push('MONTH(c.commission_date_time) = ?');
            queryParams.push(year, month);
            break;
        case 'year':
            if (!year) return res.status(400).json({ message: 'Year is required.' });
            timeSelectExpr = "DATE_FORMAT(c.commission_date_time, '%Y-%m')"; // SELECT YYYY-MM
            groupByExpr = "DATE_FORMAT(c.commission_date_time, '%Y-%m')";   // GROUP BY YYYY-MM
            orderByExpr = "DATE_FORMAT(c.commission_date_time, '%Y-%m')";   // ORDER BY YYYY-MM
            whereClauses.push('YEAR(c.commission_date_time) = ?');
            queryParams.push(year);
            break;
        case 'overall':
            timeSelectExpr = "YEAR(c.commission_date_time)"; // SELECT YYYY
            groupByExpr = "YEAR(c.commission_date_time)";   // GROUP BY YYYY
            orderByExpr = "YEAR(c.commission_date_time)";   // ORDER BY YYYY
            break;
        default:
             console.log(`>>> getGraphData: Invalid mode: ${mode}`);
            return res.status(400).json({ message: 'Invalid mode specified.' });
    }

    const groupByClause = `GROUP BY ${groupByExpr}`;
    const orderByClause = `ORDER BY ${orderByExpr} ASC`;

    try {
        const finalQuery = `
            SELECT
                ${timeSelectExpr} AS timeLabel,
                COUNT(DISTINCT c.ride_id) AS rideCount,
                COALESCE(SUM(c.commission_amount), 0) AS totalCommission,
                COALESCE(AVG(rt.score), NULL) AS averageRating
            FROM Commission c
            JOIN Ride r ON c.ride_id = r.ride_id
            LEFT JOIN Rating rt ON r.ride_id = rt.ride_id
            WHERE ${whereClauses.join(' AND ')}
            ${groupByClause}
            ${orderByClause}
        `;

        console.log(`>>> getGraphData: Preparing to execute query for mode ${mode}...`); // Log before query
        // console.log("Executing SQL:", finalQuery); // Optional: Log full query
        // console.log("With Params:", queryParams);

        const [results] = await db.query(finalQuery, queryParams);
        console.log(`>>> getGraphData: Query finished. Results count: ${results.length}`); // Log after query


        // Process results - Format DATE object from 'month' mode to string
        const processedResults = results.map(row => {
            let finalTimeLabel;
            if (typeof row.timeLabel === 'object' && row.timeLabel !== null && row.timeLabel instanceof Date) {
                 const year = row.timeLabel.getFullYear();
                 const month = (row.timeLabel.getMonth() + 1).toString().padStart(2, '0');
                 const day = row.timeLabel.getDate().toString().padStart(2, '0');
                 finalTimeLabel = `${year}-${month}-${day}`;
            } else {
                 finalTimeLabel = String(row.timeLabel); // Already YYYY-MM or YYYY
            }
            return {
                timeLabel: finalTimeLabel,
                rideCount: parseInt(row.rideCount, 10),
                totalCommission: parseFloat(row.totalCommission),
                averageRating: row.averageRating === null ? null : parseFloat(row.averageRating)
            };
        });
        console.log(">>> getGraphData: Sending response..."); // Log before send

        res.status(200).json(processedResults);
        console.log(">>> getGraphData: Response SENT."); // Log after send

    } catch (error) {
         console.error(`>>> ERROR in getGraphData for driver ${driverId}, mode ${mode}:`, error);
         res.status(500).json({ message: 'Internal server error fetching graph data.' });
    } finally {
        console.log(">>> EXITING getGraphData finally block."); // Log finally
    }
};

// Export both functions
module.exports = {
    getDailyStats,
    getGraphData,
};