// frontend/src/App.jsx
import React from 'react'; // Remove useState, useEffect
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- Import Page/Component Routes ---
import LoginPage from './components/LoginPage';
// import IntroAnimation from './components/IntroAnimation'; // REMOVED Import
import CreateAccountPage from './components/CreateAccountPage';
// Customer
import CustomerDashboard from './components/CustomerDashboard';
import EditAccountPage from './components/EditAccountPage';
import RideHistoryPage from './components/RideHistoryPage';
import BookRidePage from './components/BookRidePage';
import MakePaymentPage from './components/MakePaymentPage';
// Driver
import DriverDashboard from './components/DriverDashboard';
import RidesCompletedPage from './components/RidesCompletedPage';
import PerformancePage from './components/PerformancePage';
// Admin
import AdminDashboard from './components/AdminDashboard';
import AnalysisPage from './components/AnalysisPage';
import DriverDataPage from './components/DriverDataPage';
import VehicleDataPage from './components/VehicleDataPage';

import './App.css'; // Keep global styles

// Remove animation duration constant
// const ANIMATION_DURATION_MS = 2500;

function App() {
  // --- REMOVED isAnimating state ---
  // const [isAnimating, setIsAnimating] = useState(true);

  // --- REMOVED useEffect for animation timer ---
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setIsAnimating(false);
  //   }, ANIMATION_DURATION_MS);
  //   return () => clearTimeout(timer);
  // }, []);

  return (
    <Router>
      <div className="App">
        {/* --- REMOVED Conditional rendering for IntroAnimation --- */}
        {/* {isAnimating && <IntroAnimation />} */}

        {/* Keep all your application routes */}
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />

          {/* Customer Routes */}
          <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          <Route path="/edit-account" element={<EditAccountPage />} />
          <Route path="/ride-history" element={<RideHistoryPage />} />
          <Route path="/book-ride" element={<BookRidePage />} />
          <Route path="/make-payment" element={<MakePaymentPage />} />

          {/* Driver Routes */}
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
          <Route path="/driver/rides-completed" element={<RidesCompletedPage />} />
          <Route path="/driver/performance" element={<PerformancePage />} />

          {/* Admin Routes */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin/analysis" element={<AnalysisPage />} />
          <Route path="/admin/driver-data" element={<DriverDataPage />} />
          <Route path="/admin/vehicle-data" element={<VehicleDataPage />} />


          {/* Default route - Redirects any other path to login */}
          {/* Restore original simple redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
          {/* REMOVED the duplicate route that depended on isAnimating */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;