import React from 'react';
import { Activity, AlertTriangle, UserCheck, Shield, Volume2, Square, Stethoscope, Share2, Building2 } from 'lucide-react';
import { getTranslation } from '../services/i18n';

export default function KioskNavbar({
  language,
  onLanguageChange,
  opdToken,
  isRedFlag,
  isSpeakingPage,
  onReadPageAloud,
  activeView,
  onNavigateView,
  onOpenDoctorAuth,
  onOpenAbdmTransfer,
  onOpenHospitalPortal
}) {
  const t = (key) => getTranslation(language, key);

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30 print:hidden">
      
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Emblem */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 shrink-0">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md cursor-pointer hover:opacity-95 transition"
            onClick={() => onNavigateView && onNavigateView('HOSPITALS')}
            title="Home"
          >
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span
                className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 cursor-pointer"
                onClick={() => onNavigateView && onNavigateView('HOSPITALS')}
              >
                MediKiosk <span className="text-sky-600">AI</span>
              </span>
              <span className="hidden xs:inline-flex text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 items-center">
                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                SIH26047
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden md:block">
              {t('ministry')}
            </p>
          </div>
        </div>

        {/* Center Navigation Views (Desktop lg+) */}
        {onNavigateView && (
          <div className="hidden lg:flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => onNavigateView('HOSPITALS')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeView === 'HOSPITALS'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏥 {t('hospitalsNearMeBtn')}
            </button>
            <button
              onClick={() => onNavigateView('INTAKE')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeView === 'INTAKE'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 {t('patientIntakeBtn')}
            </button>
          </div>
        )}

        {/* Action Controls & Single Audio Button & Language Switcher */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          
          {/* Desktop Portal & Doctor Buttons (Hidden on mobile, available in sub-nav) */}
          {onOpenHospitalPortal && (
            <button
              onClick={onOpenHospitalPortal}
              className="hidden lg:flex px-3 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition items-center space-x-1.5 border border-indigo-400/40"
              title="Open Hospital Node Dashboard"
            >
              <Building2 className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              <span>{t('hospitalPortalBtn')}</span>
            </button>
          )}

          {onOpenAbdmTransfer && (
            <button
              onClick={onOpenAbdmTransfer}
              className="hidden xl:flex px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition items-center space-x-1.5 border border-emerald-400/40"
              title="Open ABDM Inter-Hospital Data Transfer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
              <span>{t('abdmDataExchangeBtn')}</span>
            </button>
          )}

          {onOpenDoctorAuth && (
            <button
              onClick={onOpenDoctorAuth}
              className="hidden md:flex px-3 py-1.5 bg-gradient-to-r from-slate-900 to-sky-950 hover:from-slate-800 hover:to-sky-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition items-center space-x-1.5 border border-sky-400/40"
              title="Open Doctor Clinical Workstation"
            >
              <Stethoscope className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{t('doctorPortalBtn') || 'Doctor Workstation'}</span>
            </button>
          )}

          {/* Unified Page Audio / Stop Button (No separate toggle) */}
          {onReadPageAloud && (
            <button
              onClick={onReadPageAloud}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                isSpeakingPage
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300 animate-pulse'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 active:scale-95'
              }`}
              title={isSpeakingPage ? (t('stopPageAudio') || 'Stop Audio') : (t('listenPageAudio') || 'Listen to Page')}
            >
              {isSpeakingPage ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current text-white shrink-0" />
                  <span className="font-extrabold">{t('stopPageAudio') || 'Stop Audio'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="hidden sm:inline">{t('listenPageAudio') || 'Listen to Page'}</span>
                  <span className="sm:hidden">{language === 'hi' ? 'सुने' : language === 'kn' ? 'ಆಲಿಸಿ' : 'Listen'}</span>
                </>
              )}
            </button>
          )}

          {/* Active Red Flag Alert Badge */}
          {isRedFlag && (
            <div className="flex items-center space-x-1 bg-red-100 text-red-700 border border-red-300 px-2 py-1 rounded-lg animate-pulse font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="hidden sm:inline">{t('emergencyAlertBadge')}</span>
            </div>
          )}

          {/* OPD Token indicator */}
          {opdToken && (
            <div className="hidden sm:flex items-center space-x-1 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-800">
              <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>{language === 'hi' ? 'टोकन' : language === 'kn' ? 'ಟೋಕನ್' : 'Token'}: <strong className="text-sky-700 font-bold">{opdToken}</strong></span>
            </div>
          )}

          {/* Responsive Language Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                language === 'en'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="English"
            >
              <span className="sm:hidden">EN</span>
              <span className="hidden sm:inline">English</span>
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                language === 'hi'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="हिंदी (Hindi)"
            >
              <span className="sm:hidden">HI</span>
              <span className="hidden sm:inline">हिंदी</span>
            </button>
            <button
              onClick={() => onLanguageChange('kn')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                language === 'kn'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ಕನ್ನಡ (Kannada)"
            >
              <span className="sm:hidden">KN</span>
              <span className="hidden sm:inline">ಕನ್ನಡ</span>
            </button>
          </div>

        </div>

      </div>

      {/* Secondary Sub-Navbar for Mobile & Tablet (< lg) */}
      <div className="lg:hidden border-t border-slate-100 bg-slate-50/90 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto">
        {onNavigateView && (
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => onNavigateView('HOSPITALS')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeView === 'HOSPITALS'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              🏥 {language === 'hi' ? 'अस्पताल' : language === 'kn' ? 'ಆಸ್ಪತ್ರೆಗಳು' : 'Hospitals'}
            </button>
            <button
              onClick={() => onNavigateView('INTAKE')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeView === 'INTAKE'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              📋 {language === 'hi' ? 'कियोस्क' : language === 'kn' ? 'ಕಿಯೋಸ್ಕ್' : 'Intake'}
            </button>
          </div>
        )}

        <div className="flex items-center space-x-1.5 shrink-0">
          {onOpenDoctorAuth && (
            <button
              onClick={onOpenDoctorAuth}
              className="md:hidden px-2.5 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center space-x-1 shadow-xs"
              title="Doctor Workstation"
            >
              <Stethoscope className="w-3.5 h-3.5 text-sky-400" />
              <span>{language === 'hi' ? 'डॉक्टर' : language === 'kn' ? 'ವೈದ್ಯರು' : 'Doctor'}</span>
            </button>
          )}

          {onOpenHospitalPortal && (
            <button
              onClick={onOpenHospitalPortal}
              className="lg:hidden px-2.5 py-1 bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 shadow-xs"
              title="Hospital Portal"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-200" />
              <span>{language === 'hi' ? 'पोर्टल' : language === 'kn' ? 'ಪೋರ್ಟಲ್' : 'Portal'}</span>
            </button>
          )}

          {onOpenAbdmTransfer && (
            <button
              onClick={onOpenAbdmTransfer}
              className="xl:hidden px-2 py-1 bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 shadow-xs"
              title="ABDM Data Exchange"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">ABDM</span>
            </button>
          )}
        </div>
      </div>

    </header>
  );
}
