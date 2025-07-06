// frontend/src/components/FilterModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './FilterModal.css';

// Helper to initialize state
const getInitialFilterState = (initialFilters) => ({
    pickup: initialFilters?.pickup || '',
    dropoff: initialFilters?.dropoff || '',
    taxiType: initialFilters?.taxiType || '',
    minDistance: initialFilters?.minDistance || '',
    maxDistance: initialFilters?.maxDistance || '',
    // Use consistent internal keys, rely on labels prop for display text
    minFare: initialFilters?.minFare ?? initialFilters?.minCommission ?? '',
    maxFare: initialFilters?.maxFare ?? initialFilters?.maxCommission ?? '',
    minRating: initialFilters?.minRating || '',
    maxRating: initialFilters?.maxRating || '',
    startDate: initialFilters?.startDate || '',
    endDate: initialFilters?.endDate || '',
});

// Validation Messages
const VALIDATION_MESSAGES = {
    MIN_GREATER_THAN_MAX: 'Min cannot be greater than Max.',
    START_DATE_AFTER_END: 'Start date cannot be after end date.',
};

// Default labels defined *outside* the component
const defaultLabels = {
    distance: 'Distance (km):',
    fare: 'Amount (₹):', // Default label for the amount range
    rating: 'Rating:',
    bookingDate: 'Booking Date:',
};

