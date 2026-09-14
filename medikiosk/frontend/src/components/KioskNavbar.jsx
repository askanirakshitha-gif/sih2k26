import React from 'react';
import { Activity, Globe, AlertTriangle, UserCheck, Shield } from 'lucide-react';
import { getTranslation } from '../services/i18n';

export default function KioskNavbar({ language, onLanguageChange, opdToken, isRedFlag }) {
  const t = (key) => getTranslation(language, key);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand & Emblem */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-slate-900">MediKiosk</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <Shield className="w-3 h-3 mr-1" />
                SIH26047
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              {t('ministry')}
            </p>
          </div>
        </div>

        {/* Status Badges & Controls */}
        <div className="flex items-center space-x-3">
          
          {/* Active Red Flag Alert Badge */}
          {isRedFlag && (
            <div className="flex items-center space-x-2 bg-red-100 text-red-700 border border-red-300 px-3 py-1.5 rounded-lg animate-pulse font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>{t('emergencyAlertBadge')}</span>
            </div>
          )}

          {/* OPD Token indicator */}
          {opdToken && (
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-800">
              <UserCheck className="w-4 h-4 text-sky-600" />
              <span>{language === 'hi' ? 'टोकन' : language === 'kn' ? 'ಟೋಕನ್' : 'Token'}: <strong className="text-sky-700 font-bold">{opdToken}</strong></span>
            </div>
          )}

          {/* Language Switcher Button */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors ${
                language === 'en'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors ${
                language === 'hi'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => onLanguageChange('kn')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors ${
                language === 'kn'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ಕನ್ನಡ
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
