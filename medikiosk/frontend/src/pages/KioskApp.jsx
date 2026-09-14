import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, ArrowRight, ArrowLeft, CheckCircle2,
  AlertTriangle, Upload, FileText, Stethoscope, Sparkles,
  ShieldCheck, RefreshCw, ChevronRight, User, HeartPulse, Flower2
} from 'lucide-react';
import { KioskService } from '../services/api';
import { defaultVoiceProvider } from '../services/voiceProvider';
import { getTranslation } from '../services/i18n';
import KioskNavbar from '../components/KioskNavbar';
import VoiceWaveform from '../components/VoiceWaveform';
import RedFlagModal from '../components/RedFlagModal';

export default function KioskApp({ onSwitchToDoctor }) {
  // Navigation Steps: 'LANG' | 'SYSTEM' | 'PATIENT' | 'CONSENT' | 'QUESTIONS' | 'DOCS' | 'DONE'
  const [step, setStep] = useState('LANG');
  const [language, setLanguage] = useState('en');
  const [system, setSystem] = useState('allopathy'); // 'allopathy' | 'ayush'
  
  // Patient Selection
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: '',
    age: '',
    gender: 'Male',
    phone: '',
    blood_group: 'B+'
  });

  // Consent
  const [consentChecked, setConsentChecked] = useState(false);

  // Session & Question State
  const [sessionId, setSessionId] = useState(null);
  const [opdToken, setOpdToken] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [progress, setProgress] = useState({ current: 1, total: 20, percent: 5 });
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedMultiple, setSelectedMultiple] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [numberInput, setNumberInput] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  // Voice Interaction State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);

  // Red Flag Alert State
  const [isRedFlag, setIsRedFlag] = useState(false);
  const [activeRedFlags, setActiveRedFlags] = useState([]);
  const [showRedFlagModal, setShowRedFlagModal] = useState(false);

  // Document Upload State
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [docType, setDocType] = useState('prescription');
  const fileInputRef = useRef(null);

  const t = (key) => getTranslation(language, key);

  // Check speech recognition support on mount
  useEffect(() => {
    setSpeechSupported(defaultVoiceProvider.isSupported());
    loadDemoPatients();
  }, []);

  const loadDemoPatients = async () => {
    try {
      const res = await KioskService.getPatients();
      if (res.success && res.patients.length > 0) {
        setPatients(res.patients);
        setSelectedPatient(res.patients[0]);
      }
    } catch (err) {
      console.warn('Could not load demo patients:', err);
    }
  };

  // Start Session
  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      let finalPatientId = selectedPatient ? selectedPatient.id : null;

      if (isNewPatient && newPatientForm.full_name) {
        const regRes = await KioskService.registerPatient(newPatientForm);
        if (regRes.success) {
          finalPatientId = regRes.patient.id;
          setSelectedPatient(regRes.patient);
        }
      }

      const res = await KioskService.startSession({
        language,
        system,
        patientId: finalPatientId,
        conditionId: system === 'ayush' ? 'ayush_general' : 'chest_pain'
      });

      if (res.success) {
        setSessionId(res.sessionId);
        setOpdToken(res.opdToken);
        setCurrentQuestion(res.nextQuestion);
        setProgress(res.progress || { current: 1, total: 20, percent: 5 });
        setStep('QUESTIONS');
        resetInputState();

        // Optional read aloud of the first question
        if (res.nextQuestion) {
          defaultVoiceProvider.speak(res.nextQuestion.text, { language });
        }
      }
    } catch (err) {
      console.error('Failed to start kiosk session:', err);
      alert('Unable to start session. Check backend connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Interaction Handlers
  const toggleVoiceListening = () => {
    if (isListening) {
      defaultVoiceProvider.stopListening();
      setIsListening(false);
    } else {
      defaultVoiceProvider.cancelSpeech();
      setIsListening(true);
      setVoiceTranscript('');

      defaultVoiceProvider.startListening({
        language,
        onStart: () => setIsListening(true),
        onResult: (text, isFinal) => {
          setVoiceTranscript(text);
          setTextInput(text);

          // Auto match options if user spoke option text
          if (currentQuestion && currentQuestion.options) {
            const lower = text.toLowerCase();
            const matched = currentQuestion.options.find(opt => 
              lower.includes(opt.text.toLowerCase()) || lower.includes(opt.value.toLowerCase())
            );
            if (matched) {
              setSelectedOption(matched.value);
            }
          }
        },
        onError: (err) => {
          console.warn('Speech recognition error:', err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        }
      });
    }
  };

  const handleReplayAudio = () => {
    if (currentQuestion) {
      defaultVoiceProvider.speak(currentQuestion.text, { language });
    }
  };

  const resetInputState = () => {
    setSelectedOption('');
    setSelectedMultiple([]);
    setTextInput('');
    setNumberInput(5);
    setVoiceTranscript('');
    defaultVoiceProvider.stopListening();
    setIsListening(false);
  };

  // Submit Answer & Fetch Next Question
  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !sessionId) return;

    let finalAnswer = '';
    if (currentQuestion.type === 'multiple_choice') {
      finalAnswer = selectedMultiple.join(', ');
    } else if (currentQuestion.type === 'single_choice' || currentQuestion.type === 'yes_no') {
      finalAnswer = selectedOption || textInput;
    } else if (currentQuestion.type === 'number') {
      finalAnswer = String(numberInput);
    } else {
      finalAnswer = textInput || selectedOption;
    }

    if (!finalAnswer && currentQuestion.required) {
      alert(language === 'hi' ? 'कृपया आगे बढ़ने से पहले उत्तर चुनें या बोलें।' : language === 'kn' ? 'ದಯವಿಟ್ಟು ಮುಂದುವರಿಯುವ ಮೊದಲು ಉತ್ತರವನ್ನು ಆರಿಸಿ ಅಥವಾ ಮಾತನಾಡಿ.' : 'Please select or speak an answer before continuing.');
      return;
    }

    setIsLoading(true);
    defaultVoiceProvider.cancelSpeech();

    try {
      const res = await KioskService.submitAnswer({
        sessionId,
        questionId: currentQuestion.id,
        answer: finalAnswer,
        voiceTranscript
      });

      if (res.success) {
        // Red Flag check
        if (res.isRedFlag) {
          setIsRedFlag(true);
          setActiveRedFlags(res.redFlags || []);
          setShowRedFlagModal(true);
        }

        if (res.completed || !res.nextQuestion) {
          // Transition to document upload step
          setStep('DOCS');
        } else {
          setCurrentQuestion(res.nextQuestion);
          setProgress(res.progress);
          resetInputState();

          // Read out next question
          defaultVoiceProvider.speak(res.nextQuestion.text, { language });
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      alert('Network error while saving response. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Document Upload Handlers
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('sessionId', sessionId || '');
    formData.append('patientId', selectedPatient ? selectedPatient.id : '');
    formData.append('documentType', docType);

    try {
      const res = await KioskService.uploadDocument(formData);
      if (res.success) {
        setUploadedDocs(prev => [...prev, {
          fileName: res.fileName,
          documentType: docType,
          extractions: res.extractions
        }]);
      }
    } catch (err) {
      console.error('Failed to upload document:', err);
      alert('Error uploading medical document.');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Kiosk Navigation */}
      <KioskNavbar
        language={language}
        onLanguageChange={(newLang) => setLanguage(newLang)}
        opdToken={opdToken}
        isRedFlag={isRedFlag}
      />

      {/* Red Flag Emergency Alert Modal */}
      <RedFlagModal
        redFlags={activeRedFlags}
        isOpen={showRedFlagModal}
        onClose={() => setShowRedFlagModal(false)}
        language={language}
      />

      {/* Main Kiosk Touch Surface */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">

        {/* ------------------------------------------------------------------ */}
        {/* STEP 1: LANGUAGE SELECTION */}
        {/* ------------------------------------------------------------------ */}
        {step === 'LANG' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center max-w-4xl mx-auto w-full fade-in">
            <span className="inline-block px-4 py-1.5 rounded-full bg-sky-50 text-sky-700 font-bold text-sm mb-4 border border-sky-200">
              {t('stepLang')}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">
              {t('selectLanguageTitle')}
            </h1>
            <p className="text-slate-500 text-lg mb-8">
              {t('selectLanguageSubtitle')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <button
                onClick={() => { setLanguage('en'); setStep('SYSTEM'); }}
                className={`p-6 rounded-2xl border-4 text-left kiosk-touch-button transition-all flex flex-col justify-between h-48 ${
                  language === 'en'
                    ? 'border-sky-600 bg-sky-50/50 shadow-md ring-4 ring-sky-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-2xl sm:text-3xl font-black text-slate-800">English</span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-sky-100 text-sky-800 rounded">EN</span>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm">
                  Proceed with clinical questions in English.
                </p>
                <div className="text-sky-600 font-bold text-sm flex items-center">
                  Select English <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              <button
                onClick={() => { setLanguage('hi'); setStep('SYSTEM'); }}
                className={`p-6 rounded-2xl border-4 text-left kiosk-touch-button transition-all flex flex-col justify-between h-48 ${
                  language === 'hi'
                    ? 'border-sky-600 bg-sky-50/50 shadow-md ring-4 ring-sky-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-2xl sm:text-3xl font-black text-slate-800">हिंदी</span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-amber-100 text-amber-800 rounded">HI</span>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm">
                  हिंदी भाषा में ओपीडी परामर्श और प्रश्नोत्तरी शुरू करें।
                </p>
                <div className="text-sky-600 font-bold text-sm flex items-center">
                  हिंदी चुनें <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              <button
                onClick={() => { setLanguage('kn'); setStep('SYSTEM'); }}
                className={`p-6 rounded-2xl border-4 text-left kiosk-touch-button transition-all flex flex-col justify-between h-48 ${
                  language === 'kn'
                    ? 'border-sky-600 bg-sky-50/50 shadow-md ring-4 ring-sky-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-2xl sm:text-3xl font-black text-slate-800">ಕನ್ನಡ</span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-emerald-100 text-emerald-800 rounded">KN</span>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm">
                  ಕನ್ನಡ ಭಾಷೆಯಲ್ಲಿ OPD ಸಮಾಲೋಚನೆ ಮತ್ತು ಪ್ರಶ್ನೋತ್ತರವನ್ನು ಪ್ರಾರಂಭಿಸಿ.
                </p>
                <div className="text-sky-600 font-bold text-sm flex items-center">
                  ಕನ್ನಡವನ್ನು ಆರಿಸಿ <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 2: CLINICAL SYSTEM SELECTION */}
        {/* ------------------------------------------------------------------ */}
        {step === 'SYSTEM' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 max-w-3xl mx-auto w-full fade-in">
            <button
              onClick={() => setStep('LANG')}
              className="text-slate-500 hover:text-slate-800 font-semibold text-sm flex items-center mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> {t('backBtn')}
            </button>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">
              {t('selectSystemTitle')}
            </h1>
            <p className="text-slate-500 text-base mb-8">
              {t('selectSystemSubtitle')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Allopathy Card */}
              <button
                onClick={() => { setSystem('allopathy'); setStep('PATIENT'); }}
                className={`p-6 rounded-2xl border-4 text-left kiosk-touch-button transition-all flex flex-col justify-between ${
                  system === 'allopathy'
                    ? 'border-sky-600 bg-sky-50/50 ring-4 ring-sky-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                    <HeartPulse className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {t('allopathyTitle')}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {t('allopathyDesc')}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/80 flex items-center justify-between text-sky-700 font-bold text-sm">
                  <span>{language === 'hi' ? 'डेमो: तीव्र सीने का दर्द' : language === 'kn' ? 'ಡೆಮೊ: ತೀವ್ರ ಎದೆ ನೋವು' : 'Demo: Acute Chest Pain'}</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>

              {/* AYUSH Card */}
              <button
                onClick={() => { setSystem('ayush'); setStep('PATIENT'); }}
                className={`p-6 rounded-2xl border-4 text-left kiosk-touch-button transition-all flex flex-col justify-between ${
                  system === 'ayush'
                    ? 'border-teal-600 bg-teal-50/50 ring-4 ring-teal-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                    <Flower2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {t('ayushTitle')}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {t('ayushDesc')}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/80 flex items-center justify-between text-teal-700 font-bold text-sm">
                  <span>{language === 'hi' ? 'दशविध परीक्षा' : language === 'kn' ? 'ದಶವಿಧ ಪರೀಕ್ಷೆ' : 'Dashavidha Pariksha'}</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 3: PATIENT IDENTIFICATION */}
        {/* ------------------------------------------------------------------ */}
        {step === 'PATIENT' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 max-w-3xl mx-auto w-full fade-in">
            <button
              onClick={() => setStep('SYSTEM')}
              className="text-slate-500 hover:text-slate-800 font-semibold text-sm flex items-center mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> {t('backBtn')}
            </button>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              {t('patientIdTitle')}
            </h1>
            <p className="text-slate-500 text-sm mb-6">
              {t('patientIdSubtitle')}
            </p>

            {/* Toggle demo vs new */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setIsNewPatient(false)}
                className={`flex-1 py-3 font-bold text-sm rounded-xl border-2 transition ${
                  !isNewPatient ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600'
                }`}
              >
                {language === 'hi' ? 'मौजूदा पंजीकृत डेमो मरीज' : language === 'kn' ? 'ನೋಂದಾಯಿತ ಡೆಮೊ ರೋಗಿಗಳು' : 'Existing Demo Patients'}
              </button>
              <button
                onClick={() => setIsNewPatient(true)}
                className={`flex-1 py-3 font-bold text-sm rounded-xl border-2 transition ${
                  isNewPatient ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600'
                }`}
              >
                {t('newPatientBtn')}
              </button>
            </div>

            {!isNewPatient ? (
              <div className="space-y-3 mb-8">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('demoPatientLabel')}
                </label>
                {patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                      selectedPatient?.id === p.id
                        ? 'border-sky-600 bg-sky-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                        {p.full_name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">{p.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {p.age} {language === 'hi' ? 'वर्ष' : language === 'kn' ? 'ವರ್ಷ' : 'Yrs'} • {language === 'kn' ? (p.gender === 'Male' ? 'ಪುರುಷ' : p.gender === 'Female' ? 'ಮಹಿಳೆ' : 'ಇತರ') : language === 'hi' ? (p.gender === 'Male' ? 'पुरुष' : p.gender === 'Female' ? 'महिला' : 'अन्य') : p.gender} • ABHA: <span className="font-mono text-slate-700">{p.abha_id}</span>
                        </div>
                      </div>
                    </div>
                    {selectedPatient?.id === p.id && (
                      <CheckCircle2 className="w-6 h-6 text-sky-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('fullNameLabel')}</label>
                  <input
                    type="text"
                    value={newPatientForm.full_name}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, full_name: e.target.value })}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('ageLabel')}</label>
                  <input
                    type="number"
                    value={newPatientForm.age}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                    placeholder="e.g. 54"
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('genderLabel')}</label>
                  <select
                    value={newPatientForm.gender}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                  >
                    <option value="Male">{language === 'hi' ? 'पुरुष' : language === 'kn' ? 'ಪುರುಷ' : 'Male'}</option>
                    <option value="Female">{language === 'hi' ? 'महिला' : language === 'kn' ? 'ಮಹಿಳೆ' : 'Female'}</option>
                    <option value="Other">{language === 'hi' ? 'अन्य' : language === 'kn' ? 'ಇತರ' : 'Other'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('phoneLabel')}</label>
                  <input
                    type="text"
                    value={newPatientForm.phone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('CONSENT')}
              className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-black text-lg rounded-2xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <span>{t('continueBtn')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 4: CONSENT SCREEN */}
        {/* ------------------------------------------------------------------ */}
        {step === 'CONSENT' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 max-w-3xl mx-auto w-full fade-in">
            <button
              onClick={() => setStep('PATIENT')}
              className="text-slate-500 hover:text-slate-800 font-semibold text-sm flex items-center mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> {t('backBtn')}
            </button>

            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {t('consentTitle')}
              </h1>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mb-6">
              {t('consentSubtitle')}
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm text-slate-700 space-y-3 mb-8">
              <p>• {t('consentText1')}</p>
              <p>• {t('consentText2')}</p>
              <p>• {t('consentText3')}</p>
            </div>

            <label className="flex items-center space-x-3 p-4 bg-sky-50/70 border border-sky-200 rounded-2xl cursor-pointer mb-8">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="w-6 h-6 text-sky-600 rounded focus:ring-sky-500"
              />
              <span className="font-bold text-slate-900 text-sm sm:text-base">
                {t('consentCheckbox')}
              </span>
            </label>

            <button
              disabled={!consentChecked || isLoading}
              onClick={handleStartSession}
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition flex items-center justify-center space-x-2 ${
                consentChecked && !isLoading
                  ? 'bg-sky-600 hover:bg-sky-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>{t('agreeContinueBtn')}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 5: CLINICAL QUESTIONING LOOP */}
        {/* ------------------------------------------------------------------ */}
        {step === 'QUESTIONS' && currentQuestion && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 max-w-4xl mx-auto w-full fade-in flex flex-col justify-between min-h-[600px]">
            
            {/* Progress Bar & Sequence */}
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 mb-2">
                <span>
                  {t('questionProgress')} {progress.current} {t('of')} {progress.total}
                </span>
                <span className="text-sky-700 font-extrabold">{progress.percent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-8">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {/* Question Header & TTS Read-Out */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                    {system === 'ayush' ? (language === 'hi' ? 'आयुष दशविध' : language === 'kn' ? 'ಆಯುಷ್ ದಶವಿಧ' : 'AYUSH Dashavidha') : (language === 'hi' ? 'एलोपैथी ओपीडी' : language === 'kn' ? 'ಅಲೋಪತಿ OPD' : 'Allopathy OPD')} • {currentQuestion.clinicalField}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 leading-snug">
                    {currentQuestion.text}
                  </h2>
                  {currentQuestion.helpText && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      {currentQuestion.helpText}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleReplayAudio}
                  title={t('replayQuestion')}
                  className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-2xl transition shrink-0 kiosk-touch-button"
                >
                  <Volume2 className="w-6 h-6 text-sky-600" />
                </button>
              </div>

              {/* VOICE INTERACTION SECTION */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleVoiceListening}
                      className={`px-5 py-3 rounded-xl font-bold text-sm sm:text-base flex items-center space-x-2 transition ${
                        isListening
                          ? 'bg-red-600 text-white animate-pulse shadow-lg'
                          : 'bg-sky-600 hover:bg-sky-700 text-white shadow-md'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-5 h-5" />
                          <span>{t('stopListening')}</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          <span>{t('tapToSpeak')}</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs text-slate-500 font-medium">
                      {isListening ? t('listening') : (language === 'hi' ? '(माइक तैयार है)' : language === 'kn' ? '(ಮೈಕ್ರೊಫೋನ್ ಸಿದ್ಧವಾಗಿದೆ)' : '(Microphone input ready)')}
                    </span>
                  </div>

                  <VoiceWaveform isListening={isListening} />
                </div>

                {/* Live Speech Recognition Transcript */}
                {voiceTranscript && (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-800">
                    <span className="font-bold text-sky-700">{t('recognizedText')} </span>
                    <span className="italic font-medium">"{voiceTranscript}"</span>
                  </div>
                )}
              </div>

              {/* QUESTION INPUT RENDERING ACCORDING TO QUESTION TYPE */}
              
              {/* Type 1: Single Choice Options */}
              {currentQuestion.type === 'single_choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {currentQuestion.options?.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedOption(opt.value)}
                      className={`p-4 rounded-2xl border-2 text-left font-bold text-base transition-all kiosk-touch-button flex items-center justify-between ${
                        selectedOption === opt.value
                          ? 'border-sky-600 bg-sky-50 text-sky-950 shadow-sm ring-2 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300 text-slate-800 bg-white'
                      }`}
                    >
                      <span>{opt.text}</span>
                      {selectedOption === opt.value && (
                        <CheckCircle2 className="w-6 h-6 text-sky-600 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Type 2: Yes / No Big Touch Buttons */}
              {currentQuestion.type === 'yes_no' && (
                <div className="grid grid-cols-2 gap-6 my-8">
                  <button
                    onClick={() => setSelectedOption('yes')}
                    className={`p-8 rounded-3xl border-4 text-center font-black text-2xl sm:text-3xl transition kiosk-touch-button ${
                      selectedOption === 'yes'
                        ? 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-100'
                        : 'border-slate-200 hover:border-slate-300 text-slate-800 bg-white'
                    }`}
                  >
                    {language === 'hi' ? 'हाँ (YES)' : language === 'kn' ? 'ಹೌದು (YES)' : 'YES'}
                  </button>

                  <button
                    onClick={() => setSelectedOption('no')}
                    className={`p-8 rounded-3xl border-4 text-center font-black text-2xl sm:text-3xl transition kiosk-touch-button ${
                      selectedOption === 'no'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-100'
                        : 'border-slate-200 hover:border-slate-300 text-slate-800 bg-white'
                    }`}
                  >
                    {language === 'hi' ? 'नहीं (NO)' : language === 'kn' ? 'ಇಲ್ಲ (NO)' : 'NO'}
                  </button>
                </div>
              )}

              {/* Type 3: Multiple Choice */}
              {currentQuestion.type === 'multiple_choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {currentQuestion.options?.map((opt) => {
                    const isChecked = selectedMultiple.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedMultiple(selectedMultiple.filter(v => v !== opt.value));
                          } else {
                            setSelectedMultiple([...selectedMultiple, opt.value]);
                          }
                        }}
                        className={`p-4 rounded-2xl border-2 text-left font-bold text-base transition-all kiosk-touch-button flex items-center justify-between ${
                          isChecked
                            ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-200'
                            : 'border-slate-200 hover:border-slate-300 text-slate-800 bg-white'
                        }`}
                      >
                        <span>{opt.text}</span>
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                          isChecked ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'
                        }`}>
                          {isChecked && <CheckCircle2 className="w-5 h-5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Type 4: Number Slider (Pain Scale 1-10) */}
              {currentQuestion.type === 'number' && (
                <div className="my-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                  <div className="text-5xl font-black text-sky-700 mb-2">{numberInput} / 10</div>
                  <p className="text-sm font-semibold text-slate-500 mb-6">
                    {numberInput >= 8 ? (language === 'hi' ? '🚨 अत्यधिक दर्द (तत्काल प्राथमिकता)' : language === 'kn' ? '🚨 ತೀವ್ರ ನೋವು (ತುರ್ತು ಆದ್ಯತೆ)' : '🚨 Severe Pain (High Priority Triage)') : numberInput >= 5 ? (language === 'hi' ? 'मध्यम दर्द' : language === 'kn' ? 'ಮಧ್ಯಮ ನೋವು' : 'Moderate Pain') : (language === 'hi' ? 'हल्का दर्द' : language === 'kn' ? 'ಸೌಮ್ಯ ನೋವು' : 'Mild Discomfort')}
                  </p>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={numberInput}
                    onChange={(e) => setNumberInput(parseInt(e.target.value, 10))}
                    className="w-full h-4 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                  <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 px-1">
                    <span>1 ({language === 'hi' ? 'हल्का' : language === 'kn' ? 'ಕಡಿಮೆ' : 'Mild'})</span>
                    <span>5 ({language === 'hi' ? 'मध्यम' : language === 'kn' ? 'ಮಧ್ಯಮ' : 'Moderate'})</span>
                    <span>10 ({language === 'hi' ? 'असहनीय' : language === 'kn' ? 'ಅಸಹನೀಯ' : 'Unbearable'})</span>
                  </div>
                </div>
              )}

              {/* Text Input Fallback */}
              <div className="mt-4">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t('typeAnswerPlaceholder')}
                  className="w-full p-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none text-base"
                />
              </div>

            </div>

            {/* Bottom Question Navigation Button */}
            <div className="pt-6 border-t border-slate-200 flex justify-end">
              <button
                disabled={isLoading}
                onClick={handleSubmitAnswer}
                className="w-full sm:w-auto px-10 py-5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-black text-xl rounded-2xl shadow-xl transition kiosk-touch-button flex items-center justify-center space-x-3"
              >
                {isLoading ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>{t('submitAnswerBtn')}</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 6: PREVIOUS MEDICAL DOCUMENTS UPLOAD & OCR */}
        {/* ------------------------------------------------------------------ */}
        {step === 'DOCS' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 max-w-3xl mx-auto w-full fade-in">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              {t('docUploadTitle')}
            </h1>
            <p className="text-slate-500 text-sm mb-6">
              {t('docUploadSubtitle')}
            </p>

            {/* Document Type Selector */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'prescription', label: t('docTypePrescription') },
                { id: 'lab_report', label: t('docTypeLab') },
                { id: 'discharge_summary', label: t('docTypeDischarge') }
              ].map(dt => (
                <button
                  key={dt.id}
                  onClick={() => setDocType(dt.id)}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl border transition ${
                    docType === dt.id ? 'bg-sky-600 text-white border-sky-600 shadow-sm' : 'border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  {dt.label}
                </button>
              ))}
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-3 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50 rounded-3xl p-8 text-center cursor-pointer transition mb-6"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <p className="font-bold text-slate-800 text-base mb-1">
                {uploadingDoc ? t('uploadingDoc') : t('uploadCardText')}
              </p>
              <p className="text-xs text-slate-400">
                {t('supportedFormats')}
              </p>
            </div>

            {/* List of Uploaded and OCR Digitized Docs */}
            {uploadedDocs.length > 0 && (
              <div className="space-y-4 mb-8">
                <h4 className="font-bold text-slate-900 text-sm">
                  {t('extractedDataTitle')}
                </h4>
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 mb-2">
                      <span className="flex items-center space-x-1.5 text-sky-700">
                        <FileText className="w-4 h-4 mr-1" />
                        {doc.fileName} ({doc.documentType})
                      </span>
                      <span className="text-emerald-600 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> {language === 'hi' ? 'डिजिटाइज़्ड' : language === 'kn' ? 'ಡಿಜಿಟೈಸ್ ಮಾಡಲಾಗಿದೆ' : 'Digitized'}
                      </span>
                    </div>

                    {doc.extractions?.diagnoses?.length > 0 && (
                      <p className="text-slate-600">
                        <strong>{language === 'hi' ? 'निदान:' : language === 'kn' ? 'ರೋಗನಿರ್ಣಯ:' : 'Diagnoses:'}</strong> {doc.extractions.diagnoses.join(', ')}
                      </p>
                    )}
                    {doc.extractions?.medications?.length > 0 && (
                      <p className="text-slate-600 mt-1">
                        <strong>{language === 'hi' ? 'दवाएं:' : language === 'kn' ? 'ಔಷಧಿಗಳು:' : 'Medications:'}</strong> {doc.extractions.medications.map(m => `${m.name} (${m.dosage})`).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setStep('DONE')}
                className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl transition"
              >
                {t('skipDocBtn')}
              </button>
              <button
                onClick={() => setStep('DONE')}
                className="flex-1 py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl shadow-lg transition"
              >
                {t('finishDocBtn')}
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 7: SESSION COMPLETED & OPD TOKEN */}
        {/* ------------------------------------------------------------------ */}
        {step === 'DONE' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center max-w-2xl mx-auto w-full fade-in">
            <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              {t('doneTitle')}
            </h1>
            <p className="text-slate-500 text-base mb-8">
              {t('doneSubtitle')}
            </p>

            {/* Token Badge */}
            <div className="bg-gradient-to-tr from-sky-50 to-teal-50 border-2 border-sky-200 rounded-3xl p-6 mb-8 max-w-md mx-auto">
              <div className="text-xs uppercase font-black text-sky-600 tracking-wider mb-1">
                {t('opdTokenLabel')}
              </div>
              <div className="text-5xl font-black text-slate-900 tracking-tight">
                {opdToken || 'OPD-101'}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {language === 'hi' ? 'रोगी' : language === 'kn' ? 'ರೋಗಿ' : 'Patient'}: <span className="font-bold text-slate-700">{selectedPatient?.full_name || 'Ramesh Sharma'}</span> | {language === 'hi' ? 'पद्धति' : language === 'kn' ? 'ವಿಭಾಗ' : 'System'}: <span className="uppercase font-bold text-sky-700">{system}</span>
              </div>
            </div>

            <p className="text-slate-600 text-sm font-medium mb-8 max-w-lg mx-auto">
              {t('proceedInstructions')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setStep('LANG');
                  setSelectedOption('');
                  setSessionId(null);
                  setIsRedFlag(false);
                  setActiveRedFlags([]);
                }}
                className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition"
              >
                {t('startNewSession')}
              </button>

              <button
                onClick={onSwitchToDoctor}
                className="py-4 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Stethoscope className="w-5 h-5" />
                <span>{t('doctorPortalBtn')}</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Persistent Bottom Bar to Switch to Doctor Dashboard */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center">
        <button
          onClick={onSwitchToDoctor}
          className="inline-flex items-center space-x-2 text-xs font-bold text-sky-700 hover:text-sky-900 px-4 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition"
        >
          <Stethoscope className="w-4 h-4" />
          <span>{language === 'hi' ? 'डॉक्टर ओपीडी वर्कस्टेशन पर जाएं (केस रिकॉर्ड और FHIR देखें)' : language === 'kn' ? 'ವೈದ್ಯರ OPD ವರ್ಕ್‌ಸ್ಟೇಷನ್‌ಗೆ ಬದಲಾಯಿಸಿ (ಕೇಸ್ ದಾಖಲೆಗಳು ಮತ್ತು FHIR ವೀಕ್ಷಿಸಿ)' : 'Switch to Doctor OPD Workstation (View Case Records & FHIR)'}</span>
        </button>
      </footer>

    </div>
  );
}