function FilterModal({
    isOpen, onClose, onApply, onRemove, initialFilters = {},
    labels = defaultLabels // Use provided labels or default
}) {
    const [currentFilters, setCurrentFilters] = useState(getInitialFilterState(initialFilters));
    const [errors, setErrors] = useState({});

    // Validation Function (no changes needed)
    const validateFilters = useCallback((filters) => {
        const newErrors = {};
        const parseNum = (val) => (val === '' || val === null || val === undefined) ? NaN : parseFloat(val);
        const minDistance = parseNum(filters.minDistance);
        const maxDistance = parseNum(filters.maxDistance);
        const minAmount = parseNum(filters.minFare); // Use minFare/maxFare from state for validation
        const maxAmount = parseNum(filters.maxFare);
        const minRating = parseNum(filters.minRating);
        const maxRating = parseNum(filters.maxRating);
        const startDate = filters.startDate ? new Date(filters.startDate) : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;

        if (!isNaN(minDistance) && !isNaN(maxDistance) && minDistance > maxDistance) newErrors.distance = VALIDATION_MESSAGES.MIN_GREATER_THAN_MAX;
        if (!isNaN(minAmount) && !isNaN(maxAmount) && minAmount > maxAmount) newErrors.fare = VALIDATION_MESSAGES.MIN_GREATER_THAN_MAX; // Keep 'fare' key for error state
        if (!isNaN(minRating) && !isNaN(maxRating) && minRating > maxRating) newErrors.rating = VALIDATION_MESSAGES.MIN_GREATER_THAN_MAX;
        if (!isNaN(minRating) && (minRating < 1 || minRating > 5)) newErrors.rating = 'Rating must be between 1 and 5.';
        if (!isNaN(maxRating) && (maxRating < 1 || maxRating > 5)) newErrors.rating = 'Rating must be between 1 and 5.';
        if (startDate && endDate && startDate > endDate) newErrors.date = VALIDATION_MESSAGES.START_DATE_AFTER_END;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, []);

    // Reset local state and errors (no changes needed)
    useEffect(() => {
        if (isOpen) {
            const initialState = getInitialFilterState(initialFilters);
            setCurrentFilters(initialState);
            validateFilters(initialState);
        } else {
            setErrors({});
        }
    }, [initialFilters, isOpen, validateFilters]);

    if (!isOpen) return null;

    // Handlers (no changes needed)
    const handleChange = (e) => { /* ... */
        const { name, value, type } = e.target;
        const processedValue = (type === 'number' && value === '') ? '' : value;
        const updatedFilters = { ...currentFilters, [name]: processedValue };
        setCurrentFilters(updatedFilters);
        validateFilters(updatedFilters);
    };
    const handleApplyClick = () => { /* ... */
         if (validateFilters(currentFilters)) {
            const appliedFilters = {};
             // Decide which keys to send back (e.g., map minFare back to minCommission if needed)
            for (const key in currentFilters) {
                 let applyKey = key;
                 let applyValue = currentFilters[key];
                 // Example: if parent expects commission keys
                 // if(key === 'minFare' && labels.fare?.toLowerCase().includes('commission')) applyKey = 'minCommission';
                 // if(key === 'maxFare' && labels.fare?.toLowerCase().includes('commission')) applyKey = 'maxCommission';

                if (applyValue !== '' && applyValue !== null && applyValue !== undefined) {
                    appliedFilters[applyKey] = applyValue;
                }
            }
            onApply(appliedFilters);
        } else { console.log("Validation errors prevent applying filters:", errors); }
    };
    const handleRemoveClick = () => { /* ... */
        const clearedState = getInitialFilterState({});
        setCurrentFilters(clearedState);
        setErrors({});
        onRemove();
    };
    const handleContentClick = (e) => e.stopPropagation();

    const isApplyDisabled = Object.keys(errors).length > 0;

    // --- Render Logic ---
    // DEBUG: Log the labels object received as prop
    // console.log("FilterModal received labels:", labels);

    return (
        <div className="filter-modal-overlay" onClick={onClose}>
            <div className="filter-modal-content" onClick={handleContentClick}>
                <h2>Filter Ride History</h2>
                <form className="filter-form" onSubmit={(e) => { e.preventDefault(); handleApplyClick(); }}>

                    {/* Row 1: Locations */}
                    <div className="filter-row">
                        <div className="filter-group">
                            <label htmlFor="pickup">Pickup Location:</label>
                            <input type="text" id="pickup" name="pickup" value={currentFilters.pickup} onChange={handleChange} placeholder="Any location"/>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="dropoff">Dropoff Location:</label>
                            <input type="text" id="dropoff" name="dropoff" value={currentFilters.dropoff} onChange={handleChange} placeholder="Any location"/>
                        </div>
                    </div>

                     {/* Row 2: Type & Distance */}
                     <div className="filter-row">
                        <div className="filter-group">
                             <label htmlFor="taxiType">Taxi Type:</label>
                            <select id="taxiType" name="taxiType" value={currentFilters.taxiType} onChange={handleChange}>
                                <option value="">Any</option>
                                <option value="sedan">Sedan</option>
                                <option value="hatchback">Hatchback</option>
                                <option value="suv">SUV</option>
                            </select>
                        </div>
                        <div className="filter-group range-group">
                             {/* --- Use labels prop with fallback --- */}
                             <label>{labels.distance || 'Distance (km):'}</label>
                             <div className="range-input-container">
                                 <input type="number" name="minDistance" value={currentFilters.minDistance} onChange={handleChange} placeholder="Min" min="0" step="0.1"/>
                                 <span>-</span>
                                 <input type="number" name="maxDistance" value={currentFilters.maxDistance} onChange={handleChange} placeholder="Max" min="0" step="0.1"/>
                             </div>
                             {errors.distance && <span className="error-message filter-error">{errors.distance}</span>}
                        </div>
                     </div>

                     {/* Row 3: Fare/Commission & Rating */}
                      <div className="filter-row">
                         <div className="filter-group range-group">
                              {/* --- Use labels prop with fallback --- */}
                              <label>{labels.fare || 'Amount (₹):'}</label>
                              <div className="range-input-container">
                                   {/* Use standard minFare/maxFare state keys */}
                                  <input type="number" name="minFare" value={currentFilters.minFare} onChange={handleChange} placeholder="Min" min="0" step="1"/>
                                  <span>-</span>
                                  <input type="number" name="maxFare" value={currentFilters.maxFare} onChange={handleChange} placeholder="Max" min="0" step="1"/>
                              </div>
                              {/* Use 'fare' error key consistently */}
                              {errors.fare && <span className="error-message filter-error">{errors.fare}</span>}
                         </div>
                         <div className="filter-group range-group">
                              {/* --- Use labels prop with fallback --- */}
                              <label>{labels.rating || 'Rating:'}</label>
                              <div className="range-input-container">
                                  <input type="number" name="minRating" value={currentFilters.minRating} onChange={handleChange} placeholder="Min" min="1" max="5" step="1"/>
                                  <span>-</span>
                                  <input type="number" name="maxRating" value={currentFilters.maxRating} onChange={handleChange} placeholder="Max" min="1" max="5" step="1"/>
                              </div>
                              {errors.rating && <span className="error-message filter-error">{errors.rating}</span>}
                         </div>
                      </div>

                      {/* Row 4: Date Range */}
                       <div className="filter-row">
                          <div className="filter-group range-group date-range-group">
                               {/* --- Use labels prop with fallback --- */}
                               <label>{labels.bookingDate || 'Booking Date:'}</label>
                               <div className="range-input-container">
                                   <input type="date" name="startDate" value={currentFilters.startDate} onChange={handleChange} />
                                   <span>-</span>
                                   <input type="date" name="endDate" value={currentFilters.endDate} onChange={handleChange} />
                               </div>
                               {errors.date && <span className="error-message filter-error">{errors.date}</span>}
                          </div>
                          {/* Add an empty div to balance flexbox if needed */}
                           <div className="filter-group" style={{ visibility: 'hidden' }}></div> {/* Empty group for alignment */}
                       </div>


                    {/* Buttons */}
                    <div className="filter-modal-buttons">
                        <button type="button" onClick={handleRemoveClick} className="filter-remove-btn">Remove Filters</button>
                        <button type="button" onClick={onClose} className="filter-cancel-btn">Cancel</button>
                        <button type="submit" className="filter-apply-btn" disabled={isApplyDisabled}>Apply Filters</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default FilterModal;