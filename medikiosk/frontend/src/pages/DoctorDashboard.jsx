import React, { useState, useEffect } from 'react';
import {
  Stethoscope, AlertOctagon, CheckCircle, FileText, Send,
  Download, Eye, Edit3, ShieldAlert, ArrowLeft, RefreshCw,
  Clock, User, HeartPulse, Flower2, ChevronRight, Activity, Calendar
} from 'lucide-react';
import { DoctorService } from '../services/api';
import FhirModal from '../components/FhirModal';

export default function DoctorDashboard({ onSwitchToKiosk }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [activeTab, setActiveTab] = useState('clinical'); // 'clinical' | 'ayush' | 'timeline' | 'notes'
  const [filterSystem, setFilterSystem] = useState('all'); // 'all' | 'allopathy' | 'ayush' | 'flagged'
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

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

  useEffect(() => {
    loadSessions();
  }, []);

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
        setProvisionalDiagnosis(res.review?.provisional_diagnosis || (res.session.clinical_system === 'ayush' ? 'Ajeerna / Vata-Pitta Prakriti Imbalance' : 'Suspected Angina / Acute Coronary Syndrome Rule-Out'));
        setPhysicianNotes(res.summary?.physician_notes || res.review?.prescription_notes || '');
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
        verificationStatus: 'verified',
        provisionalDiagnosis,
        prescriptionNotes: physicianNotes,
        editedSummary: {
          hpi_summary: editedHpi,
          physician_notes: physicianNotes
        }
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
      }
    } catch (err) {
      alert('Error pushing to mock ABDM: ' + err.message);
    } finally {
      setIsPushing(false);
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (filterSystem === 'all') return true;
    if (filterSystem === 'flagged') return s.red_flag_detected;
    return s.clinical_system === filterSystem;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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

          <div className="flex items-center space-x-3">
            <button
              onClick={loadSessions}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
              title="Refresh OPD Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

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

      {/* Main Workspace Layout: Left Queue + Right Dossier */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">

        {/* LEFT PANEL: OPD PATIENT QUEUE */}
        <div className="w-full lg:w-80 bg-white rounded-3xl shadow-sm border border-slate-200 p-4 flex flex-col shrink-0 h-[calc(100vh-140px)]">
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
                className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition ${
                  filterSystem === f
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
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition text-left ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-slate-900 text-sm">
                        {s.patient_name || 'Walk-in Patient'}
                      </span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {s.age}Y / {s.gender} • Token: <strong className="text-slate-700 font-mono">{s.opd_token_number || 'N/A'}</strong>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      s.clinical_system === 'ayush' ? 'bg-teal-100 text-teal-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {s.clinical_system}
                    </span>
                  </div>

                  {s.red_flag_detected && (
                    <div className="mt-2 text-[11px] font-black text-red-600 flex items-center bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      <AlertOctagon className="w-3.5 h-3.5 mr-1 shrink-0" />
                      <span>RED FLAG TRIAGE</span>
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
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-[calc(100vh-140px)] overflow-y-auto">
          
          {dossier ? (
            <div>
              
              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-5 mb-6 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-2xl font-black text-slate-900">
                      {dossier.patient?.full_name || 'Patient Case File'}
                    </h2>
                    <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-300">
                      ABHA: {dossier.patient?.abha_id || '91-XXXX-XXXX-XXXX'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Age: <strong>{dossier.patient?.age} Yrs</strong> • Gender: <strong>{dossier.patient?.gender}</strong> • Phone: <strong>{dossier.patient?.phone}</strong> • OPD Token: <strong className="text-sky-700">{dossier.session?.opd_token_number}</strong>
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
                <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 mb-6 animate-pulse">
                  <div className="flex items-center space-x-2 text-red-800 font-black text-sm">
                    <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
                    <span>CRITICAL RED-FLAG ALERT TRIGGERED AT KIOSK</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1 font-medium">
                    Patient reported acute high-risk symptoms (e.g. left arm radiation / high pain intensity / fainting). STAT ECG and urgent physician review recommended.
                  </p>
                </div>
              )}

              {/* Tabs Header */}
              <div className="flex border-b border-slate-200 space-x-6 mb-6 text-sm font-bold">
                <button
                  onClick={() => setActiveTab('clinical')}
                  className={`pb-3 transition flex items-center space-x-2 ${
                    activeTab === 'clinical' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Clinical Case & HPI</span>
                </button>

                {dossier.session?.clinical_system === 'ayush' && (
                  <button
                    onClick={() => setActiveTab('ayush')}
                    className={`pb-3 transition flex items-center space-x-2 ${
                      activeTab === 'ayush' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Flower2 className="w-4 h-4" />
                    <span>AYUSH Dashavidha Pariksha</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`pb-3 transition flex items-center space-x-2 ${
                    activeTab === 'timeline' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Document Timeline ({dossier.documents?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-3 transition flex items-center space-x-2 ${
                    activeTab === 'notes' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-500 hover:text-slate-800'
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

              {/* TAB 4: DOCTOR NOTES & VERIFICATION */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Editable Clinical Summary (Doctor Review)
                    </label>
                    <textarea
                      rows={4}
                      value={editedHpi}
                      onChange={(e) => setEditedHpi(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none text-sm text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Provisional Diagnosis
                    </label>
                    <input
                      type="text"
                      value={provisionalDiagnosis}
                      onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                      placeholder="e.g. Angina Pectoris / Essential Hypertension"
                      className="w-full p-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Physician Treatment Plan & Prescription Notes
                    </label>
                    <textarea
                      rows={4}
                      value={physicianNotes}
                      onChange={(e) => setPhysicianNotes(e.target.value)}
                      placeholder="Enter prescription instructions, follow-up tests (ECG, Troponin), or dietary advice..."
                      className="w-full p-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none text-sm text-slate-800"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-end">
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

            <button
              onClick={() => setShowAbdmReceipt(false)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
