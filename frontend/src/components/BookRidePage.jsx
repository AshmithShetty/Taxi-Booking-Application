// frontend/src/components/BookRidePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// Import useMapEvents for map interaction
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import RoutingMachine from './RoutingMachine'; // Import the routing component
import './BookRidePage.css'; // Ensure this CSS file exists and is correct

// --- Icon Fix (Standard Leaflet/React-Leaflet fix) ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// --- End Icon Fix ---

// --- Constants ---
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search?";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse?"; // For reverse geocoding
const DEBOUNCE_DELAY = 500; // milliseconds
const BENGALURU_VIEWBOX = '77.2,13.4,77.9,12.7'; // Bounding box
const taxiOptions = [ // Taxi type data
    { value: 'suv', label: 'SUV', icon: '/car-suv-svgrepo-com.svg' }, // Verify icon path in /public
    { value: 'sedan', label: 'Sedan', icon: '/sedan-car-model-svgrepo-com.svg' }, // Verify icon path
    { value: 'hatchback', label: 'Hatchback', icon: '/car-hatchback-svgrepo-com.svg' }, // Verify icon path
];
// --- End Constants ---


// --- Custom Debounce Hook ---
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}
// --- End Debounce Hook ---

// --- Component to handle Map Click Events ---
function MapClickHandler({ onMapClick, disabled }) {
  useMapEvents({
    click(e) {
        // Only call handler if map interaction is enabled
        if (!disabled) {
             onMapClick(e.latlng);
        }
    },
  });
  return null; // This component doesn't render anything itself
}
// --- End Map Click Handler Component ---


