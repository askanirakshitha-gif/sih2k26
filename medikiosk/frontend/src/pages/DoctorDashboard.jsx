import React, { useState, useEffect } from 'react';
import {
  Stethoscope, AlertOctagon, CheckCircle, FileText, Send,
  Download, Eye, EyeOff, Edit3, ShieldAlert, ArrowLeft, RefreshCw,
  Clock, User, HeartPulse, Flower2, ChevronRight, Activity, Calendar,
  BellRing, Volume2, VolumeX, AlertTriangle, X, Printer, Share2, Building2, Smartphone
} from 'lucide-react';
import { DoctorService } from '../services/api';
import FhirModal from '../components/FhirModal';
import AbdmBlockchainTransferModal from '../components/AbdmBlockchainTransferModal';
import {
  subscribeToEmergencyAlerts,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
  playAlertChime
} from '../services/alertSync';

export default function DoctorDashboard({ onSwitchToKiosk, onSwitchToHospital }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [activeTab, setActiveTab] = useState('clinical'); // 'clinical' | 'ayush' | 'timeline' | 'notes'
  const [filterSystem, setFilterSystem] = useState('all'); // 'all' | 'allopathy' | 'ayush' | 'flagged'
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Editable Doctor Fields
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [physicianNotes, setPhysicianNotes] = useState('');
  const [editedHpi, setEditedHpi] = useState('');

  // FHIR Modal State
  const [fhirBundle, setFhirBundle] = useState(null);
  const [showFhirModal, setShowFhirModal] = useState(false);

  // ABDM Receipt Modal State
  const [abdmReceipt, setAbdmReceipt] = useState(null);
  const [showAbdmReceipt, setShowAbdmReceipt] = useState(false);

  // ABDM + Hybrid Blockchain Inter-Hospital Transfer Modal State
  const [showAbdmBlockchainModal, setShowAbdmBlockchainModal] = useState(false);

  // SMS Reminder State
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsStatus, setSmsStatus] = useState(null);

  // Real-Time Red Flag Emergency Alert State
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [currentEmergencyAlert, setCurrentEmergencyAlert] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    loadSessions();
    const initialUnack = getUnacknowledgedAlerts();
    setActiveAlerts(initialUnack);
    if (initialUnack.length > 0) {
      setCurrentEmergencyAlert(initialUnack[0]);
    }

    const unsubscribe = subscribeToEmergencyAlerts(
      (newAlert) => {
        if (soundEnabled) playAlertChime();
        setActiveAlerts(prev => [newAlert, ...prev.filter(a => a.sessionId !== newAlert.sessionId)]);
        setCurrentEmergencyAlert(newAlert);
        loadSessions();
        loadSessionDetail(newAlert.sessionId);
      },
      (ackId) => {
        if (ackId) {
          setActiveAlerts(prev => prev.filter(a => a.id !== ackId && a.sessionId !== ackId));
          setCurrentEmergencyAlert(prev => (prev?.id === ackId || prev?.sessionId === ackId) ? null : prev);
        } else {
          setActiveAlerts(getUnacknowledgedAlerts());
        }
      }
    );

    const timer = setInterval(() => {
      loadSessions();
      setActiveAlerts(getUnacknowledgedAlerts());
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [soundEnabled]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const res = await DoctorService.getSessions();
      if (res.success && res.sessions.length > 0) {
        setSessions(res.sessions);
        if (!selectedSessionId) {
          loadSessionDetail(res.sessions[0].id);
        }
      }
    } catch (err) {
      console.warn('Could not load doctor sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionDetail = async (id) => {
    setSelectedSessionId(id);
    try {
      const res = await DoctorService.getSessionDetail(id);
      if (res.success) {
        setDossier(res);
        setProvisionalDiagnosis(res.review?.provisionalDiagnosis || res.review?.provisional_diagnosis || (res.session?.clinical_system === 'ayush' ? 'Ajeerna / Vata-Pitta Prakriti Imbalance' : 'Suspected Angina / Acute Coronary Syndrome Rule-Out'));
        setPhysicianNotes(res.review?.clinicalNotes || res.summary?.physician_notes || res.review?.prescription_notes || '');
        setEditedHpi(res.summary?.hpi_summary || '');
      }
    } catch (err) {
      console.error('Error loading session dossier:', err);
    }
  };

  // Sign & Verify Record
  const handleVerifySign = async () => {
    if (!selectedSessionId) return;
    setIsSigning(true);
    try {
      const res = await DoctorService.submitReview({
        sessionId: selectedSessionId,
        doctorId: 'DOC-AIIMS-108',
        doctorName: 'Dr. Vikramaditya Sharma, MD',
        provisionalDiagnosis,
        clinicalNotes: physicianNotes || editedHpi || 'Clinical review completed.',
        verifiedMeds: [],
        abdmConsentVerified: true
      });

      if (res.success) {
        setFhirBundle(res.fhirBundle);
        alert('Case verified and signed successfully! Compliant FHIR R4 Bundle generated.');
        loadSessions();
        loadSessionDetail(selectedSessionId);
      }
    } catch (err) {
      alert('Error verifying record: ' + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  // View FHIR
  const handleInspectFhir = async () => {
    if (!selectedSessionId) return;
    try {
      const bundle = await DoctorService.getFhirBundle(selectedSessionId);
      setFhirBundle(bundle);
      setShowFhirModal(true);
    } catch (err) {
      alert('Could not generate FHIR payload: ' + err.message);
    }
  };

  // Push to ABDM / HIS
  const handlePushToAbdm = async () => {
    if (!selectedSessionId) return;
    setIsPushing(true);
    try {
      const res = await DoctorService.pushToAbdm({
        sessionId: selectedSessionId,
        doctorId: 'DOC-AIIMS-108',
        abhaId: dossier?.patient?.abha_id
      });

      if (res.success) {
        setAbdmReceipt(res);
        setShowAbdmReceipt(true);
        loadSessions();

        // The system backend would automatically dispatch SMS alerts to the patient here.
        // Alert logic is handled server-side.
      }
    } catch (err) {
      alert('Error pushing to mock ABDM: ' + err.message);
    } finally {
      setIsPushing(false);
    }
  };

  // Alert Handlers
  const handleSendSmsReminder = async () => {
    setIsSendingSms(true);
    setSmsStatus(null);
    try {
      const payload = {
        phoneNumber: '+919334590992',
        message: 'MediKiosk Alert: Your visit is confirmed. Please take your prescribed medicines. Follow-up is due in 5 days.'
      };
      const res = await DoctorService.sendSmsReminder(payload);
      if (res.success) {
        setSmsStatus({ type: 'success', msg: 'Real-time SMS reminder sent successfully!' });
      } else {
        setSmsStatus({ type: 'error', msg: res.message || 'Failed to send SMS.' });
      }
    } catch (err) {
      setSmsStatus({ type: 'error', msg: 'An error occurred while sending the SMS.' });
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleReviewAlertPatient = (alert) => {
    if (!alert) return;
    acknowledgeAlert(alert.id || alert.sessionId);
    setCurrentEmergencyAlert(null);
    setSelectedSessionId(alert.sessionId);
    loadSessionDetail(alert.sessionId);
    setActiveTab('clinical');
  };

  const handleDismissAlert = (alert) => {
    if (!alert) return;
    acknowledgeAlert(alert.id || alert.sessionId);
    setCurrentEmergencyAlert(null);
  };

  // Filter and sort sessions (Prioritizing active emergency red-flag cases)
  const filteredSessions = sessions
    .filter(s => {
      if (filterSystem === 'all') return true;
      if (filterSystem === 'flagged') return s.red_flag_detected;
      return s.clinical_system === filterSystem;
    })
    .sort((a, b) => {
      if (a.red_flag_detected && !b.red_flag_detected) return -1;
      if (!a.red_flag_detected && b.red_flag_detected) return 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  // Safely resolve patient and session demographics for dossier and printable report
  const selectedQueueSession = sessions.find(s => s.id === selectedSessionId) || {};
  const dossierPatient = dossier?.patient || {};
  const dossierSession = dossier?.session || selectedQueueSession || {};

  // robust extraction handling empty strings as falsy
  const resolve = (...args) => {
    return args.find(a => {
      if (a === undefined || a === null) return false;
      if (typeof a === 'string' && a.trim() === '') return false;
      return true;
    }) || '';
  };

  const currentPatientName = resolve(
    dossierPatient.full_name,
    dossierPatient.name,
    dossierSession.patient_name,
    dossier?.patient_name,
    selectedQueueSession.patient_name
  ) || 'Walk-in Patient';

  const currentAge = resolve(
    dossierPatient.age,
    dossierSession.age,
    dossier?.age,
    selectedQueueSession.age
  );

  const currentGender = resolve(
    dossierPatient.gender,
    dossierSession.gender,
    dossier?.gender,
    selectedQueueSession.gender
  );

  const currentToken = resolve(
    dossierSession.opd_token_number,
    dossierSession.opdToken,
    dossier?.opd_token_number,
    dossier?.opdToken,
    selectedQueueSession.opd_token_number,
    selectedQueueSession.opdToken
  ) || 'OPD-101';

  const currentSystem = resolve(
    dossierSession.clinical_system,
    dossier?.clinical_system,
    selectedQueueSession.clinical_system
  ) || 'allopathy';

  const currentAbha = resolve(
    dossierPatient.abha_id,
    dossierSession.abha_id,
    dossier?.abha_id,
    selectedQueueSession.abha_id
  ) || '91-XXXX-XXXX-XXXX';

  const currentPhone = resolve(
    dossierPatient.phone,
    dossierSession.phone,
    selectedQueueSession.phone
  ) || 'N/A';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">

      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight">Doctor Clinical Workstation</h1>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  OPD Room 4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                MediKiosk Integrated Case Review & ABDM Dispatch
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeAlerts.length > 0 && (
              <button
                type="button"
                onClick={() => setCurrentEmergencyAlert(activeAlerts[0])}
                className="cursor-pointer flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-black animate-pulse shadow-md transition"
                title="Click to inspect active emergency alert"
              >
                <BellRing className="w-4 h-4" />
                <span>{activeAlerts.length} Emergency Alert{activeAlerts.length > 1 ? 's' : ''}</span>
              </button>
            )}

            <button
              onClick={loadSessions}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
              title="Refresh OPD Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow ${isPrivacyMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'}`}
              title="Toggle Patient Privacy Mode (Hide Names)"
            >
              {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{isPrivacyMode ? 'Privacy On' : 'Privacy Off'}</span>
            </button>

            {/* ABDM & Hybrid Blockchain Inter-Hospital Exchange Button */}
            <button
              onClick={() => setShowAbdmBlockchainModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-md border border-emerald-400/40"
              title="Open ABDM Inter-Hospital Data Transfer & Hybrid Blockchain Audit Ledger"
            >
              <Share2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="hidden md:inline">ABDM & Blockchain Exchange</span>
            </button>

            {onSwitchToHospital && (
              <button
                onClick={onSwitchToHospital}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-md border border-indigo-400/40"
                title="Open Hospital Node Dashboard (Request Data & Manage Incoming Transfers)"
              >
                <Building2 className="w-4 h-4 text-sky-200 shrink-0" />
                <span className="hidden md:inline">Hospital Portal</span>
              </button>
            )}

            <button
              onClick={onSwitchToKiosk}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Patient Kiosk</span>
            </button>
          </div>
        </div>
      </header>

      {/* Top Sticky Emergency Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-800 text-white px-4 py-2.5 shadow-lg flex items-center justify-between z-20 sticky top-16 border-b-2 border-red-500 animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3 text-xs sm:text-sm font-bold max-w-4xl overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="w-3 h-3 rounded-full bg-white animate-ping shrink-0" />
            <span className="bg-red-950/80 px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-black border border-red-400 shrink-0">
              🚨 CRITICAL ALERT AT KIOSK
            </span>
            <span className="truncate">
              Patient: <strong>{isPrivacyMode ? 'Confidential' : activeAlerts[0].patientName}</strong> (Token: <strong className="font-mono underline">{isPrivacyMode ? '***' : activeAlerts[0].opdToken}</strong>) reported high-risk signs ({activeAlerts[0].redFlags?.[0]?.ruleName || 'Potential Warning Sign'})!
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => handleReviewAlertPatient(activeAlerts[0])}
              className="px-3.5 py-1.5 bg-white text-red-700 hover:bg-red-50 active:bg-red-100 rounded-xl text-xs font-black shadow transition flex items-center space-x-1"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Open Dossier Now</span>
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-red-200 hover:text-white hover:bg-red-800 rounded-lg transition"
              title={soundEnabled ? 'Mute Alert Sound' : 'Unmute Alert Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handleDismissAlert(activeAlerts[0])}
              className="p-1.5 text-red-200 hover:text-white hover:bg-red-800 rounded-lg transition text-xs"
              title="Acknowledge Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-Time Emergency Red Flag Modal Alert */}
      {currentEmergencyAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 border-red-600 text-slate-900 relative">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-2xl bg-red-100 border-2 border-red-300 flex items-center justify-center text-red-600 shrink-0 animate-bounce">
                  <AlertOctagon className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] uppercase font-black tracking-widest text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                    High-Priority Triage Notice
                  </span>
                  <h3 className="text-xl font-black text-red-900 mt-1">
                    Emergency Alert at Kiosk
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDismissAlert(currentEmergencyAlert)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Patient: <strong className="text-slate-900 text-sm">{isPrivacyMode ? 'Confidential' : currentEmergencyAlert.patientName}</strong></span>
                <span>Token: <strong className="text-red-700 font-mono text-base">{isPrivacyMode ? '***' : currentEmergencyAlert.opdToken}</strong></span>
              </div>
              <div className="text-xs text-slate-500 mb-2">
                {currentEmergencyAlert.age ? `${currentEmergencyAlert.age} Yrs` : ''} {currentEmergencyAlert.gender ? `• ${currentEmergencyAlert.gender}` : ''} • Detected: {new Date(currentEmergencyAlert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>

              <div className="mt-2 pt-2 border-t border-red-200 space-y-1.5">
                {currentEmergencyAlert.redFlags?.map((rf, idx) => (
                  <div key={idx} className="text-xs text-red-950 font-bold bg-white p-2.5 rounded-xl border border-red-200">
                    <div className="text-red-900 font-extrabold flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-600 shrink-0" />
                      {rf.ruleName || rf.rule_name || 'High Severity Warning Sign'}
                    </div>
                    <div className="font-normal text-red-800 text-[11px] mt-0.5">{rf.message || rf.warning}</div>
                    {rf.rationale && <div className="text-[10px] text-red-600 italic mt-0.5">Rationale: {rf.rationale}</div>}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Patient reported acute safety screening symptoms at the OPD Kiosk terminal. Attending physician clinical review and Stat ECG are urgently recommended.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleReviewAlertPatient(currentEmergencyAlert)}
                className="flex-1 py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Review Patient Dossier Now</span>
              </button>
              <button
                type="button"
                onClick={() => handleDismissAlert(currentEmergencyAlert)}
                className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 transition"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout: Left Queue + Right Dossier */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-5 sm:gap-6">

        {/* LEFT PANEL: OPD PATIENT QUEUE */}
        <div className="w-full lg:w-80 bg-white rounded-3xl shadow-sm border border-slate-200 p-4 flex flex-col shrink-0 h-auto max-h-96 lg:max-h-none lg:h-[calc(100vh-140px)]">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-extrabold text-slate-900 text-base">OPD Queue</h2>
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
              {filteredSessions.length} Patients
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 mb-3 text-xs">
            {['all', 'allopathy', 'ayush', 'flagged'].map(f => (
              <button
                key={f}
                onClick={() => setFilterSystem(f)}
                className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition ${filterSystem === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredSessions.map((s) => {
              const isSelected = selectedSessionId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => loadSessionDetail(s.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition text-left ${isSelected
                    ? 'border-sky-600 bg-sky-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-slate-900 text-sm">
                        {isPrivacyMode ? 'Patient Confidential' : (s.patient_name || 'Walk-in Patient')}
                      </span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {isPrivacyMode ? '***' : `${s.age}Y / ${s.gender}`} • Token: <strong className="text-slate-700 font-mono">{isPrivacyMode ? '***' : (s.opd_token_number || 'N/A')}</strong>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${s.clinical_system === 'ayush' ? 'bg-teal-100 text-teal-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                      {s.clinical_system}
                    </span>
                  </div>

                  {s.red_flag_detected && (
                    <div className="mt-2 text-[11px] font-black text-red-600 flex items-center bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 animate-pulse">
                      <AlertOctagon className="w-4 h-4 mr-1 shrink-0 text-red-600" />
                      <span>ALERT: HIGH SEVERITY RISK {s.pain_severity ? `(${s.pain_severity}/10)` : ''}</span>
                    </div>
                  )}

                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Status: <strong className="uppercase text-slate-600">{s.status}</strong></span>
                    <span>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: CLINICAL DOSSIER */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col min-w-0 h-auto lg:h-[calc(100vh-140px)] overflow-y-auto">

          {dossier ? (
            <div>

              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-5 mb-6 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {isPrivacyMode ? 'Patient Confidential' : currentPatientName}
                    </h2>
                    <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-300">
                      ABHA: {currentAbha}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Age: <strong>{isPrivacyMode ? '**' : (currentAge ? `${currentAge} Yrs` : 'N/A')}</strong> • Gender: <strong>{currentGender || 'N/A'}</strong> • Phone: <strong>{isPrivacyMode ? '***' : currentPhone}</strong> • OPD Token: <strong className="text-sky-700 font-mono font-bold">{isPrivacyMode ? '***' : currentToken}</strong>
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleInspectFhir}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center space-x-1.5"
                  >
                    <Eye className="w-4 h-4 text-sky-600" />
                    <span>Inspect FHIR R4</span>
                  </button>

                  <button
                    disabled={isSigning}
                    onClick={handleVerifySign}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{isSigning ? 'Signing...' : 'Verify & Sign'}</span>
                  </button>

                  <button
                    disabled={isPushing}
                    onClick={handlePushToAbdm}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isPushing ? 'Pushing...' : 'Push to HIS/ABDM'}</span>
                  </button>
                </div>
              </div>

              {/* RED FLAG BANNER (IF DETECTED) */}
              {dossier.session?.red_flag_detected && (
                <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-5 mb-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-red-800 font-black text-base">
                      <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 animate-bounce" />
                      <span>CRITICAL ALERT: HIGH SEVERITY RISK DETECTED AT KIOSK</span>
                    </div>
                    <span className="px-3 py-1 bg-red-600 text-white text-xs font-black rounded-full uppercase tracking-wider self-start sm:self-auto">
                      Immediate Physician Review
                    </span>
                  </div>
                  <p className="text-xs text-red-800 mt-2 font-semibold leading-relaxed">
                    Patient reported acute high severity risk symptoms at the OPD Kiosk{dossier.session?.pain_severity ? ` (Heart Pain Severity Score: ${dossier.session.pain_severity}/10)` : ''}. Immediate clinical review, STAT ECG, and acute triage prioritization required.
                  </p>

                  {/* Triggered Red Flags Details */}
                  {((dossier.summary?.red_flags_summary && dossier.summary.red_flags_summary.length > 0) || (dossier.session?.red_flags && dossier.session.red_flags.length > 0)) && (
                    <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-red-900 block">
                        Triggered Safety Screening Flags:
                      </span>
                      {(dossier.summary?.red_flags_summary || dossier.session?.red_flags || []).map((rf, idx) => (
                        <div key={idx} className="bg-white border border-red-300 rounded-xl p-3 text-xs text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-sm">
                          <div>
                            <span className="font-bold text-red-900 text-sm">{rf.rule_name || rf.ruleName || 'High Severity Risk Flag'}</span>
                            <p className="text-xs text-red-700 mt-0.5">{rf.warning || rf.message}</p>
                            {rf.rationale && <p className="text-[11px] text-red-600 italic mt-0.5">Rationale: {rf.rationale}</p>}
                          </div>
                          <span className="text-[10px] font-black bg-red-100 text-red-800 px-2.5 py-1 rounded-md border border-red-300 uppercase shrink-0 self-start sm:self-auto">
                            {rf.severity || 'CRITICAL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tabs Header */}
              <div className="flex border-b border-slate-200 space-x-6 mb-6 text-sm font-bold">
                <button
                  onClick={() => setActiveTab('clinical')}
                  className={`pb-3 transition flex items-center space-x-2 ${activeTab === 'clinical' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Clinical Case & HPI</span>
                </button>

                {dossier.session?.clinical_system === 'ayush' && (
                  <button
                    onClick={() => setActiveTab('ayush')}
                    className={`pb-3 transition flex items-center space-x-2 ${activeTab === 'ayush' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    <Flower2 className="w-4 h-4" />
                    <span>AYUSH Dashavidha Pariksha</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`pb-3 transition flex items-center space-x-2 ${activeTab === 'timeline' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Document Timeline ({dossier.documents?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-3 transition flex items-center space-x-2 ${activeTab === 'notes' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Doctor Notes & Verification</span>
                </button>
              </div>

              {/* TAB 1: CLINICAL CASE & HPI */}
              {activeTab === 'clinical' && (
                <div className="space-y-6">

                  {/* Chief Complaint */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Chief Complaint</span>
                    <p className="text-base font-bold text-slate-900 mt-1">
                      {dossier.summary?.chief_complaint || 'Chest discomfort reported at kiosk'}
                    </p>
                  </div>

                  {/* History of Present Illness (HPI) */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">History of Present Illness (HPI)</span>
                    <p className="text-sm text-slate-800 mt-2 leading-relaxed">
                      {dossier.summary?.hpi_summary || 'Clinical history gathered via adaptive questionnaire.'}
                    </p>
                  </div>

                  {/* Grid of Medical, Drug, Allergy & Family History */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Past Medical History</span>
                      <p className="text-sm font-semibold text-slate-800 mt-1">
                        {dossier.summary?.past_history || 'None reported'}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Medications</span>
                      <p className="text-sm font-semibold text-slate-800 mt-1">
                        {dossier.summary?.medications_summary || 'None reported'}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Allergy History</span>
                      <p className="text-sm font-semibold text-slate-800 mt-1">
                        {dossier.summary?.allergies_summary || 'No known allergies reported'}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Family & Personal History</span>
                      <p className="text-sm font-semibold text-slate-800 mt-1">
                        Family: {dossier.summary?.family_history || 'Negative'} • Habits: {dossier.summary?.personal_history || 'None'}
                      </p>
                    </div>

                  </div>

                  {/* Review of Systems */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Review of Systems (ROS)</span>
                    <p className="text-sm text-slate-700 mt-1">
                      {dossier.summary?.review_of_systems || 'Negative for major systemic signs.'}
                    </p>
                  </div>

                </div>
              )}

              {/* TAB 2: AYUSH DASHAVIDHA PARIKSHA MATRIX */}
              {activeTab === 'ayush' && (
                <div className="space-y-4">
                  <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl">
                    <h3 className="font-bold text-teal-900 text-sm">Ayurvedic Dashavidha Rogi Pariksha Assessment</h3>
                    <p className="text-xs text-teal-700 mt-0.5">
                      Standard 10-fold clinical examination synthesized for AYUSH OPD physician validation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="font-bold text-slate-500 uppercase">1. Sharirika Prakriti (Body Build)</span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {dossier.summary?.ayush_assessment?.prakriti?.body_build || 'Vata-Pitta Predominant'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="font-bold text-slate-500 uppercase">2. Twak & Kesh (Skin & Hair)</span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {dossier.summary?.ayush_assessment?.prakriti?.skin_hair || 'Dry / Cool texturing'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="font-bold text-slate-500 uppercase">3. Agni Pariksha (Digestive Fire)</span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {dossier.summary?.ayush_assessment?.agni || 'Vishama Agni (Irregular)'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="font-bold text-slate-500 uppercase">4. Koshtha Pariksha (Bowel Pattern)</span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {dossier.summary?.ayush_assessment?.koshtha || 'Krura Koshtha (Hard/Constipated Tendency)'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="font-bold text-slate-500 uppercase">5. Ahara Shakti & Satmya</span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        Capacity: {dossier.summary?.ayush_assessment?.ahara_shakti || 'Madhyama'} | Rasa: {dossier.summary?.ayush_assessment?.rasa_preference || 'Katu-Amla'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="font-bold text-slate-500 uppercase">6. Vyayama Shakti (Endurance)</span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {dossier.summary?.ayush_assessment?.vyayama_shakti || 'Madhyama Balata'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="font-bold text-slate-500 uppercase">7. Nidra & Manasa (Sleep & Sattva)</span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        Nidra: {dossier.summary?.ayush_assessment?.nidra || 'Alpa / Light'} | Sattva: {dossier.summary?.ayush_assessment?.sattva || 'Rajas/Anxious'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="font-bold text-slate-500 uppercase">8. Vihara & Vaya (Lifestyle & Stage)</span>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        Routine: {dossier.summary?.ayush_assessment?.vihara || 'Sedentary'} | Age: {dossier.summary?.ayush_assessment?.vaya || 'Madhyama (Adult)'}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENT TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl text-xs text-sky-800">
                    Chronological timeline of digitized medical documents. OCR extracted findings require attending physician verification.
                  </div>

                  {dossier.documents?.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-8">No previous documents uploaded for this patient.</p>
                  ) : (
                    <div className="space-y-4">
                      {dossier.documents?.map((doc, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                          <div className="flex items-center justify-between font-bold text-sm text-slate-900 mb-2">
                            <span className="flex items-center space-x-2 text-sky-800">
                              <FileText className="w-5 h-5 text-sky-600 mr-1" />
                              {doc.file_name}
                            </span>
                            <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                              {doc.document_date || 'Date unavailable'}
                            </span>
                          </div>

                          {doc.extractions?.diagnoses?.length > 0 && (
                            <div className="text-xs text-slate-700 mt-2">
                              <strong>Diagnoses:</strong> {doc.extractions.diagnoses.join(', ')}
                            </div>
                          )}

                          {doc.extractions?.medications?.length > 0 && (
                            <div className="text-xs text-slate-700 mt-2">
                              <strong>Medications:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-0.5">
                                {doc.extractions.medications.map((m, mIdx) => (
                                  <li key={mIdx}>{m.name} - {m.dosage} ({m.frequency})</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {doc.extractions?.lab_results?.length > 0 && (
                            <div className="text-xs text-slate-700 mt-2">
                              <strong>Lab Results:</strong>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                                {doc.extractions.lab_results.map((lab, lIdx) => (
                                  <div key={lIdx} className="bg-white p-2 rounded-lg border border-slate-200">
                                    <div className="font-bold text-slate-900">{lab.test}</div>
                                    <div className="text-sky-700 font-mono">{lab.value}</div>
                                    {lab.flag && <span className="text-[10px] text-red-600 font-bold">{lab.flag}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MEDICAL REPORT & VERIFICATION */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  {/* Printable Report Section */}
                  <div id="printable-report" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 print:shadow-none print:border-none print:p-0">
                    {/* Header */}
                    <div className="border-b border-slate-200 pb-6 mb-6">
                      <h2 className="text-2xl font-black text-slate-900 mb-1">Medical Report Summary</h2>
                      <p className="text-sm text-slate-500 font-medium">Auto-generated via MediKiosk Triage • {dossier.summary?.date || new Date().toLocaleDateString()}</p>
                    </div>

                    {/* Patient Demographics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Patient Name</span>
                        <span className="font-semibold text-slate-900 text-sm">{isPrivacyMode ? '(MASKED)' : currentPatientName}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Age & Gender</span>
                        <span className="font-semibold text-slate-900 text-sm">{isPrivacyMode ? '**' : (currentAge ? `${currentAge} Yrs` : '')} {currentGender ? `• ${currentGender}` : ''}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">OPD Token</span>
                        <span className="font-semibold text-sky-700 font-mono text-sm font-bold">{isPrivacyMode ? 'OPD-***' : currentToken}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">System</span>
                        <span className="font-semibold text-slate-900 text-sm uppercase">{currentSystem}</span>
                      </div>
                    </div>

                    {/* Editable Sections */}
                    <div className="space-y-6">
                      <div>
                        <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          <Activity className="w-4 h-4 mr-2 text-sky-600" />
                          Clinical Summary (HPI)
                        </label>
                        <textarea
                          rows={4}
                          value={editedHpi}
                          onChange={(e) => setEditedHpi(e.target.value)}
                          className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none text-sm text-slate-800 transition shadow-sm print:border-none print:p-0 print:bg-transparent"
                        />
                      </div>

                      <div>
                        <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          <AlertOctagon className="w-4 h-4 mr-2 text-amber-500" />
                          Provisional Diagnosis
                        </label>
                        <input
                          type="text"
                          value={provisionalDiagnosis}
                          onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                          placeholder="e.g. Angina Pectoris / Essential Hypertension"
                          className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none text-sm font-semibold text-slate-900 transition shadow-sm print:border-none print:p-0 print:bg-transparent"
                        />
                      </div>

                      <div>
                        <label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          <Stethoscope className="w-4 h-4 mr-2 text-emerald-600" />
                          Treatment Plan & Prescription
                        </label>
                        <textarea
                          rows={5}
                          value={physicianNotes}
                          onChange={(e) => setPhysicianNotes(e.target.value)}
                          placeholder="Enter prescription instructions, follow-up tests, or dietary advice..."
                          className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm text-slate-800 transition shadow-sm print:border-none print:p-0 print:bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions (Hidden on Print) */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 print:hidden">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition flex items-center space-x-2"
                    >
                      <Printer className="w-5 h-5" />
                      <span>Print PDF Report</span>
                    </button>

                    <button
                      disabled={isSigning}
                      onClick={handleVerifySign}
                      className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base rounded-2xl shadow-lg transition flex items-center space-x-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>{isSigning ? 'Signing Record...' : 'Verify, Sign & Generate FHIR'}</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Select a patient from the OPD queue to inspect the clinical record.
            </div>
          )}

        </div>

      </div>

      {/* FHIR Bundle Inspector Modal */}
      <FhirModal
        isOpen={showFhirModal}
        onClose={() => setShowFhirModal(false)}
        fhirBundle={fhirBundle}
        sessionId={selectedSessionId}
      />

      {/* ABDM Push Receipt Modal */}
      {showAbdmReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Pushed to Mock HIS / ABDM
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-6">
              The verified clinical case record has been transmitted to the Hospital Information System and Ayushman Bharat Digital Mission gateway.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2 mb-6 font-mono text-slate-700">
              <div><strong>Status:</strong> <span className="text-emerald-600 font-bold">ACK_SUCCESS_200</span></div>
              <div><strong>Transaction ID:</strong> {abdmReceipt?.transactionId}</div>
              <div><strong>HIP Provider:</strong> {abdmReceipt?.hipId}</div>
              <div><strong>ABHA ID:</strong> {abdmReceipt?.abhaId}</div>
              <div><strong>Payload:</strong> FHIR R4 DocumentBundle ({abdmReceipt?.bundleSummary?.entriesCount} entries)</div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSendSmsReminder}
                disabled={isSendingSms}
                className={`w-full py-3.5 font-bold rounded-xl transition flex items-center justify-center space-x-2 ${
                  isSendingSms 
                    ? 'bg-blue-400 cursor-not-allowed text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span>{isSendingSms ? 'Sending SMS...' : 'Send Visit Reminder SMS'}</span>
              </button>
              
              {smsStatus && (
                <div className={`p-3 rounded-lg text-sm font-medium ${
                  smsStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {smsStatus.msg}
                </div>
              )}

              <button
                onClick={() => setShowAbdmReceipt(false)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABDM + Hybrid Blockchain Inter-Hospital Exchange Modal */}
      <AbdmBlockchainTransferModal
        isOpen={showAbdmBlockchainModal}
        onClose={() => setShowAbdmBlockchainModal(false)}
        selectedPatient={{
          ...dossierPatient,
          full_name: currentPatientName,
          age: currentAge,
          gender: currentGender,
          abha_id: currentAbha,
          chief_complaint: dossier?.summary?.chief_complaint || dossierSession?.chief_complaint || 'OPD Intake'
        }}
        fhirBundle={fhirBundle}
      />

    </div>
  );
}
