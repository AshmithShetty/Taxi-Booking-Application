// frontend/src/components/DriverDataPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// Import all necessary icons
import { FaRegEdit, FaRegTrashAlt, FaSyncAlt, FaChartLine } from 'react-icons/fa';
import AddDriverModal from './AddDriverModal';
import EditDriverModal from './EditDriverModal';
import ReactivateDriverModal from './ReactivateDriverModal';
import './DriverDataPage.css'; // Ensure CSS file exists and has styles for all buttons

// Custom Hook for Sorting (Includes specific type handling)
const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key] ?? ''; // Handle nullish values
                const valB = b[sortConfig.key] ?? '';

                // Handle specific types for better sorting
                if (['driver_id', 'vehicle_id'].includes(sortConfig.key)) {
                     // Numeric sort for IDs (handle nulls)
                     const numA = valA === null ? -Infinity : parseInt(valA, 10);
                     const numB = valB === null ? -Infinity : parseInt(valB, 10);
                     if (numA < numB) return sortConfig.direction === 'ascending' ? -1 : 1;
                     if (numA > numB) return sortConfig.direction === 'ascending' ? 1 : -1;
                 } else if (sortConfig.key === 'is_active') {
                     // Boolean sort (Active first by default)
                     const boolA = !!valA;
                     const boolB = !!valB;
                     if (boolA === boolB) return 0;
                     if (sortConfig.direction === 'ascending') {
                         return boolA ? -1 : 1;
                     } else {
                         return boolA ? 1 : -1;
                     }
                 } else {
                     // Default: Locale-aware string comparison (case-insensitive)
                     if (typeof valA === 'string' && typeof valB === 'string') {
                         const comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
                         return sortConfig.direction === 'ascending' ? comparison : -comparison;
                     } else { // Fallback basic comparison
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


function DriverDataPage() {
    const navigate = useNavigate();
    const adminId = sessionStorage.getItem('userId'); // Use sessionStorage

    // State
    const [allDrivers, setAllDrivers] = useState([]);
    const [filteredDrivers, setFilteredDrivers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [driverToReactivate, setDriverToReactivate] = useState(null);
    const [actionLoading, setActionLoading] = useState({});

    // Sorting hook applied to filtered data
    const { items: sortedDrivers, requestSort, sortConfig } = useSortableData(filteredDrivers);

    // Fetch Drivers managed by this Admin
    const fetchDrivers = useCallback(async () => {
        if (!adminId) {
            setError("Admin ID not found. Please log in.");
            setIsLoading(false);
            navigate('/login');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/admins/${adminId}/drivers`);
            if (!response.ok) {
                 let errorMsg = `HTTP error! Status: ${response.status}`;
                 try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e){}
                 throw new Error(errorMsg);
            }
            const data = await response.json();
            setAllDrivers(data);
            // Apply search filter immediately after fetching/updating allDrivers
             const lowerSearchTerm = searchTerm.toLowerCase();
             if (!lowerSearchTerm) {
                 setFilteredDrivers(data);
             } else {
                 const results = data.filter(driver =>
                     driver.name.toLowerCase().includes(lowerSearchTerm)
                 );
                 setFilteredDrivers(results);
             }
        } catch (err) {
            console.error("Error fetching drivers:", err);
            setError(err.message || "Failed to load driver data.");
            setAllDrivers([]);
            setFilteredDrivers([]);
        } finally {
            setIsLoading(false);
        }
    }, [adminId, navigate, searchTerm]); // Include searchTerm here

    // Initial fetch
    useEffect(() => {
        fetchDrivers();
    }, [fetchDrivers]); // Only depends on the memoized fetch function


    // --- Handlers ---
    const handleBack = () => navigate('/admin-dashboard');
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    // Modal Handlers
    const handleOpenAddModal = () => setIsAddModalOpen(true);
    const handleCloseAddModal = () => setIsAddModalOpen(false);
    const handleOpenEditModal = (driver) => { setSelectedDriver(driver); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setSelectedDriver(null); setIsEditModalOpen(false); };
    const handleOpenReactivateModal = (driver) => { setDriverToReactivate(driver); setIsReactivateModalOpen(true); };
    const handleCloseReactivateModal = () => { setDriverToReactivate(null); setIsReactivateModalOpen(false); };

    // Refresh list after add/edit/reactivate/deactivate
    const handleDriverActionComplete = () => {
        fetchDrivers();
    };

     // Handle Driver Deactivation (Soft Delete)
    const handleDeleteDriver = async (driverId) => {
        setActionLoading(prev => ({ ...prev, [driverId]: true }));
        setError('');
        try {
            const checkResponse = await fetch(`/api/drivers/${driverId}/active-rides-check`);
            const checkData = await checkResponse.json();
            if (!checkResponse.ok) throw new Error(checkData.message || 'Failed check.');
            if (checkData.hasActiveRides) {
                 alert(`Cannot deactivate: Driver ID ${driverId.toString().padStart(5,'0')} has ongoing rides.`);
                 return;
            }
            if (window.confirm(`Are you sure you want to deactivate Driver ID: ${driverId.toString().padStart(5,'0')}?`)) {
                 const deactivateResponse = await fetch(`/api/drivers/${driverId}/deactivate`, { method: 'PUT' });
                 const deactivateData = await deactivateResponse.json();
                 if (!deactivateResponse.ok) throw new Error(deactivateData.message || 'Failed.');
                 alert(deactivateData.message || 'Driver deactivated.');
                 handleDriverActionComplete(); // Refresh list
            }
        } catch (err) {
            console.error(`Error deactivate ${driverId}:`, err);
            setError(err.message); alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [driverId]: false }));
        }
    };

    // Handle View Performance Click
    const handleViewPerformance = (driver) => {
        navigate('/driver/performance', {
            state: {
                viewingDriverId: driver.driver_id, // Pass target driver's ID
                viewingDriverName: driver.name     // Pass target driver's name
            }
        });
    };

    // Get CSS class for sort direction indicator
    const getSortDirectionClass = (key) => {
        if (!sortConfig || sortConfig.key !== key) return '';
        return sortConfig.direction;
    };

    return (
        <div className="driver-data-page">
            {/* Header */}
            <header className="dashboard-header">
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={handleBack}>Back to Dashboard</button>
                </nav>
            </header>

            {/* Body */}
            <main className="driver-data-body">
                <div className="driver-header">
                    <h2>Driver Management</h2>
                    <div className="driver-controls">
                         <input
                            type="text"
                            placeholder="Search by Driver Name..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="search-input"
                         />
                         <button className="add-driver-button" onClick={handleOpenAddModal} title="Add New Driver">
                            + Add Driver
                        </button>
                    </div>
                </div>

                {error && <p className="error-message driver-error">{error}</p>}

                <div className="driver-table-container">
                    {isLoading ? (
                        <p className="loading">Loading drivers...</p>
                    ) : sortedDrivers.length === 0 ? ( // Check sortedDrivers
                         <p className="empty-message">{searchTerm ? "No drivers match your search." : "No drivers found for this admin."}</p>
                    ) : (
                        <table className="driver-table">
                            <thead>
                                <tr>
                                    {/* Add onClick handlers and sort indicators */}
                                    <th onClick={() => requestSort('driver_id')} className={`sortable ${getSortDirectionClass('driver_id')}`}>
                                        ID <span className="sort-arrow"></span></th>
                                    <th onClick={() => requestSort('name')} className={`sortable ${getSortDirectionClass('name')}`}>
                                        Name <span className="sort-arrow"></span></th>
                                    <th onClick={() => requestSort('phone_number')} className={`sortable ${getSortDirectionClass('phone_number')}`}>
                                        Phone <span className="sort-arrow"></span></th>
                                    <th onClick={() => requestSort('email')} className={`sortable ${getSortDirectionClass('email')}`}>
                                        Email <span className="sort-arrow"></span></th>
                                    <th onClick={() => requestSort('vehicle_name')} className={`sortable ${getSortDirectionClass('vehicle_name')}`}>
                                        Vehicle (Name/Type/ID) <span className="sort-arrow"></span></th>
                                     <th onClick={() => requestSort('is_active')} className={`sortable ${getSortDirectionClass('is_active')}`}>
                                        Status <span className="sort-arrow"></span></th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedDrivers.map((driver) => {
                                    const isActionLoading = !!actionLoading[driver.driver_id]; // Check loading state
                                    return (
                                        <tr key={driver.driver_id} className={!driver.is_active ? 'inactive-driver' : ''}>
                                            <td>{driver.driver_id.toString().padStart(5, '0')}</td>
                                            <td>{driver.name}</td>
                                            <td>{driver.phone_number}</td>
                                            <td>{driver.email}</td>
                                            <td>
                                                {driver.is_active && driver.vehicle_id
                                                    ? `${driver.vehicle_name || 'N/A'} (${driver.vehicle_type || 'N/A'}) - ${driver.vehicle_id.toString().padStart(5, '0')}`
                                                    : '-'}
                                            </td>
                                            <td>{driver.is_active ? 'Active' : 'Inactive'}</td>
                                            <td className="action-cell">
                                                {/* View Performance Button */}
                                                <button
                                                    className="performance-btn" // Add specific class for styling
                                                    onClick={() => handleViewPerformance(driver)}
                                                    title="View Performance"
                                                    disabled={isActionLoading} // Disable if other action is loading
                                                >
                                                    <FaChartLine />
                                                </button>
                                                {/* Edit Button */}
                                                <button
                                                    className="edit-btn"
                                                    onClick={() => handleOpenEditModal(driver)}
                                                    title="Edit Driver"
                                                    disabled={!driver.is_active || isActionLoading}
                                                > <FaRegEdit /> </button>
                                                {/* Deactivate/Reactivate Buttons */}
                                                {driver.is_active ? (
                                                    <button className="delete-btn" onClick={() => handleDeleteDriver(driver.driver_id)}
                                                        title="Deactivate Driver" disabled={isActionLoading} >
                                                         {isActionLoading ? '...' : <FaRegTrashAlt />} </button>
                                                ) : (
                                                    <button className="reactivate-btn" onClick={() => handleOpenReactivateModal(driver)}
                                                        title="Reactivate Driver" disabled={isActionLoading} >
                                                         {isActionLoading ? '...' : <FaSyncAlt />} </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modals */}
            <AddDriverModal
                isOpen={isAddModalOpen}
                onClose={handleCloseAddModal}
                onDriverAdded={handleDriverActionComplete}
                adminId={adminId}
            />
            {selectedDriver && (
                 <EditDriverModal
                     isOpen={isEditModalOpen}
                     onClose={handleCloseEditModal}
                     onDriverUpdated={handleDriverActionComplete}
                     driverData={selectedDriver}
                     adminId={adminId}
                 />
            )}
            {driverToReactivate && (
                  <ReactivateDriverModal
                      isOpen={isReactivateModalOpen}
                      onClose={handleCloseReactivateModal}
                      onDriverReactivated={handleDriverActionComplete}
                      driverId={driverToReactivate.driver_id}
                      driverName={driverToReactivate.name}
                  />
             )}
        </div>
    );
}

export default DriverDataPage;