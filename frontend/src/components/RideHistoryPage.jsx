// frontend/src/components/RideHistoryPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FilterModal from './FilterModal'; // Import the modal
import './RideHistoryPage.css'; // Ensure CSS is linked

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

// Helper object for Filter Tag Labels
const filterLabels = {
    pickup: 'Pickup Loc',
    dropoff: 'Dropoff Loc',
    taxiType: 'Type',
    minDistance: 'Min Distance',
    maxDistance: 'Max Distance',
    minFare: 'Min Fare', // Keep key as 'Fare' for FilterModal consistency
    maxFare: 'Max Fare', // Keep key as 'Fare' for FilterModal consistency
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
    if (key === 'minFare' || key === 'maxFare') return `₹${value}`; // Format based on internal key
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


// --- Custom Hook for Sorting ---
const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                // Access values safely using optional chaining and provide fallbacks
                const valA = a?.[sortConfig.key] ?? '';
                const valB = b?.[sortConfig.key] ?? '';

                // Handle specific types for better sorting
                if (sortConfig.key === 'booking_date_time') {
                    // Date comparison (handle invalid dates)
                    const timeA = new Date(valA).getTime();
                    const timeB = new Date(valB).getTime();
                    const validA = !isNaN(timeA);
                    const validB = !isNaN(timeB);

                    if (validA && validB) return sortConfig.direction === 'ascending' ? timeA - timeB : timeB - timeA;
                    if (validA && !validB) return -1; // Valid dates first
                    if (!validA && validB) return 1; // Valid dates first

                } else if (['distance', 'fare', 'rating_score', 'ride_id'].includes(sortConfig.key)) {
                    // Numeric comparison (handle null/undefined/non-numeric strings)
                    const numA = parseFloat(valA);
                    const numB = parseFloat(valB);
                    const validA = !isNaN(numA);
                    const validB = !isNaN(numB);

                    if (validA && validB) {
                        if (numA < numB) return sortConfig.direction === 'ascending' ? -1 : 1;
                        if (numA > numB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    } else if (validA && !validB) return -1; // Valid numbers first
                      else if (!validA && validB) return 1;  // Valid numbers first

                } else {
                     // Default: Locale-aware string comparison (case-insensitive)
                     if (typeof valA === 'string' && typeof valB === 'string') {
                         const comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
                         return sortConfig.direction === 'ascending' ? comparison : -comparison;
                     } else { // Fallback basic comparison for non-strings
                        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                     }
                 }
                return 0; // Values are equal or incomparable
            });
        }
        return sortableItems;
     }, [items, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
     };
    return { items: sortedItems, requestSort, sortConfig };
};
// --- End Custom Hook ---


