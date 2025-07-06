// frontend/src/components/RidesCompletedPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FilterModal from './FilterModal'; // Reusing the same modal component
import './RidesCompletedPage.css'; // Ensure CSS is linked

// Helper function to format date/time
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    try {
        // Example formatting: Aug 15, 2023, 10:30 AM
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return new Date(dateTimeString).toLocaleString(undefined, options);
    } catch (e) {
        console.error("Error formatting date:", dateTimeString, e);
        return dateTimeString; // Fallback to original string if formatting fails
    }
};

// Helper object for Filter Tag Labels (Driver Specific)
const filterLabels = {
    pickup: 'Pickup Loc',
    dropoff: 'Dropoff Loc',
    taxiType: 'Type',
    minDistance: 'Min Distance',
    maxDistance: 'Max Distance',
    minCommission: 'Min Commission', // Use Commission key
    maxCommission: 'Max Commission', // Use Commission key
    minRating: 'Min Rating',
    maxRating: 'Max Rating',
    startDate: 'Start Date',
    endDate: 'End Date'
};

// Function to get a display label for filter tags
const getFilterLabel = (key) => filterLabels[key] || key;

// Function to format the value for display in filter tags
const formatFilterValue = (key, value) => {
    if (key === 'minDistance' || key === 'maxDistance') return `${value} km`;
    // Use commission keys for formatting
    if (key === 'minCommission' || key === 'maxCommission') return `₹${value}`;
    return value;
};

// Helper function for safe number formatting
const formatNumber = (numStr, decimals = 2) => {
     if (typeof numStr === 'number') return numStr.toFixed(decimals);
     if (typeof numStr === 'string') {
         const parsed = parseFloat(numStr);
         return isNaN(parsed) ? '-' : parsed.toFixed(decimals);
     }
     return '-';
};


