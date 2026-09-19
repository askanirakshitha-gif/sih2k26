import React, { useState, useEffect } from 'react';
import {
  Building2, Lock, ShieldCheck, KeyRound, ArrowRight,
  Sparkles, Activity, CheckCircle2, AlertCircle, RefreshCw,
  Layers, ExternalLink, ShieldAlert, HeartPulse, ChevronRight,
  Search, FileText, Check, Copy, Cpu, Database, Share2,
  Stethoscope, LogOut, Clock, UserCheck, FileCheck2, Shield,
  Zap, Eye, AlertTriangle, Filter, CheckCircle
} from 'lucide-react';
import {
  HospitalNetworkService,
  REGISTERED_HOSPITALS,
  DEMO_PATIENTS,
  HOSPITAL_CLINICAL_ARCHIVE
} from '../services/hospitalNetworkService';
import { getTranslation } from '../services/i18n';

export default function HospitalDashboard({ onSwitchToKiosk, onSwitchToDoctor }) {
  const [language, setLanguage] = useState('en');
  const t = (key) => getTranslation(language, key);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('active_hospital_id');
  });
  const [activeHospital, setActiveHospital] = useState(() => {
    return HospitalNetworkService.getCurrentHospital();
  });
  const [hospitalIdInput, setHospitalIdInput] = useState('HOSP-SFD-102');
  const [passcodeInput, setPasscodeInput] = useState('SAFE2026');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Dashboard Tab: 'REQUEST' | 'INCOMING' | 'TRANSFERRED' | 'LEDGER'
  const [activeTab, setActiveTab] = useState('REQUEST');

  // Request Builder State
  const [selectedSourceHospId, setSelectedSourceHospId] = useState('hosp-aiims-delhi');
  const [selectedPatientAbha, setSelectedPatientAbha] = useState('91-2345-6789-0123');
  const [selectedScopes, setSelectedScopes] = useState([
    'Prescriptions',
    'Cardiology & Diagnostics',
    'Lab Reports'
  ]);
  const [validityHours, setValidityHours] = useState(24);
  const [doctorNameInput, setDoctorNameInput] = useState('Dr. Rajiv Khurana');
  const [isDispatchingRequest, setIsDispatchingRequest] = useState(false);
  const [lastDispatchedRequest, setLastDispatchedRequest] = useState(null);

  // Second Hospital Incoming Approval State (OTP modal / simulator)
  const [approvalModalReq, setApprovalModalReq] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState(null);

  // Raw FHIR Bundle Modal State
  const [viewingFhirRecord, setViewingFhirRecord] = useState(null);

  // Live Service State
  const [ledger, setLedger] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outboundRequests, setOutboundRequests] = useState([]);
  const [copiedHash, setCopiedHash] = useState('');
  const [actionNotice, setActionNotice] = useState(null);

  // Refresh data from service
  const refreshData = () => {
    if (!activeHospital) return;
    const currentLedger = HospitalNetworkService.getLedger();
    setLedger([...currentLedger]);

    const inc = HospitalNetworkService.getIncomingRequests(activeHospital.id);
    setIncomingRequests([...inc]);

    const out = HospitalNetworkService.getOutboundRequests(activeHospital.id);
    setOutboundRequests([...out]);
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = HospitalNetworkService.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [activeHospital]);

  // Handle Hospital Login
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (!hospitalIdInput.trim() || !passcodeInput.trim()) {
      setLoginError('Please enter both Hospital ID / Code and Security Passcode.');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      const res = HospitalNetworkService.loginHospital(hospitalIdInput, passcodeInput);
      setIsLoggingIn(false);

      if (res.success) {
        setActiveHospital(res.hospital);
        setIsAuthenticated(true);
        // Automatically default source hospital to another hospital
        const others = HospitalNetworkService.getAvailableSourceHospitals(res.hospital.id);
        if (others.length > 0) {
          setSelectedSourceHospId(others[0].id);
        }
      } else {
        setLoginError(res.error);
      }
    }, 350);
  };

  // Quick Preset Selection on Login Screen
  const handleQuickPreset = (hosp) => {
    setHospitalIdInput(hosp.code);
    setPasscodeInput(hosp.passcode);
    setLoginError('');
  };

  // Quick Switch Active Hospital (for easy testing of Hospital A vs Hospital B)
  const handleSwitchActiveHospital = (targetHospitalId) => {
    const hosp = HospitalNetworkService.setCurrentHospital(targetHospitalId);
    if (hosp) {
      setActiveHospital(hosp);
      // Adjust default source hospital
      const others = HospitalNetworkService.getAvailableSourceHospitals(hosp.id);
      if (others.length > 0) {
        setSelectedSourceHospId(others[0].id);
      }
      setActionNotice(`Switched active node to ${hosp.name}`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // Logout
  const handleLogout = () => {
    HospitalNetworkService.logoutHospital();
    setIsAuthenticated(false);
    setActiveHospital(null);
  };

  // Toggle Scopes for Request
  const toggleScope = (scope) => {
    setSelectedScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  // Dispatch Inter-Hospital Patient Data Request
  const handleDispatchRequest = async () => {
    if (!activeHospital || !selectedSourceHospId) return;

    const sourceHosp = HospitalNetworkService.getHospitalById(selectedSourceHospId);
    if (!sourceHosp) return;

    const patient = HospitalNetworkService.getPatientByAbha(selectedPatientAbha);

    setIsDispatchingRequest(true);
    const res = await HospitalNetworkService.initiateConsentRequest({
      requesterHospital: activeHospital,
      sourceHospital: sourceHosp,
      abhaId: patient.abhaId,
      patientName: patient.name,
      doctorName: doctorNameInput,
      selectedScopes: selectedScopes.length > 0 ? selectedScopes : ['Prescriptions'],
      validityHours
    });

    setIsDispatchingRequest(false);
    if (res.success) {
      setLastDispatchedRequest(res.consentRequest);
      setActionNotice(
        `✓ Consent request sent to ${sourceHosp.name}! To authorize as ${sourceHosp.name}, switch to its dashboard.`
      );
      setTimeout(() => setActionNotice(null), 7000);
    }
  };

  // Open Approval Modal for an Incoming Request
  const handleOpenApprovalModal = (req) => {
    setApprovalModalReq(req);
    setOtpInput(req.otpCode || '123456');
    setApprovalFeedback(null);
  };

  // Submit Approval & Mint On-Chain Block
  const handleConfirmApproval = async () => {
    if (!approvalModalReq) return;
    setIsApproving(true);

    const res = await HospitalNetworkService.approveConsentAndMint({
      requestId: approvalModalReq.requestId,
      otpInput
    });

    setIsApproving(false);
    if (res.success) {
      setApprovalFeedback({
        success: true,
        message: `Consent authorized! Minted on Hyperledger Block #${res.blockNumber}. Data transferred securely.`
      });
      setTimeout(() => {
        setApprovalModalReq(null);
        setApprovalFeedback(null);
      }, 2000);
    } else {
      setApprovalFeedback({
        success: false,
        message: res.error || 'Approval failed.'
      });
    }
  };

  // Revoke DPDP Consent
  const handleRevokeToken = (token) => {
    const res = HospitalNetworkService.revokeConsentToken(token);
    if (res.success) {
      setActionNotice(`Consent revoked under DPDP Act 2023. Token ${token} is now terminated.`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Copy helper
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(''), 2500);
  };

  // Filter available source hospitals (exclude current hospital)
  const availableSourceHospitals = activeHospital 
    ? HospitalNetworkService.getAvailableSourceHospitals(activeHospital.id)
    : REGISTERED_HOSPITALS;

  // Selected patient details
  const currentPatient = HospitalNetworkService.getPatientByAbha(selectedPatientAbha);

  // Collect transferred clinical records received from approved requests
  const receivedRequests = outboundRequests.filter(r => r.status === 'APPROVED');

  // =========================================================================
  // VIEW 1: HOSPITAL AUTHENTICATION SCREEN (HOSPITAL ID & CODE)
  // =========================================================================
  if (!isAuthenticated || !activeHospital) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Dynamic Background Gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight text-white">
                  MediKiosk <span className="text-sky-400">Hospital Exchange</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  National ABDM Network
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inter-Hospital Patient Data Request & Blockchain Consent Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-xs font-bold rounded-lg ${language === 'en' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>EN</button>
              <button onClick={() => setLanguage('hi')} className={`px-2 py-1 text-xs font-bold rounded-lg ${language === 'hi' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>HI</button>
              <button onClick={() => setLanguage('kn')} className={`px-2 py-1 text-xs font-bold rounded-lg ${language === 'kn' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>KN</button>
            </div>
            {onSwitchToKiosk && (
              <button
                onClick={onSwitchToKiosk}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
              >
                📋 {t('patientKioskBtn')}
              </button>
            )}
            {onSwitchToDoctor && (
              <button
                onClick={onSwitchToDoctor}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-950 hover:bg-sky-900 text-sky-300 transition border border-sky-800/50"
              >
                🩺 {t('docWorkstationBtn')}
              </button>
            )}
          </div>
        </header>

        {/* Main Sign-In Card Container */}
        <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Explanatory & ABDM Architecture */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>NRCeS ABDM FHIR R4 & DPDP Act 2023 Compliant</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {t('hospitalSignIn')}
              </h1>

              <p className="text-slate-300 text-sm leading-relaxed">
                {t('hospitalSignInSub')}
              </p>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-3 text-xs text-slate-300">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono font-bold text-[11px]">
                    1
                  </div>
                  <span>Enter your <strong>Hospital ID / Code</strong> & <strong>Passcode</strong></span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-300">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-bold text-[11px]">
                    2
                  </div>
                  <span>Choose target hospital to ask for patient records</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-300">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[11px]">
                    3
                  </div>
                  <span>Inspect incoming requests & authorize on second hospital dashboard</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-1 text-xs text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ABDM Gateway: Live</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Hyperledger Fabric Sync: Active</span>
                </div>
              </div>
            </div>

            {/* Right Column: Credentials Input Form */}
            <div className="lg:col-span-7">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
                
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-black text-white">Enter Hospital Credentials</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Your Hospital Dashboard will appear immediately upon verification</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2.5 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Hospital ID / Code
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={hospitalIdInput}
                        onChange={(e) => setHospitalIdInput(e.target.value)}
                        placeholder="e.g. HOSP-SFD-102 or HOSP-AIIMS-101"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Security Passcode / Secret Key
                      </label>
                      <span className="text-[11px] text-slate-400">See presets below</span>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="password"
                        value={passcodeInput}
                        onChange={(e) => setPasscodeInput(e.target.value)}
                        placeholder="Enter hospital passcode"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Validating ABDM Node Certificate...</span>
                      </>
                    ) : (
                      <>
                        <span>Open Hospital Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Selection Presets */}
                <div className="mt-6 pt-5 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Choose Your Hospital Identity (1-Click Fill)</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Click preset to select</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {REGISTERED_HOSPITALS.map((hosp) => {
                      const isSelected = hospitalIdInput.toUpperCase() === hosp.code.toUpperCase();
                      return (
                        <button
                          key={hosp.id}
                          type="button"
                          onClick={() => handleQuickPreset(hosp)}
                          className={`text-left p-2.5 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-sky-950/60 border-sky-500/80 text-sky-200 ring-1 ring-sky-500/50'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-sky-400">
                              {hosp.code}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                          </div>
                          <p className="text-xs font-bold truncate mt-0.5 text-white">
                            {hosp.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Pass: {hosp.passcode}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </main>

        <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-3 text-center text-xs text-slate-500 z-10">
          MediKiosk ABDM Inter-Hospital Node Gateway • DPDP Act 2023 Compliant • SIH26047
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGGED-IN HOSPITAL DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative selection:bg-sky-500 selection:text-white">
      
      {/* Toast Action Notice */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 bg-sky-900/90 text-sky-100 px-5 py-3 rounded-2xl shadow-2xl border border-sky-500/40 backdrop-blur-md flex items-center space-x-3 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/90 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Active Hospital Identity Emblem */}
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${activeHospital.iconBg || 'from-sky-600 to-teal-600'} flex items-center justify-center text-white shadow-lg shrink-0 border border-white/10`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-black text-white tracking-tight">
                  {activeHospital.name}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-mono font-bold">
                  {activeHospital.code}
                </span>
                <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {activeHospital.department} • ABDM: <span className="font-mono text-slate-300">{activeHospital.abdmFacilityId}</span>
              </p>
            </div>
          </div>

          {/* Center: Switch Hospital Quick Simulator */}
          <div className="hidden xl:flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 text-sky-400" />
              <span>Simulate Node:</span>
            </span>
            <div className="flex items-center space-x-1">
              {REGISTERED_HOSPITALS.map((h) => {
                const isCurrent = h.id === activeHospital.id;
                return (
                  <button
                    key={h.id}
                    onClick={() => handleSwitchActiveHospital(h.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                    }`}
                    title={`Switch active dashboard to ${h.name}`}
                  >
                    {h.code.replace('HOSP-', '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Navigation & Logout */}
          <div className="flex items-center space-x-2.5">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 hidden sm:flex">
              <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-lg ${language === 'en' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>EN</button>
              <button onClick={() => setLanguage('hi')} className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-lg ${language === 'hi' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>HI</button>
              <button onClick={() => setLanguage('kn')} className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-lg ${language === 'kn' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>KN</button>
            </div>
            {onSwitchToKiosk && (
              <button
                onClick={onSwitchToKiosk}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
              >
                📋 {t('patientKioskBtn')}
              </button>
            )}
            {onSwitchToDoctor && (
              <button
                onClick={onSwitchToDoctor}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-950 hover:bg-sky-900 text-sky-300 transition border border-sky-800/60"
              >
                🩺 {t('docWorkstationBtn')}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 transition border border-slate-700/80"
              title="Sign Out of Hospital Node"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Hospital Metrics & Quick Stats Strip */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Incoming Requests</span>
            <span className="font-bold text-sky-400 text-sm">{incomingRequests.length}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Outbound Requests</span>
            <span className="font-bold text-teal-400 text-sm">{outboundRequests.length}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Active Blockchain Contracts</span>
            <span className="font-bold text-emerald-400 text-sm">
              {ledger.filter(l => (l.requesterHospitalId === activeHospital.id || l.sourceHospitalId === activeHospital.id) && l.status === 'ACTIVE').length}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Facility Capacity</span>
            <span className="font-bold text-amber-400 text-sm">{activeHospital.stats?.totalBeds || 1200} Beds</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-12 flex-1 flex flex-col">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-2 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
            
            <button
              onClick={() => setActiveTab('REQUEST')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'REQUEST'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>1. Request Patient Data</span>
            </button>

            <button
              onClick={() => setActiveTab('INCOMING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 relative ${
                activeTab === 'INCOMING'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>2. Second Hospital View (Incoming)</span>
              {incomingRequests.filter(r => r.status === 'PENDING_APPROVAL').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('TRANSFERRED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'TRANSFERRED'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>3. Transferred Patient Dossier</span>
            </button>

            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'LEDGER'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>4. Blockchain Audit Ledger</span>
            </button>

          </div>

          <div className="text-xs text-slate-400 font-medium">
            Node: <span className="text-sky-400 font-mono font-bold">{activeHospital.blockchainNode?.split(' ')[0] || 'Peer #1'}</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: REQUEST PATIENT DATA (CHOOSE HOSPITAL & REQUEST)            */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'REQUEST' && (
          <div className="space-y-6">
            
            {/* Header Description */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 mb-2">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Cross-Hospital ABDM Gateway</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    {t('reqPatientDataTitle')}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    {t('reqPatientDataSub')}
                  </p>
                </div>

                <div className="bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800 shrink-0">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Requester Hospital</div>
                  <div className="text-sm font-black text-white mt-0.5">{activeHospital.name}</div>
                  <div className="text-[11px] text-sky-400 font-mono">{activeHospital.code}</div>
                </div>
              </div>
            </div>

            {/* STEP 1: CHOOSE TARGET HOSPITAL */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs">1</span>
                    <span>Choose Which Hospital To Request Data From:</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Showing all registered hospitals in the National ABDM Network
                  </p>
                </div>
                <span className="text-xs text-sky-400 font-semibold font-mono">
                  {availableSourceHospitals.length} Available Nodes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {availableSourceHospitals.map((hosp) => {
                  const isSelected = selectedSourceHospId === hosp.id;
                  return (
                    <div
                      key={hosp.id}
                      onClick={() => setSelectedSourceHospId(hosp.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/40 shadow-xl shadow-sky-500/10'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                      }`}
                    >
                      {/* Selection Pill */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 font-bold text-[10px]">
                          <Check className="w-3 h-3" />
                          <span>Selected</span>
                        </div>
                      )}

                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${hosp.iconBg || 'from-blue-600 to-indigo-600'} flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 pr-12">
                          <span className="text-[10px] font-mono font-bold text-sky-400">
                            {hosp.code}
                          </span>
                          <h4 className="text-sm font-bold text-white truncate">
                            {hosp.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {hosp.city}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1">
                        {hosp.specialties?.slice(0, 3).map((spec, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span>ABDM: {hosp.abdmFacilityId}</span>
                        <span className="text-emerald-400 font-semibold">● Live Node</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: SELECT PATIENT & SCOPE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left: Patient Selection */}
              <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs">2</span>
                  <span>Select Patient (ABHA ID):</span>
                </h3>

                {/* Patient Quick Selector */}
                <div className="space-y-2">
                  {DEMO_PATIENTS.map((p) => {
                    const isSelected = selectedPatientAbha === p.abhaId;
                    return (
                      <div
                        key={p.abhaId}
                        onClick={() => setSelectedPatientAbha(p.abhaId)}
                        className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-950/50 border-sky-500 text-sky-100 ring-1 ring-sky-500/50'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={p.photo}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <div className="text-sm font-bold text-white flex items-center space-x-2">
                              <span>{p.name}</span>
                              <span className="text-xs text-slate-400">({p.age}y, {p.gender})</span>
                            </div>
                            <div className="text-xs font-mono text-sky-400 mt-0.5">
                              {p.abhaId}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-400">
                          <div>Blood: <strong className="text-slate-200">{p.bloodGroup}</strong></div>
                          <div className="text-emerald-400 font-semibold">ABDM Linked</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Attending Physician */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Requesting Physician Name
                  </label>
                  <input
                    type="text"
                    value={doctorNameInput}
                    onChange={(e) => setDoctorNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-sky-500"
                    placeholder="e.g. Dr. Rajiv Khurana"
                  />
                </div>
              </div>

              {/* Right: Clinical Scope & Validity */}
              <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">3</span>
                    <span>Clinical Scope To Request:</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      'Prescriptions',
                      'Cardiology & Diagnostics',
                      'Lab Reports',
                      'Clinical Notes',
                      'AYUSH SACTP Intake',
                      'Diagnostic Radiology'
                    ].map((scope) => {
                      const checked = selectedScopes.includes(scope);
                      return (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => toggleScope(scope)}
                          className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                            checked
                              ? 'bg-teal-950/60 border-teal-500 text-teal-200'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span>{scope}</span>
                          {checked && <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Validity Period */}
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Consent Token Validity (DPDP Act 2023)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[12, 24, 72].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() => setValidityHours(hrs)}
                          className={`py-2 text-xs font-bold rounded-xl border transition ${
                            validityHours === hrs
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {hrs} Hours
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={handleDispatchRequest}
                    disabled={isDispatchingRequest || selectedScopes.length === 0}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isDispatchingRequest ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                        <span>Dispatching Smart Contract Request...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        <span>
                          Dispatch Request To {HospitalNetworkService.getHospitalById(selectedSourceHospId)?.name}
                        </span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-slate-500 mt-2">
                    The requested hospital node will receive this in their <strong>Incoming Requests</strong> queue.
                  </p>
                </div>

              </div>

            </div>

            {/* Recently Dispatched Requests Preview */}
            {outboundRequests.length > 0 && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Outbound Requests Dispatched By {activeHospital.name} ({outboundRequests.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Request ID</th>
                        <th className="py-2.5 px-3">Target Hospital</th>
                        <th className="py-2.5 px-3">Patient</th>
                        <th className="py-2.5 px-3">Scope</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {outboundRequests.map((req) => (
                        <tr key={req.requestId} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3 font-bold text-sky-400">{req.requestId}</td>
                          <td className="py-3 px-3 font-sans font-semibold text-white">{req.sourceHospitalName}</td>
                          <td className="py-3 px-3 font-sans">{req.patientName} ({req.abhaId})</td>
                          <td className="py-3 px-3 font-sans text-slate-400">{req.scope?.join(', ')}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans">
                            {req.status === 'APPROVED' ? (
                              <button
                                onClick={() => setActiveTab('TRANSFERRED')}
                                className="text-sky-400 hover:underline font-bold text-[11px]"
                              >
                                View Received Records →
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSwitchActiveHospital(req.sourceHospitalId)}
                                className="text-amber-400 hover:underline font-bold text-[11px]"
                              >
                                Switch to {req.sourceHospitalName.split(' ')[0]} to Approve →
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: SECOND HOSPITAL VIEW (INCOMING REQUESTS & AUTHORIZATION)    */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'INCOMING' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Second Hospital Authorization Node</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    Incoming Patient Data Requests For {activeHospital.name}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Other hospitals are requesting clinical records held in {activeHospital.name}'s archive. Review, verify patient consent via simulated ABDM OTP, and mint cryptographic transfer blocks.
                  </p>
                </div>

                <div className="bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800 shrink-0">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Source Hospital Node</div>
                  <div className="text-sm font-black text-white mt-0.5">{activeHospital.name}</div>
                  <div className="text-[11px] text-emerald-400 font-mono">Archive: Active & Secure</div>
                </div>
              </div>
            </div>

            {/* Incoming Requests Cards List */}
            {incomingRequests.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">No Incoming Requests at this Node</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  There are currently no pending requests asking for data from {activeHospital.name}. You can switch to another hospital (e.g. Safdarjung or Fortis) and send a request to {activeHospital.name} to see it arrive here!
                </p>
                <button
                  onClick={() => setActiveTab('REQUEST')}
                  className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
                >
                  Go To Request Builder
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {incomingRequests.map((req) => {
                  const isApproved = req.status === 'APPROVED';
                  return (
                    <div
                      key={req.requestId}
                      className={`p-5 rounded-3xl border transition-all ${
                        isApproved
                          ? 'bg-slate-900/40 border-emerald-500/40'
                          : 'bg-slate-900/80 border-amber-500/40 ring-1 ring-amber-500/20 shadow-xl shadow-amber-500/5'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Requester Hospital & Patient Details */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-sky-400">
                              {req.requestId}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs font-semibold text-slate-400">
                              Requested by: <strong className="text-white">{req.requesterHospitalName}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs text-slate-400">
                              Physician: <span className="text-slate-300">{req.requesterDoctor}</span>
                            </span>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                              {req.patientName?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <h4 className="text-base font-black text-white">
                                {req.patientName}
                              </h4>
                              <p className="text-xs font-mono text-slate-400">
                                ABHA: <span className="text-sky-300">{req.abhaId}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-1">Scope:</span>
                            {req.scope?.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold"
                              >
                                {s}
                              </span>
                            ))}
                            <span className="text-[11px] text-slate-500 ml-2">
                              Validity: {req.validityHours} hrs
                            </span>
                          </div>
                        </div>

                        {/* Status & Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                          {isApproved ? (
                            <div className="text-right">
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Consent Authorized & Transferred</span>
                              </span>
                              <p className="text-[10px] font-mono text-slate-400 mt-1">
                                Token: {req.smartContractToken || '0xSC_MINTED'}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2.5">
                              <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold animate-pulse">
                                Awaiting Consent Approval
                              </span>
                              <button
                                onClick={() => handleOpenApprovalModal(req)}
                                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Approve & Release Records</span>
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: TRANSFERRED CLINICAL RECORDS DOSSIER                        */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'TRANSFERRED' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 mb-2">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Verified FHIR R4 Clinical Dossier</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    Patient Clinical Records Received by {activeHospital.name}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Records retrieved from other hospitals via ABDM Health Information Exchange with cryptographic SHA-256 tamper verification.
                  </p>
                </div>

                <div className="bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800 shrink-0">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Active Patient Dossier</div>
                  <div className="text-sm font-black text-white mt-0.5">{currentPatient.name}</div>
                  <div className="text-[11px] text-sky-400 font-mono">{currentPatient.abhaId}</div>
                </div>
              </div>
            </div>

            {/* Display Records from Approved Requests */}
            {receivedRequests.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">No Records Transferred Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  When you request patient data from another hospital and that hospital (or patient OTP) authorizes it, the clinical records will immediately render here in structured FHIR format!
                </p>
                <div className="pt-2 flex justify-center space-x-3">
                  <button
                    onClick={() => setActiveTab('REQUEST')}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    1. Send Request
                  </button>
                  <button
                    onClick={() => setActiveTab('INCOMING')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
                  >
                    2. Check Incoming Requests
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {receivedRequests.map((req) => (
                  <div key={req.requestId} className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-5">
                    
                    {/* Source Hospital Header Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-white">
                              Transferred from: {req.sourceHospitalName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              Verified On-Chain
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Patient: <strong className="text-slate-200">{req.patientName}</strong> ({req.abhaId}) • Scope: {req.scope?.join(', ')}
                          </p>
                        </div>
                      </div>

                      {/* Cryptographic SHA-256 Badge */}
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-400 font-mono">SHA-256:</span>
                        <code className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-sky-400 font-mono text-[11px]">
                          {req.sha256Hash ? req.sha256Hash.substring(0, 18) + '...' : '0x8a7b6c...verified'}
                        </code>
                        <button
                          onClick={() => handleCopy(req.sha256Hash || '0x8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Copy Full SHA-256 Hash"
                        >
                          {copiedHash === (req.sha256Hash || '0x8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d') ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Records List Container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {req.records?.map((record) => (
                        <div
                          key={record.id}
                          className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4.5 space-y-3 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              record.categoryColor === 'purple'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : record.categoryColor === 'cyan'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : record.categoryColor === 'rose'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {record.category}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {record.date}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-white">
                              {record.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {record.doctor} • {record.department}
                            </p>
                          </div>

                          <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                            {record.summary}
                          </p>

                          {/* Specific items table or values */}
                          {record.details && record.details.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {record.details.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs py-1 border-b border-slate-900 last:border-0"
                                >
                                  <span className="font-semibold text-slate-300">{item.name}</span>
                                  <div className="text-right">
                                    <span className="text-sky-400 font-mono font-medium">{item.dose || item.value}</span>
                                    {item.status && (
                                      <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        item.status === 'Normal'
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'bg-amber-500/20 text-amber-400'
                                      }`}>
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {record.advice && (
                            <div className="text-[11px] text-slate-400 pt-1">
                              <strong className="text-slate-300">Advice:</strong> {record.advice}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                            <span>FHIR: <strong className="font-mono text-slate-400">{record.fhirResourceType}</strong></span>
                            <button
                              onClick={() => setViewingFhirRecord(record)}
                              className="text-sky-400 hover:underline font-bold"
                            >
                              Inspect JSON Bundle →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: BLOCKCHAIN AUDIT LEDGER & DPDP COMPLIANCE                   */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'LEDGER' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 mb-2">
                    <Database className="w-3.5 h-3.5" />
                    <span>Hyperledger Fabric & Polygon Inter-Hospital Ledger</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    Cryptographic Consent & Data Exchange Audit Trail
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Every inter-hospital record transfer is timestamped, cryptographically hashed, and subject to real-time revocation under Section 6 of the Digital Personal Data Protection Act (DPDP Act 2023).
                  </p>
                </div>

                <div className="flex items-center space-x-2 bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-xs">
                    <div className="font-bold text-white">Network Peer Sync</div>
                    <div className="text-[11px] text-emerald-400 font-mono">Consensus: Validated</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Total Ledger Blocks ({ledger.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Updates in real time upon every inter-hospital consent mint
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-mono">Block #</th>
                      <th className="py-3 px-4">Transaction Hash</th>
                      <th className="py-3 px-4">Requester Hospital</th>
                      <th className="py-3 px-4">Source Hospital</th>
                      <th className="py-3 px-4">Patient / ABHA</th>
                      <th className="py-3 px-4">Smart Contract Token</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">DPDP Act Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {ledger.map((entry) => {
                      const isRevoked = entry.status === 'REVOKED';
                      return (
                        <tr key={entry.blockNumber} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-bold text-sky-400">
                            #{entry.blockNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-400" title={entry.txHash}>
                              {entry.txHash?.substring(0, 10)}...{entry.txHash?.substring(58)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-sans font-semibold text-white">
                            {entry.requesterHospitalName}
                          </td>
                          <td className="py-3.5 px-4 font-sans font-semibold text-teal-300">
                            {entry.sourceHospitalName}
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <div>{entry.patientName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{entry.abhaId}</div>
                          </td>
                          <td className="py-3.5 px-4 text-emerald-400 font-bold">
                            {entry.smartContractToken}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isRevoked
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            {isRevoked ? (
                              <span className="text-[11px] text-rose-400 font-medium italic">
                                Access Terminated
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRevokeToken(entry.smartContractToken)}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                                title="Revoke access under Section 6 of DPDP Act 2023"
                              >
                                <ShieldAlert className="w-3 h-3 text-rose-400" />
                                <span>Revoke Access</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* APPROVAL & OTP SIMULATOR MODAL (SECOND HOSPITAL ACTION)            */}
      {/* ------------------------------------------------------------------ */}
      {approvalModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Authorize Inter-Hospital Transfer</h3>
                  <p className="text-xs text-slate-400">ABDM HIE-CM Dynamic Consent Manager</p>
                </div>
              </div>
              <button
                onClick={() => setApprovalModalReq(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Request Summary Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Requesting Hospital:</span>
                <strong className="text-white">{approvalModalReq.requesterHospitalName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source Hospital (Here):</span>
                <strong className="text-teal-300">{approvalModalReq.sourceHospitalName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="text-white">{approvalModalReq.patientName} ({approvalModalReq.abhaId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requested Records:</span>
                <span className="text-sky-300 font-semibold">{approvalModalReq.scope?.join(', ')}</span>
              </div>
            </div>

            {/* Simulated OTP Code Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Patient 6-Digit Consent OTP
                </label>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  Simulated Code: 123456
                </span>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="Enter 123456"
                className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-black focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Simulates real-time ABDM SMS sent to patient's registered mobile number.
              </p>
            </div>

            {approvalFeedback && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                approvalFeedback.success
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {approvalFeedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{approvalFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setApprovalModalReq(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isApproving || !otpInput}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Minting Blockchain Block...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Authorize & Mint Block</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RAW FHIR R4 JSON BUNDLE VIEWER MODAL                               */}
      {/* ------------------------------------------------------------------ */}
      {viewingFhirRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Cpu className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-black text-white">
                  FHIR R4 Resource: {viewingFhirRecord.fhirResourceType}
                </h3>
              </div>
              <button
                onClick={() => setViewingFhirRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-sky-300">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify({
                  resourceType: viewingFhirRecord.fhirResourceType,
                  id: viewingFhirRecord.id,
                  status: 'final',
                  category: [{ coding: [{ display: viewingFhirRecord.category }] }],
                  code: { text: viewingFhirRecord.title },
                  subject: { reference: `Patient/${currentPatient.abhaId}`, display: currentPatient.name },
                  effectiveDateTime: viewingFhirRecord.date,
                  performer: [{ display: viewingFhirRecord.doctor }],
                  conclusion: viewingFhirRecord.summary,
                  details: viewingFhirRecord.details || []
                }, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => setViewingFhirRecord(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
            >
              Close FHIR Viewer
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-3 text-center text-xs text-slate-500">
        MediKiosk ABDM Inter-Hospital Node Gateway • DPDP Act 2023 Compliant • SIH26047
      </footer>
    </div>
  );
}
