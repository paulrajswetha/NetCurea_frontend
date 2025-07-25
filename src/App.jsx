import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import AppointmentConfirmation from './components/AppointmentConfirmation';
import HospitalDashboard from './components/HospitalDashboard';


// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    setRole(storedRole);
    setLoading(false);
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (!role || role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorDashboard username={localStorage.getItem('username')} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRole="patient">
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospital"
        element={
          <ProtectedRoute allowedRole="hospital">
            <HospitalDashboard/>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointment-confirmation"
        element={<AppointmentConfirmation />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}