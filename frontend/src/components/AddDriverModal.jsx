// frontend/src/components/AddDriverModal.jsx
import React, { useState, useEffect } from 'react';
// --- Import Icons ---
import { FaEye, FaEyeSlash } from 'react-icons/fa';
// --- End Import ---
import './Modal.css'; // Using a generic Modal CSS file

function AddDriverModal({ isOpen, onClose, onDriverAdded, adminId }) {
    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState('');

    // --- State for password visibility ---
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    // --- End State ---


    // Vehicle Options State
    const [unassignedVehicles, setUnassignedVehicles] = useState([]);
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // --- Toggle Handler ---
    const togglePasswordVisibility = () => setIsPasswordVisible(prev => !prev);
    // --- End Handler ---

    // Fetch unassigned vehicles when modal opens
    useEffect(() => {
        if (isOpen) {
            // Reset form and messages when opening
            setName(''); setPhone(''); setEmail(''); setPassword('');
            setSelectedVehicleId(''); setError(''); setSuccessMessage('');
            setIsPasswordVisible(false); // Ensure password starts hidden
            setIsLoadingVehicles(true);

            const fetchVehicles = async () => {
                try {
                    const response = await fetch('/api/vehicles/unassigned'); // Fetch unassigned
                    if (!response.ok) throw new Error('Failed to fetch vehicles');
                    const data = await response.json();
                    setUnassignedVehicles(data);
                } catch (err) {
                    console.error("Error fetching unassigned vehicles:", err);
                    setError("Could not load available vehicles.");
                    setUnassignedVehicles([]); // Ensure it's an array
                } finally {
                    setIsLoadingVehicles(false);
                }
            };
            fetchVehicles();
        }
    }, [isOpen]); // Rerun when modal opens

    if (!isOpen) return null;

    const handleAddDriver = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Frontend Validation (add more as needed)
        if (!name.trim()) return setError("Driver name is required.");
        if (!/^[0-9]{10}$/.test(phone)) return setError("Phone must be 10 digits.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Invalid email format.");
        if (!password) return setError("Password is required.");
        if (!selectedVehicleId) return setError("Please assign a vehicle.");

        setIsSaving(true);
        try {
            // API call to add driver under the specific admin
            const response = await fetch(`/api/admins/${adminId}/drivers`, { // Use nested route
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    phone: phone,
                    email: email,
                    password: password, // Sending plain text password
                    vehicle_id: selectedVehicleId
                }),
            });

            const data = await response.json();

            if (response.ok || response.status === 201) {
                setSuccessMessage(data.message || 'Driver added successfully!');
                setName(''); setPhone(''); setEmail(''); setPassword(''); setSelectedVehicleId(''); // Clear form
                setIsPasswordVisible(false); // Reset visibility state
                if (onDriverAdded) {
                    onDriverAdded(); // Notify parent page to refresh
                }
                setTimeout(handleClose, 1500); // Use handleClose to ensure all state resets
            } else {
                setError(data.message || `Failed to add driver (Status: ${response.status})`);
            }
        } catch (err) {
            console.error("Error adding driver:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Updated handleClose to reset visibility state as well
    const handleClose = () => {
         setName(''); setPhone(''); setEmail(''); setPassword('');
         setSelectedVehicleId(''); setError(''); setSuccessMessage('');
         setIsPasswordVisible(false); // Reset visibility on close
        onClose();
    }

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={handleClose}>×</button>
                <h2>Add New Driver</h2>
                <form onSubmit={handleAddDriver}>
                    {/* Name */}
                    <div className="modal-form-group">
                        <label htmlFor="driverName">Driver Name:</label>
                        <input type="text" id="driverName" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving} />
                    </div>
                    {/* Phone */}
                    <div className="modal-form-group">
                        <label htmlFor="driverPhone">Phone:</label>
                        <input type="tel" id="driverPhone" value={phone} onChange={(e) => setPhone(e.target.value)} pattern="[0-9]{10}" maxLength="10" required disabled={isSaving} />
                    </div>
                    {/* Email */}
                     <div className="modal-form-group">
                        <label htmlFor="driverEmail">Email:</label>
                        <input type="email" id="driverEmail" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSaving} />
                    </div>
                    {/* Password */}
                     {/* --- Password Field with Toggle --- */}
                     <div className="modal-form-group">
                        <label htmlFor="driverPassword">Password:</label>
                         {/* Wrapper class needed from CSS */}
                        <div className="password-input-wrapper">
                            <input
                                type={isPasswordVisible ? "text" : "password"} 
                                id="driverPassword"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isSaving}
                            />
                             {/* Button uses toggle function and state */}
                             <button type="button" className="password-toggle-btn" onClick={togglePasswordVisibility} aria-label={isPasswordVisible ? "Hide password" : "Show password"}>
                                {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    {/* --- End Password Field --- */}

                    {/* Assign Vehicle */}
                     <div className="modal-form-group">
                        <label htmlFor="assignVehicle">Assign Vehicle:</label>
                        <select
                            id="assignVehicle"
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
                            className="modal-submit-btn"
                            disabled={isSaving || !name || !phone || !email || !password || !selectedVehicleId}
                         >
                            {isSaving ? 'Adding...' : 'Add Driver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddDriverModal;