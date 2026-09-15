/**
 * Multilingual Translation and Localization Dictionary
 * Structured for easy extension to Telugu, Tamil, Kannada, Marathi, Bengali, etc.
 */

export const translations = {
  en: {
    appTitle: "MediKiosk",
    tagline: "Physical OPD Patient Case-Taking & Triage Kiosk",
    ministry: "Ministry of Ayush • Government of India",
    emergencyContact: "Staff Alert: Room 4 Emergency",
    
    // Steps
    stepLang: "Language",
    stepSystem: "Medical System",
    stepPatient: "Patient ID",
    stepConsent: "Consent",
    stepQuestions: "Case-Taking",
    stepDocs: "Prescriptions",
    stepDone: "OPD Token",
    
    // Language Selection Screen
    selectLanguageTitle: "Select Your Preferred Language",
    selectLanguageSubtitle: "कृपया अपनी भाषा चुनें (Touch to select)",
    continueBtn: "Continue",
    
    // Clinical System Selection
    selectSystemTitle: "Select Consultation System",
    selectSystemSubtitle: "Choose the outpatient department you wish to consult today",
    allopathyTitle: "Allopathy (Modern Medicine)",
    allopathyDesc: "Evidence-based clinical medicine, chest pain triage, and acute OPD evaluation",
    ayushTitle: "AYUSH (Ayurveda & Traditional)",
    ayushDesc: "Holistic health assessment, Dashavidha Pariksha, Prakriti, Agni, and lifestyle evaluation",
    
    // Patient ID Screen
    patientIdTitle: "Patient Identification",
    patientIdSubtitle: "Choose an existing registered patient or enter your ABHA number",
    demoPatientLabel: "Select Demo Patient for OPD Kiosk:",
    orAbhaLabel: "Or Enter ABHA / Aadhaar ID:",
    newPatientBtn: "New Walk-in Patient",
    fullNameLabel: "Full Name",
    ageLabel: "Age",
    genderLabel: "Gender",
    phoneLabel: "Mobile Phone",
    
    // Consent Screen
    consentTitle: "Patient Consent & Privacy Notice",
    consentSubtitle: "Under the Ayushman Bharat Digital Mission (ABDM) guidelines",
    consentText1: "I voluntarily consent to share my health symptoms, medical history, and physical documents via this MediKiosk terminal.",
    consentText2: "The collected clinical case-history will be synthesized for the attending OPD physician to review and verify.",
    consentText3: "Digital records may be formatted into FHIR standards and securely integrated with the Hospital Information System (HIS) with my consent.",
    consentCheckbox: "I understand and agree to the clinical history-taking process.",
    agreeContinueBtn: "I Agree & Begin Consultation",
    listenPageAudio: "Listen to Page (Audio)",
    stopPageAudio: "Stop Audio Reading",

    
    // Kiosk Question Screen
    questionProgress: "Question",
    of: "of",
    tapToSpeak: "Tap to Speak (Voice Answer)",
    listening: "Listening... Please speak clearly",
    stopListening: "Done Speaking",
    replayQuestion: "Hear Question (Audio)",
    recognizedText: "Voice recognized:",
    typeAnswerPlaceholder: "Or type your answer here...",
    submitAnswerBtn: "Next Question",
    backBtn: "Back",
    emergencyAlertBadge: "Emergency Warning Sign Detected",
    
    // Document Upload Screen
    docUploadTitle: "Upload Previous Medical Documents",
    docUploadSubtitle: "Scan or upload past prescriptions, blood test reports, or discharge summaries",
    uploadCardText: "Touch here to browse or take a photo of your prescription / report",
    supportedFormats: "Supported formats: JPG, PNG, PDF (Max 15MB)",
    docTypePrescription: "OPD Prescription",
    docTypeLab: "Blood / Lab Report",
    docTypeDischarge: "Discharge Summary",
    uploadingDoc: "Digitizing and running OCR extraction...",
    docUploadedSuccess: "Document digitized successfully!",
    skipDocBtn: "No Documents (Proceed to OPD Token)",
    finishDocBtn: "Continue to OPD Token",
    extractedDataTitle: "Extracted Clinical Findings (OCR):",
    
    // Done Screen
    doneTitle: "Case-Taking Completed Successfully",
    doneSubtitle: "Your clinical history has been digitized and forwarded to the doctor workstation.",
    opdTokenLabel: "Your OPD Token Number:",
    proceedInstructions: "Please take your seat in Waiting Area B. You will be called to Room 4 when the doctor is ready.",
    startNewSession: "Start New Patient Session",
    
    // Doctor Portal Toggle
    doctorPortalBtn: "Open Doctor Workstation",
    kioskModeBtn: "Return to Patient Kiosk"
  },
  
  hi: {
    appTitle: "मेडीकियोस्क",
    tagline: "ओपीडी रोगी केस-टेकिंग एवं प्राथमिक मूल्यांकन कियोस्क",
    ministry: "आयुष मंत्रालय • भारत सरकार",
    emergencyContact: "आपातकालीन सूचना: कमरा नं 4",
    
    // Steps
    stepLang: "भाषा",
    stepSystem: "चिकित्सा पद्धति",
    stepPatient: "रोगी पहचान",
    stepConsent: "सहमति",
    stepQuestions: "प्रश्न-उत्तर",
    stepDocs: "दस्तावेज़",
    stepDone: "ओपीडी टोकन",
    
    // Language Selection Screen
    selectLanguageTitle: "अपनी पसंदीदा भाषा चुनें",
    selectLanguageSubtitle: "स्क्रीन पर स्पर्श करके अपनी भाषा चुनें",
    continueBtn: "आगे बढ़ें",
    
    // Clinical System Selection
    selectSystemTitle: "चिकित्सा परामर्श पद्धति चुनें",
    selectSystemSubtitle: "आज आप किस विभाग में परामर्श लेना चाहते हैं?",
    allopathyTitle: "एलोपैथी (आधुनिक चिकित्सा)",
    allopathyDesc: "छाती दर्द, हृदय संबंधी लक्षण और आधुनिक प्राथमिक ओपीडी मूल्यांकन",
    ayushTitle: "आयुष (आयुर्वेद एवं पारंपरिक चिकित्सा)",
    ayushDesc: "दशविध परीक्षा, प्रकृति, अग्नि, कोष्ठ एवं समग्र स्वास्थ्य मूल्यांकन",
    
    // Patient ID Screen
    patientIdTitle: "रोगी पहचान एवं पंजीकरण",
    patientIdSubtitle: "पहले से पंजीकृत रोगी चुनें या आभा (ABHA) आईडी दर्ज करें",
    demoPatientLabel: "डेमो रोगी का चयन करें:",
    orAbhaLabel: "या आभा / आधार संख्या दर्ज करें:",
    newPatientBtn: "नया ओपीडी रोगी",
    fullNameLabel: "पूरा नाम",
    ageLabel: "उम्र",
    genderLabel: "लिंग",
    phoneLabel: "मोबाइल नंबर",
    
    // Consent Screen
    consentTitle: "रोगी सहमति एवं गोपनीयता सूचना",
    consentSubtitle: "आयुष्मान भारत डिजिटल मिशन (ABDM) के दिशा-निर्देशों के अनुसार",
    consentText1: "मैं स्वेच्छा से इस कियोस्क टर्मिनल के माध्यम से अपने लक्षण और पिछली मेडिकल जानकारी साझा करने की सहमति देता/देती हूँ।",
    consentText2: "एकत्रित की गई जानकारी ओपीडी चिकित्सक के सत्यापन और उचित परामर्श के लिए प्रस्तुत की जाएगी।",
    consentText3: "यह डेटा सुरक्षित रूप से अस्पताल सूचना प्रणाली (HIS) के साथ साझा किया जा सकता है।",
    consentCheckbox: "मैं नियमों को समझता/समझती हूँ और सहमत हूँ।",
    agreeContinueBtn: "सहमति दें एवं परामर्श शुरू करें",
    listenPageAudio: "पेज ऑडियो सुनें",
    stopPageAudio: "ऑडियो बंद करें",

    
    // Kiosk Question Screen
    questionProgress: "प्रश्न",
    of: "में से",
    tapToSpeak: "बोलकर उत्तर दें (माइक दबाएं)",
    listening: "सुन रहे हैं... कृपया स्पष्ट बोलें",
    stopListening: "बोलना समाप्त हुआ",
    replayQuestion: "प्रश्न सुनें (ऑडियो)",
    recognizedText: "पहचानी गई आवाज:",
    typeAnswerPlaceholder: "या यहाँ अपना उत्तर लिखें...",
    submitAnswerBtn: "अगला प्रश्न",
    backBtn: "पीछे",
    emergencyAlertBadge: "संभावित आपातकालीन चेतावनी संकेत",
    
    // Document Upload Screen
    docUploadTitle: "पुराने पर्चे या जांच रिपोर्ट अपलोड करें",
    docUploadSubtitle: "पुराना पर्चा, खून की जांच या डिस्चार्ज समरी की फोटो खींचें या अपलोड करें",
    uploadCardText: "पर्चा या रिपोर्ट अपलोड करने के लिए यहाँ स्पर्श करें",
    supportedFormats: "स्वीकृत प्रारूप: JPG, PNG, PDF (अधिकतम 15MB)",
    docTypePrescription: "डॉक्टर का पर्चा",
    docTypeLab: "जांच / लैब रिपोर्ट",
    docTypeDischarge: "अस्पताल डिस्चार्ज समरी",
    uploadingDoc: "दस्तावेज़ स्कैन और ओसीआर विश्लेषण हो रहा है...",
    docUploadedSuccess: "दस्तावेज़ सफलतापूर्वक डिजिटाइज़ हो गया!",
    skipDocBtn: "कोई दस्तावेज़ नहीं है (टोकन प्राप्त करें)",
    finishDocBtn: "ओपीडी टोकन प्राप्त करें",
    extractedDataTitle: "दस्तावेज़ से निकाली गई जानकारी (OCR):",
    
    // Done Screen
    doneTitle: "केस-टेकिंग सफलतापूर्वक पूर्ण हुई",
    doneSubtitle: "आपकी स्वास्थ्य जानकारी डिजिटाइज़ करके डॉक्टर के कंप्यूटर पर भेज दी गई है।",
    opdTokenLabel: "आपका ओपीडी टोकन नंबर:",
    proceedInstructions: "कृपया प्रतीक्षालय 'ख' में बैठें। डॉक्टर के तैयार होने पर आपको कमरा नं 4 में बुलाया जाएगा।",
    startNewSession: "नए रोगी का सत्र शुरू करें",
    
    // Doctor Portal Toggle
    doctorPortalBtn: "डॉक्टर वर्कस्टेशन खोलें",
    kioskModeBtn: "रोगी कियोस्क पर वापस जाएं"
  },

  kn: {
    appTitle: "ಮೆಡಿಕಿಯೋಸ್ಕ್",
    tagline: "OPD ರೋಗಿಗಳ ಕೇಸ್-ಟೇಕಿಂಗ್ ಮತ್ತು ಟ್ರಯೇಜ್ ಕಿಯೋಸ್ಕ್",
    ministry: "ಆಯುಷ್ ಸಚಿವಾಲಯ • ಭಾರತ ಸರ್ಕಾರ",
    emergencyContact: "ಸಿಬ್ಬಂದಿ ಎಚ್ಚರಿಕೆ: ಕೊಠಡಿ 4 ತುರ್ತುಸ್ಥಿತಿ",
    
    // Steps
    stepLang: "ಭಾಷೆ",
    stepSystem: "ವೈದ್ಯಕೀಯ ವ್ಯವಸ್ಥೆ",
    stepPatient: "ರೋಗಿಯ ವಿವರ",
    stepConsent: "ಸಮ್ಮತಿ",
    stepQuestions: "ಕೇಸ್-ಟೇಕಿಂಗ್",
    stepDocs: "ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ಗಳು",
    stepDone: "OPD ಟೋಕನ್",
    
    // Language Selection Screen
    selectLanguageTitle: "ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    selectLanguageSubtitle: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ (ಆಯ್ಕೆ ಮಾಡಲು ಸ್ಪರ್ಶಿಸಿ)",
    continueBtn: "ಮುಂದುವರಿಯಿರಿ",
    
    // Clinical System Selection
    selectSystemTitle: "ಸಮಾಲೋಚನಾ ವಿಭಾಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    selectSystemSubtitle: "ನೀವು ಇಂದು ಸಮಾಲೋಚಿಸಲು ಬಯಸುವ ಹೊರರೋಗಿ (OPD) ವಿಭಾಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    allopathyTitle: "ಅಲೋಪತಿ (ಆಧುನಿಕ ವೈದ್ಯಕೀಯ)",
    allopathyDesc: "ಸಾಕ್ಷ್ಯಾಧಾರಿತ ಚಿಕಿತ್ಸೆ, ಎದೆನೋವು ತಪಾಸಣೆ ಮತ್ತು ತುರ್ತು OPD ಮೌಲ್ಯಮಾಪನ",
    ayushTitle: "ಆಯುಷ್ (ಆಯುರ್ವೇದ ಮತ್ತು ಸಾಂಪ್ರದಾಯಿಕ)",
    ayushDesc: "ಸಮಗ್ರ ಆರೋಗ್ಯ ಮೌಲ್ಯಮಾಪನ, ದಶವಿಧ ಪರೀಕ್ಷೆ, ಪ್ರಕೃತಿ, ಅಗ್ನಿ ಮತ್ತು ಜೀವನಶೈಲಿ ಪರೀಕ್ಷೆ",
    
    // Patient ID Screen
    patientIdTitle: "ರೋಗಿಯ ಗುರುತಿಸುವಿಕೆ",
    patientIdSubtitle: "ಈಗಾಗಲೇ ನೋಂದಾಯಿತ ರೋಗಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ನಿಮ್ಮ ಆಭಾ (ABHA) ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
    demoPatientLabel: "OPD ಕಿಯೋಸ್ಕ್ಗಾಗಿ ಡೆಮೊ ರೋಗಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:",
    orAbhaLabel: "ಅಥವಾ ಆಭಾ / ಆಧಾರ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ:",
    newPatientBtn: "ಹೊಸ ರೋಗಿ ನೋಂದಣಿ",
    fullNameLabel: "ಪೂರ್ಣ ಹೆಸರು",
    ageLabel: "ವಯಸ್ಸು",
    genderLabel: "ಲಿಂಗ",
    phoneLabel: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
    
    // Consent Screen
    consentTitle: "ರೋಗಿಯ ಸಮ್ಮತಿ ಮತ್ತು ಗೌಪ್ಯತೆ ಸೂಚನೆ",
    consentSubtitle: "ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಡಿಜಿಟಲ್ ಮಿಷನ್ (ABDM) ಮಾರ್ಗಸೂಚಿಗಳ ಅಡಿಯಲ್ಲಿ",
    consentText1: "ಈ ಮೆಡಿಕಿಯೋಸ್ಕ್ ಟರ್ಮಿನಲ್ ಮೂಲಕ ನನ್ನ ಆರೋಗ್ಯ ಲಕ್ಷಣಗಳು, ವೈದ್ಯಕೀಯ ಇತಿಹಾಸ ಮತ್ತು ದಾಖಲೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಲು ನಾನು ಸ್ವಯಂಪ್ರೇರಿತರಾಗಿ ಸಮ್ಮತಿಸುತ್ತೇನೆ.",
    consentText2: "ಸಂಗ್ರಹಿಸಿದ ವೈದ್ಯಕೀಯ ಮಾಹಿತಿಯನ್ನು ಹಾಜರಾಗುವ OPD ವೈದ್ಯರ ಪರಿಶೀಲನೆ ಮತ್ತು ದೃಢೀಕರಣಕ್ಕಾಗಿ ಪ್ರಸ್ತುತಪಡಿಸಲಾಗುತ್ತದೆ.",
    consentText3: "ನನ್ನ ಸಮ್ಮತಿಯೊಂದಿಗೆ ಡಿಜಿಟಲ್ ದಾಖಲೆಗಳನ್ನು FHIR ಮಾನದಂಡಗಳಲ್ಲಿ ಆಸ್ಪತ್ರೆ ಮಾಹಿತಿ ವ್ಯವಸ್ಥೆಗೆ (HIS) ಸುರಕ್ಷಿತವಾಗಿ ರವಾನಿಸಬಹುದು.",
    consentCheckbox: "ನಾನು ನಿಯಮಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ ಮತ್ತು ಸಮಾಲೋಚನೆಗೆ ಒಪ್ಪುತ್ತೇನೆ.",
    agreeContinueBtn: "ನಾನು ಒಪ್ಪುತ್ತೇನೆ ಮತ್ತು ಸಮಾಲೋಚನೆ ಪ್ರಾರಂಭಿಸಿ",
    listenPageAudio: "ಪುಟದ ಆಡಿಯೋ ಆಲಿಸಿ",
    stopPageAudio: "ಆಡಿಯೋ ನಿಲ್ಲಿಸಿ",

    
    // Kiosk Question Screen
    questionProgress: "ಪ್ರಶ್ನೆ",
    of: "ರಲ್ಲಿ",
    tapToSpeak: "ಮಾತನಾಡಿ ಉತ್ತರಿಸಲು ಸ್ಪರ್ಶಿಸಿ (ಧ್ವನಿ)",
    listening: "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ... ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ",
    stopListening: "ಮಾತನಾಡುವುದು ಮುಕ್ತಾಯ",
    replayQuestion: "ಪ್ರಶ್ನೆಯನ್ನು ಆಲಿಸಿ (ಆಡಿಯೋ)",
    recognizedText: "ಗುರುತಿಸಲಾದ ಧ್ವನಿ:",
    typeAnswerPlaceholder: "ಅಥವಾ ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...",
    submitAnswerBtn: "ಮುಂದಿನ ಪ್ರಶ್ನೆ",
    backBtn: "ಹಿಂದೆ",
    emergencyAlertBadge: "ತುರ್ತು ಎಚ್ಚರಿಕೆ ಸೂಚನೆ ಕಂಡುಬಂದಿದೆ",
    
    // Document Upload Screen
    docUploadTitle: "ಹಿಂದಿನ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    docUploadSubtitle: "ಹಿಂದಿನ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್, ರಕ್ತ ಪರೀಕ್ಷಾ ವರದಿ ಅಥವಾ ಡಿಸ್ಚಾರ್ಜ್ ಸಾರಾಂಶವನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    uploadCardText: "ನಿಮ್ಮ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಥವಾ ವರದಿಯನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಲು ಇಲ್ಲಿ ಸ್ಪರ್ಶಿಸಿ",
    supportedFormats: "ಬೆಂಬಲಿತ ಸ್ವರೂಪಗಳು: JPG, PNG, PDF (ಗರಿಷ್ಠ 15MB)",
    docTypePrescription: "OPD ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್",
    docTypeLab: "ರಕ್ತ / ಲ್ಯಾಬ್ ವರದಿ",
    docTypeDischarge: "ಡಿಸ್ಚಾರ್ಜ್ ಸಾರಾಂಶ",
    uploadingDoc: "ದಾಖಲೆಯನ್ನು ಡಿಜಿಟೈಜ್ ಮತ್ತು OCR ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ...",
    docUploadedSuccess: "ದಾಖಲೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಡಿಜಿಟೈಜ್ ಮಾಡಲಾಗಿದೆ!",
    skipDocBtn: "ದಾಖಲೆಗಳಿಲ್ಲ (OPD ಟೋಕನ್ಗೆ ಮುಂದುವರಿಯಿರಿ)",
    finishDocBtn: "OPD ಟೋಕನ್ಗೆ ಮುಂದುವರಿಯಿರಿ",
    extractedDataTitle: "ದಾಖಲೆಯಿಂದ ಪಡೆದ ವೈದ್ಯಕೀಯ ವಿವರಗಳು (OCR):",
    
    // Done Screen
    doneTitle: "ಕೇಸ್-ಟೇಕಿಂಗ್ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ",
    doneSubtitle: "ನಿಮ್ಮ ಆರೋಗ್ಯ ಇತಿಹಾಸವನ್ನು ಡಿಜಿಟೈಜ್ ಮಾಡಿ ವೈದ್ಯರ ಕಂಪ್ಯೂಟರ್‌ಗೆ ಕಳುಹಿಸಲಾಗಿದೆ.",
    opdTokenLabel: "ನಿಮ್ಮ OPD ಟೋಕನ್ ಸಂಖ್ಯೆ:",
    proceedInstructions: "ದಯವಿಟ್ಟು ಕಾಯುವ ಕೊಠಡಿ 'B' ನಲ್ಲಿ ಆಸೀನರಾಗಿ. ವೈದ್ಯರು ಸಿದ್ಧರಾದಾಗ ನಿಮ್ಮನ್ನು ಕೊಠಡಿ 4ಕ್ಕೆ ಕರೆಯಲಾಗುವುದು.",
    startNewSession: "ಹೊಸ ರೋಗಿಯ ಸೆಷನ್ ಪ್ರಾರಂಭಿಸಿ",
    
    // Doctor Portal Toggle
    doctorPortalBtn: "ವೈದ್ಯರ ವರ್ಕ್‌ಸ್ಟೇಷನ್ ತೆರೆಯಿರಿ",
    kioskModeBtn: "ರೋಗಿ ಕಿಯೋಸ್ಕ್‌ಗೆ ಹಿಂತಿರುಗಿ"
  }
};

export const getTranslation = (lang, key) => {
  const dictionary = translations[lang] || translations.en;
  return dictionary[key] || translations.en[key] || key;
};
