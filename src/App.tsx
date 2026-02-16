
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import CustomerConsultation from './pages/CustomerConsultation';
import VerifyEmail from './pages/VerifyEmail';
import IntegrationManual from './pages/IntegrationManual';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { PWAProvider } from './contexts/PWAContext';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import SupportHub from './components/SupportHub';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PWAProvider>
        <PWAInstallPrompt />
        <SupportHub />
        <BrowserRouter>

          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customer" element={<CustomerConsultation />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/manual" element={<IntegrationManual />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </PWAProvider>
    </AuthProvider>
  );
};

export default App;