function BookRidePage() {
    const navigate = useNavigate();
    const customerId = sessionStorage.getItem('userId'); // Using Session Storage

    // --- State Declarations ---
    const [taxiType, setTaxiType] = useState('');
    const [pickupQuery, setPickupQuery] = useState('');
    const [dropoffQuery, setDropoffQuery] = useState('');
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
    const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
    const [isLoadingPickupSuggestions, setIsLoadingPickupSuggestions] = useState(false);
    const [isLoadingDropoffSuggestions, setIsLoadingDropoffSuggestions] = useState(false);
    const [pickupLocation, setPickupLocation] = useState(null); // { lat, lng, name }
    const [dropoffLocation, setDropoffLocation] = useState(null); // { lat, lng, name }
    const [distance, setDistance] = useState(null); // In kilometers
    const [fare, setFare] = useState(null);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false); // For route machine feedback (visual)
    const [isSubmitting, setIsSubmitting] = useState(false); // Separate state for payment button processing
    const [error, setError] = useState('');
    const [isPaymentEnabled, setIsPaymentEnabled] = useState(false);
    // Map Selection State
    const [selectingLocationType, setSelectingLocationType] = useState(null); // null | 'pickup' | 'dropoff'
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false); // Prevent multiple map clicks

    // --- Refs ---
    const mapRef = useRef();
    const pickupInputRef = useRef(); // Ref for pickup input container
    const dropoffInputRef = useRef(); // Ref for dropoff input container

    // --- Debounced Queries ---
    const debouncedPickupQuery = useDebounce(pickupQuery, DEBOUNCE_DELAY);
    const debouncedDropoffQuery = useDebounce(dropoffQuery, DEBOUNCE_DELAY);

    // --- Effects ---

    // Enable/Disable Payment Button Logic
    useEffect(() => {
        // Enable only if all required fields are selected/calculated and there are no errors
        if (customerId && taxiType && pickupLocation && dropoffLocation && distance !== null && distance >= 0 && !error) { // Allow 0 distance? Check logic
            setIsPaymentEnabled(true);
        } else {
            setIsPaymentEnabled(false);
        }
    }, [customerId, taxiType, pickupLocation, dropoffLocation, distance, error]); // Dependencies

    // Calculate Fare based on distance
    useEffect(() => {
        if (distance !== null && distance >= 0) { // Allow base fare for 0 distance
            const calculatedFare = 50 + (distance * 10);
            setFare(calculatedFare);
            // Clear route specific errors if distance recalculates successfully
            setError(prev => prev === 'Could not calculate route. Please check locations.' ? '' : prev);
        } else {
            setFare(null); // Reset fare if distance becomes invalid
        }
    }, [distance]);

    // Fetch Pickup Suggestions
    useEffect(() => {
        // Only fetch if query is long enough AND not currently selecting via map
        if (!pickupQuery || pickupQuery.length < 3 || selectingLocationType) {
            setPickupSuggestions([]); setShowPickupSuggestions(false); return;
        }
        const fetchSuggestions = async () => {
            setIsLoadingPickupSuggestions(true); setPickupSuggestions([]); setError('');
            const params = { q: debouncedPickupQuery, format: 'json', addressdetails: 1, limit: 5, viewbox: BENGALURU_VIEWBOX, bounded: 1 };
            const queryString = new URLSearchParams(params).toString();
            try {
                const response = await fetch(`${NOMINATIM_BASE_URL}${queryString}`);
                if (!response.ok) throw new Error(`Nominatim error: ${response.statusText}`);
                const data = await response.json();
                setPickupSuggestions(data || []);
            } catch (err) { console.error("Pickup suggestion fetch error:", err); setError("Failed to fetch pickup suggestions."); setPickupSuggestions([]); }
            finally {
                setIsLoadingPickupSuggestions(false);
                // Keep suggestions visible if input still focused after fetch
                if (pickupInputRef.current?.contains(document.activeElement)) { setShowPickupSuggestions(true); }
            }
        };
        fetchSuggestions();
    }, [debouncedPickupQuery, selectingLocationType]); // Re-run if mode changes

    // Fetch Dropoff Suggestions
     useEffect(() => {
         // Only fetch if query is long enough AND not currently selecting via map
        if (!dropoffQuery || dropoffQuery.length < 3 || selectingLocationType) {
            setDropoffSuggestions([]); setShowDropoffSuggestions(false); return;
        }
        const fetchSuggestions = async () => {
            setIsLoadingDropoffSuggestions(true); setDropoffSuggestions([]); setError('');
            const params = { q: debouncedDropoffQuery, format: 'json', addressdetails: 1, limit: 5, viewbox: BENGALURU_VIEWBOX, bounded: 1 };
            const queryString = new URLSearchParams(params).toString();
            try {
                const response = await fetch(`${NOMINATIM_BASE_URL}${queryString}`);
                if (!response.ok) throw new Error(`Nominatim error: ${response.statusText}`);
                const data = await response.json();
                setDropoffSuggestions(data || []);
            } catch (err) { console.error("Dropoff suggestion fetch error:", err); setError("Failed to fetch dropoff suggestions."); setDropoffSuggestions([]); }
            finally {
                setIsLoadingDropoffSuggestions(false);
                 if (dropoffInputRef.current?.contains(document.activeElement)) { setShowDropoffSuggestions(true); }
            }
        };
        fetchSuggestions();
    }, [debouncedDropoffQuery, selectingLocationType]); // Re-run if mode changes

    // Map Invalidation Effect
    useEffect(() => {
        const map = mapRef.current;
        if (map) {
            const timer = setTimeout(() => { try { map.invalidateSize(); } catch (e) { console.error("Error calling invalidateSize:", e); } }, 500);
            const handleResize = () => map.invalidateSize();
            window.addEventListener('resize', handleResize);
            return () => { clearTimeout(timer); window.removeEventListener('resize', handleResize); };
        }
    }, []); // Run only once

    // Handle Clicks Outside Suggestion Lists
    useEffect(() => {
       const handleClickOutside = (event) => {
            // Check if click is outside pickup input AND its suggestions list
            if (pickupInputRef.current && !pickupInputRef.current.contains(event.target)) {
                 // Find suggestions list element if needed, basic check for now
                setShowPickupSuggestions(false);
            }
             // Check if click is outside dropoff input AND its suggestions list
            if (dropoffInputRef.current && !dropoffInputRef.current.contains(event.target)) {
                setShowDropoffSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => { document.removeEventListener('mousedown', handleClickOutside); };
    }, []); // Run only once


    // --- Handlers ---
    const handleBack = () => navigate('/customer-dashboard');

    // Handle Selecting a Suggestion from the List
    const handleSuggestionSelect = (suggestion, type) => {
        const { lat, lon, display_name } = suggestion;
        const locationData = { lat: parseFloat(lat), lng: parseFloat(lon), name: display_name };
        const otherLocation = type === 'pickup' ? dropoffLocation : pickupLocation;

        // Check if same as other location
        if (otherLocation && locationData.lat === otherLocation.lat && locationData.lng === otherLocation.lng) {
            setError('Pickup and Dropoff locations cannot be the same.');
            setDistance(null); setFare(null);
            if (type === 'pickup') setShowPickupSuggestions(false); else setShowDropoffSuggestions(false);
            return;
        }
        // Update state based on type
        if (type === 'pickup') {
            setPickupLocation(locationData);
            setPickupQuery(display_name); // Update input text
            setShowPickupSuggestions(false); // Hide list
        } else {
            setDropoffLocation(locationData);
            setDropoffQuery(display_name); // Update input text
            setShowDropoffSuggestions(false); // Hide list
        }
        setError(''); // Clear any errors like "outside bounds"
        mapRef.current?.flyTo([locationData.lat, locationData.lng], 14); // Pan map
    };

    // Callback for RoutingMachine (when route is calculated)
    const handleRouteFound = useCallback((route, distanceMeters) => {
        setIsCalculatingRoute(false); // Mark route calculation attempt as finished
        if (route && distanceMeters >= 0) { // Allow 0 distance route
            const distanceKm = distanceMeters / 1000;
            setDistance(distanceKm);
            setError(prev => prev === 'Could not calculate route. Please check locations.' ? '' : prev); // Clear route error
            if (mapRef.current && route.coordinates) {
                const bounds = L.latLngBounds(route.coordinates.map(coord => [coord.lat, coord.lng]));
                 mapRef.current.flyToBounds(bounds, { padding: [50, 50] });
            }
        } else {
             // Only set error if both points are validly set but routing failed
             if (pickupLocation && dropoffLocation && !(pickupLocation.lat === dropoffLocation.lat && pickupLocation.lng === dropoffLocation.lng)) {
                  setError('Could not calculate route. Please check locations.');
             }
             // If points were the same, error is already set
             setDistance(null); // Clear distance/fare if no valid route
        }
    }, [pickupLocation, dropoffLocation]); // Dependencies

    // --- Handlers for Map Selection ---
    const startMapSelection = (type) => {
        setSelectingLocationType(type);
        setError('');
        mapRef.current?.getContainer().classList.add('crosshair-cursor');
        setShowPickupSuggestions(false); setShowDropoffSuggestions(false);
    };
    const cancelMapSelection = () => {
        setSelectingLocationType(null);
        mapRef.current?.getContainer().classList.remove('crosshair-cursor');
    };
    const handleMapClick = useCallback(async (latlng) => {
        if (!selectingLocationType || isReverseGeocoding) return;

        setError(''); // Clear previous errors

        // --- Boundary Check ---
        const bounds = BENGALURU_VIEWBOX.split(',').map(Number); // [W, N, E, S]
        const [west, north, east, south] = bounds;
        if (latlng.lat > north || latlng.lat < south || latlng.lng < west || latlng.lng > east) {
            setError("Selected location is outside the serviceable area (Bengaluru). Please click within the bounds.");
            cancelMapSelection();
            return; // Stop processing
        }
        // --- End Boundary Check ---

        setIsReverseGeocoding(true); // Start loading indicator
        const params = { lat: latlng.lat, lon: latlng.lng, format: 'json', addressdetails: 1 };
        const queryString = new URLSearchParams(params).toString();

        try {
            const response = await fetch(`${NOMINATIM_REVERSE_URL}${queryString}`);
            if (!response.ok) throw new Error(`Reverse geocoding failed: ${response.statusText}`);
            const data = await response.json();

            if (data?.display_name) {
                const locationData = { lat: latlng.lat, lng: latlng.lng, name: data.display_name };
                const otherLocation = selectingLocationType === 'pickup' ? dropoffLocation : pickupLocation;

                // Check if same as the other point
                if (otherLocation && locationData.lat === otherLocation.lat && locationData.lng === otherLocation.lng) {
                     setError('Pickup and Dropoff locations cannot be the same.');
                     setDistance(null); setFare(null);
                } else {
                    // Update the correct location state and clear the corresponding text query
                    if (selectingLocationType === 'pickup') { setPickupLocation(locationData); setPickupQuery(''); }
                    else { setDropoffLocation(locationData); setDropoffQuery(''); }
                     setError(''); // Clear any previous errors
                }
            } else {
                 setError("Could not determine address for the selected point.");
            }
        } catch (err) {
            console.error("Reverse geocoding error:", err);
            setError("Failed to get address for the selected point.");
        } finally {
            setIsReverseGeocoding(false); // Finish loading
            cancelMapSelection(); // Always exit selection mode automatically after click
        }
    }, [selectingLocationType, isReverseGeocoding, pickupLocation, dropoffLocation]); // Dependencies


    // Handle "Make Payment" Button Click
    const handleMakePayment = async () => {
        if (!isPaymentEnabled) return;
        setError(''); setIsSubmitting(true); // Use separate state for button submit action
        try {
            // Final validation before submitting to backend
            if (!pickupLocation || !dropoffLocation || distance === null || distance < 0 || !taxiType || !customerId) {
                 setError("Please ensure all fields are selected correctly and route is calculated.");
                 setIsSubmitting(false); return;
            }
            const response = await fetch('/api/rides/book', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: parseInt(customerId, 10), pickupLocation: pickupLocation.name,
                    dropoffLocation: dropoffLocation.name, distance: distance, taxiType: taxiType,
                }),
            });
            const data = await response.json();

            if (response.ok || response.status === 201) {
                console.log('Ride drafted successfully:', data);
                // Navigate on success
                navigate('/make-payment', {
                    state: { rideId: data.rideId, fare: data.fare, pickup: pickupLocation.name,
                             dropoff: dropoffLocation.name, distance: distance, taxiType: taxiType }
                });
            } else {
                 setError(data.message || `Failed to create ride draft (Status: ${response.status})`);
                 setIsSubmitting(false); // Reset button state on failure
            }
        } catch (err) {
            setIsSubmitting(false); // Reset button state on error
            console.error('Error calling /api/rides/book:', err);
            setError('An error occurred while preparing your ride. Please try again.');
        }
    };

     // Handler for Taxi Type Selection Button Clicks
     const handleTaxiTypeSelect = (typeValue) => { setTaxiType(typeValue); };

    // Default map center
    const defaultCenter = [12.9716, 77.5946];

    // --- JSX Structure ---
    return (
        <div className="book-ride-page">
            {/* Header */}
             <header className="dashboard-header">
                <img src="/BTC.png" alt="BTC Logo" className="header-logo" />
                <nav className="header-nav">
                    <button onClick={handleBack}>Back to Dashboard</button>
                    <button
                        onClick={handleMakePayment}
                        className="make-payment-button"
                        disabled={!isPaymentEnabled || isSubmitting} // Use isSubmitting here
                    >
                        {isSubmitting ? 'Processing...' : 'Make Payment'}
                    </button>
                </nav>
            </header>

            {/* Body */}
            <main className="book-ride-body">
                <div className="booking-form-container">
                    <h3>Plan Your Ride</h3>

                    {/* Taxi Type Selection */}
                    <div className="form-group-br taxi-type-group">
                        <label>Taxi Type:</label>
                        <div className="taxi-type-options">
                            {taxiOptions.map((option) => (
                                <button type="button" key={option.value}
                                    className={`taxi-type-option ${taxiType === option.value ? 'selected' : ''}`}
                                    onClick={() => handleTaxiTypeSelect(option.value)} >
                                    <img src={option.icon} alt={`${option.label} icon`} className="taxi-type-icon" />
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pickup Point Input & Suggestions & Map Button */}
                    <div className="form-group-br search-group" ref={pickupInputRef}>
                        <label htmlFor="pickup">Pickup Point:</label>
                        <input type="text" id="pickup" value={pickupQuery}
                            onChange={(e) => setPickupQuery(e.target.value)}
                            onFocus={() => setShowPickupSuggestions(true)}
                            placeholder="Search or click map button ->"
                            disabled={selectingLocationType !== null}
                            autoComplete="off" />
                         <button type="button"
                             className={`map-select-btn ${selectingLocationType === 'pickup' ? 'active' : ''}`}
                             onClick={() => startMapSelection('pickup')}
                             title="Select Pickup on Map"
                             disabled={selectingLocationType !== null && selectingLocationType !== 'pickup'} >
                            📍 Map
                         </button>
                        {/* Loading indicator for text search */}
                        {isLoadingPickupSuggestions && !selectingLocationType && <span className="loading-indicator"> L</span>}
                        {/* Suggestions list - only shown if not selecting on map */}
                        {showPickupSuggestions && !selectingLocationType && (
                            <ul className="suggestions-list">
                                {pickupSuggestions.length > 0 ? ( pickupSuggestions.map((item) => (
                                    <li key={item.place_id} className="suggestion-item" onClick={() => handleSuggestionSelect(item, 'pickup')}>{item.display_name}</li>
                                ))) : !isLoadingPickupSuggestions && debouncedPickupQuery.length >= 3 ? (
                                    <li className="suggestion-item no-results">No suggestions found.</li>
                                ) : null }
                            </ul> )}
                    </div>
                    {pickupLocation && <p className="location-display">📍 {pickupLocation.name}</p>}

                    {/* Dropoff Point Input & Suggestions & Map Button */}
                    <div className="form-group-br search-group" ref={dropoffInputRef}>
                         <label htmlFor="dropoff">Dropoff Point:</label>
                        <input type="text" id="dropoff" value={dropoffQuery}
                            onChange={(e) => setDropoffQuery(e.target.value)}
                            onFocus={() => setShowDropoffSuggestions(true)}
                            placeholder="Search or click map button ->"
                            disabled={selectingLocationType !== null}
                            autoComplete="off" />
                          <button type="button"
                             className={`map-select-btn ${selectingLocationType === 'dropoff' ? 'active' : ''}`}
                             onClick={() => startMapSelection('dropoff')}
                             title="Select Dropoff on Map"
                             disabled={selectingLocationType !== null && selectingLocationType !== 'dropoff'} >
                            🏁 Map
                         </button>
                         {isLoadingDropoffSuggestions && !selectingLocationType && <span className="loading-indicator"> L</span>}
                         {showDropoffSuggestions && !selectingLocationType && (
                            <ul className="suggestions-list">
                                 {dropoffSuggestions.length > 0 ? ( dropoffSuggestions.map((item) => (
                                     <li key={item.place_id} className="suggestion-item" onClick={() => handleSuggestionSelect(item, 'dropoff')}>{item.display_name}</li>
                                 ))) : !isLoadingDropoffSuggestions && debouncedDropoffQuery.length >= 3 ? (
                                      <li className="suggestion-item no-results">No suggestions found.</li>
                                 ) : null}
                            </ul> )}
                    </div>
                     {dropoffLocation && <p className="location-display">🏁 {dropoffLocation.name}</p>}

                    {/* Indicate map selection mode */}
                    {selectingLocationType && (
                         <p className="map-select-indicator">
                            Click on the map to set the {selectingLocationType} location.
                            <button onClick={cancelMapSelection} className="cancel-map-select-btn">Cancel</button>
                         </p>
                    )}
                     {isReverseGeocoding && <p className="loading">Getting address...</p>}

                    {/* Distance & Fare */}
                    <div className="ride-details">
                         {distance !== null && distance >= 0 && (<p><strong>Distance:</strong> {distance.toFixed(2)} km</p>)}
                         {fare !== null && fare >= 0 && (<p><strong>Estimated Fare:</strong> ₹ {fare.toFixed(2)}</p>)}
                         {isCalculatingRoute && <p className="calculating">Calculating route...</p>}
                    </div>

                    {/* Error Display */}
                     {error && <p className="error-message br-error">{error}</p>}
                </div>

                {/* Map Container */}
                <div className="map-container-br">
                     <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}
                        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }} ref={mapRef} >
                         <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                             attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                         {/* Add Map Click Handler - disable when not selecting or reverse geocoding */}
                         <MapClickHandler
                             onMapClick={handleMapClick}
                             disabled={!selectingLocationType || isReverseGeocoding}
                          />
                        {/* Markers */}
                        {pickupLocation && (<Marker position={[pickupLocation.lat, pickupLocation.lng]}><Popup>Pickup: {pickupLocation.name}</Popup></Marker>)}
                        {dropoffLocation && (<Marker position={[dropoffLocation.lat, dropoffLocation.lng]}><Popup>Dropoff: {dropoffLocation.name}</Popup></Marker>)}
                        {/* Routing Machine - Rerender if locations change */}
                        {pickupLocation && dropoffLocation && (
                             <RoutingMachine key={`${pickupLocation.lat}-${pickupLocation.lng}-${dropoffLocation.lat}-${dropoffLocation.lng}`}
                                start={pickupLocation} end={dropoffLocation} onRouteFound={handleRouteFound} /> )}
                    </MapContainer>
                </div>
            </main>
        </div>
    );
}

export default BookRidePage;