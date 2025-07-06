// frontend/src/components/MakePaymentPage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './MakePaymentPage.css'; // Create this CSS file

function MakePaymentPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [rideDetails, setRideDetails] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Extract ride details passed from BookRidePage
    useEffect(() => {
        if (location.state && location.state.rideId) {
            setRideDetails(location.state);
            console.log("Ride details received for payment:", location.state);
        } else {
            console.error("No ride details passed to payment page.");
            setError("Ride details missing. Please book again.");
            // Optional: Redirect back after a delay or provide a button
            // setTimeout(() => navigate('/book-ride'), 3000);
        }
    }, [location.state]); // Dependency on location.state

    const handleEditRide = async () => {
        if (!rideDetails || !rideDetails.rideId) return;

        setIsLoading(true);
        setError('');
        console.log(`Attempting to cancel draft ride ID: ${rideDetails.rideId}`);

        try {
            // Call backend to delete the draft ride
            const response = await fetch(`/api/rides/draft/${rideDetails.rideId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                console.log(`Draft ride ${rideDetails.rideId} cancelled.`);
                alert('Ride cancelled. Redirecting to booking page...');
                navigate('/book-ride'); // Redirect back to booking page
            } else {
                // Handle error (e.g., ride already paid, not found)
                const data = await response.json();
                console.error('Failed to cancel ride:', data.message);
                setError(data.message || 'Failed to cancel ride draft. It might have already been processed.');
                 setIsLoading(false);
            }
        } catch (err) {
            console.error('API call to cancel ride failed:', err);
            setError('An error occurred while cancelling the ride.');
             setIsLoading(false);
        }
        // No need to set isLoading false here if navigation happens on success
    };

    const handleConfirmPayment = async () => {
        if (!selectedPaymentMethod || !rideDetails) {
            setError('Please select a payment method.');
            return;
        }

        setIsLoading(true);
        setError('');
        console.log(`Processing payment for Ride ID: ${rideDetails.rideId}, Amount: ${rideDetails.fare}, Method: ${selectedPaymentMethod}`);

        try {
            const response = await fetch('/api/payments/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rideId: rideDetails.rideId,
                    amount: rideDetails.fare,
                    paymentMethod: selectedPaymentMethod,
                }),
            });

            const data = await response.json();

            if (response.ok || response.status === 201) {
                console.log('Payment successful:', data);
                alert('Payment successful! Redirecting to dashboard.');
                navigate('/customer-dashboard'); // Redirect to dashboard on success
            } else {
                 console.error('Payment processing failed:', data.message);
                 setError(data.message || 'Payment processing failed.');
                  setIsLoading(false);
            }

        } catch (err) {
            console.error('API call to process payment failed:', err);
            setError('An error occurred during payment processing.');
             setIsLoading(false);
        }
    };

    // Determine if Pay button should be enabled
    const isPayButtonEnabled = selectedPaymentMethod && !isLoading;
    const fareDisplay = rideDetails?.fare?.toFixed(2) ?? '0.00';

    // Render Loading or Error state if rideDetails are missing initially
     if (!rideDetails && !error) {
        return <div className="loading-payment">Loading ride details...</div>;
     }
     if (error && !rideDetails) {
         return (
            <div className="payment-error-page">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/book-ride')}>Go Back to Booking</button>
            </div>
         );
     }


    return (
        <div className="make-payment-page">
            {/* Header */}
            <header className="dashboard-header"> {/* Reusing styles */}
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={handleEditRide} disabled={isLoading}>
                        Edit Ride
                    </button>
                </nav>
            </header>

            {/* Body */}
            <main className="payment-body">
                <div className="payment-container">
                    <h2>Confirm Ride & Payment</h2>

                    {/* Ride Summary Section */}
                    <section className="ride-summary-section">
                        <h3>Ride Summary</h3>
                        <p><strong>From:</strong> {rideDetails?.pickup ?? 'N/A'}</p>
                        <p><strong>To:</strong> {rideDetails?.dropoff ?? 'N/A'}</p>
                        <p><strong>Distance:</strong> {rideDetails?.distance?.toFixed(2) ?? 'N/A'} km</p>
                        <p><strong>Fare Amount:</strong> ₹ {fareDisplay}</p>
                         <p><strong>Taxi Type:</strong> {rideDetails?.taxiType ?? 'N/A'}</p>
                    </section>

                    <hr className="divider" />

                    {/* Payment Method Section */}
                    <section className="payment-method-section">
                        <h3>Select Payment Method</h3>
                        <div className="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="credit card"
                                    checked={selectedPaymentMethod === 'credit card'}
                                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                    disabled={isLoading}
                                />
                                Credit Card
                            </label>
                             <label>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="debit card"
                                    checked={selectedPaymentMethod === 'debit card'}
                                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                    disabled={isLoading}
                                />
                                Debit Card
                            </label>
                             <label>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="net banking"
                                    checked={selectedPaymentMethod === 'net banking'}
                                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                    disabled={isLoading}
                                />
                                Net Banking
                            </label>
                        </div>
                    </section>

                    {/* Error Display */}
                    {error && <p className="error-message payment-error">{error}</p>}

                    {/* Pay Button */}
                    <div className="pay-button-container">
                        <button
                            className="pay-button"
                            onClick={handleConfirmPayment}
                            disabled={!isPayButtonEnabled}
                        >
                            {isLoading ? 'Processing...' : `Pay ₹${fareDisplay}`}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default MakePaymentPage;