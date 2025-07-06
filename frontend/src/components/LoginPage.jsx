// frontend/src/components/LoginPage.jsx
import React, { useState } from 'react'; // Ensure useState is imported
import { useNavigate } from 'react-router-dom';
// --- Import React Icons ---
import { FaEye, FaEyeSlash, FaUser } from 'react-icons/fa'; // Font Awesome icons
import { PiSteeringWheelFill } from "react-icons/pi";      // Phosphor Icons
import { MdAdminPanelSettings } from "react-icons/md";   // Material Design Icons
// --- End Import ---
import './LoginPage.css'; // Ensure CSS is linked

function LoginPage() {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Customer'); // Default Role
    const [error, setError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false); // State for password visibility
    const navigate = useNavigate();

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(prevState => !prevState);
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setError('');

        console.log('Attempting login with:', { name, password, role });

        if (!name || !password) {
            setError('Please enter both name and password.');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ name, password, role }),
            });

            console.log('API Response Status:', response.status, response.statusText);
            const contentType = response.headers.get("content-type");
            let data;

            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
                console.log('API Response Data:', data);
            } else {
                 // Handle non-JSON error responses more gracefully
                 const textData = await response.text();
                 console.error('Received non-JSON response:', textData);
                 // Try to show a generic error or potentially parse HTML for a message if applicable
                 setError(`Login failed. Server returned status: ${response.status}`);
                 return; // Stop execution
            }

            if (response.ok) {
                console.log('Login successful, response OK.');
                // Use sessionStorage as decided previously
                sessionStorage.setItem('userId', data.userId);
                sessionStorage.setItem('userName', data.name);
                sessionStorage.setItem('userRole', data.role);
                console.log('Stored user info (session):', { id: data.userId, role: data.role });
                console.log('Navigating based on role:', data.role);

                switch (data.role?.toLowerCase()) { // Optional chaining for safety
                    case 'customer': navigate('/customer-dashboard'); break;
                    case 'driver': navigate('/driver-dashboard'); break;
                    case 'admin': navigate('/admin-dashboard'); break;
                    default:
                        console.error('Login successful, but role unknown or missing in response:', data.role);
                        setError('Login successful, but couldn\'t determine user role.');
                }
            } else {
                // Handle specific error messages from backend
                console.log('Login failed, response NOT OK.');
                setError(data.message || `Login failed with status: ${response.status}. Please check credentials.`);
            }
        } catch (err) {
            // Handle network errors or JSON parsing errors
            console.error('Login API call failed:', err);
            setError(err.message || 'An error occurred during login. Check network connection.');
        }
    };

    const handleCreateAccount = () => {
        navigate('/create-account');
    };

    // Helper function to render the correct role icon
    const renderRoleIcon = () => {
        switch (role) { // Based on current state 'role'
            case 'Customer': return <FaUser />;
            case 'Driver': return <PiSteeringWheelFill />;
            case 'Admin': return <MdAdminPanelSettings />;
            default: return null;
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <img src="/BTC.png" alt="BTC Logo" className="login-logo" />

                <form onSubmit={handleLogin}>
                    {/* Name Input */}
                    <div className="form-group">
                        <label htmlFor="name">Name:</label>
                        <input type="text" id="name" value={name}
                            onChange={(e) => setName(e.target.value)} required />
                    </div>

                    {/* Password Input */}
                    <div className="form-group">
                        <label htmlFor="password">Password:</label>
                        <div className="password-input-wrapper">
                            <input
                                type={isPasswordVisible ? "text" : "password"}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button" // Prevent form submission
                                className="password-toggle-btn"
                                onClick={togglePasswordVisibility}
                                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            >
                                {/* Use React Icons Components */}
                                {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="form-group">
                        <label htmlFor="role">Role:</label>
                        <div className="role-select-wrapper">
                             <span className="role-icon-display" aria-hidden="true">
                                {/* Render icon based on current 'role' state */}
                                {renderRoleIcon()}
                             </span>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="role-select-element"
                            >
                                {/* Value should match the case used in the state/logic */}
                                <option value="Customer">Customer</option>
                                <option value="Driver">Driver</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {/* Display Error Messages */}
                    {error && <p className="error-message">{error}</p>}

                    {/* Buttons */}
                    <div className="button-group">
                         {/* Swapped button order based on image */}
                         <button type="button" onClick={handleCreateAccount} className="create-account-button">Create Account</button>
                         <button type="submit" className="login-button">Log In</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;