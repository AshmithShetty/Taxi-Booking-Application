// frontend/src/components/DriverDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartLine } from 'react-icons/fa';
import { IoMdDoneAll } from "react-icons/io";
import VerificationModal from './VerificationModal'; // Import the new modal
import './DriverDashboard.css'; // Ensure CSS file exists

function DriverDashboard() {
    const navigate = useNavigate();
    const driverId = sessionStorage.getItem('userId'); // Assuming driver's ID is stored as 'userId' on login
    // const driverName = sessionStorage.getItem('userName'); // Optional: Use if needed before details load

    // --- State ---
    const [driverDetails, setDriverDetails] = useState(null);
    const [rideRequests, setRideRequests] = useState([]);
    const [currentRide, setCurrentRide] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [isLoadingRequests, setIsLoadingRequests] = useState(true);
    const [isLoadingCurrent, setIsLoadingCurrent] = useState(true);
    const [error, setError] = useState(''); // General error state
    const [actionLoading, setActionLoading] = useState({}); // For specific action button loading states (e.g., accepting)
    // --- New State for Verification Modal ---
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [rideToVerify, setRideToVerify] = useState(null); // Store ID of ride needing verification

    // --- Fetch Driver Details (including vehicle type) ---
    const fetchDriverDetails = useCallback(async () => {
        if (!driverId) {
             setError("Driver ID not found. Please log in.");
             setIsLoadingDetails(false);
             navigate('/login'); // Redirect if ID missing
             return null; // Indicate failure
         }
        setIsLoadingDetails(true);
        // Clear only details-related errors perhaps? Or keep general error handling
        setError(prev => prev === 'Could not load driver details.' ? '' : prev);
        try {
            const response = await fetch(`/api/drivers/${driverId}`);
            if (!response.ok){
                 let errorMsg = 'Failed to fetch driver details';
                 try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e){}
                 throw new Error(errorMsg);
            }
            const data = await response.json();
            setDriverDetails(data);
            return data; // Return data for dependent fetches
        } catch (err) {
            console.error("Error fetching driver details:", err);
            setError(err.message || 'Could not load driver details.');
            setDriverDetails(null);
            return null;
        } finally {
            setIsLoadingDetails(false);
        }
    }, [driverId, navigate]);

    // --- Fetch Available Ride Requests ---
    const fetchRideRequests = useCallback(async (vehicleType) => {
        if (!vehicleType) {
            // console.log("Skipping fetchRideRequests: no vehicle type provided.");
            setIsLoadingRequests(false); // Ensure loading stops if skipped
            return;
        };
        setIsLoadingRequests(true);
        setError(prev => prev === 'Could not load ride requests.' ? '' : prev);
        try {
            const response = await fetch(`/api/rides/available?vehicleType=${encodeURIComponent(vehicleType)}`);
             if (!response.ok){
                 let errorMsg = 'Failed to fetch ride requests';
                 try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e){}
                 throw new Error(errorMsg);
             }
            const data = await response.json();
            setRideRequests(data);
        } catch (err) {
            console.error("Error fetching ride requests:", err);
            setError(err.message || 'Could not load ride requests.');
            setRideRequests([]);
        } finally {
            setIsLoadingRequests(false);
        }
    }, []); // No dependency on driverId needed here, passed via vehicleType

    // --- Fetch Current Accepted Ride ---
     const fetchCurrentRide = useCallback(async () => {
         if (!driverId) return;
         setIsLoadingCurrent(true);
         setError(prev => prev === 'Could not load current ride.' ? '' : prev);
        try {
            const response = await fetch(`/api/rides/driver/current/${driverId}`);
             if (!response.ok){
                  let errorMsg = 'Failed to fetch current ride';
                  try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e){}
                  throw new Error(errorMsg);
             }
            const data = await response.json();
            setCurrentRide(data); // Will be null if no current ride
        } catch (err) {
            console.error("Error fetching current ride:", err);
            setError(err.message || 'Could not load current ride.');
            setCurrentRide(null);
        } finally {
            setIsLoadingCurrent(false);
        }
    }, [driverId]);

    // --- Initial Data Fetching Logic ---
    useEffect(() => {
        async function loadInitialData() {
            const details = await fetchDriverDetails(); // Fetch details first
            if (details?.vehicle_type) {
                fetchRideRequests(details.vehicle_type); // Fetch requests if type is available
            }
            fetchCurrentRide(); // Fetch current ride regardless
        }
        if(driverId){ // Only run if driverId is present
             loadInitialData();
        } else {
             // Handle case where driverId isn't available on mount (e.g., redirect done in fetchDriverDetails)
             setIsLoadingDetails(false);
             setIsLoadingRequests(false);
             setIsLoadingCurrent(false);
        }
    }, [driverId, fetchDriverDetails, fetchRideRequests, fetchCurrentRide]); // Added driverId dependency


    // --- Handlers ---
    const handleLogout = () => {
        sessionStorage.clear(); // Use sessionStorage OR sessionStorage consistently
        sessionStorage.clear(); // Clear session storage too just in case
        navigate('/login');
    };

    const handleNavigate = (path) => navigate(path);

    const handleAcceptRide = async (rideId) => {
        if (!driverId || !driverDetails?.vehicle_type) {
            console.error("Cannot accept ride: Missing driverId or vehicle type details.");
            setError("Cannot accept ride at the moment. Please refresh.");
            return;
        }
        setActionLoading(prev => ({ ...prev, [`accept-${rideId}`]: true }));
        setError('');
        try {
            const response = await fetch(`/api/rides/accept/${rideId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: driverId })
            });
            const data = await response.json();
            if (response.ok) {
                alert('Ride accepted!');
                fetchCurrentRide(); // Refresh current ride list
            } else {
                throw new Error(data.message || `Failed to accept ride (Status: ${response.status})`);
            }
        } catch (err) {
            console.error("Error accepting ride:", err);
            setError(err.message || 'Could not accept ride.');
        } finally {
            // Always refresh ride requests list after attempt
            fetchRideRequests(driverDetails.vehicle_type);
            setActionLoading(prev => ({ ...prev, [`accept-${rideId}`]: false }));
        }
    };

    // --- UPDATED: Open Verification Modal instead of direct completion ---
    const handleOpenVerificationModal = (rideId) => {
         if (!rideId) return;
         setRideToVerify(rideId); // Store the ID of the ride to verify
         setIsVerificationModalOpen(true); // Open the modal
    };

    // Handler to close the verification modal
    const handleCloseVerificationModal = () => {
        setRideToVerify(null); // Clear the ride ID being verified
        setIsVerificationModalOpen(false); // Close the modal
    };

    // Callback when verification is successful in the modal
    const handleRideVerified = () => {
        // Backend updated status. Refresh current ride view.
        fetchCurrentRide(); // This should now show no current ride
        // Optional: Could also refresh ride requests if needed, but likely not
        // if (driverDetails?.vehicle_type) fetchRideRequests(driverDetails.vehicle_type);
    };
    // --- End Verification Modal Handlers ---


    // --- Helper function for safe number formatting ---
    const formatNumber = (numStr, decimals = 2) => {
         if (typeof numStr === 'number') return numStr.toFixed(decimals);
         if (typeof numStr === 'string') {
             const parsed = parseFloat(numStr);
             return isNaN(parsed) ? 'N/A' : parsed.toFixed(decimals);
         }
         return 'N/A';
    };


    // --- Render Logic ---
    return (
        <div className="driver-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={() => handleNavigate('/driver/rides-completed')}>Rides Completed <IoMdDoneAll /></button>
                    <button onClick={() => handleNavigate('/driver/performance')}>Performance <FaChartLine /></button>
                    <button onClick={handleLogout} className="logout-button">Log out</button>
                </nav>
            </header>

            {/* Body */}
            <main className="driver-dashboard-body">
                {/* Driver Details Section */}
                <section className="driver-details-info driver-section">
                    <h3>Your Details</h3>
                    {isLoadingDetails ? (
                        <p className="loading">Loading details...</p>
                    ) : !driverDetails ? (
                        <p className="error-message">{error || 'Could not load driver details.'}</p>
                    ) : (
                        <>
                            <p><strong>ID:</strong> {driverDetails.driver_id?.toString().padStart(5, '0')}</p>
                            <p><strong>Name:</strong> {driverDetails.driver_name}</p>
                            <p><strong>Email:</strong> {driverDetails.driver_email}</p>
                            <p><strong>Phone:</strong> {driverDetails.driver_phone}</p>
                            <hr/>
                            <p><strong>Vehicle ID:</strong> {driverDetails.vehicle_id?.toString().padStart(5, '0')}</p>
                            <p><strong>Vehicle Name:</strong> {driverDetails.vehicle_name} ({driverDetails.vehicle_type})</p>
                             <hr/>
                             <p><strong>Assigned Admin:</strong> {driverDetails.admin_name}</p>
                             <p><strong>Admin Contact:</strong> {driverDetails.admin_phone} / {driverDetails.admin_email}</p>
                        </>
                    )}
                     {/* Show general non-details error here if details loaded */}
                     {error && !error.toLowerCase().includes('details') && driverDetails && <p className="error-message">{error}</p>}
                </section>

                {/* Ride Requests Section */}
                 <section className="ride-requests-window driver-section">
                     <h3>Available Ride Requests ({driverDetails?.vehicle_type || '...'})</h3>
                     {isLoadingRequests ? (
                         <p className="loading">Loading requests...</p>
                     ) : rideRequests.length === 0 ? (
                          <p className="empty-message">{error && error.includes('requests') ? error : "No available requests for your vehicle type."}</p>
                     ) : (
                         <ul className="driver-ride-list">
                             {rideRequests.map((req) => (
                                 <li key={req.ride_id} className="driver-ride-item">
                                     <div className="ride-info">
                                         <span className="ride-id">ID: {req.ride_id.toString().padStart(5, '0')}</span>
                                         <span className="ride-loc">From: {req.pickup_location}</span>
                                         <span className="ride-loc">To: {req.dropoff_location}</span>
                                         <span className="ride-dist">Distance: {formatNumber(req.distance)} km</span>
                                         <span className="ride-comm">Commission: ~₹{formatNumber(req.potential_commission)}</span>
                                     </div>
                                     <div className="ride-actions">
                                         <button
                                             className="accept-button"
                                             onClick={() => handleAcceptRide(req.ride_id)}
                                             disabled={!!actionLoading[`accept-${req.ride_id}`] || !!currentRide} // Disable if busy or already has a ride
                                             title={currentRide ? "Cannot accept: Finish current ride first" : "Accept this ride"}
                                         >
                                             {actionLoading[`accept-${req.ride_id}`] ? '...' : 'Accept'}
                                         </button>
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     )}
                 </section>

                 {/* Current Ride Section */}
                  <section className="current-ride-window driver-section">
                     <h3>Current Assigned Ride</h3>
                     {isLoadingCurrent ? (
                         <p className="loading">Loading current ride...</p>
                     ) : !currentRide ? (
                         <p className="empty-message">{error && error.includes('current ride') ? error : "No current ride assigned."}</p>
                     ) : (
                          <div className="driver-ride-item current">
                             <div className="ride-info">
                                 <span className="ride-id">ID: {currentRide.ride_id.toString().padStart(5, '0')}</span>
                                 <span className="ride-cust">Customer: {currentRide.customer_name}</span>
                                 <span className="ride-loc">Pickup: {currentRide.pickup_location}</span>
                                 <span className="ride-loc">Dropoff: {currentRide.dropoff_location}</span>
                                 <span className="ride-dist">Distance: {formatNumber(currentRide.distance)} km</span>
                                 <span className="ride-comm">Commission: ~₹{formatNumber(currentRide.commission)}</span>
                             </div>
                             <div className="ride-actions">
                                  <button
                                      className="complete-button"
                                      // --- UPDATED onClick to open modal ---
                                      onClick={() => handleOpenVerificationModal(currentRide.ride_id)}
                                      // --- End Update ---
                                      // No need for actionLoading here, modal handles loading state
                                  >
                                     Mark Completed
                                  </button>
                             </div>
                         </div>
                     )}
                 </section>
            </main>

            {/* Verification Modal */}
            {rideToVerify && (
                 <VerificationModal
                     isOpen={isVerificationModalOpen}
                     onClose={handleCloseVerificationModal}
                     onVerified={handleRideVerified} // Pass callback
                     rideId={rideToVerify} // Pass the ride ID
                 />
            )}
        </div>
    );
}

export default DriverDashboard;