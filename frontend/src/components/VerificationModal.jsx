// frontend/src/components/VerificationModal.jsx
import React, { useState } from 'react';
import './Modal.css'; // Reuse generic modal CSS

function VerificationModal({ isOpen, onClose, onVerified, rideId }) {
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');

        if (!code || code.length !== 6) { // Basic validation
            setError('Please enter the 6-character verification code.');
            return;
        }

        setIsVerifying(true);
        try {
            // Call the modified backend endpoint, sending the code
            const response = await fetch(`/api/rides/complete/${rideId}`, {
                method: 'PUT', // Still PUT to update status 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verificationCode: code }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('Verification Successful! Ride marked as completed.');
                onVerified(); // Call parent callback (e.g., to refresh DriverDashboard)
                onClose(); // Close the modal
            } else {
                // Handle verification failure (403, 400, etc.)
                setError(data.message || `Verification failed (Status: ${response.status})`);
            }
        } catch (err) {
            console.error("Error verifying ride completion:", err);
            setError("An unexpected error occurred during verification.");
        } finally {
            setIsVerifying(false);
        }
    };

    // Reset state when closing
    const handleClose = () => {
        setCode('');
        setError('');
        setIsVerifying(false);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={handleClose}>×</button>
                <h2>Enter Ride Verification Code</h2>
                <p>Please ask the customer for the 6-character code for Ride ID: {rideId?.toString().padStart(5,'0')}.</p>
                <form onSubmit={handleVerify}>
                    <div className="modal-form-group">
                        <label htmlFor="verificationCode">Verification Code:</label>
                        <input
                            type="text" // Allow alphanumeric
                            id="verificationCode"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())} // Force uppercase maybe
                            maxLength={6}
                            required
                            disabled={isVerifying}
                            className="verification-code-input" // Add class for potential styling
                            autoComplete="off"
                        />
                    </div>

                    {error && <p className="modal-error-message">{error}</p>}

                    <div className="modal-actions">
                        <button
                            type="submit"
                            className="modal-submit-btn verify-btn"
                            disabled={isVerifying || code.length !== 6}
                        >
                            {isVerifying ? 'Verifying...' : 'Verify & Complete'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default VerificationModal;