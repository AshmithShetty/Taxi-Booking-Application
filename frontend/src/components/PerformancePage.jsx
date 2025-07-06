// frontend/src/components/PerformancePage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './PerformancePage.css'; // Ensure CSS is linked

// --- Helpers ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatXAxis = (tickItem, mode) => {
    if (!tickItem) return '';
    try {
        if (mode === 'month') return tickItem.split('-')[2]; // Day e.g., '17'
        if (mode === 'year') return monthNames[parseInt(tickItem.split('-')[1], 10) - 1]; // Month Name e.g., 'Apr'
        if (mode === 'overall') return tickItem; // Year e.g., '2025'
    } catch (e) { return tickItem; }
    return tickItem;
};
const formatNumber = (numStr, decimals = 2) => {
     if (typeof numStr === 'number') return numStr.toFixed(decimals);
     if (typeof numStr === 'string') {
         const parsed = parseFloat(numStr);
         return isNaN(parsed) ? '-' : parsed.toFixed(decimals);
     }
     return '-';
};
const formatCurrency = (value) => {
    if (typeof value === 'number') return `₹${value.toFixed(2)}`;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 'N/A' : `₹${parsed.toFixed(2)}`;
};
const formatRating = (value) => {
     if (value === null || value === undefined) return 'N/A';
     if (typeof value === 'number') return value.toFixed(1);
     const parsed = parseFloat(value);
     return isNaN(parsed) ? 'N/A' : parsed.toFixed(1);
 };
// --- End Helpers ---

