// frontend/src/components/AnalysisPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AnalysisPage.css'; // Ensure this CSS file exists

// Helpers (can be moved to a utils file)
const getTodayDateString = () => new Date().toISOString().split('T')[0];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Formatter for X-axis labels based on graph mode
const formatXAxis = (tickItem, mode) => {
    if (!tickItem) return '';
    try {
        if (mode === 'month') return tickItem.split('-')[2]; // Day (e.g., '17')
        if (mode === 'year') return monthNames[parseInt(tickItem.split('-')[1], 10) - 1]; // Month Name (e.g., 'Apr')
        if (mode === 'overall') return tickItem; // Year (e.g., '2025')
    } catch (e) {
        return tickItem; // Fallback
    }
    return tickItem;
};

// Formatter for general numbers and currency
const formatNumber = (numStr, decimals = 2) => {
     if (typeof numStr === 'number') return numStr.toFixed(decimals);
     if (typeof numStr === 'string') {
         const parsed = parseFloat(numStr);
         return isNaN(parsed) ? '-' : parsed.toFixed(decimals);
     }
     return '-';
};

// Formatter specifically for currency in tooltips
const formatCurrency = (value) => {
    if (typeof value === 'number') return `₹${value.toFixed(2)}`;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 'N/A' : `₹${parsed.toFixed(2)}`;
};

// Formatter specifically for ratings in tooltips
const formatRating = (value) => {
     if (value === null || value === undefined) return 'N/A';
     if (typeof value === 'number') return value.toFixed(1);
     const parsed = parseFloat(value);
     return isNaN(parsed) ? 'N/A' : parsed.toFixed(1);
 };

