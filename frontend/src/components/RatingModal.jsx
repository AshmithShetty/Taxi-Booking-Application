// frontend/src/components/RatingModal.jsx
import React, { useState } from 'react';
import './RatingModal.css'; // We'll create this CSS file

function RatingModal({ rideId, onClose, onSaveRating }) {
    const [rating, setRating] = useState(0);
    const [error, setError] = useState('');

    const handleRatingClick = (score) => {
        setRating(score);
        setError(''); // Clear error when a rating is selected
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a rating from 1 to 5.');
            return;
        }
        setError('');
        // Call the parent component's function to handle the API call
        await onSaveRating(rideId, rating);
        // onClose(); // Let the parent handle closing after successful save
    };

    // Prevent modal close when clicking inside the content
    const handleContentClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="rating-modal-overlay" onClick={onClose}>
            <div className="rating-modal-content" onClick={handleContentClick}>
                <h2>Rate Your Ride (ID: {rideId})</h2>
                <p>Please select a rating (1 = Bad, 5 = Excellent):</p>
                <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((score) => (
                        <button
                            key={score}
                            className={`star-button ${rating >= score ? 'selected' : ''}`}
                            onClick={() => handleRatingClick(score)}
                            aria-label={`Rate ${score} out of 5`}
                        >
                            ★
                        </button>
                    ))}
                </div>

                {error && <p className="error-message">{error}</p>}

                <div className="modal-buttons">
                    <button onClick={onClose} className="modal-cancel-button">Cancel</button>
                    <button onClick={handleSubmit} className="modal-submit-button">Submit Rating</button>
                </div>
            </div>
        </div>
    );
}

export default RatingModal;