function RidesCompletedPage() {
    const navigate = useNavigate();
    const driverId = sessionStorage.getItem('userId'); // Driver's ID

    const [completedRides, setCompletedRides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({}); // Stores currently applied filters

    // Fetch Completed Rides based on driverId and activeFilters
    const fetchCompletedRides = useCallback(async (filtersToApply) => {
        if (!driverId) {
             setError("Driver ID not found. Please log in.");
             setIsLoading(false);
             // navigate('/login'); // Navigate only if critical
             return;
         }

        setIsLoading(true);
        setError('');

        const queryParams = new URLSearchParams();
        // Use the keys expected by the FilterModal internally (minCommission etc)
        // The backend controller (getDriverCompletedRides) should handle these
        for (const key in filtersToApply) {
            if (filtersToApply[key] !== '' && filtersToApply[key] !== null && filtersToApply[key] !== undefined) {
                queryParams.append(key, filtersToApply[key]);
            }
        }
        const queryString = queryParams.toString();

        // --- *** USE THE CORRECT DRIVER ENDPOINT *** ---
        const apiUrl = `/api/rides/driver/${driverId}/completed${queryString ? `?${queryString}` : ''}`;
        // --- End Endpoint Change ---

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                let errorMsg = `HTTP error! Status: ${response.status}`;
                try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch (e) {}
                throw new Error(errorMsg);
            }
            const data = await response.json();
            // Backend filters by status='destination reached' and driver_id
            setCompletedRides(data);
        } catch (err) {
            console.error("Error fetching completed rides:", err);
            setError(`Failed to load completed rides: ${err.message}`);
            setCompletedRides([]);
        } finally {
            setIsLoading(false);
        }
    }, [driverId]); // Removed navigate dependency, handle login elsewhere

    // Initial fetch and re-fetch when filters change
    useEffect(() => {
        if (driverId) { // Ensure driverId exists before fetching
           fetchCompletedRides(activeFilters);
        } else {
           // Handle case where driverId isn't available on mount (e.g., redirect)
           setIsLoading(false);
           setError("Driver ID not found. Please log in.");
           // navigate('/login'); // Optional immediate redirect
        }
    }, [activeFilters, fetchCompletedRides, driverId]); // Add driverId dependency

    // --- Filter Modal Handlers ---
    const handleOpenFilterModal = () => setIsFilterModalOpen(true);
    const handleCloseFilterModal = () => setIsFilterModalOpen(false);
    const handleApplyFilters = (newFilters) => { setActiveFilters(newFilters); handleCloseFilterModal(); };
    const handleRemoveFilters = () => { setActiveFilters({}); handleCloseFilterModal(); };
    const handleRemoveTag = (filterKeyToRemove) => {
        setActiveFilters(currentFilters => {
            const { [filterKeyToRemove]: removed, ...newFilters } = currentFilters;
            return newFilters;
        });
    };

    // --- Navigation ---
    const handleBack = () => navigate('/driver-dashboard');

    // --- Generate Filter Tags ---
    const renderFilterTags = () => {
         const filterEntries = Object.entries(activeFilters);
         if (filterEntries.length === 0) return null;
        return (
            <div className="applied-filters-container">
                <span>Applied Filters:</span>
                {filterEntries.map(([key, value]) => (
                    <span key={key} className="filter-tag">
                        {getFilterLabel(key)}: {formatFilterValue(key, value)}
                        <button
                            className="remove-tag-btn" onClick={() => handleRemoveTag(key)}
                            aria-label={`Remove ${getFilterLabel(key)} filter`}
                            title={`Remove ${getFilterLabel(key)} filter`}
                        > × </button>
                    </span>
                ))}
            </div>
        );
    };


    return (
        <div className="rides-completed-page">
            {/* Header */}
            <header className="dashboard-header">
                 <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                 <nav className="header-nav">
                     <button onClick={handleBack}>Back to Dashboard</button>
                 </nav>
             </header>

            {/* Body */}
            <main className="completed-body">
                <h2>Your Completed Rides</h2>

                <div className="completed-controls">
                     <button className="filter-button" onClick={handleOpenFilterModal}>
                        Filter Rides
                    </button>
                </div>

                 {renderFilterTags()}
                 {error && <p className="error-message completed-error">{error}</p>}

                <div className="completed-table-container">
                    {isLoading ? (
                        <p className="loading">Loading completed rides...</p>
                    ) : completedRides.length === 0 ? (
                        <p className="empty-message">
                           {Object.keys(activeFilters).length > 0 ? "No rides match the current filters." : "No completed rides found."}
                        </p>
                    ) : (
                        <table className="completed-table">
                            <thead>
                                <tr>
                                    <th>Ride ID</th>
                                    <th>Completed On</th>
                                    <th>Type</th>
                                    <th>Pickup</th>
                                    <th>Dropoff</th>
                                    <th>Distance (km)</th>
                                    <th>Commission (₹)</th>
                                    <th>Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {completedRides.map((ride) => (
                                    <tr key={ride.ride_id}>
                                        <td>{ride.ride_id.toString().padStart(5, '0')}</td>
                                        {/* Assuming booking_date_time is close enough to completion */}
                                        <td>{formatDateTime(ride.booking_date_time)}</td>
                                        <td>{ride.taxi_type}</td>
                                        <td title={ride.pickup_location}>{ride.pickup_location}</td>
                                        <td title={ride.dropoff_location}>{ride.dropoff_location}</td>
                                        <td>{formatNumber(ride.distance)}</td>
                                        {/* Use commission field directly from backend data */}
                                        <td>{formatNumber(ride.commission)}</td>
                                        <td>{ride.rating_score ?? '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Filter Modal */}
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={handleCloseFilterModal}
                onApply={handleApplyFilters}
                onRemove={handleRemoveFilters}
                initialFilters={activeFilters}
                // Pass specific labels if FilterModal is made generic
                 labels={{ ...filterLabels, fare: 'Commission (₹):' }} // Override fare label for this instance
            />
        </div>
    );
}

// Frontend CalculateDriverCommission helper function is removed (rely on backend)

export default RidesCompletedPage;