function AnalysisPage() {
    const navigate = useNavigate();
    // No specific adminId needed for these API calls, assuming backend verifies admin role

    // --- State ---
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const [dailyStats, setDailyStats] = useState(null);
    const [isLoadingDaily, setIsLoadingDaily] = useState(true);
    const [dailyError, setDailyError] = useState('');

    const [graphMode, setGraphMode] = useState('month'); // Default mode
    const [graphYear, setGraphYear] = useState(new Date().getFullYear());
    const [graphMonth, setGraphMonth] = useState(new Date().getMonth() + 1); // 1-12 month index
    const [graphData, setGraphData] = useState([]);
    const [isLoadingGraph, setIsLoadingGraph] = useState(true);
    const [graphError, setGraphError] = useState('');

    // --- Data Fetching Callbacks ---
    const fetchDailyStats = useCallback(async (date) => {
        if (!date) return;
        setIsLoadingDaily(true);
        setDailyError('');
        try {
            const response = await fetch(`/api/analysis/daily?date=${date}`); // Call company-wide endpoint
            if (!response.ok) {
                const data = await response.json().catch(()=>({}));
                throw new Error(data.message || `Failed to fetch daily stats (Status: ${response.status})`);
            }
            const data = await response.json();
            setDailyStats(data);
        } catch (err) {
            console.error("Error fetching company daily stats:", err);
            setDailyError(err.message);
            setDailyStats(null);
        } finally {
            setIsLoadingDaily(false);
        }
    }, []); // No dependency on ID needed

    const fetchGraphData = useCallback(async () => {
        setIsLoadingGraph(true);
        setGraphError('');
        const params = new URLSearchParams({ mode: graphMode });
        if (graphMode === 'year' || graphMode === 'month') params.append('year', graphYear);
        if (graphMode === 'month') params.append('month', graphMonth);

        try {
            const response = await fetch(`/api/analysis/graph?${params.toString()}`); // Call company-wide endpoint
            if (!response.ok) {
                const data = await response.json().catch(()=>({}));
                throw new Error(data.message || `Failed to fetch graph data (Status: ${response.status})`);
            }
            const data = await response.json();
            // Process data (mainly ensuring averageRating is null if needed)
            const processedData = data.map(item => ({
                ...item,
                averageRating: item.averageRating === null ? null : item.averageRating,
            }));
            setGraphData(processedData);
        } catch (err) {
            console.error("Error fetching company graph data:", err);
            setGraphError(err.message);
            setGraphData([]);
        } finally {
            setIsLoadingGraph(false);
        }
    }, [graphMode, graphYear, graphMonth]); // Dependencies for graph fetch

    // --- Effects ---
    // Fetch daily stats when selectedDate changes
    useEffect(() => {
        fetchDailyStats(selectedDate);
    }, [selectedDate, fetchDailyStats]);

    // Fetch graph data when mode/year/month dependencies change
    useEffect(() => {
        fetchGraphData();
    }, [fetchGraphData]); // fetchGraphData callback already includes its own dependencies


    // --- Handlers ---
    const handleBack = () => navigate('/admin-dashboard'); // Navigate back to admin dashboard
    const handleDateChange = (e) => setSelectedDate(e.target.value);
    const handleModeChange = (e) => setGraphMode(e.target.value);
    const handleYearChange = (e) => setGraphYear(parseInt(e.target.value, 10));
    const handleMonthChange = (e) => setGraphMonth(parseInt(e.target.value, 10));

    // --- Memoized Graphs ---
    // Memoize each graph component to optimize performance
    const memoizedRideCountChart = useMemo(() => (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeLabel" tickFormatter={(tick) => formatXAxis(tick, graphMode)} />
                <YAxis allowDecimals={false} label={{ value: 'Rides', angle: -90, position: 'insideLeft' }}/>
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rideCount" name="Total Rides" stroke="#8884d8" activeDot={{ r: 8 }} connectNulls={true} />
            </LineChart>
        </ResponsiveContainer>
    ), [graphData, graphMode]);

    const memoizedPaymentChart = useMemo(() => (
         <ResponsiveContainer width="100%" height={250}>
             <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="timeLabel" tickFormatter={(tick) => formatXAxis(tick, graphMode)} />
                 <YAxis label={{ value: 'Payment (₹)', angle: -90, position: 'insideLeft' }}/>
                 <Tooltip formatter={formatCurrency} />
                 <Legend />
                 <Line type="monotone" dataKey="totalPaymentAmount" name="Total Payment" stroke="#82ca9d" activeDot={{ r: 8 }} connectNulls={true}/>
             </LineChart>
         </ResponsiveContainer>
     ), [graphData, graphMode]);

     const memoizedIncomeChart = useMemo(() => (
         <ResponsiveContainer width="100%" height={250}>
             <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="timeLabel" tickFormatter={(tick) => formatXAxis(tick, graphMode)} />
                 <YAxis label={{ value: 'Income (₹)', angle: -90, position: 'insideLeft' }}/>
                 <Tooltip formatter={formatCurrency} />
                 <Legend />
                 <Line type="monotone" dataKey="totalCompanyIncome" name="Company Income" stroke="#ff7300" activeDot={{ r: 8 }} connectNulls={true}/>
             </LineChart>
         </ResponsiveContainer>
     ), [graphData, graphMode]);

    const memoizedRatingChart = useMemo(() => (
          <ResponsiveContainer width="100%" height={250}>
              <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeLabel" tickFormatter={(tick) => formatXAxis(tick, graphMode)} />
                  {/* Set specific domain and ticks for rating */}
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} label={{ value: 'Avg Rating', angle: -90, position: 'insideLeft' }}/>
                  <Tooltip formatter={formatRating}/>
                  <Legend />
                  <Line type="monotone" dataKey="averageRating" name="Average Rating" stroke="#ffc658" activeDot={{ r: 8 }} connectNulls={true}/>
              </LineChart>
          </ResponsiveContainer>
      ), [graphData, graphMode]);


    // --- Render Logic ---
    return (
        <div className="analysis-page">
            {/* Header */}
            <header className="dashboard-header">
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={handleBack}>Back to Admin Dashboard</button>
                </nav>
            </header>

            {/* Body */}
            <main className="analysis-body">
                {/* Daily Data Window */}
                <section className="analysis-section daily-data-window">
                    <h3>Daily Company Stats</h3>
                    <div className="daily-controls">
                        <label htmlFor="dailyDate">Select Date:</label>
                        <input
                            type="date"
                            id="dailyDate"
                            value={selectedDate}
                            onChange={handleDateChange}
                            max={getTodayDateString()} // Prevent selecting future dates
                        />
                    </div>
                    {isLoadingDaily ? (
                        <p className="loading">Loading daily stats...</p>
                    ) : dailyError ? (
                         <p className="error-message">{dailyError}</p>
                    ) : dailyStats ? (
                        <div className="stats-grid">
                            <div className="stat-item"><span>Total Rides:</span> <span>{dailyStats.totalRides}</span></div>
                            <div className="stat-item"><span>Total Distance:</span> <span>{formatNumber(dailyStats.totalDistance)} km</span></div>
                            <div className="stat-item"><span>Total Payment:</span> <span>₹{formatNumber(dailyStats.totalPaymentAmount)}</span></div>
                            <div className="stat-item"><span>Company Income:</span> <span>₹{formatNumber(dailyStats.totalCompanyIncome)}</span></div>
                            <div className="stat-item"><span>Avg Distance:</span> <span>{formatNumber(dailyStats.averageDistance)} km</span></div>
                            <div className="stat-item"><span>Avg Payment:</span> <span>₹{formatNumber(dailyStats.averagePayment)}</span></div>
                            <div className="stat-item"><span>Avg Rating:</span> <span>{dailyStats.averageRating ? formatNumber(dailyStats.averageRating, 1) : '-'}</span></div>
                        </div>
                    ) : (
                         <p className="empty-message">No data available for {selectedDate}.</p>
                    )}
                </section>

                 {/* Stats Window */}
                <section className="analysis-section stats-window">
                    <h3>Company Performance Trends</h3>
                    <div className="graph-controls">
                         {/* Mode Selection */}
                         <div className="mode-selector">
                            <label>
                                <input type="radio" name="graphMode" value="month" checked={graphMode === 'month'} onChange={handleModeChange} />
                                Monthly
                            </label>
                            <label>
                                <input type="radio" name="graphMode" value="year" checked={graphMode === 'year'} onChange={handleModeChange} />
                                Yearly
                            </label>
                            <label>
                                <input type="radio" name="graphMode" value="overall" checked={graphMode === 'overall'} onChange={handleModeChange} />
                                Overall
                            </label>
                         </div>

                         {/* Conditional Year/Month Selectors */}
                          <div className="time-selectors">
                            {(graphMode === 'month' || graphMode === 'year') && (
                                <div className="select-group">
                                    <label htmlFor="graphYear">Year:</label>
                                    <select id="graphYear" value={graphYear} onChange={handleYearChange}>
                                        {/* Generate year options (e.g., last 5 years) */}
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                             {graphMode === 'month' && (
                                <div className="select-group">
                                     <label htmlFor="graphMonth">Month:</label>
                                     <select id="graphMonth" value={graphMonth} onChange={handleMonthChange}>
                                         {monthNames.map((name, index) => (
                                             <option key={index + 1} value={index + 1}>{name}</option>
                                         ))}
                                     </select>
                                </div>
                             )}
                          </div>
                    </div>

                     {/* Graphs */}
                      <div className="charts-container">
                         {isLoadingGraph ? (
                             <p className="loading">Loading graph data...</p>
                         ) : graphError ? (
                              <p className="error-message">{graphError}</p>
                         ) : graphData.length === 0 ? (
                              <p className="empty-message">No data available for the selected period.</p>
                         ) : (
                             <>
                                <div className="chart-wrapper">
                                    {/* Title updates dynamically */}
                                    <h4>Total Rides per {graphMode === 'month' ? 'Day' : graphMode === 'year' ? 'Month' : 'Year'}</h4>
                                     {memoizedRideCountChart}
                                </div>
                                <div className="chart-wrapper">
                                     <h4>Total Payment per {graphMode === 'month' ? 'Day' : graphMode === 'year' ? 'Month' : 'Year'}</h4>
                                     {memoizedPaymentChart}
                                </div>
                                 <div className="chart-wrapper">
                                     <h4>Company Income per {graphMode === 'month' ? 'Day' : graphMode === 'year' ? 'Month' : 'Year'}</h4>
                                     {memoizedIncomeChart}
                                 </div>
                                <div className="chart-wrapper">
                                     <h4>Average Rating per {graphMode === 'month' ? 'Day' : graphMode === 'year' ? 'Month' : 'Year'}</h4>
                                     {memoizedRatingChart}
                                </div>
                             </>
                         )}
                      </div>
                </section>
            </main>
        </div>
    );
}

export default AnalysisPage;