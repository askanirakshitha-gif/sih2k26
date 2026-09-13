import React, { useState } from 'react';
import KioskApp from './pages/KioskApp';
import DoctorDashboard from './pages/DoctorDashboard';
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState('kiosk'); // 'kiosk' | 'doctor'

  return (
    <div className="min-h-screen bg-slate-50">
      {currentView === 'kiosk' ? (
        <KioskApp onSwitchToDoctor={() => setCurrentView('doctor')} />
      ) : (
        <DoctorDashboard onSwitchToKiosk={() => setCurrentView('kiosk')} />
      )}
    </div>
  );
}
