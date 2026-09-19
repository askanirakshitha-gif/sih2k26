import React, { useState, useEffect } from 'react';
import { Bell, CheckSquare, AlertTriangle, Info, MessageSquare, X } from 'lucide-react';

export default function PatientNotificationSimulator({ isOpen, onClose, triggerAlerts }) {
  const [activeAlerts, setActiveAlerts] = useState([]);

  // Sequence the alerts appearing to simulate real-time SMS
  useEffect(() => {
    if (isOpen && triggerAlerts && triggerAlerts.length > 0) {
      setActiveAlerts([]);
      
      triggerAlerts.forEach((alert, index) => {
        setTimeout(() => {
          setActiveAlerts(prev => [...prev, alert]);
        }, (index + 1) * 800); // Stagger by 800ms
      });
    } else if (!isOpen) {
      setActiveAlerts([]);
    }
  }, [isOpen, triggerAlerts]);

  if (!isOpen) return null;

  const renderIcon = (type) => {
    switch(type) {
      case 'appointment':
        return <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm"><CheckSquare className="w-6 h-6 text-white" /></div>;
      case 'risk':
        return <div className="w-10 h-10 flex items-center justify-center shrink-0"><AlertTriangle className="w-10 h-10 text-red-500 drop-shadow-md" fill="#ef4444" stroke="#ffffff" /></div>;
      case 'medicine':
        return <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm"><Info className="w-6 h-6 text-white" /></div>;
      case 'followup':
        return <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm"><MessageSquare className="w-6 h-6 text-white" fill="currentColor" /></div>;
      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Close Button (External to Phone) */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 sm:top-10 sm:right-10 z-[60] p-4 bg-white/10 hover:bg-white/20 rounded-full transition shadow-xl"
      >
        <X className="w-8 h-8 text-white" />
      </button>

      {/* Mobile Phone Frame */}
      <div 
        className="relative w-full max-w-[340px] bg-white rounded-[3rem] shadow-2xl overflow-hidden border-[12px] border-slate-900 aspect-[9/19] flex flex-col animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-20">
          <div className="w-1/3 h-6 bg-slate-900 rounded-b-2xl"></div>
        </div>

        <div className="flex-1 bg-slate-50 flex flex-col pt-14 p-6 overflow-y-auto custom-scrollbar">
          
          <div className="flex flex-col items-center justify-center mb-8">
            <h2 className="text-[22px] font-black text-slate-800 mb-4 tracking-tight">Alerts & Notifications</h2>
            <div className="relative">
              <Bell className="w-14 h-14 text-blue-700" strokeWidth={1.5} />
              {activeAlerts.length > 0 && (
                <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </div>
          </div>

          <div className="space-y-4 relative">
            {/* Timeline Line */}
            <div className="absolute left-5 top-8 bottom-4 w-0.5 bg-slate-200 z-0"></div>

            {activeAlerts.map((alert, idx) => (
              <div 
                key={idx} 
                className="relative z-10 flex gap-4 bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-slate-100 animate-in slide-in-from-bottom-4 fade-in duration-500"
                style={{ animationFillMode: 'both' }}
              >
                {renderIcon(alert.type)}
                <div className="flex flex-col justify-center">
                  <h4 className="text-[15px] font-bold text-slate-800 leading-tight">{alert.title}</h4>
                  <p className="text-sm text-slate-600 mt-1 leading-snug">{alert.message}</p>
                </div>
              </div>
            ))}

            {activeAlerts.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-10">
                Waiting for incoming alerts...
              </div>
            )}
          </div>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 inset-x-0 flex justify-center">
          <div className="w-1/3 h-1 bg-slate-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
