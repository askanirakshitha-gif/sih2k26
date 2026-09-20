import React, { useState } from 'react';
import {
  Building2, Lock, ShieldCheck, KeyRound, ArrowRight,
  Sparkles, Activity, CheckCircle2, AlertCircle, RefreshCw,
  Layers, ExternalLink, ShieldAlert, HeartPulse, ChevronRight
} from 'lucide-react';
import { HospitalNetworkService, REGISTERED_HOSPITALS } from '../services/hospitalNetworkService';

export default function HospitalLoginView({ onLoginSuccess, onBackToKiosk, onBackToDoctor }) {
  const [hospitalIdInput, setHospitalIdInput] = useState('HOSP-SFD-102');
  const [passcodeInput, setPasscodeInput] = useState('SAFE2026');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!hospitalIdInput.trim()) {
      setErrorMessage('Please enter your Hospital ID or Code.');
      return;
    }
    if (!passcodeInput.trim()) {
      setErrorMessage('Please enter your Security Passcode.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = HospitalNetworkService.loginHospital(hospitalIdInput, passcodeInput);
      setIsLoading(false);

      if (res.success) {
        onLoginSuccess(res.hospital);
      } else {
        setErrorMessage(res.error);
      }
    }, 400);
  };

  const handleQuickSelectPreset = (hospital) => {
    setHospitalIdInput(hospital.code);
    setPasscodeInput(hospital.passcode);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight text-white">
                MediKiosk <span className="text-sky-400">ABDM Exchange</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                National Network
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ayushman Bharat Digital Mission • Hybrid Blockchain Inter-Hospital Gateway
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onBackToKiosk && (
            <button
              onClick={onBackToKiosk}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            >
              📋 Patient Kiosk
            </button>
          )}
          {onBackToDoctor && (
            <button
              onClick={onBackToDoctor}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-950 hover:bg-sky-900 text-sky-300 transition border border-sky-800/50"
            >
              🩺 Doctor OPD Queue
            </button>
          )}
        </div>
      </header>

      {/* Central Login Card Container */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Context & ABDM Architecture */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>DPDP Act 2023 & ABDM Compliant</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Hospital Node Authentication
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed">
              Connect your Hospital Management Information System (HMIS) to the ABDM Health Information Exchange & Consent Manager (HIE-CM). Securely request, exchange, and verify patient clinical dossiers via tamper-proof Hyperledger smart contracts.
            </p>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-3 text-xs text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono font-bold text-[11px]">
                  1
                </div>
                <span>Select or enter your Hospital ID & Passcode</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-bold text-[11px]">
                  2
                </div>
                <span>Choose patient & select source hospital to request records</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[11px]">
                  3
                </div>
                <span>Simulate patient OTP & render live verified FHIR records</span>
              </div>
            </div>

            <div className="flex items-center space-x-4 pt-1 text-xs text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ABDM Gateway: Live</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Hyperledger Fabric Sync: OK</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Form */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              
              {/* Card Top Pill */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white">Hospital Sign-In</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Enter credentials to open your Hospital Workspace</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400">
                  <Lock className="w-5 h-5" />
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2.5 text-rose-300 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Inputs */}
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
                      Security Passcode
                    </label>
                    <span className="text-[11px] text-slate-400">
                      See quick presets below
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      placeholder="Enter hospital security passcode"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Authenticating Node Certificate...</span>
                    </>
                  ) : (
                    <>
                      <span>Open Hospital Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Preset Selector Tiles */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Select Hospital Presets</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Click to fill</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {REGISTERED_HOSPITALS.map((hosp) => {
                    const isSelected = hospitalIdInput.toUpperCase() === hosp.code.toUpperCase();
                    return (
                      <button
                        key={hosp.id}
                        type="button"
                        onClick={() => handleQuickSelectPreset(hosp)}
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

      {/* Footer Info */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-3 text-center text-xs text-slate-500 z-10">
        MediKiosk Outpatient & Triage • NRCeS ABDM FHIR R4 Microservice • Smart India Hackathon 2026 (SIH26047)
      </footer>
    </div>
  );
}