function PerformancePage() {
    const navigate = useNavigate();
    const location = useLocation(); // Hook to get route state

    // --- Determine Driver ID and Name ---
    const loggedInUserId = sessionStorage.getItem('userId');
    const loggedInUserRole = sessionStorage.getItem('userRole');
    // Check if admin is viewing a specific driver via location state
    const viewingDriverIdFromState = location.state?.viewingDriverId;
    // Use the ID from state if available, otherwise use the logged-in user's ID
    const driverIdForFetch = viewingDriverIdFromState || loggedInUserId;
    // Get name similarly for display
    const driverNameToDisplay = location.state?.viewingDriverName || sessionStorage.getItem('userName');
    // --- End ID Logic ---


    // --- State ---
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const [dailyStats, setDailyStats] = useState(null);
    const [isLoadingDaily, setIsLoadingDaily] = useState(true);
    const [dailyError, setDailyError] = useState('');
    const [graphMode, setGraphMode] = useState('month');
    const [graphYear, setGraphYear] = useState(new Date().getFullYear());
    const [graphMonth, setGraphMonth] = useState(new Date().getMonth() + 1);
    const [graphData, setGraphData] = useState([]);
    const [isLoadingGraph, setIsLoadingGraph] = useState(true);
    const [graphError, setGraphError] = useState('');

    // --- Data Fetching Callbacks ---
    const fetchDailyStats = useCallback(async (date) => {
        if (!driverIdForFetch || !date) return; // Use determined ID
        setIsLoadingDaily(true); setDailyError('');
        try {
            const response = await fetch(`/api/drivers/${driverIdForFetch}/performance/daily?date=${date}`); // Use determined ID
            if (!response.ok) { const data=await response.json().catch(()=>({})); throw new Error(data.message||`Err ${response.status}`); }
            const data = await response.json(); setDailyStats(data);
        } catch (err) { console.error("Error daily stats:", err); setDailyError(err.message); setDailyStats(null); }
        finally { setIsLoadingDaily(false); }
    }, [driverIdForFetch]); // Depend on determined ID

    const fetchGraphData = useCallback(async () => {
        if (!driverIdForFetch) return; // Use determined ID
        setIsLoadingGraph(true); setGraphError('');
        const params = new URLSearchParams({ mode: graphMode });
        if (graphMode !== 'overall') params.append('year', graphYear);
        if (graphMode === 'month') params.append('month', graphMonth);
        try {
            const response = await fetch(`/api/drivers/${driverIdForFetch}/performance/graph?${params.toString()}`); // Use determined ID
            if (!response.ok) { const data=await response.json().catch(()=>({})); throw new Error(data.message||`Err ${response.status}`); }
            const data = await response.json();
            const processedData = data.map(item => ({ ...item, averageRating: item.averageRating === null ? null : item.averageRating }));
            setGraphData(processedData);
        } catch (err) { console.error("Error graph data:", err); setGraphError(err.message); setGraphData([]); }
        finally { setIsLoadingGraph(false); }
    }, [driverIdForFetch, graphMode, graphYear, graphMonth]); // Depend on determined ID and controls

    // --- Effects ---
    useEffect(() => {
        if(driverIdForFetch) { fetchDailyStats(selectedDate); }
        else { setIsLoadingDaily(false); setDailyError("Driver info missing."); }
    }, [selectedDate, fetchDailyStats, driverIdForFetch]);

    useEffect(() => {
         if(driverIdForFetch) { fetchGraphData(); }
         else { setIsLoadingGraph(false); setGraphError("Driver info missing."); }
    }, [fetchGraphData, driverIdForFetch]); // Re-run if ID changes


    // --- Handlers ---
    const handleBack = () => {
        // Navigate back based on the LOGGED IN user's role
        if (loggedInUserRole === 'admin') { navigate('/admin/driver-data'); }
        else if (loggedInUserRole === 'driver') { navigate('/driver-dashboard'); }
        else { navigate('/login'); } // Fallback
    };
    const handleDateChange = (e) => setSelectedDate(e.target.value);
    const handleModeChange = (e) => setGraphMode(e.target.value);
    const handleYearChange = (e) => setGraphYear(parseInt(e.target.value, 10));
    const handleMonthChange = (e) => setGraphMonth(parseInt(e.target.value, 10));

    // --- Memoized Graphs ---
    const memoizedRideCountChart = useMemo(() => (
         <ResponsiveContainer width="100%" height={250}> <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timeLabel" tickFormatter={(tick) => formatXAxis(tick, graphMode)} />
            <YAxis allowDecimals={false} label={{ value: 'Rides', angle: -90, position: 'insideLeft' }}/><Tooltip /><Legend />
            <Line type="monotone" dataKey="rideCount" name="Total Rides" stroke="#8884d8" activeDot={{ r: 8 }} connectNulls={true} />
         </LineChart> </ResponsiveContainer>
     ), [graphData, graphMode]);
    const memoizedCommissionChart = useMemo(() => (
         <ResponsiveContainer width="100%" height={250}> <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timeLabel" tickFormatter={(tick) => formatXAxis(tick, graphMode)} />
            <YAxis label={{ value: 'Commission (₹)', angle: -90, position: 'insideLeft' }}/><Tooltip formatter={formatCurrency} /><Legend />
            <Line type="monotone" dataKey="totalCommission" name="Total Commission" stroke="#82ca9d" activeDot={{ r: 8 }} connectNulls={true}/>
         </LineChart> </ResponsiveContainer>
     ), [graphData, graphMode]);
    // --- NOTE: Removed duplicate payment chart ---
    const memoizedRatingChart = useMemo(() => (
         <ResponsiveContainer width="100%" height={250}> <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
             <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timeLabel" tickFormatter={(tick) => formatXAxis(tick, graphMode)} />
             <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} label={{ value: 'Avg Rating', angle: -90, position: 'insideLeft' }}/><Tooltip formatter={formatRating}/><Legend />
             <Line type="monotone" dataKey="averageRating" name="Average Rating" stroke="#ffc658" activeDot={{ r: 8 }} connectNulls={true}/>
         </LineChart> </ResponsiveContainer>
     ), [graphData, graphMode]);

    // --- Render Logic ---
    return (
        <div className="performance-page">
            <header className="dashboard-header">
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={handleBack}>Back to Dashboard</button>
                </nav>
            </header>

            <main className="performance-body">
                 <h2 className="performance-title">
                    {/* Display name dynamically */}
                    Performance for: {driverNameToDisplay || `Driver ID ${driverIdForFetch}` || 'Loading...'}
                 </h2>

                <section className="perf-section daily-data-window">
                    <h3>Daily Stats</h3>
                    <div className="daily-controls">
                        <label htmlFor="dailyDate">Select Date:</label>
                        <input type="date" id="dailyDate" value={selectedDate} onChange={handleDateChange} max={getTodayDateString()} />
                    </div>
                    {isLoadingDaily ? ( <p className="loading">Loading daily stats...</p> )
                    : dailyError ? ( <p className="error-message">{dailyError}</p> )
                    : dailyStats ? (
                        <div className="stats-grid">
                             <div className="stat-item"><span>Total Rides:</span> <span>{dailyStats.totalRides}</span></div>
                             <div className="stat-item"><span>Total Distance:</span> <span>{formatNumber(dailyStats.totalDistance)} km</span></div>
                             {/* Note: Daily stats from backend still has totalCommission */}
                             <div className="stat-item"><span>Total Commission:</span> <span>₹{formatNumber(dailyStats.totalCommission)}</span></div>
                             <div className="stat-item"><span>Avg Distance:</span> <span>{formatNumber(dailyStats.averageDistance)} km</span></div>
                             <div className="stat-item"><span>Avg Commission:</span> <span>₹{formatNumber(dailyStats.averageCommission)}</span></div>
                             <div className="stat-item"><span>Avg Rating:</span> <span>{dailyStats.averageRating ? formatNumber(dailyStats.averageRating, 1) : '-'}</span></div>
                        </div>
                    ) : ( <p className="empty-message">No data available for {selectedDate}.</p> )}
                </section>

                <section className="perf-section stats-window">
                    <h3>Performance Trends</h3>
                    <div className="graph-controls">
                         <div className="mode-selector">
                            <label><input type="radio" name="graphMode" value="month" checked={graphMode === 'month'} onChange={handleModeChange} /> Monthly </label>
                            <label><input type="radio" name="graphMode" value="year" checked={graphMode === 'year'} onChange={handleModeChange} /> Yearly </label>
                            <label><input type="radio" name="graphMode" value="overall" checked={graphMode === 'overall'} onChange={handleModeChange} /> Overall </label>
                         </div>
                          <div className="time-selectors">
                            {(graphMode === 'month' || graphMode === 'year') && (
                                <div className="select-group"> <label htmlFor="graphYear">Year:</label> <select id="graphYear" value={graphYear} onChange={handleYearChange}>
                                     {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (<option key={y} value={y}>{y}</option>))} </select> </div> )}
                             {graphMode === 'month' && (
                                <div className="select-group"> <label htmlFor="graphMonth">Month:</label> <select id="graphMonth" value={graphMonth} onChange={handleMonthChange}>
                                     {monthNames.map((n, i) => (<option key={i + 1} value={i + 1}>{n}</option>))} </select> </div> )}
                          </div>
                    </div>
                      <div className="charts-container">
                         {isLoadingGraph ? ( <p className="loading">Loading graph data...</p> )
                         : graphError ? ( <p className="error-message">{graphError}</p> )
                         : graphData.length === 0 ? ( <p className="empty-message">No data for selected period.</p> )
                         : ( <>
                                <div className="chart-wrapper"> <h4>Rides per {graphMode === 'month' ? 'Day' : graphMode === 'year' ? 'Month' : 'Year'}</h4> {memoizedRideCountChart} </div>
                                <div className="chart-wrapper"> <h4>Total Commission per {graphMode === 'month' ? 'Day' : graphMode === 'year' ? 'Month' : 'Year'}</h4> {memoizedCommissionChart} </div>
                                <div className="chart-wrapper"> <h4>Average Rating per {graphMode === 'month' ? 'Day' : graphMode === 'year' ? 'Month' : 'Year'}</h4> {memoizedRatingChart} </div>
                             </>
                         )}
                      </div>
                </section>
            </main>
        </div>
    );
}

export default PerformancePage;