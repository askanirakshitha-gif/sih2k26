import React, { useState } from 'react';
import KioskApp from './pages/KioskApp';
import DoctorDashboard from './pages/DoctorDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import './App.css';

export default function App() {
  const getInitialView = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam && ['kiosk', 'doctor', 'hospital'].includes(viewParam.toLowerCase())) {
        return viewParam.toLowerCase();
      }
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash && ['kiosk', 'doctor', 'hospital'].includes(hash)) {
        return hash;
      }
    } catch {
      // ignore
    }
    return 'kiosk';
  };

  const [currentView, setCurrentView] = useState(getInitialView); // 'kiosk' | 'doctor' | 'hospital'

  const handleSwitchView = (view) => {
    setCurrentView(view);
    try {
      window.history.replaceState(null, '', `?view=${view}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {currentView === 'kiosk' && (
        <KioskApp
          onSwitchToDoctor={() => handleSwitchView('doctor')}
          onSwitchToHospital={() => handleSwitchView('hospital')}
        />
      )}
      {currentView === 'doctor' && (
        <DoctorDashboard
          onSwitchToKiosk={() => handleSwitchView('kiosk')}
          onSwitchToHospital={() => handleSwitchView('hospital')}
        />
      )}
      {currentView === 'hospital' && (
        <HospitalDashboard
          onSwitchToKiosk={() => handleSwitchView('kiosk')}
          onSwitchToDoctor={() => handleSwitchView('doctor')}
        />
      )}
    </div>
  );
}