function RideHistoryPage() {
    const navigate = useNavigate();
    const customerId = sessionStorage.getItem('userId'); // Using Session Storage

    const [historyRides, setHistoryRides] = useState([]); // Original fetched data
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({});

    // Use the sorting hook, passing the fetched historyRides
    const { items: sortedHistoryRides, requestSort, sortConfig } = useSortableData(historyRides);

    // Fetch Ride History based on customerId and activeFilters
    const fetchHistory = useCallback(async (filtersToApply) => {
        if (!customerId) {
             setError("Customer ID not found. Please log in.");
             setIsLoading(false);
             navigate('/login'); // Redirect if critical
             return;
         }

        setIsLoading(true);
        setError(''); // Clear previous errors

        const queryParams = new URLSearchParams();
        for (const key in filtersToApply) {
            if (filtersToApply[key] !== '' && filtersToApply[key] !== null && filtersToApply[key] !== undefined) {
                queryParams.append(key, filtersToApply[key]);
            }
        }
        const queryString = queryParams.toString();
        // Use the correct customer history endpoint
        const apiUrl = `/api/rides/customer/${customerId}/history${queryString ? `?${queryString}` : ''}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                let errorMsg = `HTTP error! Status: ${response.status}`;
                try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch (e) {}
                throw new Error(errorMsg);
            }
            const data = await response.json();
            setHistoryRides(data); // Update the state that the sorting hook uses
        } catch (err) {
            console.error("Error fetching ride history:", err);
            setError(`Failed to load ride history: ${err.message}`);
            setHistoryRides([]); // Clear data on error
        } finally {
            setIsLoading(false);
        }
    }, [customerId, navigate]); // Include navigate in dependency

    // Initial fetch and re-fetch whenever activeFilters change
    useEffect(() => {
        if (customerId) {
             fetchHistory(activeFilters);
        } else {
            // Handle case where customerId might not be available on initial render
            setIsLoading(false);
             // Error might already be set by useCallback if ID was missing
             if(!error) setError("Customer ID not found. Please log in.");
        }
    }, [activeFilters, fetchHistory, customerId]); // Add customerId

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
    const handleBack = () => navigate('/customer-dashboard');

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

     // Get CSS class for sort direction indicator
     const getSortDirectionClass = (name) => {
         if (!sortConfig) return '';
         return sortConfig.key === name ? sortConfig.direction : '';
     };

    return (
        <div className="ride-history-page">
            {/* Header */}
            <header className="dashboard-header">
                 <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                 <nav className="header-nav">
                     <button onClick={handleBack}>Back to Dashboard</button>
                 </nav>
             </header>

            {/* Body */}
            <main className="history-body">
                <h2>Your Ride History</h2>

                <div className="history-controls">
                     <button className="filter-button" onClick={handleOpenFilterModal}>
                        Filter Rides
                    </button>
                </div>

                 {renderFilterTags()}
                 {error && <p className="error-message history-error">{error}</p>}

                <div className="history-table-container">
                    {isLoading ? (
                        <p className="loading">Loading history...</p>
                    ) : historyRides.length === 0 ? ( // Check original length for empty message base
                        <p className="empty-message">
                           {Object.keys(activeFilters).length > 0 ? "No rides match the current filters." : "No completed rides found."}
                        </p>
                    ) : (
                        <table className="history-table">
                             <thead>
                                 <tr>
                                     {/* Add sorting classes and onClick, ensure key matches data field */}
                                     <th onClick={() => requestSort('ride_id')} className={`sortable ${getSortDirectionClass('ride_id')}`}>
                                        Ride ID <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('booking_date_time')} className={`sortable ${getSortDirectionClass('booking_date_time')}`}>
                                        Booked On <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('taxi_type')} className={`sortable ${getSortDirectionClass('taxi_type')}`}>
                                        Type <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('pickup_location')} className={`sortable ${getSortDirectionClass('pickup_location')}`}>
                                        Pickup <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('dropoff_location')} className={`sortable ${getSortDirectionClass('dropoff_location')}`}>
                                        Dropoff <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('driver_name')} className={`sortable ${getSortDirectionClass('driver_name')}`}>
                                        Driver <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('distance')} className={`sortable ${getSortDirectionClass('distance')}`}>
                                        Distance (km) <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('fare')} className={`sortable ${getSortDirectionClass('fare')}`}>
                                        Fare (₹) <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('rating_score')} className={`sortable ${getSortDirectionClass('rating_score')}`}>
                                        Rating <span className="sort-arrow"></span></th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {/* --- Map over sortedHistoryRides --- */}
                                {sortedHistoryRides.map((ride) => (
                                    <tr key={ride.ride_id}>
                                        <td>{ride.ride_id.toString().padStart(5, '0')}</td>
                                        <td>{formatDateTime(ride.booking_date_time)}</td>
                                        <td>{ride.taxi_type}</td>
                                        <td title={ride.pickup_location}>{ride.pickup_location}</td>
                                        <td title={ride.dropoff_location}>{ride.dropoff_location}</td>
                                        <td>{ride.driver_name || '-'}</td>
                                        <td>{formatNumber(ride.distance)}</td>
                                        <td>{formatNumber(ride.fare)}</td>
                                        <td>{ride.rating_score ?? '-'}</td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Filter Modal - Pass correct labels */}
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={handleCloseFilterModal}
                onApply={handleApplyFilters}
                onRemove={handleRemoveFilters}
                initialFilters={activeFilters}
                labels={{...filterLabels, fare: 'Fare (₹):' }} // Use specific label for fare
            />
        </div>
    );
}

export default RideHistoryPage;