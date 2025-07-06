// frontend/src/components/EditAccountPage.jsx
import React, { useState, useEffect, useRef } from 'react'; // Removed useCallback as it wasn't used here
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './EditAccountPage.css';

function EditAccountPage() {
    const navigate = useNavigate();
    const customerId = sessionStorage.getItem('userId');

    // --- State ---
    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        password: '' // Holds the actual plain text password
    });
    const [isPasswordVisible, setIsPasswordVisible] = useState(false); // Controls input type

    const [initialData, setInitialData] = useState(null); // Store initial data for comparison
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [fetchError, setFetchError] = useState('');

    // Refs for potential focus management or other direct DOM interactions if needed
    const emailInputRef = useRef();
    const phoneInputRef = useRef();
    const passwordInputRef = useRef(); // Ref specifically for the password input


    // --- Fetch Initial Data ---
    useEffect(() => {
        if (!customerId) {
            navigate('/login'); // Redirect if no ID
            return;
        }

        const fetchCustomerData = async () => {
            setIsLoading(true);
            setFetchError('');
            try {
                // Fetching necessary data - backend sends plain password (as per prior request)
                const response = await fetch(`/api/customers/${customerId}`);
                if (!response.ok) {
                    const data = await response.json().catch(() => ({})); // Try to parse error
                    throw new Error(data.message || `HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                console.log("Fetched customer data:", data); // DEBUG: Verify password is in fetched data

                // Set state with fetched data, including the actual password
                setFormData({
                    email: data.email || '',
                    phone: data.phone_number || '',
                    // Store the actual password from the backend.
                    // The input field type="password" will handle displaying dots.
                    password: data.password || ''
                });
                 // Store initial data separately if needed for dirty checking (optional)
                 setInitialData({ email: data.email, phone: data.phone_number });

            } catch (err) {
                console.error("Error fetching customer data:", err);
                setFetchError(`Failed to load account details: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCustomerData();
    }, [customerId, navigate]); // Dependencies for fetching data

    // --- Input Validation ---
    const validateField = (name, value) => {
        let error = '';
        switch (name) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value) error = 'Email is required.';
                else if (!emailRegex.test(value)) error = 'Invalid email format.';
                break;
            case 'phone':
                const phoneRegex = /^[0-9]{10}$/;
                if (!value) error = 'Phone number is required.';
                else if (!phoneRegex.test(value)) error = 'Phone must be 10 digits.';
                break;
            case 'password':
                // Basic check - password will be sent/stored plain text
                if (!value) error = 'Password is required.';
                // No other specific validation here for plain text password, unless you add rules
                break;
            default:
                break;
        }
        return error;
    };

    // --- Handlers ---
    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Validate on change
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
        setSaveMessage(''); // Clear save message on edit
    };

    const handleBlur = (event) => {
        // Optional: Validate on blur as well
        const { name, value } = event.target;
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleBack = () => {
        navigate('/customer-dashboard');
    };

    // Handler to toggle password visibility state
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(prevState => !prevState);
    };


    // --- Handle Save ---
    const handleSave = async (event) => {
        event.preventDefault();
        setSaveMessage('');
        setFetchError(''); // Clear previous fetch errors

        // --- Final Validation before submit ---
        let formIsValid = true;
        const currentErrors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) {
                currentErrors[key] = error;
                formIsValid = false;
            }
        });
        setErrors(currentErrors);

        if (!formIsValid) {
            return; // Stop submission if validation fails
        }

        setIsSaving(true);
        try {
            const response = await fetch(`/api/customers/${customerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // Sending plain password - backend will store it as is
                body: JSON.stringify({
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password
                }),
            });

            const data = await response.json(); // Always try to parse response

            if (response.ok) {
                setSaveMessage('Changes Saved!');
                // Update initial data to reflect saved state if needed for comparison logic
                setInitialData({ email: formData.email, phone: formData.phone });
                // Keep password field filled after successful save, as requested implicitly by pre-fill
                // setFormData(prev => ({ ...prev, password: '' })); // Don't clear it

            } else {
                // Handle backend validation errors (e.g., 400, 409 Conflict)
                setErrors(prev => ({ ...prev, form: data.message || `Update failed (Status: ${response.status})` }));
            }
        } catch (err) {
            console.error('Error saving account details:', err);
            setErrors({ form: 'An error occurred while saving. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

     // Determine if save button should be enabled
     const isSaveDisabled = isSaving ||
                          !formData.email || !formData.phone || !formData.password || // All fields required
                          Object.values(errors).some(error => error !== '' && error !== undefined) || // Any validation error exists
                          isLoading; // Disable while loading initial data


    // --- Render Logic ---
    if (isLoading) {
        return <div className="loading">Loading Account Details...</div>;
    }

    if (fetchError) {
         return (
             <div className="page-error">
                <h2>Error Loading Data</h2>
                <p>{fetchError}</p>
                <button onClick={() => navigate('/customer-dashboard')}>Back to Dashboard</button>
            </div>
         );
    }

    return (
        <div className="edit-account-page">
            {/* Header */}
            <header className="dashboard-header">
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={handleBack}>Back to Dashboard</button>
                </nav>
            </header>

            {/* Body */}
            <main className="edit-account-body">
                <div className="edit-account-container">
                    <h3>Edit Account Details</h3>
                    <form onSubmit={handleSave}>
                        {/* Email */}
                        <div className="form-group-edit">
                            <label htmlFor="email">Email:</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? "email-error" : undefined}
                                ref={emailInputRef} // Attach ref if needed
                            />
                            {errors.email && <p id="email-error" className="error-message">{errors.email}</p>}
                        </div>

                        {/* Phone */}
                         <div className="form-group-edit">
                            <label htmlFor="phone">Phone:</label>
                            <input
                                type="tel" // Use 'tel' type
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                pattern="[0-9]{10}" // Basic pattern
                                maxLength="10"
                                aria-invalid={!!errors.phone}
                                aria-describedby={errors.phone ? "phone-error" : undefined}
                                ref={phoneInputRef} // Attach ref if needed
                            />
                             {errors.phone && <p id="phone-error" className="error-message">{errors.phone}</p>}
                        </div>

                        {/* Password Field */}
                         <div className="form-group-edit">
                            <label htmlFor="password">Password:</label>
                            <div className="password-input-wrapper">
                                <input
                                    // Type is controlled by isPasswordVisible state
                                    type={isPasswordVisible ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    // Value IS set to the actual password from state.
                                    // type="password" attribute automatically makes the browser show dots.
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    required
                                    placeholder="Enter password" // Only shows if value is empty
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? "password-error" : undefined}
                                    ref={passwordInputRef} // Attach ref if needed
                                />
                                <button
                                    type="button" // Prevent form submission
                                    className="password-toggle-btn"
                                    onClick={togglePasswordVisibility}
                                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                                >
                                    {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                             {errors.password && <p id="password-error" className="error-message">{errors.password}</p>}
                        </div>

                        {/* General Form Error */}
                        {errors.form && <p className="error-message form-error">{errors.form}</p>}

                        {/* Save Message */}
                         {saveMessage && <p className="save-message">{saveMessage}</p>}

                        {/* Save Button */}
                        <div className="save-button-container">
                             <button type="submit" className="save-button-edit" disabled={isSaveDisabled}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default EditAccountPage;