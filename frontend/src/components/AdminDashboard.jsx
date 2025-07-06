// frontend/src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartLine } from 'react-icons/fa';
import { PiSteeringWheelFill } from "react-icons/pi";  
import { FaCar } from "react-icons/fa";
import './AdminDashboard.css'; // Create this CSS file

function AdminDashboard() {
    const navigate = useNavigate();
    const adminId = sessionStorage.getItem('userId'); // Assuming admin ID stored as userId on login
    const adminName = sessionStorage.getItem('userName'); // Optional: use stored name initially

    const [adminData, setAdminData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch Admin Data
    useEffect(() => {
        if (!adminId) {
            setError('Admin ID not found. Please log in.');
            setIsLoading(false);
            navigate('/login');
            return;
        }
        // Clear previous error on re-fetch attempt
        setError('');
        setIsLoading(true);

        const fetchAdminData = async () => {
            try {
                const response = await fetch(`/api/admins/${adminId}`);
                if (!response.ok) {
                     let errorMsg = `HTTP error! Status: ${response.status}`;
                     try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e){}
                     throw new Error(errorMsg);
                }
                const data = await response.json();
                setAdminData(data);
            } catch (err) {
                console.error("Error fetching admin data:", err);
                setError(err.message || 'Failed to load admin information.');
                setAdminData(null); // Clear data on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchAdminData();
    }, [adminId, navigate]); // Re-run if adminId changes (unlikely but good practice)

    // --- Handlers ---
    const handleLogout = () => {
        sessionStorage.clear(); // Clear all stored info on logout
        navigate('/login');
    };

    const handleNavigate = (path) => {
        navigate(path);
    };

    // --- Render Logic ---
    return (
        <div className="admin-dashboard"> {/* Specific class */}
            {/* Header */}
            <header className="dashboard-header"> {/* Reusing styles */}
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={() => handleNavigate('/admin/analysis')}>Analysis <FaChartLine /></button>
                    <button onClick={handleLogout} className="logout-button">Log out</button>
                </nav>
            </header>

            {/* Body */}
            <main className="admin-dashboard-body"> {/* Specific class */}
                {/* Admin Info Section */}
                <section className="admin-info admin-section"> {/* Reusing/Adapting styles */}
                    <h3>Your Details</h3>
                    {isLoading ? (
                        <p className="loading">Loading details...</p>
                    ) : error && !adminData ? (
                         <p className="error-message">{error}</p>
                    ) : adminData ? (
                        <>
                            <p><strong>ID:</strong> {adminData.admin_id?.toString().padStart(5, '0')}</p>
                            <p><strong>Name:</strong> {adminData.name}</p>
                            <p><strong>Email:</strong> {adminData.email}</p>
                            <p><strong>Phone:</strong> {adminData.phone_number}</p>
                        </>
                     ) : (
                           <p className="empty-message">Admin details not found.</p> // Fallback
                     )}
                     {/* Display general error if details loaded but something else failed */}
                     {error && adminData && <p className="error-message inline-error">{error}</p>}
                </section>

                {/* Navigation Window Section */}
                <section className="admin-navigation-window admin-section">
                     <h3>Management Areas</h3>
                     <div className="admin-nav-buttons">
                        <button onClick={() => handleNavigate('/admin/driver-data')} title="Manage driver accounts and assignments">
                            Driver Data <PiSteeringWheelFill />
                        </button>
                        <button onClick={() => handleNavigate('/admin/vehicle-data')} title="Manage vehicle details and types">
                            Vehicle Data <FaCar />
                        </button>
                     </div>
                </section>

                 {/* Can add more sections later */}

            </main>
        </div>
    );
}

export default AdminDashboard;