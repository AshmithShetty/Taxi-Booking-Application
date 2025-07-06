// frontend/src/components/AddVehicleModal.jsx
import React, { useState } from 'react';
import './AddVehicleModal.css'; // Create this CSS file

function AddVehicleModal({ isOpen, onClose, onVehicleAdded }) {
    const [vehicleName, setVehicleName] = useState('');
    const [vehicleType, setVehicleType] = useState(''); // Default empty
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const handleAddVehicle = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Basic Frontend Validation
        if (!vehicleName.trim()) {
            setError("Vehicle name is required.");
            return;
        }
        if (!vehicleType) {
            setError("Please select a vehicle type.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: vehicleName, type: vehicleType }),
            });

            const data = await response.json();

            if (response.ok || response.status === 201) {
                setSuccessMessage(data.message || 'Vehicle added successfully!');
                setVehicleName(''); // Clear form
                setVehicleType('');
                if (onVehicleAdded) {
                    onVehicleAdded(); // Notify parent to refresh list
                }
                // Optionally close modal after a short delay
                setTimeout(onClose, 1500); // Close after 1.5 seconds
            } else {
                setError(data.message || `Failed to add vehicle (Status: ${response.status})`);
            }
        } catch (err) {
            console.error("Error adding vehicle:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Reset form when modal closes
    const handleClose = () => {
        setVehicleName('');
        setVehicleType('');
        setError('');
        setSuccessMessage('');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={handleClose}>×</button>
                <h2>Add New Vehicle</h2>
                <form onSubmit={handleAddVehicle}>
                    <div className="modal-form-group">
                        <label htmlFor="vehicleName">Vehicle Name:</label>
                        <input
                            type="text"
                            id="vehicleName"
                            value={vehicleName}
                            onChange={(e) => setVehicleName(e.target.value)}
                            placeholder="e.g., KA-01-AB-1234, Swift Dzire Blue"
                            required
                            disabled={isSaving}
                        />
                    </div>
                    <div className="modal-form-group">
                        <label htmlFor="vehicleType">Vehicle Type:</label>
                        <select
                            id="vehicleType"
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                            required
                            disabled={isSaving}
                        >
                            <option value="" disabled>-- Select Type --</option>
                            <option value="sedan">Sedan</option>
                            <option value="hatchback">Hatchback</option>
                            <option value="suv">SUV</option>
                        </select>
                    </div>

                    {error && <p className="modal-error-message">{error}</p>}
                    {successMessage && <p className="modal-success-message">{successMessage}</p>}

                    <div className="modal-actions">
                        <button type="submit" className="modal-submit-btn" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Vehicle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddVehicleModal;