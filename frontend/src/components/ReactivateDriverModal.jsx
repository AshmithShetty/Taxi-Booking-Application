// frontend/src/components/ReactivateDriverModal.jsx
import React, { useState, useEffect } from 'react';
import './Modal.css'; // Reusing generic Modal CSS

function ReactivateDriverModal({ isOpen, onClose, onDriverReactivated, driverId, driverName }) {
    // State for vehicle selection
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [unassignedVehicles, setUnassignedVehicles] = useState([]);
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch unassigned vehicles when modal opens
    useEffect(() => {
        if (isOpen && driverId) {
            setSelectedVehicleId(''); // Reset selection
            setError('');
            setSuccessMessage('');
            setIsLoadingVehicles(true);

            const fetchVehicles = async () => {
                try {
                    const response = await fetch('/api/vehicles/unassigned');
                    if (!response.ok) throw new Error('Failed to fetch vehicles');
                    const data = await response.json();
                    setUnassignedVehicles(data);
                } catch (err) {
                    console.error("Error fetching unassigned vehicles:", err);
                    setError("Could not load available vehicles.");
                    setUnassignedVehicles([]);
                } finally {
                    setIsLoadingVehicles(false);
                }
            };
            fetchVehicles();
        }
    }, [isOpen, driverId]); // Rerun when modal opens for specific driver

    if (!isOpen || !driverId) return null;

    const handleReactivate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!selectedVehicleId) {
            setError("Please select a vehicle to assign.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`/api/drivers/${driverId}/activate`, { // Call activate endpoint
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicle_id: selectedVehicleId }), // Send selected vehicle
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage(data.message || 'Driver reactivated successfully!');
                setSelectedVehicleId(''); // Clear selection
                if (onDriverReactivated) {
                    onDriverReactivated(); // Notify parent page
                }
                setTimeout(onClose, 1500); // Close modal after delay
            } else {
                setError(data.message || `Failed to reactivate driver (Status: ${response.status})`);
            }
        } catch (err) {
            console.error("Error reactivating driver:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

     const handleClose = () => {
        setSelectedVehicleId(''); setError(''); setSuccessMessage('');
        onClose();
    }


    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={handleClose}>×</button>
                <h2>Reactivate Driver: {driverName || `ID: ${driverId.toString().padStart(5,'0')}`}</h2>
                <form onSubmit={handleReactivate}>
                     <div className="modal-form-group">
                        <label htmlFor="reactivateVehicle">Assign Vehicle:</label>
                        <select
                            id="reactivateVehicle"
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                            required
                            disabled={isSaving || isLoadingVehicles}
                        >
                            <option value="" disabled>
                                {isLoadingVehicles ? "Loading vehicles..." : "-- Select Vehicle --"}
                            </option>
                            {unassignedVehicles.map(v => (
                                <option key={v.vehicle_id} value={v.vehicle_id}>
                                    {v.name} ({v.type}) - ID: {v.vehicle_id.toString().padStart(5,'0')}
                                </option>
                            ))}
                            {unassignedVehicles.length === 0 && !isLoadingVehicles && (
                                 <option value="" disabled>No unassigned vehicles available</option>
                            )}
                        </select>
                    </div>

                    {error && <p className="modal-error-message">{error}</p>}
                    {successMessage && <p className="modal-success-message">{successMessage}</p>}

                    <div className="modal-actions">
                        <button
                            type="submit"
                            className="modal-submit-btn reactivate-btn" // Add specific class maybe
                            disabled={isSaving || !selectedVehicleId || isLoadingVehicles}
                         >
                            {isSaving ? 'Reactivating...' : 'Reactivate Driver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ReactivateDriverModal;