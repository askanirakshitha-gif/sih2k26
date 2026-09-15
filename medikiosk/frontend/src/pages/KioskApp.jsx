import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, ArrowRight, ArrowLeft, CheckCircle2,
  AlertTriangle, Upload, FileText, Stethoscope, Sparkles,
  ShieldCheck, RefreshCw, ChevronRight, User, HeartPulse, Flower2,
  Smartphone, KeyRound, Search, CreditCard, Check, UserPlus, Loader2,
  Pill, Hospital, Activity, Printer, Download
} from 'lucide-react';
import { KioskService } from '../services/api';
import { defaultVoiceProvider } from '../services/voiceProvider';
import { getTranslation } from '../services/i18n';
import KioskNavbar from '../components/KioskNavbar';
import VoiceWaveform from '../components/VoiceWaveform';
import RedFlagModal from '../components/RedFlagModal';
import HospitalGpsTracker from '../components/HospitalGpsTracker';
import { dispatchEmergencyAlert } from '../services/alertSync';

export default function KioskApp({ onSwitchToDoctor }) {
  // Navigation Views: 'HOSPITALS' (Landing & GPS Tracker) | 'INTAKE' (Clinical History Kiosk)
  const [activeView, setActiveView] = useState('HOSPITALS');
  const [selectedHospital, setSelectedHospital] = useState(null);
  // Navigation Steps: 'LANG' | 'SYSTEM' | 'PATIENT' | 'CONSENT' | 'QUESTIONS' | 'DOCS' | 'DONE'
  const [step, setStep] = useState('LANG');
  const [language, setLanguage] = useState('en');
  const [system, setSystem] = useState('ayush'); // 'ayush' | 'allopathy'
  
  // Patient Selection
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: '',
    age: '',
    gender: 'Male',
    phone: '',
    blood_group: 'B+',
    abha_id: '',
    emergency_contact: ''
  });

  // Walk-in Registration Options: 'abha' | 'phone' | 'manual'
  const [regMethod, setRegMethod] = useState('abha');

  // ABHA ID State
  const [abhaInput, setAbhaInput] = useState('');
  const [abhaStatus, setAbhaStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [abhaPatient, setAbhaPatient] = useState(null);
  const [abhaErrorMsg, setAbhaErrorMsg] = useState('');

  // Phone + OTP State
  const [phoneInput, setPhoneInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMaskedPhone, setOtpMaskedPhone] = useState('');
  const [otpGateway, setOtpGateway] = useState('');
  const [otpDebugCode, setOtpDebugCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpResendCountdown, setOtpResendCountdown] = useState(30);

  // Form validation alert
  const [regValidationError, setRegValidationError] = useState('');

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
  const [micErrorMsg, setMicErrorMsg] = useState('');

  // Red Flag Alert State
  const [isRedFlag, setIsRedFlag] = useState(false);
  const [activeRedFlags, setActiveRedFlags] = useState([]);
  const [showRedFlagModal, setShowRedFlagModal] = useState(false);
  const [staffAlertToast, setStaffAlertToast] = useState(false);

  // Document Upload State
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [docType, setDocType] = useState('prescription');
  const fileInputRef = useRef(null);

  // Summary & Medical Prescribed Report Data State
  const [summaryReportData, setSummaryReportData] = useState(null);

  // Fetch compiled medical summary & prescribed report when step becomes 'DONE'
  useEffect(() => {
    if (step === 'DONE' && sessionId) {
      const fetchReport = async () => {
        try {
          const res = await KioskService.getSessionSummary(sessionId);
          if (res && res.success) {
            setSummaryReportData(res);
          }
        } catch (e) {
          console.warn('Failed to fetch summary report:', e);
        }
      };
      fetchReport();
    }
  }, [step, sessionId]);

  const t = (key) => getTranslation(language, key);

  // Page Audio Read-Aloud State & Controls
  const [isSpeakingPage, setIsSpeakingPage] = useState(false);

  // Auto-trigger audio read-aloud when arriving at CONSENT step or changing language on CONSENT step
  useEffect(() => {
    defaultVoiceProvider.cancelSpeech();
    setIsSpeakingPage(false);

    if (step === 'CONSENT') {
      const timer = setTimeout(() => {
        const textToRead = getPageAuditableText('CONSENT');
        if (textToRead) {
          setIsSpeakingPage(true);
          defaultVoiceProvider.speak(textToRead, {
            language,
            onEnd: () => setIsSpeakingPage(false),
            onError: () => setIsSpeakingPage(false)
          });
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        defaultVoiceProvider.cancelSpeech();
      };
    }
  }, [step, language]);

  const getPageAuditableText = (targetStep) => {
    const lang = language;
    if (targetStep === 'CONSENT') {
      return `${getTranslation(lang, 'consentTitle')}. ${getTranslation(lang, 'consentSubtitle')}. Point 1: ${getTranslation(lang, 'consentText1')}. Point 2: ${getTranslation(lang, 'consentText2')}. Point 3: ${getTranslation(lang, 'consentText3')}. Agreement: ${getTranslation(lang, 'consentCheckbox')}`;
    }
    if (targetStep === 'LANG') {
      return `${getTranslation(lang, 'selectLanguageTitle')}. ${getTranslation(lang, 'selectLanguageSubtitle')}`;
    }
    if (targetStep === 'SYSTEM') {
      return `${getTranslation(lang, 'selectSystemTitle')}. ${getTranslation(lang, 'selectSystemSubtitle')}. ${getTranslation(lang, 'allopathyTitle')}: ${getTranslation(lang, 'allopathyDesc')}. ${getTranslation(lang, 'ayushTitle')}: ${getTranslation(lang, 'ayushDesc')}`;
    }
    if (targetStep === 'PATIENT') {
      return lang === 'hi'
        ? "मरीज पहचान। आभा आईडी खोजें, या मोबाइल नंबर पर एसएमएस ओटीपी प्राप्त करके सत्यापित करें।"
        : lang === 'kn'
        ? "ರೋಗಿಯ ಗುರುತು. ABHA ID ಯನ್ನು ಹುಡುಕಿ ಅಥವಾ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗೆ SMS OTP ಪಡೆಯುವ ಮೂಲಕ ಪರಿಶೀಲಿಸಿ."
        : "Patient Identification screen. Search ABHA ID record or request SMS OTP verification to link mobile number.";
    }
    if (targetStep === 'QUESTIONS' && currentQuestion) {
      return currentQuestion.text;
    }
    if (targetStep === 'DOCS') {
      return lang === 'hi'
        ? "चिकित्सा दस्तावेज अपलोड करें। पर्ची या जांच रिपोर्ट स्कैन या अपलोड करें।"
        : lang === 'kn'
        ? "ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಥವಾ ಲ್ಯಾಬ್ ವರದಿಯನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ."
        : "Medical Document Upload. Upload past prescriptions or lab test reports.";
    }
    if (targetStep === 'DONE') {
      return lang === 'hi'
        ? "आपकी ओपीडी परामर्श प्रक्रिया पूर्ण हो चुकी है। आपका डिजिटल केस समरी तैयार है।"
        : lang === 'kn'
        ? "ನಿಮ್ಮ ಒಪಿಡಿ ಸಮಾಲೋಚನೆ ಪ್ರಕ್ರಿಯೆ ಪೂರ್ಣಗೊಂಡಿದೆ. ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಕೇಸ್ ಸಾರಾಂಶ ಸಿದ್ಧವಾಗಿದೆ."
        : "Your OPD consultation entry process is complete. Your digital intake summary is ready for the physician.";
    }
    return "";
  };

  const handleReadPageAloud = (customText) => {
    if (isSpeakingPage) {
      defaultVoiceProvider.cancelSpeech();
      setIsSpeakingPage(false);
      return;
    }

    const textToRead = customText || getPageAuditableText(step);
    if (!textToRead) return;

    setIsSpeakingPage(true);
    defaultVoiceProvider.speak(textToRead, {
      language,
      onEnd: () => setIsSpeakingPage(false),
      onError: () => setIsSpeakingPage(false)
    });
  };

  // Check speech recognition support on mount
  useEffect(() => {
    setSpeechSupported(defaultVoiceProvider.isSupported());
    loadDemoPatients();
  }, []);

  // Timer for OTP resend countdown
  useEffect(() => {
    let timer;
    if (otpSent && otpResendCountdown > 0 && !otpVerified) {
      timer = setTimeout(() => setOtpResendCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpSent, otpResendCountdown, otpVerified]);

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

  // Handle ABHA Lookup / Direct Fetch
  const handleFetchAbha = (customAbha) => {
    const queryAbha = (customAbha !== undefined ? customAbha : abhaInput).trim();
    if (!queryAbha) {
      setAbhaErrorMsg(
        language === 'hi'
          ? 'कृपया 14 अंकों की आभा आईडी दर्ज करें'
          : language === 'kn'
          ? 'ದಯವಿಟ್ಟು 14 ಅಂಕಿಯ ABHA ID ನಮೂದಿಸಿ'
          : 'Please enter a 14-digit ABHA ID (e.g. 91-2345-6789-0123)'
      );
      setAbhaStatus('error');
      return;
    }

    setAbhaStatus('loading');
    setAbhaErrorMsg('');
    setRegValidationError('');

    setTimeout(() => {
      const cleanInput = queryAbha.replace(/\D/g, '');
      const matched = patients.find(p => {
        if (!p.abha_id) return false;
        const cleanP = p.abha_id.replace(/\D/g, '');
        return cleanP === cleanInput || p.abha_id.toLowerCase() === queryAbha.toLowerCase();
      });

      if (matched) {
        setSelectedPatient(matched);
        setAbhaPatient(matched);
        setNewPatientForm({
          full_name: matched.full_name,
          age: matched.age,
          gender: matched.gender,
          phone: matched.phone || '',
          blood_group: matched.blood_group || 'B+',
          abha_id: matched.abha_id,
          emergency_contact: matched.emergency_contact || ''
        });
        setAbhaStatus('success');
      } else if (cleanInput.length >= 10 || queryAbha.includes('@') || queryAbha.includes('-')) {
        // Valid ABHA format outside demo seed - ABDM National Registry simulation fetch
        const mockAbdmPatient = {
          id: 'abha_' + Date.now(),
          full_name: 'Vikram Malhotra',
          age: 42,
          gender: 'Male',
          phone: '+91 98450 12345',
          blood_group: 'O+',
          abha_id: queryAbha,
          abha_address: 'vikram@abdm'
        };
        setSelectedPatient(mockAbdmPatient);
        setAbhaPatient(mockAbdmPatient);
        setNewPatientForm({
          full_name: mockAbdmPatient.full_name,
          age: mockAbdmPatient.age,
          gender: mockAbdmPatient.gender,
          phone: mockAbdmPatient.phone,
          blood_group: mockAbdmPatient.blood_group,
          abha_id: mockAbdmPatient.abha_id,
          emergency_contact: ''
        });
        setAbhaStatus('success');
      } else {
        setAbhaStatus('error');
        setAbhaErrorMsg(
          language === 'hi'
            ? 'आभा आईडी रिकॉर्ड में नहीं मिली। कृपया 14 अंकों की सही आईडी डालें या मोबाइल से पंजीकरण करें।'
            : language === 'kn'
            ? 'ABDM ದಾಖಲೆಗಳಲ್ಲಿ ABHA ID ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಐಡಿ ನಮೂದಿಸಿ ಅಥವಾ ಮೊಬೈಲ್ ಮೂಲಕ ನೋಂದಾಯಿಸಿ.'
            : 'ABHA ID not found in ABDM registry. Please verify the 14-digit number or register via Phone / Direct entry.'
        );
      }
    }, 500);
  };

  // Handle Send OTP
  const handleSendOtp = async (customPhone) => {
    const raw = (customPhone !== undefined ? customPhone : phoneInput).trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) {
      setOtpError(
        language === 'hi'
          ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।'
          : language === 'kn'
          ? 'ದಯವಿಟ್ಟು 10 ಅಂಕಿಯ ಮಾನ್ಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }
    setOtpError('');
    setRegValidationError('');
    setOtpLoading(true);

    try {
      const res = await KioskService.sendOtp(raw);
      if (res && res.success) {
        setOtpSent(true);
        setOtpVerified(false);
        setOtpInput('');
        setOtpMaskedPhone(res.phone_masked || '');
        setOtpGateway(res.gateway || '');
        if (res.otp) {
          setOtpDebugCode(res.otp);
        } else {
          setOtpDebugCode('');
        }
        setOtpResendCountdown(30);
      } else {
        setOtpError(res?.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setOtpError(err?.message || 'Failed to send OTP. Please check connection.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async () => {
    const trimmed = otpInput.trim();
    if (!trimmed) {
      setOtpError(
        language === 'hi'
          ? 'कृपया भेजा गया 4 अंकों का ओटीपी दर्ज करें।'
          : language === 'kn'
          ? 'ದಯವಿಟ್ಟು ಕಳುಹಿಸಲಾದ 4 ಅಂಕಿಯ OTP ನಮೂದಿಸಿ.'
          : 'Please enter the 4-digit OTP.'
      );
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await KioskService.verifyOtp(phoneInput, trimmed);
      if (res && (res.success || res.verified)) {
        setOtpVerified(true);
        setOtpError('');
        setRegValidationError('');

        // Check if phone matches an existing registered patient
        const cleanPhone = phoneInput.replace(/\D/g, '');
        const matched = patients.find(p => p.phone && p.phone.replace(/\D/g, '').includes(cleanPhone));
        if (matched) {
          setSelectedPatient(matched);
          setNewPatientForm({
            full_name: matched.full_name,
            age: matched.age,
            gender: matched.gender,
            phone: matched.phone || phoneInput,
            blood_group: matched.blood_group || 'B+',
            abha_id: matched.abha_id || '',
            emergency_contact: matched.emergency_contact || ''
          });
        } else {
          setNewPatientForm(prev => ({
            ...prev,
            phone: phoneInput.startsWith('+91') ? phoneInput : `+91 ${phoneInput}`
          }));
        }
      } else {
        setOtpError(
          res?.message || (
            language === 'hi'
              ? 'अमान्य ओटीपी कोड। कृपया एसएमएस में दिए गए 4 अंक फिर से दर्ज करें।'
              : language === 'kn'
              ? 'ಅಮಾನ್ಯ OTP ಕೋಡ್. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಕೋಡ್ ನಮೂದಿಸಿ.'
              : 'Invalid OTP code. Please check the code received on your phone.'
          )
        );
      }
    } catch (err) {
      setOtpError(err?.message || 'OTP verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle Proceed to Consent
  const handleProceedToConsent = () => {
    setRegValidationError('');

    if (!isNewPatient) {
      if (!selectedPatient) {
        setRegValidationError(
          language === 'hi'
            ? 'जारी रखने के लिए कृपया सूची से एक मरीज चुनें।'
            : language === 'kn'
            ? 'ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ರೋಗಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.'
            : 'Please select a patient from the list to continue.'
        );
        return;
      }
      setStep('CONSENT');
      return;
    }

    if (regMethod === 'abha') {
      if (abhaStatus !== 'success' || !newPatientForm.full_name) {
        setRegValidationError(
          language === 'hi'
            ? 'कृपया जारी रखने से पहले अपनी आभा (ABHA) आईडी सत्यापित करके विवरण प्राप्त करें।'
            : language === 'kn'
            ? 'ಮುಂದುವರಿಯುವ ಮೊದಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ABHA ID ಯನ್ನು ಪರಿಶೀಲಿಸಿ ವಿವರ ಪಡೆಯಿರಿ.'
            : 'Please fetch your ABHA ID details first before continuing.'
        );
        return;
      }
    } else if (regMethod === 'phone') {
      if (!otpVerified) {
        setRegValidationError(
          language === 'hi'
            ? 'कृपया पहले ओटीपी (OTP) से अपना मोबाइल नंबर सत्यापित करें।'
            : language === 'kn'
            ? 'ದಯವಿಟ್ಟು ಮೊದಲು OTP ಮೂಲಕ ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಪರಿಶೀಲಿಸಿ.'
            : 'Please verify your mobile number with the SMS OTP first.'
        );
        return;
      }
      if (!newPatientForm.full_name?.trim() || !newPatientForm.age) {
        setRegValidationError(
          language === 'hi'
            ? 'कृपया मरीज का नाम और आयु दर्ज करें।'
            : language === 'kn'
            ? 'ದಯವಿಟ್ಟು ರೋಗಿಯ ಹೆಸರು ಮತ್ತು ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ.'
            : 'Please enter patient full name and age.'
        );
        return;
      }
    } else if (regMethod === 'manual') {
      if (!newPatientForm.full_name?.trim() || !newPatientForm.age) {
        setRegValidationError(
          language === 'hi'
            ? 'कृपया मरीज का नाम और आयु दर्ज करें।'
            : language === 'kn'
            ? 'ದಯವಿಟ್ಟು ರೋಗಿಯ ಹೆಸರು ಮತ್ತು ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ.'
            : 'Please enter patient full name and age.'
        );
        return;
      }
    }

    setStep('CONSENT');
  };

  // Start Session
  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      let finalPatientId = selectedPatient ? selectedPatient.id : null;

      if (isNewPatient && newPatientForm.full_name) {
        if (selectedPatient && selectedPatient.id && !String(selectedPatient.id).startsWith('abha_')) {
          finalPatientId = selectedPatient.id;
        } else {
          const regRes = await KioskService.registerPatient(newPatientForm);
          if (regRes.success) {
            finalPatientId = regRes.patient.id;
            setSelectedPatient(regRes.patient);
          }
        }
      }

      const res = await KioskService.startSession({
        language,
        system,
        patientId: finalPatientId,
        conditionId: system === 'ayush' ? 'ayush_general' : 'chest_pain',
        hospitalName: selectedHospital ? selectedHospital.name : 'Manipal Hospital HAL Old Airport Road, Bengaluru'
      });

      if (res.success) {
        setSessionId(res.sessionId);
        setOpdToken(res.opdToken);
        setCurrentQuestion(res.nextQuestion);
        setProgress(res.progress || { current: 1, total: 20, percent: 5 });
        setStep('QUESTIONS');
        resetInputState();

        if (res.nextQuestion) {
          const firstQText = res.nextQuestion.text || res.nextQuestion.questionText || '';
          if (firstQText) {
            defaultVoiceProvider.speak(firstQText, { language });
          }
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

          if (!text.trim()) return;

          // Enhanced Multilingual Matching (EN, HI, KN)
          if (currentQuestion && currentQuestion.options && currentQuestion.options.length > 0) {
            const lower = text.toLowerCase().trim();
            const words = lower.split(/\s+/);

            // Multilingual Spoken Number mapping (1-5)
            const numMap = {
              "1": 0, "one": 0, "first": 0, "एक": 0, "पहला": 0, "प्रथमा": 0, "ಒಂದು": 0, "ಮೊದಲ": 0,
              "2": 1, "two": 1, "second": 1, "दो": 1, "दूसरा": 1, "द्वितीया": 1, "ಎರಡು": 1, "ಎರಡನೇ": 1,
              "3": 2, "three": 2, "third": 2, "तीन": 2, "तीसरा": 2, "तृतीया": 2, "ಮೂರು": 2, "ಮೂರನೇ": 2,
              "4": 3, "four": 3, "fourth": 3, "चार": 3, "चौथा": 3, "ನಾಲ್ಕು": 3, "ನಾಲ್ಕನೇ": 3,
              "5": 4, "five": 4, "fifth": 4, "पांच": 4, "पाँच": 4, "पांचवां": 4, "ಐದು": 4, "ಐದನೇ": 4
            };

            let matchedIdx = -1;
            for (const w of words) {
              if (numMap[w] !== undefined && numMap[w] < currentQuestion.options.length) {
                matchedIdx = numMap[w];
                break;
              }
            }

            if (matchedIdx !== -1) {
              const opt = currentQuestion.options[matchedIdx];
              setSelectedOption(opt.value);
              if (isFinal) {
                handleAutoSubmit(opt.value);
              }
              return;
            }

            // Text/value match across English, Hindi, Kannada
            const matched = currentQuestion.options.find(opt => {
              const valLower = (opt.value || '').toLowerCase();
              const textLower = (opt.text || '').toLowerCase();
              return lower.includes(valLower) || (textLower && lower.includes(textLower));
            });

            if (matched) {
              setSelectedOption(matched.value);
              if (isFinal) {
                handleAutoSubmit(matched.value);
              }
            } else if (isFinal) {
              // Send spoken transcript to backend for noise cancellation & acoustic option matching
              handleSubmitAnswer(text.trim());
            }
          } else if (currentQuestion && (currentQuestion.type === 'yes_no' || currentQuestion.questionType === 'yes_no')) {
            const lower = text.toLowerCase();
            const isYes = lower.includes('yes') || lower.includes('हाँ') || lower.includes('हां') || lower.includes('हೌದು') || lower.includes('ಹೌದು');
            const isNo = lower.includes('no') || lower.includes('नहीं') || lower.includes('ना') || lower.includes('ಇಲ್ಲ');

            if (isYes) {
              setSelectedOption('yes');
              if (isFinal) handleAutoSubmit('yes');
            } else if (isNo) {
              setSelectedOption('no');
              if (isFinal) handleAutoSubmit('no');
            } else if (isFinal) {
              handleSubmitAnswer(text.trim());
            }
          } else if (isFinal) {
            handleSubmitAnswer(text.trim());
          }
        },
        onError: (err) => {
          console.warn('[Microphone/Speech Stream]', err);
          // Keep listening status active unless explicitly stopped by patient
          if (err?.error === 'no-speech' || err?.error === 'aborted') {
            return;
          }
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
      const qText = currentQuestion.text || currentQuestion.questionText || '';
      if (qText) {
        defaultVoiceProvider.speak(qText, { language });
      }
    }
  };

  const resetInputState = () => {
    setSelectedOption('');
    setSelectedMultiple([]);
    setTextInput('');
    setNumberInput(5);
    setVoiceTranscript('');
    setMicErrorMsg('');
    defaultVoiceProvider.stopListening();
    setIsListening(false);
  };

  // Submit Answer & Fetch Next Dynamically Generated Question
  const handleSubmitAnswer = async (directAnswer) => {
    if (!currentQuestion || !sessionId || isLoading) return;

    let finalAnswer = directAnswer !== undefined ? directAnswer : '';
    if (!finalAnswer) {
      if (currentQuestion.type === 'multiple_choice') {
        finalAnswer = selectedMultiple.join(', ');
      } else if (currentQuestion.type === 'single_choice' || currentQuestion.type === 'yes_no') {
        finalAnswer = selectedOption || textInput;
      } else if (currentQuestion.type === 'number') {
        finalAnswer = String(numberInput);
      } else {
        finalAnswer = textInput || selectedOption;
      }
    }

    if (!finalAnswer && currentQuestion.required) {
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

          // Dispatch emergency alert to Doctor Dashboard in real time
          try {
            dispatchEmergencyAlert({
              sessionId,
              opdToken,
              patientName: selectedPatient?.full_name || 'Walk-in Patient',
              age: selectedPatient?.age,
              gender: selectedPatient?.gender,
              redFlags: res.redFlags || [],
              painSeverity: currentQuestion.clinicalField === 'severity' ? finalAnswer : undefined,
              clinicalSystem: system
            });
          } catch (e) {
            console.warn('Failed to dispatch alert:', e);
          }
        }

        if (res.completed || !res.nextQuestion) {
          // Transition to document upload step
          setStep('DOCS');
        } else {
          setCurrentQuestion(res.nextQuestion);
          setProgress(res.progress);
          resetInputState();

          // Read out next dynamically generated question
          if (!res.isRedFlag) {
            defaultVoiceProvider.speak(res.nextQuestion.text, { language });
          }
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      alert('Network error while saving response. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate Auto-Submit upon patient selection
  const handleAutoSubmit = (val) => {
    if (isLoading) return;
    setSelectedOption(val);
    handleSubmitAnswer(val);
  };

  // Document Upload Handlers
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

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
          fileName: res.fileName || file.name,
          documentType: docType,
          extractions: res.extractions,
          previewUrl: previewUrl,
          fileUrl: res.fileUrl || res.file_url || previewUrl,
          isPdf: isPdf
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
        isSpeakingPage={isSpeakingPage}
        onReadPageAloud={handleReadPageAloud}
        activeView={activeView}
        onNavigateView={(v) => setActiveView(v)}
      />

      {/* Red Flag Emergency Alert Modal */}
      <RedFlagModal
        redFlags={activeRedFlags}
        isOpen={showRedFlagModal}
        onClose={() => {
          setShowRedFlagModal(false);
          setStaffAlertToast(true);
          setTimeout(() => setStaffAlertToast(false), 5000);
          if (step === 'QUESTIONS' && currentQuestion?.text) {
            defaultVoiceProvider.speak(currentQuestion.text, { language });
          }
        }}
        onConfirmAndContinue={() => {
          setShowRedFlagModal(false);
          setStaffAlertToast(true);
          setTimeout(() => setStaffAlertToast(false), 5000);
          if (step === 'QUESTIONS' && currentQuestion?.text) {
            defaultVoiceProvider.speak(currentQuestion.text, { language });
          }
        }}
        language={language}
      />

      {/* Reassurance Notification Toast when Staff Alerted */}
      {staffAlertToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-emerald-700 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border-2 border-emerald-400 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0" />
          <div className="text-sm font-bold">
            {language === 'hi'
              ? '✓ अस्पताल स्टाफ एवं डॉक्टर वर्कस्टेशन को सूचित कर दिया गया है। कृपया आगे के प्रश्नों के उत्तर दें।'
              : language === 'kn'
              ? '✓ ಆಸ್ಪತ್ರೆ ಸಿಬ್ಬಂದಿ ಮತ್ತು ವೈದ್ಯರ ವರ್ಕ್‌ಸ್ಟೇಷನ್‌ಗೆ ತಿಳಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಮುಂದಿನ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ.'
              : '✓ Hospital staff & OPD physician alerted. Please continue with the remaining questions.'}
          </div>
        </div>
      )}

      {/* Render View: HOSPITALS (Hero Banner + GPS Tracker) OR INTAKE (Questionnaire) */}
      {activeView === 'HOSPITALS' ? (
        <HospitalGpsTracker
          language={language}
          onSelectHospital={(hosp) => setSelectedHospital(hosp)}
          onStartKiosk={() => {
            setActiveView('INTAKE');
            setStep('LANG');
          }}
        />
      ) : (
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
                onClick={() => {
                  setIsNewPatient(false);
                  setRegValidationError('');
                }}
                className={`flex-1 py-3 font-bold text-sm rounded-xl border-2 transition ${
                  !isNewPatient ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600'
                }`}
              >
                {language === 'hi' ? 'मौजूदा पंजीकृत डेमो मरीज' : language === 'kn' ? 'ನೋಂದಾಯಿತ ಡೆಮೊ ರೋಗಿಗಳು' : 'Existing Demo Patients'}
              </button>
              <button
                onClick={() => {
                  setIsNewPatient(true);
                  setRegValidationError('');
                }}
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
              <div className="space-y-6 mb-8">
                {/* 3 Walk-in Registration Options */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    {language === 'hi' ? 'पंजीकरण का तरीका चुनें' : language === 'kn' ? 'ನೋಂದಣಿ ವಿಧಾನವನ್ನು ಆಯ್ಕೆಮಾಡಿ' : 'Select Walk-in Registration Method'}
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Option 1: ABHA ID */}
                    <button
                      type="button"
                      onClick={() => {
                        setRegMethod('abha');
                        setRegValidationError('');
                      }}
                      className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                        regMethod === 'abha'
                          ? 'border-sky-600 bg-sky-50/80 shadow-sm ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2.5 rounded-xl ${regMethod === 'abha' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <CreditCard className="w-5 h-5" />
                        </div>
                        {regMethod === 'abha' && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-600 text-white">Active</span>
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {language === 'hi' ? 'आभा (ABHA) आईडी' : language === 'kn' ? 'ABHA ಐಡಿ' : 'ABHA Health ID'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {language === 'hi' ? 'सीधे विवरण प्राप्त करें' : language === 'kn' ? 'ನೇರ ವಿವರ ಪಡೆಯಿರಿ' : 'Direct ABDM Fetch'}
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Phone + OTP */}
                    <button
                      type="button"
                      onClick={() => {
                        setRegMethod('phone');
                        setRegValidationError('');
                      }}
                      className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                        regMethod === 'phone'
                          ? 'border-sky-600 bg-sky-50/80 shadow-sm ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2.5 rounded-xl ${regMethod === 'phone' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Smartphone className="w-5 h-5" />
                        </div>
                        {regMethod === 'phone' && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-600 text-white">Active</span>
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {language === 'hi' ? 'मोबाइल और ओटीपी' : language === 'kn' ? 'ಮೊಬೈಲ್ ಮತ್ತು ಒಟಿಪಿ' : 'Phone Number'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {language === 'hi' ? 'ओटीपी सत्यापन' : language === 'kn' ? 'OTP ಪರಿಶೀಲನೆ' : 'OTP Verified Intake'}
                        </div>
                      </div>
                    </button>

                    {/* Option 3: Name with Details */}
                    <button
                      type="button"
                      onClick={() => {
                        setRegMethod('manual');
                        setRegValidationError('');
                      }}
                      className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
                        regMethod === 'manual'
                          ? 'border-sky-600 bg-sky-50/80 shadow-sm ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2.5 rounded-xl ${regMethod === 'manual' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <UserPlus className="w-5 h-5" />
                        </div>
                        {regMethod === 'manual' && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-600 text-white">Active</span>
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {language === 'hi' ? 'नाम व विवरण' : language === 'kn' ? 'ಹೆಸರು ಮತ್ತು ವಿವರ' : 'Name with Details'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {language === 'hi' ? 'सीधा मैनुअल पंजीकरण' : language === 'kn' ? 'ನೇರ ನೋಂದಣಿ' : 'Manual Walk-in Entry'}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sub-Panel 1: ABHA ID */}
                {regMethod === 'abha' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center">
                          <CreditCard className="w-4 h-4 mr-1.5 text-sky-600" />
                          {language === 'hi' ? 'आयुष्मान भारत डिजिटल मिशन (ABHA) सत्यापन' : language === 'kn' ? 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಡಿಜಿಟಲ್ ಮಿಷನ್ (ABHA) ಪರಿಶೀಲನೆ' : 'Ayushman Bharat Health Account (ABHA) Direct Fetch'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {language === 'hi' ? '14 अंकों का आभा नंबर डालें, सिस्टम सीधे आपका नाम और विवरण प्राप्त कर लेगा।' : language === 'kn' ? '14 ಅಂಕಿಯ ABHA ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ, ಸಿಸ್ಟಮ್ ನೇರವಾಗಿ ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಪಡೆಯುತ್ತದೆ.' : 'Enter your 14-digit ABHA ID to automatically fetch demographics directly.'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-lg uppercase tracking-wide">
                        ABDM Govt
                      </span>
                    </div>

                    {/* Input + Fetch Button */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={abhaInput}
                          onChange={(e) => {
                            setAbhaInput(e.target.value);
                            setAbhaStatus('idle');
                            setAbhaErrorMsg('');
                          }}
                          placeholder="e.g. 91-2345-6789-0123"
                          className="w-full p-3 rounded-xl border border-slate-300 font-mono text-sm tracking-wide uppercase focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={abhaStatus === 'loading'}
                        onClick={() => handleFetchAbha()}
                        className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
                      >
                        {abhaStatus === 'loading' ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            <span>{language === 'hi' ? 'विवरण प्राप्त करें' : language === 'kn' ? 'ವಿವರ ಪಡೆಯಿರಿ' : 'Fetch Details'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick demo sample chips */}
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="font-semibold text-slate-600">Quick Demo Records:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAbhaInput('91-2345-6789-0123');
                          handleFetchAbha('91-2345-6789-0123');
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:border-sky-500 rounded-lg font-mono text-[11px] text-sky-700 transition"
                      >
                        91-2345-6789-0123 (Ramesh)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAbhaInput('91-8765-4321-9876');
                          handleFetchAbha('91-8765-4321-9876');
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:border-sky-500 rounded-lg font-mono text-[11px] text-sky-700 transition"
                      >
                        91-8765-4321-9876 (Sunita)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAbhaInput('91-1122-3344-5566');
                          handleFetchAbha('91-1122-3344-5566');
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:border-sky-500 rounded-lg font-mono text-[11px] text-sky-700 transition"
                      >
                        91-1122-3344-5566 (Rajesh)
                      </button>
                    </div>

                    {/* Error message */}
                    {abhaStatus === 'error' && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{abhaErrorMsg}</span>
                      </div>
                    )}

                    {/* Fetched Details Card */}
                    {abhaStatus === 'success' && abhaPatient && (
                      <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span className="font-extrabold text-emerald-900 text-sm">
                              ABDM Verified Health Record Fetched
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            {abhaPatient.abha_id}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                            <div className="text-slate-500 font-semibold uppercase text-[10px]">Full Name</div>
                            <div className="font-bold text-slate-900 text-sm mt-0.5">{abhaPatient.full_name}</div>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                            <div className="text-slate-500 font-semibold uppercase text-[10px]">Age & Gender</div>
                            <div className="font-bold text-slate-900 text-sm mt-0.5">{abhaPatient.age} Yrs • {abhaPatient.gender}</div>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                            <div className="text-slate-500 font-semibold uppercase text-[10px]">Phone</div>
                            <div className="font-bold text-slate-900 text-sm mt-0.5">{abhaPatient.phone || 'N/A'}</div>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                            <div className="text-slate-500 font-semibold uppercase text-[10px]">Blood Group</div>
                            <div className="font-bold text-slate-900 text-sm mt-0.5">{abhaPatient.blood_group || 'B+'}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-emerald-700 font-medium">
                            ✓ Ready to proceed to consultation
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAbhaStatus('idle');
                              setAbhaPatient(null);
                              setSelectedPatient(null);
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold"
                          >
                            Change / Re-fetch
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Panel 2: Phone + OTP */}
                {regMethod === 'phone' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center">
                          <Smartphone className="w-4 h-4 mr-1.5 text-sky-600" />
                          {language === 'hi' ? 'मोबाइल नंबर और ओटीपी सत्यापन' : language === 'kn' ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು ಒಟಿಪಿ ಪರಿಶೀಲನೆ' : 'Mobile Number & OTP Verification'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {language === 'hi' ? 'अपना 10 अंकों का मोबाइल नंबर दर्ज करें और एसएमएस ओटीपी सत्यापित करें।' : language === 'kn' ? 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ ಮತ್ತು SMS OTP ಪರಿಶೀಲಿಸಿ.' : 'Enter patient mobile number and verify via OTP before continuing.'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-sky-100 text-sky-800 text-[11px] font-black rounded-lg uppercase tracking-wide">
                        OTP Shield
                      </span>
                    </div>

                    {/* Phone Input Row */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          disabled={otpVerified}
                          value={phoneInput}
                          onChange={(e) => {
                            setPhoneInput(e.target.value);
                            setOtpError('');
                          }}
                          placeholder="Enter 10-digit mobile number"
                          className="w-full p-3 rounded-xl border border-slate-300 font-mono text-sm tracking-wide focus:ring-2 focus:ring-sky-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                      {!otpVerified ? (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          disabled={otpLoading}
                          className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-sm"
                        >
                          {otpLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Smartphone className="w-4 h-4" />
                          )}
                          <span>{otpSent ? 'Resend OTP' : 'Send OTP'}</span>
                        </button>
                      ) : (
                        <div className="px-4 py-3 bg-emerald-100 text-emerald-800 font-bold text-sm rounded-xl flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>

                    {/* SMS Banner when OTP is sent */}
                    {otpSent && !otpVerified && (
                      <div className="p-4 bg-sky-50 border border-sky-300 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-xs text-sky-900 font-semibold">
                          <span className="flex items-center">
                            <KeyRound className="w-4 h-4 mr-1.5 text-sky-700" />
                            SMS Dispatched via {otpGateway || 'SMS Gateway'}
                          </span>
                          {otpMaskedPhone && (
                            <span className="font-mono bg-sky-200/80 px-2 py-0.5 rounded text-sky-900 font-bold">
                              To: {otpMaskedPhone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-sky-800">
                          {otpDebugCode ? (
                            <>Offline Kiosk Simulator Code: <strong className="font-mono bg-amber-200 px-1.5 py-0.5 rounded">{otpDebugCode}</strong> (Sent to {otpMaskedPhone})</>
                          ) : (
                            <>Security OTP dispatched to <strong>{otpMaskedPhone || 'your mobile device'}</strong>. Please enter the 4-digit code below.</>
                          )}
                        </p>

                        {/* OTP Entry Box */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <input
                            type="text"
                            maxLength={6}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="Enter OTP"
                            className="w-36 p-2.5 rounded-xl border border-sky-400 bg-white font-mono text-center font-extrabold tracking-widest text-base focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={otpLoading}
                            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                          >
                            {otpLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>Verify OTP</span>
                          </button>
                          {otpDebugCode && (
                            <button
                              type="button"
                              onClick={() => {
                                setOtpInput(otpDebugCode);
                              }}
                              className="px-3 py-2 text-xs text-sky-800 font-bold hover:underline"
                            >
                              Auto-fill Code
                            </button>
                          )}
                          {otpResendCountdown > 0 && (
                            <span className="text-[11px] text-slate-500 ml-auto">
                              Resend in {otpResendCountdown}s
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* OTP error display */}
                    {otpError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}

                    {/* Once OTP is verified: Patient demographics form */}
                    {otpVerified && (
                      <div className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-2xl space-y-4">
                        <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Mobile Number Verified (+91 {phoneInput.replace(/\D/g, '').slice(-10)}). Please complete patient details:</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {t('fullNameLabel')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newPatientForm.full_name}
                              onChange={(e) => setNewPatientForm({ ...newPatientForm, full_name: e.target.value })}
                              placeholder="e.g. Ramesh Sharma"
                              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {t('ageLabel')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={newPatientForm.age}
                              onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                              placeholder="e.g. 54"
                              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">{t('genderLabel')}</label>
                            <select
                              value={newPatientForm.gender}
                              onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                            >
                              <option value="Male">{language === 'hi' ? 'पुरुष' : language === 'kn' ? 'ಪುರುಷ' : 'Male'}</option>
                              <option value="Female">{language === 'hi' ? 'महिला' : language === 'kn' ? 'ಮಹಿಳೆ' : 'Female'}</option>
                              <option value="Other">{language === 'hi' ? 'अन्य' : language === 'kn' ? 'ಇತರ' : 'Other'}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                            <select
                              value={newPatientForm.blood_group}
                              onChange={(e) => setNewPatientForm({ ...newPatientForm, blood_group: e.target.value })}
                              className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                            >
                              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Panel 3: Name with Details (Manual Entry) */}
                {regMethod === 'manual' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center">
                          <UserPlus className="w-4 h-4 mr-1.5 text-sky-600" />
                          {language === 'hi' ? 'मरीज का व्यक्तिगत विवरण' : language === 'kn' ? 'ರೋಗಿಯ ವೈಯಕ್ತಿಕ ವಿವರಗಳು' : 'Patient Demographics & Walk-in Details'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {language === 'hi' ? 'नाम, आयु, लिंग व अन्य विवरण सीधे भरें।' : language === 'kn' ? 'ಹೆಸರು, ವಯಸ್ಸು, ಲಿಂಗ ಮತ್ತು ಇತರ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ.' : 'Enter name, age, gender, phone and other walk-in patient information.'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[11px] font-black rounded-lg uppercase tracking-wide">
                        Manual Entry
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('fullNameLabel')} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newPatientForm.full_name}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, full_name: e.target.value })}
                          placeholder="e.g. Ramesh Sharma"
                          className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('ageLabel')} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={newPatientForm.age}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                          placeholder="e.g. 54"
                          className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('genderLabel')}</label>
                        <select
                          value={newPatientForm.gender}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                          className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
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
                          placeholder="Enter 10-digit mobile number"
                          className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                        <select
                          value={newPatientForm.blood_group}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, blood_group: e.target.value })}
                          className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                        >
                          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {language === 'hi' ? 'आपातकालीन संपर्क / पता' : language === 'kn' ? 'ತುರ್ತು ಸಂಪರ್ಕ / ವಿಳಾಸ' : 'Emergency Contact / Address (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={newPatientForm.emergency_contact || ''}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, emergency_contact: e.target.value })}
                          placeholder="e.g. Ward 4, Civil Hospital Rd"
                          className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Validation Error Notice */}
            {regValidationError && (
              <div className="mb-4 p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-2xl text-sm font-bold flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                <span>{regValidationError}</span>
              </div>
            )}

            <button
              onClick={handleProceedToConsent}
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {t('consentTitle')}
                  </h1>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                    {t('consentSubtitle')}
                  </p>
                </div>
              </div>

              {/* Default Audio Playback Status & Controls */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleReadPageAloud()}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center space-x-2 transition shadow-md border ${
                    isSpeakingPage
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse ring-4 ring-amber-100'
                      : 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700'
                  }`}
                  title={isSpeakingPage ? 'Pause / Mute Default Audio' : 'Replay Consent Audio'}
                >
                  {isSpeakingPage ? (
                    <>
                      <VolumeX className="w-5 h-5 text-white" />
                      <span>{language === 'hi' ? 'ऑडियो रोकें' : language === 'kn' ? 'ಆಡಿಯೋ ನಿಲ್ಲಿಸಿ' : 'Pause Audio'}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5" />
                      <span>{language === 'hi' ? 'पुनः सुनें' : language === 'kn' ? 'ಮತ್ತे आलिसि' : 'Replay Audio'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Default Audio Banner */}
            {isSpeakingPage && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span>
                    {language === 'hi'
                      ? '🔊 डिफ़ॉल्ट हिंदी ऑडियो स्वचालित रूप से पढ़ा जा रहा है...'
                      : language === 'kn'
                      ? '🔊 ಡೀಫಾಲ್ಟ್ ಕನ್ನಡ ಆಡಿಯೋ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ಲೇ ಆಗುತ್ತಿದೆ...'
                      : '🔊 Default audio is automatically reading this consent page aloud in your selected language...'}
                  </span>
                </div>
                <span className="font-mono bg-amber-200/80 px-2 py-0.5 rounded text-[11px] font-black uppercase">
                  {language.toUpperCase()} TTS ACTIVE
                </span>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm text-slate-700 space-y-3 mb-8">
              <p className="flex items-start">
                <span className="mr-2 text-sky-600 font-bold">•</span>
                <span>{t('consentText1')}</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2 text-sky-600 font-bold">•</span>
                <span>{t('consentText2')}</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2 text-sky-600 font-bold">•</span>
                <span>{t('consentText3')}</span>
              </p>
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
        {step === 'QUESTIONS' && currentQuestion && (() => {
          const qText = currentQuestion.text || currentQuestion.questionText || '';
          const rawType = (currentQuestion.type || currentQuestion.questionType || 'single_choice').toLowerCase();
          const qType = rawType === 'single_select' ? 'single_choice' : rawType === 'multi_select' ? 'multiple_choice' : rawType;

          return (
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
                      {qText}
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

                  {/* Microphone Error / Permission Alert Banner */}
                  {micErrorMsg && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{micErrorMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setMicErrorMsg(''); toggleVoiceListening(); }}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-extrabold text-[11px] shrink-0 ml-2"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>

                {/* QUESTION INPUT RENDERING ACCORDING TO QUESTION TYPE */}
                
                {/* Type 1: Single Choice Options - Instant Auto-Submit */}
                {qType === 'single_choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {currentQuestion.options?.map((opt) => (
                      <button
                        key={opt.value}
                        disabled={isLoading}
                        onClick={() => handleAutoSubmit(opt.value)}
                        className={`p-4 rounded-2xl border-2 text-left font-bold text-base transition-all kiosk-touch-button flex items-center justify-between ${
                          selectedOption === opt.value
                            ? 'border-sky-600 bg-sky-50 text-sky-950 shadow-md ring-2 ring-sky-300 scale-[1.01]'
                            : 'border-slate-200 hover:border-sky-400 text-slate-800 bg-white hover:bg-sky-50/40'
                        }`}
                      >
                        <span>{opt.text}</span>
                        {selectedOption === opt.value ? (
                          <CheckCircle2 className="w-6 h-6 text-sky-600 shrink-0 ml-2 animate-bounce" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Type 2: Yes / No Big Touch Buttons - Instant Auto-Submit */}
                {qType === 'yes_no' && (
                  <div className="grid grid-cols-2 gap-6 my-8">
                    <button
                      disabled={isLoading}
                      onClick={() => handleAutoSubmit('yes')}
                      className={`p-8 rounded-3xl border-4 text-center font-black text-2xl sm:text-3xl transition kiosk-touch-button ${
                        selectedOption === 'yes'
                          ? 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-100 scale-[1.02]'
                          : 'border-slate-200 hover:border-red-300 text-slate-800 bg-white hover:bg-red-50/40'
                      }`}
                    >
                      {language === 'hi' ? 'हाँ (YES)' : language === 'kn' ? 'ಹೌದು (YES)' : 'YES'}
                    </button>

                    <button
                      disabled={isLoading}
                      onClick={() => handleAutoSubmit('no')}
                      className={`p-8 rounded-3xl border-4 text-center font-black text-2xl sm:text-3xl transition kiosk-touch-button ${
                        selectedOption === 'no'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-100 scale-[1.02]'
                          : 'border-slate-200 hover:border-emerald-300 text-slate-800 bg-white hover:bg-emerald-50/40'
                      }`}
                    >
                      {language === 'hi' ? 'नहीं (NO)' : language === 'kn' ? 'ಇಲ್ಲ (NO)' : 'NO'}
                    </button>
                  </div>
                )}

                {/* Type 3: Multiple Choice */}
                {qType === 'multiple_choice' && (
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {selectedMultiple.length > 0 && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleSubmitAnswer()}
                        className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center space-x-2"
                      >
                        <span>{language === 'hi' ? 'उत्तर की पुष्टि करें' : language === 'kn' ? 'ದೃಢೀಕರಿಸಿ' : 'Confirm Selected Answers'}</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Type 4: Pain Scale Touch Buttons (1-10) - Instant Auto-Submit */}
                {qType === 'number' && (
                  <div className="my-6 bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {language === 'hi' ? 'दर्द का स्तर चुनें (1 हल्का - 10 अत्यधिक)' : language === 'kn' ? 'ನೋವಿನ ಪ್ರಮಾಣವನ್ನು ಆರಿಸಿ (1-10)' : 'Touch a number to rate your pain severity (1-10)'}
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleAutoSubmit(String(num))}
                          className={`p-3 sm:py-4 rounded-xl border-2 font-black text-lg sm:text-xl transition kiosk-touch-button ${
                            num >= 8
                              ? 'border-red-300 hover:border-red-600 hover:bg-red-50 text-red-700 bg-white'
                              : num >= 5
                              ? 'border-amber-300 hover:border-amber-600 hover:bg-amber-50 text-amber-700 bg-white'
                              : 'border-slate-200 hover:border-sky-600 hover:bg-sky-50 text-slate-800 bg-white'
                          } ${String(numberInput) === String(num) ? 'ring-2 ring-sky-500 bg-sky-100 font-extrabold' : ''}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 px-1">
                      <span>1 ({language === 'hi' ? 'हल्का' : language === 'kn' ? 'ಕಡಿಮೆ' : 'Mild'})</span>
                      <span>5 ({language === 'hi' ? 'मध्यम' : language === 'kn' ? 'ಮಧ್ಯಮ' : 'Moderate'})</span>
                      <span className="text-red-600">10 ({language === 'hi' ? 'असहनीय' : language === 'kn' ? 'ಅಸಹನೀಯ' : 'Emergency'})</span>
                    </div>
                  </div>
                )}

              {/* Text Input Fallback with Enter key / Send button */}
              <div className="mt-4 relative">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textInput.trim()) {
                      handleAutoSubmit(textInput.trim());
                    }
                  }}
                  placeholder={t('typeAnswerPlaceholder')}
                  className="w-full p-4 pr-24 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none text-base bg-white"
                />
                {textInput.trim() && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleAutoSubmit(textInput.trim())}
                    className="absolute right-3 top-2.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition flex items-center space-x-1 shadow-md"
                  >
                    <span>Send</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

            {/* Auto-advance Status / Feedback (No manual Next button) */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
                <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
                <span>
                  {language === 'hi'
                    ? 'उत्तर चुनते ही अगला प्रश्न अपने आप तैयार हो जाएगा'
                    : language === 'kn'
                    ? 'ಉತ್ತರ ಆರಿಸಿದ ತಕ್ಷಣ ಮುಂದಿನ ಪ್ರಶ್ನೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಿದ್ಧವಾಗುತ್ತದೆ'
                    : 'Select any option to instantly auto-generate the next clinical question'}
                </span>
              </div>
              {isLoading && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold animate-pulse shadow-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                  <span>
                    {language === 'hi'
                      ? 'आपके उत्तर के आधार पर अगला प्रश्न तैयार हो रहा है...'
                      : language === 'kn'
                      ? 'ಮುಂದಿನ ಪ್ರಶ್ನೆ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...'
                      : 'Auto-generating next question based on response...'}
                  </span>
                </div>
              )}
            </div>

          </div>
          );
        })()}

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

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Upload Area / Live Photo & PDF Preview Card */}
            {uploadedDocs.length > 0 ? (
              <div className="bg-slate-900 text-white rounded-3xl p-6 mb-6 shadow-2xl border-2 border-sky-400/40 relative overflow-hidden fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-xl bg-sky-500/20 text-sky-400 font-mono font-bold text-xs uppercase border border-sky-500/30 flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{uploadedDocs[uploadedDocs.length - 1].isPdf ? 'PDF Document' : 'Prescription Image'}</span>
                    </span>
                    <span className="text-xs text-slate-200 font-extrabold truncate max-w-[200px] sm:max-w-xs">
                      {uploadedDocs[uploadedDocs.length - 1].fileName}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-black flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Digitized</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition shadow"
                    >
                      + Replace / Add
                    </button>
                  </div>
                </div>

                {/* Photo or PDF Viewer Frame */}
                <div className="bg-slate-950 rounded-2xl p-2 border border-slate-800 flex items-center justify-center max-h-[420px] overflow-hidden relative group">
                  {uploadedDocs[uploadedDocs.length - 1].isPdf ? (
                    <iframe
                      src={uploadedDocs[uploadedDocs.length - 1].previewUrl || uploadedDocs[uploadedDocs.length - 1].fileUrl}
                      className="w-full h-[350px] rounded-xl border-none"
                      title="PDF Document Preview"
                    />
                  ) : (
                    <img
                      src={uploadedDocs[uploadedDocs.length - 1].previewUrl || uploadedDocs[uploadedDocs.length - 1].fileUrl}
                      alt="Uploaded Medical Prescription Preview"
                      className="max-h-[380px] w-auto max-w-full object-contain rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                  )}
                </div>

                {/* Footer instructions */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>📸 Photo uploaded & digitized via Medical AI.</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sky-400 hover:text-sky-300 font-bold underline ml-2"
                  >
                    + Add Another Document
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-3 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50 rounded-3xl p-8 text-center cursor-pointer transition mb-6"
              >
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
            )}

            {/* List of Uploaded and OCR Digitized Docs */}
            {uploadedDocs.length > 0 && (
              <div className="space-y-4 mb-8">
                <h4 className="font-bold text-slate-900 text-sm flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-sky-600" />
                  {t('extractedDataTitle')}
                </h4>
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200/80 pb-2">
                      <span className="flex items-center space-x-1.5 text-sky-700">
                        <FileText className="w-4 h-4 mr-1 text-sky-600" />
                        {doc.fileName} ({doc.documentType})
                      </span>
                      <span className="text-emerald-600 flex items-center font-black">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> {language === 'hi' ? 'डिजिटाइज़्ड' : language === 'kn' ? 'ಡಿಜಿಟೈಸ್ ಮಾಡಲಾಗಿದೆ' : 'Digitized via OCR AI'}
                      </span>
                    </div>

                    {doc.extractions?.medications?.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="font-bold text-slate-700 block uppercase text-[10px] text-sky-700">Extracted Prescription Medications:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {doc.extractions.medications.map((m, mIdx) => (
                            <div key={mIdx} className="p-2.5 bg-white border border-slate-200 rounded-xl font-medium flex items-center justify-between">
                              <span className="font-bold text-slate-900 flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{m.name}</span>
                              </span>
                              <span className="text-sky-800 font-mono text-[11px] font-bold">{m.dosage} • {m.frequency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
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
        {/* STEP 7: SESSION COMPLETED, OPD TOKEN & PRESCRIBED REPORT DATA */}
        {/* ------------------------------------------------------------------ */}
        {step === 'DONE' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 text-center max-w-4xl mx-auto w-full fade-in space-y-8">
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 mb-1">
                {t('doneTitle')}
              </h1>
              <p className="text-slate-500 text-sm max-w-md">
                {t('doneSubtitle')}
              </p>
            </div>

            {/* Token Badge */}
            <div className="bg-gradient-to-tr from-sky-50 to-teal-50 border-2 border-sky-200 rounded-3xl p-6 max-w-md mx-auto shadow-sm">
              <div className="text-xs uppercase font-black text-sky-600 tracking-wider mb-1">
                {t('opdTokenLabel')}
              </div>
              <div className="text-5xl font-black text-slate-900 tracking-tight">
                {opdToken || 'OPD-101'}
              </div>
              <div className="text-xs text-slate-500 mt-2 font-medium">
                {language === 'hi' ? 'रोगी' : language === 'kn' ? 'ರೋಗಿ' : 'Patient'}: <span className="font-bold text-slate-800">{selectedPatient?.full_name || 'Ramesh Sharma'}</span> | {language === 'hi' ? 'पद्धति' : language === 'kn' ? 'ವಿಭಾಗ' : 'System'}: <span className="uppercase font-bold text-sky-700">{system}</span>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* MEDICAL PRESCRIBED REPORT DATA CARD */}
            {/* ---------------------------------------------------------------- */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 sm:p-8 text-left shadow-sm space-y-6">
              
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
                    <Hospital className="w-4 h-4 text-sky-600" />
                    <span>{selectedHospital ? selectedHospital.name : 'Manipal Hospital HAL Old Airport Road, Bengaluru'}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    {language === 'hi' ? 'चिकित्सीय पर्चा एवं डिजिटल स्वास्थ्य रिपोर्ट' : language === 'kn' ? 'ವೈದ್ಯಕೀಯ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಮತ್ತು ಡಿಜಿಟಲ್ ಹೆಲ್ತ್ ವರದಿ' : 'Medical Prescription & Digital Health Report'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    OPD Token: <span className="font-bold text-slate-800 font-mono">{opdToken || 'OPD-101'}</span> • ABHA ID: <span className="font-bold text-slate-800 font-mono">{selectedPatient?.abha_id || '91-2345-6789-0123'}</span>
                  </p>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center space-x-1.5 ${
                    isRedFlag ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    <Activity className="w-3.5 h-3.5" />
                    <span>{isRedFlag ? 'STAT Triage Alert' : 'Routine OPD Intake'}</span>
                  </span>
                </div>
              </div>

              {/* Patient Demographics Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Patient Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedPatient?.full_name || 'Ramesh Sharma'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Age / Gender</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedPatient?.age || 54} Yrs / {selectedPatient?.gender || 'Male'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Clinical Protocol</span>
                  <span className="font-extrabold text-sky-700 text-sm uppercase">{system === 'ayush' ? 'AYUSH SACTP' : 'Allopathy SOCRATES'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Blood Group</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedPatient?.blood_group || 'B+'}</span>
                </div>
              </div>

              {/* Diagnosis & Clinical Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center">
                  <Stethoscope className="w-4 h-4 mr-1.5 text-sky-600" />
                  {language === 'hi' ? 'आकलन एवं निदान' : language === 'kn' ? 'ಮೌಲ್ಯಮಾಪನ ಮತ್ತು ರೋಗನಿರ್ಣಯ' : 'Evaluated Diagnosis & Clinical Summary'}
                </h4>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {summaryReportData?.summary?.prescribed_report?.diagnosis || summaryReportData?.summary?.chief_complaint || 'Ajeerna (Digestive Dysfunction)'}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    {summaryReportData?.summary?.hpi_summary || 'Patient completed standardized clinical case-taking. Symptoms and risk factors evaluated for physician consultation.'}
                  </p>
                </div>
              </div>

              {/* Prescribed Formulations / Medications */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center">
                  <Pill className="w-4 h-4 mr-1.5 text-teal-600" />
                  {language === 'hi' ? 'अनुशंसित दवाएं एवं औषधियां' : language === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಔಷಧಿಗಳು' : 'Prescribed Formulations & Medications'}
                </h4>
                
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-slate-100 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Medication / Formulation</th>
                        <th className="p-3">Dosage</th>
                        <th className="p-3">Frequency</th>
                        <th className="p-3">Directions / Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {(summaryReportData?.summary?.prescribed_report?.prescribed_medications || [
                        { name: 'Triphala Churna', dosage: '3g (1/2 tsp)', frequency: 'Twice daily', instructions: 'Take with warm water' },
                        { name: 'Shunthi Powder', dosage: '2g', frequency: 'Before meals', instructions: 'Take for Agni Deepana' },
                        { name: 'Sanjivani Vati', dosage: '1 tablet', frequency: 'Morning & Evening', instructions: 'Digestive Pachana support' }
                      ]).map((rx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-900 flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{rx.name}</span>
                          </td>
                          <td className="p-3 font-mono">{rx.dosage}</td>
                          <td className="p-3 font-semibold text-sky-800">{rx.frequency}</td>
                          <td className="p-3 text-slate-500">{rx.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Diet, Lifestyle & Yoga Therapy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-1">
                  <span className="font-extrabold text-emerald-900 block text-xs">
                    🥗 {language === 'hi' ? 'आहार एवं जीवनशैली सुझाव' : language === 'kn' ? 'ಆಹಾರ ಮತ್ತು ಜೀವನಶೈಲಿ ಮಾರ್ಗದರ್ಶನ' : 'Recommended Diet & Lifestyle'}
                  </span>
                  <p className="text-emerald-800 font-medium">
                    {summaryReportData?.summary?.prescribed_report?.diet_lifestyle || 'Avoid heavy, oily foods; consume warm light meals; stay hydrated.'}
                  </p>
                </div>

                {system === 'ayush' && (
                  <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl text-xs space-y-1">
                    <span className="font-extrabold text-teal-900 block text-xs">
                      🧘 {language === 'hi' ? 'योग एवं व्यायाम' : language === 'kn' ? 'ಯೋಗ ಮತ್ತು ದೈಹಿಕ ವ್ಯಾಯಾಮ' : 'Yoga & Physical Therapy Protocol'}
                    </span>
                    <p className="text-teal-800 font-medium">
                      {summaryReportData?.summary?.prescribed_report?.yoga_therapy || 'Vajrasana after meals, Pawanmuktasana, Anulom Vilom.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Report Actions Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center space-x-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === 'hi' ? 'रिपोर्ट प्रिंट करें' : language === 'kn' ? 'ವರದಿ ಮುದ್ರಿಸಿ' : 'Print Medical Report'}</span>
                </button>

                <div className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-300 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ABDM FHIR R4 Bundle Digitized</span>
                </div>
              </div>

            </div>

            <p className="text-slate-600 text-sm font-medium max-w-lg mx-auto">
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
                  setSummaryReportData(null);
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
      )}

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
