// frontend/src/components/VehicleDataPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRegTrashAlt } from 'react-icons/fa'; // Import trash icon
import AddVehicleModal from './AddVehicleModal'; // Import the modal
import './VehicleDataPage.css'; // Ensure CSS is linked

// Custom Hook for Sorting
const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key] ?? '';
                const valB = b[sortConfig.key] ?? '';

                // Enhance comparison for specific types if needed
                 if (['vehicle_id', 'assigned_driver_id'].includes(sortConfig.key)) {
                     // Numeric sort for IDs (handle nulls for driver ID)
                     const numA = valA === null ? -Infinity : parseInt(valA, 10); // Treat null as very small
                     const numB = valB === null ? -Infinity : parseInt(valB, 10);
                     if (numA < numB) return sortConfig.direction === 'ascending' ? -1 : 1;
                     if (numA > numB) return sortConfig.direction === 'ascending' ? 1 : -1;
                 } else {
                    // LocaleCompare for strings (name, type)
                     if (typeof valA === 'string' && typeof valB === 'string') {
                         const comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
                         return sortConfig.direction === 'ascending' ? comparison : -comparison;
                     } else { // Basic fallback
                        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                     }
                 }
                return 0;
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


function VehicleDataPage() {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]); // Holds the fetched data
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    // State to track loading status for delete actions on specific rows
    const [actionLoading, setActionLoading] = useState({}); // { vehicleId: true/false }

    // Use the custom sorting hook, passing the currently fetched vehicles
    const { items: sortedVehicles, requestSort, sortConfig } = useSortableData(vehicles);

    // Function to fetch vehicle data
    const fetchVehicles = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/vehicles'); // Fetch all vehicles
            if (!response.ok) {
                 let errorMsg = `HTTP error! Status: ${response.status}`;
                 try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e){}
                 throw new Error(errorMsg);
            }
            const data = await response.json();
            setVehicles(data); // Update state with fetched vehicles
        } catch (err) {
            console.error("Error fetching vehicles:", err);
            setError(err.message || "Failed to load vehicle data.");
            setVehicles([]); // Clear data on error
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array means fetch happens on mount or manual call

    // Initial fetch on component mount
    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]); // fetchVehicles is memoized by useCallback

    // --- Handlers ---
    const handleBack = () => navigate('/admin-dashboard');
    const handleOpenAddModal = () => setIsAddModalOpen(true);
    const handleCloseAddModal = () => setIsAddModalOpen(false);

    // Callback for when a vehicle is successfully added in the modal
    const handleVehicleAdded = () => {
        fetchVehicles(); // Re-fetch the list to include the new vehicle
    };

     // --- Delete Vehicle Handler ---
     const handleDeleteVehicle = async (vehicleId, assignedDriverId) => {
        // Frontend check (quick check, backend does the real validation)
        if (assignedDriverId !== null && assignedDriverId !== undefined) {
             alert("Cannot delete vehicle: It is currently assigned to a driver. Please unassign or deactivate the driver first.");
             return;
        }

        if (window.confirm(`Are you sure you want to permanently delete Vehicle ID: ${vehicleId}? This action cannot be undone.`)) {
            setActionLoading(prev => ({ ...prev, [vehicleId]: true })); // Set loading for this row
            setError('');
            try {
                const response = await fetch(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
                const data = await response.json().catch(() => ({})); // Try to parse JSON even on error

                if (response.ok || response.status === 204) { // Handle 204 No Content
                    alert(data.message || "Vehicle deleted successfully.");
                    fetchVehicles(); // Refresh the list
                } else {
                    // Throw error using message from backend response
                    throw new Error(data.message || `Failed to delete vehicle (Status: ${response.status})`);
                }
            } catch (err) {
                console.error(`Error deleting vehicle ${vehicleId}:`, err);
                const errorMsg = err.message || "An error occurred during deletion.";
                setError(errorMsg); // Set error state for display
                alert(`Error: ${errorMsg}`); // Also show alert
            } finally {
                setActionLoading(prev => ({ ...prev, [vehicleId]: false })); // Remove loading state
            }
        }
    };
    // --- End Delete Handler ---

    // Get CSS class for sort direction indicator
    const getSortDirectionClass = (key) => {
        if (!sortConfig) return '';
        return sortConfig.key === key ? sortConfig.direction : '';
    };

    return (
        <div className="vehicle-data-page">
            {/* Header */}
            <header className="dashboard-header">
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={handleBack}>Back to Dashboard</button>
                </nav>
            </header>

            {/* Body */}
            <main className="vehicle-data-body">
                <div className="vehicle-header">
                    <h2>Vehicle Management</h2>
                    <button className="add-vehicle-button" onClick={handleOpenAddModal} title="Add New Vehicle">
                        + Add Vehicle
                    </button>
                </div>

                {error && <p className="error-message vehicle-error">{error}</p>}

                <div className="vehicle-table-container">
                    {isLoading ? (
                        <p className="loading">Loading vehicles...</p>
                    ) : vehicles.length === 0 && !error ? ( // Check original vehicles length for empty message base
                         <p className="empty-message">No vehicles found in the database.</p>
                    ) : (
                        <table className="vehicle-table">
                            <thead>
                                <tr>
                                    {/* Make headers clickable for sorting */}
                                    <th onClick={() => requestSort('vehicle_id')}
                                        className={`sortable ${getSortDirectionClass('vehicle_id')}`}>
                                        Vehicle ID <span className="sort-arrow"></span>
                                    </th>
                                    <th onClick={() => requestSort('name')}
                                        className={`sortable ${getSortDirectionClass('name')}`}>
                                        Name <span className="sort-arrow"></span>
                                    </th>
                                    <th onClick={() => requestSort('type')}
                                        className={`sortable ${getSortDirectionClass('type')}`}>
                                        Type <span className="sort-arrow"></span>
                                    </th>
                                    <th onClick={() => requestSort('assigned_driver_id')}
                                        className={`sortable ${getSortDirectionClass('assigned_driver_id')}`}>
                                        Assigned Driver ID <span className="sort-arrow"></span>
                                    </th>
                                    <th>Actions</th>{/* Actions Header */}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Map over the SORTED vehicles */}
                                {sortedVehicles.map((vehicle) => {
                                    const isAssigned = vehicle.assigned_driver_id !== null && vehicle.assigned_driver_id !== undefined;
                                    const isLoadingAction = actionLoading[vehicle.vehicle_id]; // Check loading state for this row

                                    return (
                                        <tr key={vehicle.vehicle_id}>
                                            <td>{vehicle.vehicle_id.toString().padStart(5, '0')}</td>
                                            <td>{vehicle.name}</td>
                                            <td>{vehicle.type}</td>
                                            {/* Display driver ID or dash */}
                                            <td>{isAssigned ? vehicle.assigned_driver_id.toString().padStart(5, '0') : '-'}</td>
                                            {/* Actions Cell */}
                                            <td className="action-cell">
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteVehicle(vehicle.vehicle_id, vehicle.assigned_driver_id)}
                                                    title={isAssigned ? "Cannot delete: Vehicle is assigned" : "Delete Vehicle"}
                                                    // Disable button if assigned OR if this row's action is loading
                                                    disabled={isAssigned || isLoadingAction}
                                                >
                                                    {/* Show loading indicator or icon */}
                                                    {isLoadingAction ? '...' : <FaRegTrashAlt />}
                                                </button>
                                                {/* Placeholder for future Edit button */}
                                                {/* <button className="edit-btn" disabled={isLoadingAction}>✏️</button> */}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Add Vehicle Modal */}
            <AddVehicleModal
                isOpen={isAddModalOpen}
                onClose={handleCloseAddModal}
                onVehicleAdded={handleVehicleAdded}
            />
        </div>
    );
}

export default VehicleDataPage;