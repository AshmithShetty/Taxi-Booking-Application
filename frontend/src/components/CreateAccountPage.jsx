// frontend/src/components/CreateAccountPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// --- Import Icons ---
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FaSave } from "react-icons/fa";
// --- End Import ---
import './CreateAccountPage.css'; // Ensure CSS exists and includes password wrapper/button styles

function CreateAccountPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // --- State for visibility ---
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    // --- End State ---

    // --- Toggle Handlers ---
    const togglePasswordVisibility = () => setIsPasswordVisible(prev => !prev);
    const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(prev => !prev);
    // --- End Handlers ---


    const handleBack = () => {
        navigate('/login');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        // Frontend Validation
        if (!name || !email || !phone || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) { setError('Phone number must be exactly 10 digits.'); return; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         if (!emailRegex.test(email)) { setError('Please enter a valid email address.'); return; }

        // API Call Logic (remains the same)
        try {
            const response = await fetch('/api/auth/register/customer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ name, email, phone, password }), // Sending plain password
            });
            const data = await response.json();
            if (response.ok || response.status === 201) {
                console.log('Account creation successful:', data);
                alert('Account created successfully! Please log in.');
                navigate('/login');
            } else {
                setError(data.message || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error('Registration API call failed:', err);
            setError('An error occurred during registration. Please try again later.');
        }
    };

    return (
        <div className="create-account-page">
            <div className="create-account-container">
                {/* Use a specific class if different styling needed from login logo */}
                <img src="/BTC.png" alt="BTC Logo" className="logo" />

                <form onSubmit={handleSubmit}>
                    {/* Name */}
                    <div className="form-group">
                        <label htmlFor="name">Name:</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    {/* Email */}
                     <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    {/* Phone */}
                     <div className="form-group">
                        <label htmlFor="phone">Phone:</label>
                        <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} pattern="[0-9]{10}" title="Phone number must be 10 digits" maxLength="10" required />
                    </div>

                    {/* --- Password Field with Toggle --- */}
                    <div className="form-group">
                        <label htmlFor="password">Password:</label>
                         {/* Wrapper for input + button */}
                        <div className="password-input-wrapper">
                            <input
                                type={isPasswordVisible ? "text" : "password"}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="button" className="password-toggle-btn" onClick={togglePasswordVisibility} aria-label={isPasswordVisible ? "Hide password" : "Show password"}>
                                {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                            </button>
                         </div>
                    </div>
                    {/* --- End Password Field --- */}


                    {/* --- Confirm Password Field with Toggle --- */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password:</label>
                        {/* Wrapper for input + button */}
                         <div className="password-input-wrapper">
                            <input
                                type={isConfirmPasswordVisible ? "text" : "password"}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                             />
                             <button type="button" className="password-toggle-btn" onClick={toggleConfirmPasswordVisibility} aria-label={isConfirmPasswordVisible ? "Hide password" : "Show password"}>
                                {isConfirmPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                     {/* --- End Confirm Password Field --- */}


                    {error && <p className="error-message">{error}</p>}

                    <div className="button-group">
                         <button type="button" onClick={handleBack} className="back-button">Back</button>
                         <button type="submit" className="save-button">Save Account  <FaSave /></button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateAccountPage;