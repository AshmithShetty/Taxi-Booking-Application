// frontend/src/components/CustomerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTaxi } from "react-icons/fa6";
import { FaHistory } from "react-icons/fa";
import { FaUserEdit } from "react-icons/fa";
import RatingModal from './RatingModal';
import './CustomerDashboard.css'; // Ensure CSS is linked

function CustomerDashboard() {
    const [customerData, setCustomerData] = useState(null);
    // State to hold ALL fetched rides relevant for logic (active status check)
    const [allRelevantRides, setAllRelevantRides] = useState([]);
    // State for rides to *display* in the list (unrated completed, or active)
    const [ridesToDisplay, setRidesToDisplay] = useState([]);

    const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
    const [isLoadingRides, setIsLoadingRides] = useState(true);
    const [error, setError] = useState(''); // Stores general or fetch errors
    const [rideSpecificLoading, setRideSpecificLoading] = useState({}); // For cancel button loading state

    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [selectedRideForRating, setSelectedRideForRating] = useState(null);


    const navigate = useNavigate();
    const customerId = sessionStorage.getItem('userId'); // Using sessionStorage

    // --- Fetch Customer Data ---
    useEffect(() => {
        if (!customerId) {
            setError('No customer ID found in session. Please log in again.');
            setIsLoadingCustomer(false);
            navigate('/login');
            return;
        }
        const fetchCustomerData = async () => {
            setIsLoadingCustomer(true);
            // Clear only customer-related errors
            setError(prev => prev === 'Failed to load customer information.' ? '' : prev);
            try {
                const response = await fetch(`/api/customers/${customerId}`);
                if (!response.ok) {
                    let errorMsg = `HTTP error! Status: ${response.status}`;
                    try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e){}
                    throw new Error(errorMsg);
                }
                const data = await response.json();
                setCustomerData(data);
            } catch (err) {
                console.error("Error fetching customer data:", err);
                setError('Failed to load customer information.');
            } finally {
                setIsLoadingCustomer(false);
            }
        };
        fetchCustomerData();
    }, [customerId, navigate]);


    // --- Fetch ALL Relevant Rides ---
    const fetchRides = useCallback(async () => {
        if (!customerId) return;

        setIsLoadingRides(true);
        // Clear only ride-related errors before fetching
        setError(prev => prev?.includes('load rides') ? '' : prev);

        try {
            // Fetch all statuses potentially needed for logic or display
            // Added verification_code to SELECT based on previous feature
            const statuses = 'drafted,payment done,request accepted,destination reached';
            const response = await fetch(`/api/rides/customer/${customerId}/status?statuses=${encodeURIComponent(statuses)}`);

            if (!response.ok) {
                let errorMsg = `HTTP error! Status: ${response.status}`;
                try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch (e) {}
                throw new Error(errorMsg);
            }
            const data = await response.json();

            const ridesWithDetails = data.map(ride => ({
                ...ride,
                isRated: ride.rating_id !== null || ride.rating_score !== null
            }));

            // Store ALL relevant rides for active status checking logic
            setAllRelevantRides(ridesWithDetails);

            // Filter rides specifically for *display* in the list
            // Show all non-completed rides + completed-but-unrated rides
            const displayableRides = ridesWithDetails.filter(ride =>
                ride.ride_status !== 'destination reached' ||
                (ride.ride_status === 'destination reached' && !ride.isRated)
            );
            setRidesToDisplay(displayableRides);

            // Clear general error if fetch succeeds and we got some data (even if empty display list)
            // Only clear if the current error message is about loading rides
             if (error?.includes('load rides') && data) setError('');


        } catch (err) {
            console.error("Error fetching rides:", err);
            // Set error without concatenating indefinitely
            setError(`Failed to load rides: ${err.message}`);
             // Clear rides on error
            setAllRelevantRides([]);
            setRidesToDisplay([]);
        } finally {
            setIsLoadingRides(false);
        }
    }, [customerId, error]); // Include error dependency to allow clearing it

    useEffect(() => {
        if (customerId) { fetchRides(); }
    }, [customerId, fetchRides]);


    // --- Handlers ---
    const handleLogout = () => {
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('userRole');
        navigate('/login');
    };

    const handleNavigate = (path) => navigate(path);

    const handleOpenRatingModal = (rideId) => {
        setSelectedRideForRating(rideId);
        setIsRatingModalOpen(true);
    };

    const handleCloseModal = () => {
         setIsRatingModalOpen(false);
        setSelectedRideForRating(null);
    };

    const handleSaveRating = async (rideId, score) => {
        // Show loading state specific to rating maybe?
        try {
            const response = await fetch('/api/ratings', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ rideId, score }),
             });
            const data = await response.json();
            if (response.ok || response.status === 201) {
                alert('Thank you for your rating!');
                // Refetch rides to update the display (rated ride will disappear)
                fetchRides();
            } else {
                 console.error('Failed to save rating:', data.message);
                 alert(`Failed to save rating: ${data.message}`);
            }
        } catch (err) {
             console.error('API call to save rating failed:', err);
             alert('An error occurred while saving the rating.');
        } finally {
             handleCloseModal(); // Always close modal
        }
    };

    // UPDATED handleCancelRide with correct alert logic
    const handleCancelRide = async (rideId, status) => {
        const confirmMsg = status === 'payment done'
           ? "Are you sure you want to cancel this ride? Refund will be initiated within 2 business days."
           : "Are you sure you want to cancel this ride draft?";

        if (window.confirm(confirmMsg)) {
            setRideSpecificLoading(prev => ({ ...prev, [rideId]: true }));
            setError(''); // Clear previous general errors
            try {
                const response = await fetch(`/api/rides/cancel/${rideId}`, { method: 'DELETE' });

                if (response.ok) {
                     // Show appropriate message based on the status it HAD when cancelled
                     alert(status === 'payment done'
                           ? 'Ride cancelled. Refund will be processed within 2 business days.'
                           : 'Ride cancelled successfully.');

                   // Refetch rides AFTER showing the alert and confirming success
                   fetchRides();

                } else {
                    // Handle backend errors
                    const data = await response.json().catch(() => ({ message: 'Cancellation failed. Please try again.' }));
                    console.error('Failed to cancel ride:', data.message || response.statusText);
                    alert(`Failed to cancel ride: ${data.message || 'Please try again.'}`); // Show specific error
                }
            } catch (err) {
                 // Handle network errors
                console.error('API call to cancel ride failed:', err);
                alert('An error occurred while cancelling the ride.');
            } finally {
                 setRideSpecificLoading(prev => ({ ...prev, [rideId]: false })); // Always remove loading indicator
            }
        }
    };

    // Clear only 'destination reached' rides from the DISPLAY list
    const handleClearRides = () => {
        setRidesToDisplay(prevRides => prevRides.filter(ride =>
            ride.ride_status !== 'destination reached'
        ));
    };


    // --- Render Logic ---

    // Determine if booking should be disabled based on ALL relevant rides
    const hasActiveRide = !isLoadingRides && allRelevantRides.some(ride =>
        ride.ride_status === 'drafted' ||
        ride.ride_status === 'payment done' ||
        ride.ride_status === 'request accepted'
    );
    const isBookingDisabled = isLoadingRides || hasActiveRide;


    if (isLoadingCustomer) return <div className="loading">Loading Customer Data...</div>;
    // Show critical error only if customer data failed AND there's no customer data yet
    if (error && !customerData && !isLoadingCustomer) return <div className="error">{error} <button onClick={() => navigate('/login')}>Go to Login</button></div>;
    // Fallback if still loading or no data after loading
    if (!customerData) return <div className="loading">Initializing... Please wait.</div>;

    return (
        <div className="customer-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                     <button
                        onClick={() => handleNavigate('/book-ride')}
                        disabled={isBookingDisabled} // Disable based on flag
                        title={isBookingDisabled ? "Cannot book: You have an ongoing or pending ride." : "Book a new ride"} // Explain why disabled
                     >
                        Book Ride <FaTaxi />
                     </button>
                     <button onClick={() => handleNavigate('/ride-history')}>Ride History <FaHistory /></button>
                     <button onClick={() => handleNavigate('/edit-account')}>Edit Account <FaUserEdit /></button>
                     <button onClick={handleLogout} className="logout-button">Log out</button>
                </nav>
            </header>

            {/* Body */}
            <main className="dashboard-body">
                {/* Customer Info Section */}
                <section className="customer-info">
                    <h2>Your Details</h2>
                    <p><strong>ID:</strong> {customerData.customer_id.toString().padStart(5, '0')}</p>
                    <p><strong>Name:</strong> {customerData.name}</p>
                    <p><strong>Email:</strong> {customerData.email}</p>
                    <p><strong>Phone:</strong> {customerData.phone_number}</p>
                    {/* Display general fetch error if customer data loaded but rides failed */}
                    {error && customerData && ridesToDisplay.length === 0 && !isLoadingRides &&
                        <p className="error-message inline-error">{error}</p>
                    }
                </section>

                {/* Ride Status Window Section */}
                <section className="ride-status-window">
                     <button
                        className="clear-rides-button"
                        onClick={handleClearRides}
                        title="Clear completed & unrated rides from view"
                     >
                        ✕
                     </button>
                    <h3>Current & Pending Rides</h3>
                    {isLoadingRides ? (
                        <p className="loading">Loading rides...</p>
                    ) : ridesToDisplay.length === 0 ? (
                         <p className="empty-message">
                            {/* Show error if loading failed, otherwise show empty message */}
                            {error && !isLoadingCustomer && customerData ? error : "No active or pending rides."}
                         </p>
                    ) : (
                        <ul className="ride-list">
                            {/* Map over ridesToDisplay */}
                            {ridesToDisplay.map((ride) => {
                                const canCancel = ride.ride_status === 'drafted' || ride.ride_status === 'payment done';
                                const canRate = ride.ride_status === 'destination reached' && !ride.isRated; // isRated determined during fetch
                                const isRideLoading = rideSpecificLoading[ride.ride_id];
                                // Check if code should be shown based on status
                                const showCode = ride.verification_code && (ride.ride_status === 'payment done' || ride.ride_status === 'request accepted');

                                return (
                                    <li key={ride.ride_id} className={`ride-item status-${ride.ride_status.replace(/\s+/g, '-')}`}>
                                        <div className="ride-info">
                                             <span className="ride-id">ID: {ride.ride_id.toString().padStart(5, '0')}</span>
                                             <span className="ride-loc">From: {ride.pickup_location || 'N/A'}</span>
                                             <span className="ride-loc">To: {ride.dropoff_location || 'N/A'}</span>
                                             <span className="ride-driver">Driver: {ride.driver_name || '-'}</span>
                                             <span className="ride-status-text">Status: {ride.ride_status}</span>
                                              {/* Display Verification Code */}
                                             {showCode && (
                                                <span className="verification-code">
                                                    Code for Driver: <strong>{ride.verification_code}</strong>
                                                </span>
                                             )}
                                        </div>
                                        <div className="ride-actions">
                                            <button
                                                className="cancel-button"
                                                onClick={() => handleCancelRide(ride.ride_id, ride.ride_status)}
                                                disabled={!canCancel || isRideLoading}
                                                title={canCancel ? "Cancel this ride" : "Cannot cancel ride in this status"}
                                            >
                                                {isRideLoading ? '...' : 'Cancel'}
                                            </button>
                                            <button
                                                className="rate-button"
                                                onClick={() => handleOpenRatingModal(ride.ride_id)}
                                                disabled={!canRate || isRideLoading} // Should also disable if ride is loading for cancel
                                                title={canRate ? "Rate this ride" : ride.isRated ? "Already Rated" : "Cannot rate yet"}
                                            >
                                                Rate
                                            </button>
                                        </div>
                                    </li>
                                );
                             })}
                        </ul>
                    )}
                    {/* Display general ride loading errors if list is populated but error occurred */}
                     {error && !isLoadingRides && ridesToDisplay.length > 0 &&
                         <p className="error-message inline-error">{error}</p>
                     }
                </section>
            </main>

            {/* Rating Modal */}
            {isRatingModalOpen && selectedRideForRating && (
                <RatingModal
                    rideId={selectedRideForRating}
                    onClose={handleCloseModal}
                    onSaveRating={handleSaveRating}
                />
            )}
        </div>
    );
}

export default CustomerDashboard;