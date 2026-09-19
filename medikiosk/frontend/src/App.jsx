import React, { useState } from 'react';
import KioskApp from './pages/KioskApp';
import DoctorDashboard from './pages/DoctorDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState('kiosk'); // 'kiosk' | 'doctor' | 'hospital'

  return (
    <div className="min-h-screen bg-slate-50">
      {currentView === 'kiosk' && (
        <KioskApp
          onSwitchToDoctor={() => setCurrentView('doctor')}
          onSwitchToHospital={() => setCurrentView('hospital')}
        />
      )}
      {currentView === 'doctor' && (
        <DoctorDashboard
          onSwitchToKiosk={() => setCurrentView('kiosk')}
          onSwitchToHospital={() => setCurrentView('hospital')}
        />
      )}
      {currentView === 'hospital' && (
        <HospitalDashboard
          onSwitchToKiosk={() => setCurrentView('kiosk')}
          onSwitchToDoctor={() => setCurrentView('doctor')}
        />
      )}
    </div>
  );
}
