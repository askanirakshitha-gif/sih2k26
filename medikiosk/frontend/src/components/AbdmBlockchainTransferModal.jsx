import React, { useState, useEffect } from 'react';
import {
  X, Shield, Building2, KeyRound, CheckCircle2, Lock, ArrowRight,
  RefreshCw, FileText, Activity, AlertTriangle, Cpu, Database, Share2,
  Check, Copy, ShieldCheck, ExternalLink, UserCheck, Flame, Layers
} from 'lucide-react';
import { AbdmBlockchainService, DISCOVERED_FACILITIES } from '../services/abdmBlockchainGateway';

export default function AbdmBlockchainTransferModal({ isOpen, onClose, selectedPatient, fhirBundle, currentHospital }) {
  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'consent' | 'ledger'
  const [abhaIdInput, setAbhaIdInput] = useState(selectedPatient?.abha_id || '91-2345-6789-0123');
  const [selectedFacility, setSelectedFacility] = useState('hip-aiims-delhi');
  const [requesterFacilityId, setRequesterFacilityId] = useState('');
  const [recordScope, setRecordScope] = useState('Past 6 Months - All Records');
  
  // Consent Request State
  const [consentReq, setConsentReq] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [transferStatus, setTransferStatus] = useState('idle'); // 'idle' | 'pending' | 'approved' | 'rejected'
  const [decryptedData, setDecryptedData] = useState(null);
  const [txnToken, setTxnToken] = useState('');
  const [sha256Hash, setSha256Hash] = useState('');

  // Ledger & Verification State
  const [ledger, setLedger] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifyingHash, setIsVerifyingHash] = useState(false);

  // Resolve effective current hospital
  const [effectiveHospital, setEffectiveHospital] = useState(currentHospital);

  useEffect(() => {
    if (!effectiveHospital) {
      const stored = localStorage.getItem('lastVisitedHospital');
      if (stored) {
        try {
          setEffectiveHospital(JSON.parse(stored));
        } catch(e) {}
      }
    }
  }, [currentHospital, effectiveHospital]);

  const [facilitiesList, setFacilitiesList] = useState(DISCOVERED_FACILITIES);

  useEffect(() => {
    if (isOpen) {
      loadLedger();
      if (selectedPatient?.abha_id) {
        setAbhaIdInput(selectedPatient.abha_id);
      }
      
      const prevStr = localStorage.getItem('previousVisitedHospital');
      if (prevStr) {
        try {
          const prevData = JSON.parse(prevStr);
          // Check if this hospital is already in the list
          const exists = facilitiesList.find(f => f.id === prevData.id);
          if (!exists) {
            setFacilitiesList(prev => [prevData, ...prev]);
          }
          setSelectedFacility(prevData.id);
        } catch(e) {
          console.error('Failed to parse previous hospital', e);
        }
      }

      if (effectiveHospital) {
        const exists = facilitiesList.find(f => f.id === effectiveHospital.id);
        if (!exists) {
          setFacilitiesList(prev => [effectiveHospital, ...prev]);
        }
        setRequesterFacilityId(effectiveHospital.id);
      }
    }
  }, [isOpen, selectedPatient, facilitiesList, effectiveHospital]);

  if (!isOpen) return null;

  const loadLedger = () => {
    const res = AbdmBlockchainService.getBlockchainLedger();
    if (res.success) {
      setLedger(res.ledger);
    }
  };

  // Step 1: Doctor at Hospital B triggers Data Request via ABDM HIE-CM
  const handleTriggerRequest = async () => {
    setTransferStatus('pending');
    setDecryptedData(null);
    setVerificationResult(null);

    const providerFac = facilitiesList.find(f => f.id === selectedFacility);
    const providerName = providerFac ? providerFac.facilityName : 'Unknown Facility';

    const reqFac = facilitiesList.find(f => f.id === requesterFacilityId) || effectiveHospital;
    const hospitalName = reqFac?.name || reqFac?.facilityName || 'Manipal Hospital HAL (Hospital B)';

    const res = await AbdmBlockchainService.requestConsent({
      abhaId: abhaIdInput,
      patientName: selectedPatient?.full_name || selectedPatient?.patient_name || 'Ramesh Sharma',
      requesterDoctor: `Dr. A. K. Sharma (${hospitalName})`,
      requesterHospital: hospitalName,
      providerFacilityId: selectedFacility,
      providerFacilityName: providerName,
      scope: recordScope,
      validityHours: 24
    });

    if (res.success) {
      setConsentReq(res.consentRequest);
      setOtpInput(res.otpDebug);
      setActiveTab('consent'); // Automatically switch to consent simulator tab
    }
  };

  // Step 2: Patient Approves Request & Mints On-Chain Block
  const handleApproveConsent = async () => {
    if (!consentReq) return;

    const sampleRecords = fhirBundle || {
      resourceType: 'Bundle',
      type: 'collection',
      id: `bundle-transfer-${Date.now()}`,
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: selectedPatient?.id || 'p-101',
            name: [{ text: selectedPatient?.full_name || 'Ramesh Sharma' }],
            gender: selectedPatient?.gender || 'Male'
          }
        },
        {
          resource: {
            resourceType: 'Condition',
            clinicalStatus: { coding: [{ code: 'active' }] },
            verificationStatus: { coding: [{ code: 'confirmed' }] },
            code: { text: selectedPatient?.chief_complaint || 'Acute Chest Discomfort - High Severity' }
          }
        },
        {
          resource: {
            resourceType: 'MedicationRequest',
            status: 'active',
            medicationCodeableConcept: { text: selectedPatient?.medications_summary || 'Telmisartan 40mg OD, Atorvastatin 20mg OD' }
          }
        }
      ]
    };

    const res = await AbdmBlockchainService.approveConsent({
      requestId: consentReq.requestId,
      otpInput,
      patientRecordsData: sampleRecords
    });

    if (res.success) {
      setTransferStatus('approved');
      setDecryptedData(res.decryptedFhirData);
      setSha256Hash(res.sha256Hash);
      setTxnToken(res.smartContractToken);
      loadLedger();
      setActiveTab('request'); // Switch back to view decrypted data timeline
    } else {
      alert(res.error || 'Approval failed.');
    }
  };

  // Step 3: Patient Rejects Consent Request
  const handleRejectConsent = () => {
    if (!consentReq) return;
    AbdmBlockchainService.rejectConsent(consentReq.requestId);
    setTransferStatus('rejected');
    setActiveTab('request');
  };

  // Step 4: Revoke Access (DPDP Act 2023 Compliance)
  const handleRevoke = (blockNum) => {
    const res = AbdmBlockchainService.revokeAccess(blockNum);
    if (res.success) {
      loadLedger();
      if (transferStatus === 'approved') setTransferStatus('idle');
    }
  };

  // Step 5: Cryptographic Data Integrity Verification Tool
  const handleVerifyIntegrity = async () => {
    if (!decryptedData || !sha256Hash) return;
    setIsVerifyingHash(true);
    const res = await AbdmBlockchainService.verifyDataIntegrity(decryptedData, sha256Hash);
    setIsVerifyingHash(false);
    setVerificationResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30 shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">ABDM Gateway + Hybrid Blockchain Exchange</h2>
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                  Hospital A ➔ Hospital B
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                HL7 FHIR R4 Interoperability • On-Chain Tamper-Proof Audit Trail • DPDP Act 2023 Compliant
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex items-center space-x-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('request')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'request'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. Hospital B Data Request (HIU Mode)</span>
          </button>

          <button
            onClick={() => setActiveTab('consent')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition relative ${
              activeTab === 'consent'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>2. Patient Consent Simulator (ABDM / OTP)</span>
            {transferStatus === 'pending' && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-0 right-0" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'ledger'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-500" />
            <span>3. Blockchain On-Chain Audit Ledger</span>
            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] rounded-md">
              {ledger.length} Blocks
            </span>
          </button>
        </div>

        {/* TAB 1: HOSPITAL B DATA REQUEST MODE */}
        {activeTab === 'request' && (
          <div className="p-6 flex-1 overflow-auto space-y-6 bg-slate-50/50">
            
            {/* Request Card Form */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center">
                    <Building2 className="w-4 h-4 text-sky-600 mr-2" />
                    {facilitiesList.find(f => f.id === requesterFacilityId)?.facilityName || facilitiesList.find(f => f.id === requesterFacilityId)?.name || 'Requester (Hospital B)'} ➔ {facilitiesList.find(f => f.id === selectedFacility)?.facilityName || facilitiesList.find(f => f.id === selectedFacility)?.name || 'Provider (Hospital A)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Query ABDM Health Information Exchange (HIE-CM) to locate records at the selected provider.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-sky-50 text-sky-800 text-[11px] font-bold rounded-lg border border-sky-200">
                    HIU Node: {facilitiesList.find(f => f.id === requesterFacilityId)?.abdmFacilityId || 'MANIPAL_BLR_01'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient ABHA ID Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Patient Universal ABHA ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={abhaIdInput}
                    onChange={(e) => setAbhaIdInput(e.target.value)}
                    placeholder="e.g. 91-2345-6789-0123"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none bg-slate-50"
                  />
                </div>

                {/* Discovered Facility Selector (Provider) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Discovered Health Facility (HIP Node - Hospital A)
                  </label>
                  <select
                    value={selectedFacility}
                    onChange={(e) => setSelectedFacility(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                  >
                    {facilitiesList.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.facilityName || f.name} ({f.abdmFacilityId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Requester Facility Selector (Hospital B) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Requester Health Facility (HIU Node - Hospital B)
                  </label>
                  <select
                    value={requesterFacilityId}
                    onChange={(e) => setRequesterFacilityId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                  >
                    {facilitiesList.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.facilityName || f.name} ({f.abdmFacilityId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Record Scope Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Requested Data Scope & Period
                  </label>
                  <select
                    value={recordScope}
                    onChange={(e) => setRecordScope(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                  >
                    <option value="Past 6 Months - All Records">Past 6 Months - All Clinical Records</option>
                    <option value="Past 1 Month - OPD Consultation">Past 1 Month - OPD Consultation</option>
                    <option value="Only Prescriptions & Medications">Only Prescriptions & Medications</option>
                    <option value="Only Cardiology Lab Reports">Only Cardiology Lab Reports</option>
                    <option value="AYUSH SACTP Case Files">AYUSH SACTP Case Files</option>
                  </select>
                </div>
              </div>

              {/* Action Trigger Button */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Encrypted TLS 1.3 Point-to-Point Stream • Patient Consent Required</span>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerRequest}
                  className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
                >
                  <span>Request Health Records via ABDM</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Pipeline Status Badge */}
            {transferStatus !== 'idle' && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                transferStatus === 'pending'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
                  : transferStatus === 'approved'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <div className="flex items-center space-x-3">
                  {transferStatus === 'pending' && <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />}
                  {transferStatus === 'approved' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {transferStatus === 'rejected' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
                  <div>
                    <div className="text-sm font-extrabold">
                      {transferStatus === 'pending' && 'ABDM Consent Request Pending (OTP Sent to Patient Mobile)'}
                      {transferStatus === 'approved' && 'Access Granted: Hospital A FHIR Bundle Decrypted & Rendered!'}
                      {transferStatus === 'rejected' && 'Transfer Aborted: Patient Denied Consent Access.'}
                    </div>
                    <p className="text-[11px] opacity-80 font-normal mt-0.5">
                      {transferStatus === 'approved' && `Smart Contract Token: ${txnToken} • SHA-256 Data Hash Verified.`}
                    </p>
                  </div>
                </div>

                {transferStatus === 'approved' && (
                  <button
                    type="button"
                    onClick={handleVerifyIntegrity}
                    disabled={isVerifyingHash}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition shadow-xs flex items-center space-x-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{isVerifyingHash ? 'Verifying Hash...' : 'Verify Cryptographic Hash'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Hash Verification Output Notice */}
            {verificationResult && (
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                verificationResult.isAuthentic ? 'bg-emerald-900 text-emerald-100 border-emerald-700' : 'bg-red-900 text-red-100 border-red-700'
              }`}>
                <div className="font-extrabold flex items-center space-x-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{verificationResult.verificationMessage}</span>
                </div>
                <div className="font-mono text-[11px] pt-1 opacity-90">
                  <div>Computed Hash : {verificationResult.computedHash}</div>
                  <div>On-Chain Hash: {verificationResult.onChainHash}</div>
                </div>
              </div>
            )}

            {/* Decrypted HL7 FHIR Bundle Records View (Hospital B View) */}
            {decryptedData && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center">
                    <FileText className="w-4 h-4 text-sky-600 mr-2" />
                    Decrypted Hospital A Records (HL7 FHIR R4 Bundle Timeline)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Bundle ID: {decryptedData.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Patient Resource (FHIR Patient)
                    </span>
                    <p className="font-bold text-slate-900">
                      {selectedPatient?.full_name || 'Ramesh Sharma'} ({selectedPatient?.gender || 'Male'}, {selectedPatient?.age || 54} Yrs)
                    </p>
                    <p className="text-slate-500 mt-1 font-mono">ABHA: {selectedPatient?.abha_id || abhaIdInput}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Condition & Chief Complaint Resource
                    </span>
                    <p className="font-bold text-slate-900">
                      {selectedPatient?.chief_complaint || 'Acute retrosternal crushing chest pain (Severity 8/10)'}
                    </p>
                    <p className="text-slate-500 mt-1 font-medium">System: Allopathy / Emergency Cardiology</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      MedicationStatement / Prescription
                    </span>
                    <p className="font-bold text-slate-800">
                      {selectedPatient?.medications_summary || 'Telmisartan 40mg OD, Atorvastatin 20mg OD, Ecosprin 75mg OD'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Past History & Allergies
                    </span>
                    <p className="font-bold text-slate-800">
                      Past: {selectedPatient?.past_history || 'Hypertension, Dyslipidemia'}
                    </p>
                    <p className="text-slate-500 mt-0.5">Allergies: {selectedPatient?.allergies_summary || 'No known drug allergies'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PATIENT CONSENT & OTP SIMULATOR */}
        {activeTab === 'consent' && (
          <div className="p-6 flex-1 overflow-auto space-y-6 bg-slate-50/50">
            <div className="max-w-lg mx-auto bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-lg space-y-5 fade-in">
              
              <div className="flex items-center space-x-3 text-amber-900 border-b border-amber-200 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Patient Mobile Consent Simulator (DPDP Act 2023)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Simulating SMS OTP push notification sent to ABHA linked mobile (+91 ******0001).
                  </p>
                </div>
              </div>

              {consentReq ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-slate-800">
                    <div className="font-bold text-amber-900 text-sm flex items-center justify-between">
                      <span>Consent Request Notice</span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-[10px] uppercase font-bold">
                        Pending OTP
                      </span>
                    </div>
                    <p className="leading-relaxed">
                      <strong>{consentReq.requesterHospital}</strong> ({consentReq.requesterDoctor}) has requested access to your past medical records from <strong>{consentReq.providerFacilityName}</strong>.
                    </p>
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-amber-200/60 font-mono">
                      Scope: {consentReq.scope} • Validity: {consentReq.validityHours} Hours
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enter 6-Digit SMS Verification OTP
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="flex-1 p-3 rounded-xl border border-amber-400 bg-white font-mono text-center font-extrabold text-base tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setOtpInput(consentReq.otpCode || '123456')}
                        className="px-3 py-3 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs transition"
                      >
                        Auto-fill OTP
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleRejectConsent}
                      className="py-3 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl transition"
                    >
                      Deny Access
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveConsent}
                      className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Mint Block</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">
                  No active consent request pending. Please trigger a request from Tab 1.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BLOCKCHAIN ON-CHAIN AUDIT LEDGER */}
        {activeTab === 'ledger' && (
          <div className="p-6 flex-1 overflow-auto space-y-5 bg-slate-900 text-slate-100 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">
                  Hyperledger Fabric / On-Chain Audit Ledger (Immutable)
                </h3>
              </div>
              <span className="text-[11px] bg-indigo-900/60 text-indigo-300 border border-indigo-700 px-2.5 py-1 rounded-lg">
                Consortium Consensus: ACTIVE (PBFT)
              </span>
            </div>

            {/* Audit Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                    <th className="p-3">Block #</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Requester (HIU) ➔ Provider (HIP)</th>
                    <th className="p-3">ABHA ID</th>
                    <th className="p-3">SHA-256 Integrity Hash</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ledger.map((entry) => (
                    <tr key={entry.blockNumber} className="hover:bg-slate-900/60 transition">
                      <td className="p-3 font-bold text-indigo-400">#{entry.blockNumber}</td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium text-slate-200">
                        {entry.requesterHIU} ➔ {entry.providerHIP}
                      </td>
                      <td className="p-3 text-slate-300">{entry.abhaId}</td>
                      <td className="p-3 text-emerald-400 truncate max-w-[150px]" title={entry.sha256DataHash}>
                        {entry.sha256DataHash}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.status === 'APPROVED' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' : 'bg-rose-900 text-rose-300 border border-rose-700'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {entry.status === 'APPROVED' ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(entry.blockNumber)}
                            className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded transition text-[10px] font-bold"
                            title="DPDP Act 2023: Revoke Access Token"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>ABDM HIE-CM Specification v2.0 • Encryption: AES-256-GCM + TLS 1.3</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}
