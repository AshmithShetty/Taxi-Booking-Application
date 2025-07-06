// frontend/src/components/EditDriverModal.jsx
import React, { useState, useEffect } from 'react';
import './Modal.css'; // Reusing generic Modal CSS

function EditDriverModal({ isOpen, onClose, onDriverUpdated, driverData, adminId }) {
    // Form State - Initialize from props when modal opens
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', vehicle_id: '' });

    // Vehicle Options State
    const [vehicleOptions, setVehicleOptions] = useState([]);
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Effect to populate form when driverData prop changes (modal opens)
    useEffect(() => {
        if (driverData && isOpen) {
            setFormData({
                name: driverData.name || '',
                phone: driverData.phone_number || '', // Match DB column name
                email: driverData.email || '',
                vehicle_id: driverData.vehicle_id || '' // Match DB column name
            });
            setError(''); // Clear errors on open
            setSuccessMessage(''); // Clear success message on open

            // Fetch vehicle options specific to this driver
            setIsLoadingVehicles(true);
            const fetchOptions = async () => {
                 try {
                     const response = await fetch(`/api/vehicles/options-for-driver/${driverData.driver_id}`);
                     if (!response.ok) throw new Error('Failed to fetch vehicle options');
                     const data = await response.json();
                     setVehicleOptions(data);
                 } catch (err) {
                     console.error("Error fetching vehicle options:", err);
                     setError("Could not load vehicle options.");
                     setVehicleOptions([]);
                 } finally {
                      setIsLoadingVehicles(false);
                 }
            };
            fetchOptions();

        } else if (!isOpen) {
             // Optional: Clear form when modal is closed externally
             setFormData({ name: '', phone: '', email: '', vehicle_id: '' });
             setErrors(''); setSuccessMessage('');
        }
    }, [driverData, isOpen]); // Depend on driverData and isOpen

    if (!isOpen || !driverData) return null; // Don't render if no data or not open

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
         setError(''); // Clear errors on change
         setSuccessMessage('');
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Frontend Validation
        if (!formData.name.trim()) return setError("Driver name is required.");
        if (!/^[0-9]{10}$/.test(formData.phone)) return setError("Phone must be 10 digits.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setError("Invalid email format.");
        if (!formData.vehicle_id) return setError("Please assign a vehicle.");

        setIsSaving(true);
        try {
            // API call to update the specific driver
            const response = await fetch(`/api/drivers/${driverData.driver_id}`, { // Use driver route for update
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    vehicle_id: formData.vehicle_id
                    // Password is not updated here
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage(data.message || 'Driver updated successfully!');
                if (onDriverUpdated) {
                    onDriverUpdated(); // Notify parent to refresh
                }
                 setTimeout(onClose, 1500); // Close modal after delay
            } else {
                setError(data.message || `Failed to update driver (Status: ${response.status})`);
            }
        } catch (err) {
            console.error("Error updating driver:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>×</button>
                <h2>Edit Driver (ID: {driverData.driver_id.toString().padStart(5, '0')})</h2>
                <form onSubmit={handleSaveChanges}>
                    {/* Name */}
                    <div className="modal-form-group">
                        <label htmlFor="editDriverName">Driver Name:</label>
                        <input type="text" id="editDriverName" name="name" value={formData.name} onChange={handleChange} required disabled={isSaving} />
                    </div>
                    {/* Phone */}
                    <div className="modal-form-group">
                        <label htmlFor="editDriverPhone">Phone:</label>
                        <input type="tel" id="editDriverPhone" name="phone" value={formData.phone} onChange={handleChange} pattern="[0-9]{10}" maxLength="10" required disabled={isSaving} />
                    </div>
                    {/* Email */}
                     <div className="modal-form-group">
                        <label htmlFor="editDriverEmail">Email:</label>
                        <input type="email" id="editDriverEmail" name="email" value={formData.email} onChange={handleChange} required disabled={isSaving} />
                    </div>
                    {/* Assign Vehicle */}
                     <div className="modal-form-group">
                        <label htmlFor="editAssignVehicle">Assign Vehicle:</label>
                        <select
                            id="editAssignVehicle"
                            name="vehicle_id" // Name matches state key
                            value={formData.vehicle_id}
                            onChange={handleChange}
                            required
                            disabled={isSaving || isLoadingVehicles}
                        >
                            <option value="" disabled>
                                 {isLoadingVehicles ? "Loading options..." : "-- Select Vehicle --"}
                            </option>
                            {/* Options include unassigned AND the driver's current vehicle */}
                            {vehicleOptions.map(v => (
                                <option key={v.vehicle_id} value={v.vehicle_id}>
                                     {v.name} ({v.type}) - ID: {v.vehicle_id.toString().padStart(5,'0')}
                                     {v.vehicle_id === driverData.vehicle_id ? ' (Current)' : ''}
                                </option>
                            ))}
                            {vehicleOptions.length === 0 && !isLoadingVehicles && (
                                  <option value="" disabled>No vehicles available</option>
                             )}
                        </select>
                    </div>

                    {error && <p className="modal-error-message">{error}</p>}
                    {successMessage && <p className="modal-success-message">{successMessage}</p>}

                    <div className="modal-actions">
                        <button
                            type="submit"
                            className="modal-submit-btn"
                            disabled={isSaving || !formData.name || !formData.phone || !formData.email || !formData.vehicle_id}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditDriverModal;