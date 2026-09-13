/**
 * Seed data for MediKiosk
 * Provides full clinical question banks, options, red-flag triggers,
 * demo patients, and sample documents.
 */

const SEED_PATIENTS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    abha_id: '91-2345-6789-0123',
    aadhaar_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    full_name: 'Ramesh Sharma',
    age: 54,
    gender: 'Male',
    phone: '+91 9876543210',
    blood_group: 'B+'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    abha_id: '91-8765-4321-9876',
    aadhaar_hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    full_name: 'Sunita Patel',
    age: 42,
    gender: 'Female',
    phone: '+91 9812345678',
    blood_group: 'O+'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    abha_id: '91-1122-3344-5566',
    aadhaar_hash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    full_name: 'Rajesh Kumar',
    age: 61,
    gender: 'Male',
    phone: '+91 9765432109',
    blood_group: 'A+'
  }
];

const SEED_CONDITIONS = [
  {
    id: 'chest_pain',
    name: 'Acute / Subacute Chest Pain',
    clinical_system: 'allopathy',
    description: 'Evaluation of acute coronary syndromes, angina, and chest discomfort red flags.'
  },
  {
    id: 'ayush_general',
    name: 'Dashavidha Pariksha & Rogi Assessment',
    clinical_system: 'ayush',
    description: 'Comprehensive 10-fold clinical evaluation covering Prakriti, Agni, Koshtha, and lifestyle.'
  }
];

const SEED_RED_FLAGS = [
  {
    id: 'rf_radiation_arm',
    condition_id: 'chest_pain',
    rule_name: 'Left Arm / Shoulder Radiation',
    clinical_field: 'radiation',
    operator: 'contains',
    trigger_value: 'left arm',
    severity: 'CRITICAL',
    warning_message_en: 'Potential warning sign detected: Pain radiating to the left arm is a high-risk symptom for acute coronary syndrome. Please alert hospital staff immediately.',
    warning_message_hi: 'संभावित चेतावनी संकेत: बाएं हाथ में जाने वाला दर्द हृदय संबंधी आपातकाल का संकेत हो सकता है। कृपया तुरंत अस्पताल स्टाफ को सूचित करें।',
    clinical_rationale: 'Radiation of chest pain to left arm is strongly associated with acute myocardial ischemia.'
  },
  {
    id: 'rf_radiation_jaw',
    condition_id: 'chest_pain',
    rule_name: 'Jaw / Neck Radiation',
    clinical_field: 'radiation',
    operator: 'contains',
    trigger_value: 'jaw',
    severity: 'CRITICAL',
    warning_message_en: 'Potential warning sign detected: Pain radiating to the jaw/neck requires emergency clinical evaluation.',
    warning_message_hi: 'संभावित चेतावनी संकेत: जबड़े या गर्दन तक जाने वाला दर्द तत्काल जांच की मांग करता है।',
    clinical_rationale: 'Anginal pain radiation to jaw/neck dermatomic pathways.'
  },
  {
    id: 'rf_severe_pain',
    condition_id: 'chest_pain',
    rule_name: 'Severe Pain Intensity (>=8)',
    clinical_field: 'severity',
    operator: 'greater_than_or_equal',
    trigger_value: '8',
    severity: 'HIGH',
    warning_message_en: 'High pain severity (8/10 or higher) reported. Triaged for immediate physician assessment.',
    warning_message_hi: 'अत्यधिक दर्द (8/10 या अधिक) दर्ज किया गया है। तुरंत डॉक्टर से मिलें।',
    clinical_rationale: 'High pain score indicates urgent clinical prioritization.'
  },
  {
    id: 'rf_syncope',
    condition_id: 'chest_pain',
    rule_name: 'Syncope or Fainting',
    clinical_field: 'syncope',
    operator: 'equals',
    trigger_value: 'yes',
    severity: 'CRITICAL',
    warning_message_en: 'Potential warning sign detected: Fainting or sudden loss of consciousness indicates hemodynamic instability.',
    warning_message_hi: 'संभावित चेतावनी संकेत: बेहोशी या चक्कर आना गंभीर स्थिति का संकेत हो सकता है।',
    clinical_rationale: 'Cardiogenic syncope indicates arrhythmia or severe hemodynamic compromise.'
  }
];

const SEED_QUESTIONS = [
  // ================= ALLOPATHY: CHEST PAIN =================
  {
    id: 'cp_q1',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'What is your primary discomfort today?',
    question_text_hi: 'आज आपको मुख्य रूप से क्या परेशानी है?',
    question_type: 'single_choice',
    clinical_field: 'chief_complaint',
    sequence: 1,
    required: true,
    options: [
      { value: 'chest_pain_pressure', text_en: 'Chest pain or heavy pressure', text_hi: 'छाती में दर्द या भारी दबाव' },
      { value: 'chest_burning', text_en: 'Burning sensation in chest', text_hi: 'छाती में जलन' },
      { value: 'chest_tightness_breathless', text_en: 'Chest tightness with breathlessness', text_hi: 'छाती में जकड़न और सांस फूलना' },
      { value: 'other_discomfort', text_en: 'Other chest discomfort', text_hi: 'अन्य छाती संबंधी परेशानी' }
    ]
  },
  {
    id: 'cp_q2',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Where exactly do you feel the pain or discomfort?',
    question_text_hi: 'दर्द या बेचैनी वास्तव में कहाँ महसूस हो रही है?',
    question_type: 'single_choice',
    clinical_field: 'site',
    sequence: 2,
    required: true,
    options: [
      { value: 'center_retrosternal', text_en: 'Center of chest (behind breastbone)', text_hi: 'छाती के बीचों-बीच (हड्डी के पीछे)' },
      { value: 'left_side', text_en: 'Left side of chest', text_hi: 'छाती के बाईं ओर' },
      { value: 'right_side', text_en: 'Right side of chest', text_hi: 'छाती के दाईं ओर' },
      { value: 'upper_abdomen', text_en: 'Upper abdomen / epigastric', text_hi: 'पेट के ऊपरी हिस्से में' }
    ]
  },
  {
    id: 'cp_q3',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'How did the pain start?',
    question_text_hi: 'दर्द की शुरुआत कैसे हुई?',
    question_type: 'single_choice',
    clinical_field: 'onset',
    sequence: 3,
    required: true,
    options: [
      { value: 'sudden', text_en: 'Suddenly (within minutes)', text_hi: 'अचानक (कुछ ही मिनटों में)' },
      { value: 'gradual', text_en: 'Gradually (built up over hours/days)', text_hi: 'धीरे-धीरे (घंटों या दिनों में बढ़ा)' }
    ]
  },
  {
    id: 'cp_q4',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'How long has this pain been present?',
    question_text_hi: 'यह दर्द कितने समय से है?',
    question_type: 'single_choice',
    clinical_field: 'duration',
    sequence: 4,
    required: true,
    options: [
      { value: 'under_30_mins', text_en: 'Less than 30 minutes', text_hi: '30 मिनट से कम' },
      { value: '30_to_120_mins', text_en: '30 minutes to 2 hours', text_hi: '30 मिनट से 2 घंटे' },
      { value: 'several_hours', text_en: 'Several hours', text_hi: 'कई घंटों से' },
      { value: 'more_than_a_day', text_en: 'More than 24 hours', text_hi: 'एक दिन से अधिक' }
    ]
  },
  {
    id: 'cp_q5',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'How would you describe the feeling of the pain?',
    question_text_hi: 'दर्द किस प्रकार का महसूस होता है?',
    question_type: 'single_choice',
    clinical_field: 'character',
    sequence: 5,
    required: true,
    options: [
      { value: 'crushing_heavy', text_en: 'Crushing pressure, weight, or squeezing', text_hi: 'भारी दबाव, निचोड़ने या कुचलने जैसा' },
      { value: 'sharp_stabbing', text_en: 'Sharp, stabbing or needle-like', text_hi: 'तेज, चुभने या सुई जैसा दर्द' },
      { value: 'burning_acidity', text_en: 'Burning or acid reflux sensation', text_hi: 'जलन या एसिडिटी जैसा दर्द' },
      { value: 'dull_ache', text_en: 'Dull continuous ache', text_hi: 'हल्का लगातार मीठा दर्द' }
    ]
  },
  {
    id: 'cp_q6',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'On a scale of 1 to 10, how severe is your pain right now?',
    question_text_hi: '1 से 10 के पैमाने पर, अभी दर्द कितना तेज है?',
    question_type: 'number',
    clinical_field: 'severity',
    sequence: 6,
    required: true,
    options: []
  },
  {
    id: 'cp_q7',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Does the pain spread (radiate) to any other part of your body?',
    question_text_hi: 'क्या दर्द शरीर के किसी अन्य हिस्से में फैलता है?',
    question_type: 'single_choice',
    clinical_field: 'radiation',
    sequence: 7,
    required: true,
    options: [
      { value: 'left arm', text_en: 'Radiates to Left Arm and Shoulder', text_hi: 'बाएं हाथ और कंधे में फैलता है' },
      { value: 'jaw', text_en: 'Radiates to Jaw, Teeth or Neck', text_hi: 'जबड़े, दांत या गर्दन में फैलता है' },
      { value: 'back', text_en: 'Radiates to Upper Back', text_hi: 'पीठ के ऊपरी हिस्से में फैलता है' },
      { value: 'both_arms', text_en: 'Radiates to Both Arms', text_hi: 'दोनों हाथों में फैलता है' },
      { value: 'none', text_en: 'No, stays in one spot only', text_hi: 'नहीं, केवल एक ही जगह रहता है' }
    ]
  },
  {
    id: 'cp_q8',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'What makes the pain worse?',
    question_text_hi: 'किस कारण से दर्द बढ़ जाता है?',
    question_type: 'single_choice',
    clinical_field: 'aggravating_factors',
    sequence: 8,
    required: true,
    options: [
      { value: 'walking_exertion', text_en: 'Walking, stairs or physical exertion', text_hi: 'चलने, सीढ़ियां चढ़ने या मेहनत करने से' },
      { value: 'deep_breathing', text_en: 'Deep breathing or coughing', text_hi: 'गहरी सांस लेने या खांसने से' },
      { value: 'emotional_stress', text_en: 'Mental tension or emotional stress', text_hi: 'तनाव या मानसिक चिंता से' },
      { value: 'lying_flat', text_en: 'Lying down flat', text_hi: 'सीधे लेटने से' },
      { value: 'none', text_en: 'Nothing in particular', text_hi: 'किसी खास गतिविधि से नहीं' }
    ]
  },
  {
    id: 'cp_q9',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'What makes the pain feel better or relieve it?',
    question_text_hi: 'किस चीज़ से दर्द में आराम मिलता है?',
    question_type: 'single_choice',
    clinical_field: 'relieving_factors',
    sequence: 9,
    required: true,
    options: [
      { value: 'complete_rest', text_en: 'Complete rest / sitting down', text_hi: 'पूरी तरह आराम करने या बैठने से' },
      { value: 'sorbitrate_nitrates', text_en: 'Medicine under tongue (Nitrate/Sorbitrate)', text_hi: 'जीभ के नीचे गोली रखने से' },
      { value: 'leaning_forward', text_en: 'Sitting up and leaning forward', text_hi: 'आगे की ओर झुक कर बैठने से' },
      { value: 'antacids', text_en: 'Antacid syrup or gas medicine', text_hi: 'गैस की दवा या एंटासिड से' },
      { value: 'none', text_en: 'Nothing provides relief', text_hi: 'किसी चीज़ से आराम नहीं मिलता' }
    ]
  },
  {
    id: 'cp_q10',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Are you experiencing any shortness of breath or difficulty breathing?',
    question_text_hi: 'क्या आपको सांस लेने में तकलीफ या सांस फूलने की समस्या हो रही है?',
    question_type: 'yes_no',
    clinical_field: 'breathlessness',
    sequence: 10,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं' }
    ]
  },
  {
    id: 'cp_q11',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Are you sweating unusually or feeling cold sweats (diaphoresis)?',
    question_text_hi: 'क्या आपको असामान्य पसीना या ठंडा पसीना आ रहा है?',
    question_type: 'yes_no',
    clinical_field: 'sweating',
    sequence: 11,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं' }
    ]
  },
  {
    id: 'cp_q12',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Do you feel nauseous or have you vomited?',
    question_text_hi: 'क्या आपको उल्टी जैसा लग रहा है या उल्टी हुई है?',
    question_type: 'yes_no',
    clinical_field: 'nausea_vomiting',
    sequence: 12,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं' }
    ]
  },
  {
    id: 'cp_q13',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Do you feel your heart racing, fluttering, or pounding (palpitations)?',
    question_text_hi: 'क्या आपको दिल की धड़कन तेज या घबराहट महसूस हो रही है?',
    question_type: 'yes_no',
    clinical_field: 'palpitations',
    sequence: 13,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं' }
    ]
  },
  {
    id: 'cp_q14',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Have you felt lightheaded, dizzy, or experienced fainting / blackout?',
    question_text_hi: 'क्या आपको चक्कर आए या आप कभी बेहोश हुए?',
    question_type: 'yes_no',
    clinical_field: 'syncope',
    sequence: 14,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं' }
    ]
  },
  {
    id: 'cp_q15',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Have you had similar chest pain episodes in the past?',
    question_text_hi: 'क्या आपको पहले भी कभी ऐसा दर्द हुआ है?',
    question_type: 'yes_no',
    clinical_field: 'previous_episodes',
    sequence: 15,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं' }
    ]
  },
  {
    id: 'cp_q16',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Do you have any known existing medical conditions?',
    question_text_hi: 'क्या आपको पहले से कोई पुरानी बीमारी है?',
    question_type: 'multiple_choice',
    clinical_field: 'past_medical_history',
    sequence: 16,
    required: true,
    options: [
      { value: 'hypertension', text_en: 'High Blood Pressure (Hypertension)', text_hi: 'हाई ब्लड प्रेशर' },
      { value: 'diabetes', text_en: 'Diabetes / High Blood Sugar', text_hi: 'मधुमेह / शुगर की बीमारी' },
      { value: 'heart_disease', text_en: 'Previous Heart Attack / Stent / Bypass', text_hi: 'पुराना हार्ट अटैक / स्टेंट / बाईपास' },
      { value: 'high_cholesterol', text_en: 'High Cholesterol (Dyslipidemia)', text_hi: 'हाई कोलेस्ट्रॉल' },
      { value: 'none', text_en: 'No known health conditions', text_hi: 'कोई ज्ञात बीमारी नहीं' }
    ]
  },
  {
    id: 'cp_q17',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Are you currently taking any regular medications?',
    question_text_hi: 'क्या आप वर्तमान में कोई नियमित दवा ले रहे हैं?',
    question_type: 'single_choice',
    clinical_field: 'current_medications',
    sequence: 17,
    required: true,
    options: [
      { value: 'bp_heart_meds', text_en: 'Taking BP / Blood Thinners (Aspirin/Atorvastatin)', text_hi: 'बीपी या खून पतला करने की दवा ले रहे हैं' },
      { value: 'diabetes_meds', text_en: 'Taking Diabetes pills / Insulin', text_hi: 'शुगर की दवा या इंसुलिन ले रहे हैं' },
      { value: 'gastric_meds', text_en: 'Taking Gas / Acidity medication', text_hi: 'गैस / एंटासिड की दवा ले रहे हैं' },
      { value: 'none', text_en: 'Not taking any regular medications', text_hi: 'कोई नियमित दवा नहीं ले रहे' }
    ]
  },
  {
    id: 'cp_q18',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Do you have known allergies to any medicines or food?',
    question_text_hi: 'क्या आपको किसी दवा या भोजन से एलर्जी है?',
    question_type: 'single_choice',
    clinical_field: 'allergies',
    sequence: 18,
    required: true,
    options: [
      { value: 'penicillin_antibiotics', text_en: 'Allergy to Penicillin / Antibiotics', text_hi: 'एंटीबायोटिक / पेनिसिलिन से एलर्जी' },
      { value: 'painkillers_nsaids', text_en: 'Allergy to Painkillers (Aspirin / Brufen)', text_hi: 'दर्द निवारक दवाओं से एलर्जी' },
      { value: 'no_known_allergies', text_en: 'No known drug allergies', text_hi: 'किसी दवा से कोई एलर्जी नहीं है' }
    ]
  },
  {
    id: 'cp_q19',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Does anyone in your direct family have a history of heart disease?',
    question_text_hi: 'क्या आपके परिवार में किसी को दिल की बीमारी का इतिहास रहा है?',
    question_type: 'yes_no',
    clinical_field: 'family_history',
    sequence: 19,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं' }
    ]
  },
  {
    id: 'cp_q20',
    template_id: 'chest_pain_v1',
    clinical_system: 'allopathy',
    question_text_en: 'Do you use tobacco (smoking/chewing) or consume alcohol?',
    question_text_hi: 'क्या आप तंबाकू (धूम्रपान/गुटखा) या शराब का सेवन करते हैं?',
    question_type: 'single_choice',
    clinical_field: 'habits',
    sequence: 20,
    required: true,
    options: [
      { value: 'smoker_daily', text_en: 'Yes, daily smoker (Beedi / Cigarette)', text_hi: 'हाँ, रोजाना बीड़ी / सिगरेट पीते हैं' },
      { value: 'tobacco_chewer', text_en: 'Yes, chew tobacco / Gutkha / Khaini', text_hi: 'हाँ, तंबाकू / गुटखा / खैनी खाते हैं' },
      { value: 'alcohol_regular', text_en: 'Yes, consume alcohol regularly', text_hi: 'हाँ, शराब का नियमित सेवन करते हैं' },
      { value: 'none', text_en: 'No tobacco or alcohol use', text_hi: 'तंबाकू या शराब का सेवन नहीं करते' }
    ]
  },

  // ================= AYUSH: DASHAVIDHA PARIKSHA =================
  {
    id: 'ay_q1',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'What is your primary physical complaint or discomfort today?',
    question_text_hi: 'आज आपकी मुख्य शारीरिक समस्या या लक्षण क्या है?',
    question_type: 'single_choice',
    clinical_field: 'ayush_chief_complaint',
    sequence: 1,
    required: true,
    options: [
      { value: 'digestive_issues', text_en: 'Indigestion, gas, bloating, acidity (Ajeerna / Amlapitta)', text_hi: 'पाचन संबंधी परेशानी, गैस, अफरा, खट्टी डकारें' },
      { value: 'joint_muscular_pain', text_en: 'Joint pain, stiffness, body ache (Sandhivata / Amavata)', text_hi: 'जोड़ों में दर्द, जकड़न, शरीर में दर्द (संधिवात)' },
      { value: 'respiratory_allergies', text_en: 'Cough, sinus, breathing congestion (Kasa / Shwasa)', text_hi: 'खांसी, सर्दी, जुकाम, कफ या सांस की तकलीफ' },
      { value: 'stress_fatigue_insomnia', text_en: 'Mental fatigue, sleep trouble, low energy (Klama / Anidra)', text_hi: 'थकान, अनिद्रा, तनाव, कमजोरी' }
    ]
  },
  {
    id: 'ay_q2',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Prakriti (Body Frame): How would you describe your natural physical body build?',
    question_text_hi: 'प्रकृति (शरीर गठन): आपकी प्राकृतिक शारीरिक बनावट कैसी है?',
    question_type: 'single_choice',
    clinical_field: 'prakriti_body_build',
    sequence: 2,
    required: true,
    options: [
      { value: 'vata_lean', text_en: 'Thin, slender, bones prominent, difficult to gain weight (Vata)', text_hi: 'दुबला-पतला, हड्डियां उभरी हुईं, वजन कठिनाई से बढ़ता है (वात)' },
      { value: 'pitta_medium', text_en: 'Medium build, muscular, athletic, moderate weight (Pitta)', text_hi: 'मध्यम गठन, सुगठित मांसपेशियां, संतुलित वजन (पित्त)' },
      { value: 'kapha_broad', text_en: 'Broad frame, heavy bones, solid build, gains weight easily (Kapha)', text_hi: 'चौड़ा शरीर, भारी हड्डियां, वजन आसानी से बढ़ जाता है (कफ)' }
    ]
  },
  {
    id: 'ay_q3',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Prakriti (Skin & Hair): What is the natural texture of your skin and hair?',
    question_text_hi: 'प्रकृति (त्वचा एवं केश): आपकी त्वचा और बालों का प्राकृतिक स्वभाव कैसा है?',
    question_type: 'single_choice',
    clinical_field: 'prakriti_skin_hair',
    sequence: 3,
    required: true,
    options: [
      { value: 'vata_skin', text_en: 'Dry, rough, cool skin; brittle or frizzy hair (Vata)', text_hi: 'रूखी, खुरदरी, ठंडी त्वचा; रूखे बाल (वात)' },
      { value: 'pitta_skin', text_en: 'Warm, flushed, sensitive skin, moles; oily/thin hair (Pitta)', text_hi: 'गर्म, संवेदनशील त्वचा; पतले या जल्दी सफेद होने वाले बाल (पित्त)' },
      { value: 'kapha_skin', text_en: 'Smooth, oily, thick, soft skin; thick, lustrous dark hair (Kapha)', text_hi: 'मुलायम, चिकनी त्वचा; घने, काले एवं मजबूत बाल (कफ)' }
    ]
  },
  {
    id: 'ay_q4',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Prakriti (Temperature Sensitivity): Which weather or climate do you find uncomfortable?',
    question_text_hi: 'तापमान सहनशीलता: आपको कौन सा मौसम या तापमान सबसे अधिक असहज लगता है?',
    question_type: 'single_choice',
    clinical_field: 'prakriti_temperature',
    sequence: 4,
    required: true,
    options: [
      { value: 'intolerant_cold', text_en: 'Sensitive to cold weather and cold drafts (Vata-Kapha)', text_hi: 'ठंड या ठंडी हवा बिल्कुल सहन नहीं होती (शीत असहिष्णु)' },
      { value: 'intolerant_heat', text_en: 'Sensitive to hot weather and spicy food; prefers cold drinks (Pitta)', text_hi: 'गर्मी या धूप बिल्कुल सहन नहीं होती (उष्ण असहिष्णु)' },
      { value: 'adaptable', text_en: 'Tolerates both seasons moderately well (Sama)', text_hi: 'दोनों मौसम सामान्य रूप से सहन कर लेते हैं (सम स्वभाव)' }
    ]
  },
  {
    id: 'ay_q5',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Agni Pariksha: How is your appetite and digestion of meals?',
    question_text_hi: 'अग्नि परीक्षा: आपकी भूख और भोजन के पाचन की स्थिति कैसी रहती है?',
    question_type: 'single_choice',
    clinical_field: 'agni_digestive_fire',
    sequence: 5,
    required: true,
    options: [
      { value: 'vishama_irregular', text_en: 'Irregular appetite: sometimes ravenous, sometimes skips meals; gas (Vishama Agni)', text_hi: 'अनियमित भूख: कभी बहुत तेज, कभी बिल्कुल नहीं; गैस (विषम अग्नि)' },
      { value: 'tikshna_excessive', text_en: 'Sharp/intense appetite: gets irritable if delayed; acidity (Tikshna Agni)', text_hi: 'तीव्र भूख: भोजन में देरी पर चिड़चिड़ापन, खट्टी डकारें (तीक्ष्ण अग्नि)' },
      { value: 'manda_sluggish', text_en: 'Low/sluggish appetite: feels heavy for hours after eating (Manda Agni)', text_hi: 'धीमी भूख: थोड़ा खाने पर भी भारीपन (मन्द अग्नि)' },
      { value: 'sama_balanced', text_en: 'Regular, comfortable digestion with timely hunger (Sama Agni)', text_hi: 'समय पर भूख और बिना परेशानी के अच्छा पाचन (सम अग्नि)' }
    ]
  },
  {
    id: 'ay_q6',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Koshtha Pariksha: What is your usual bowel habit and elimination pattern?',
    question_text_hi: 'कोष्ठ परीक्षा: आपका मल त्याग और पेट साफ होने का स्वभाव कैसा है?',
    question_type: 'single_choice',
    clinical_field: 'koshtha_bowel_pattern',
    sequence: 6,
    required: true,
    options: [
      { value: 'krura_hard', text_en: 'Hard, dry stools; prone to constipation and straining (Krura Koshtha)', text_hi: 'कड़ा, सूखा मल; कब्ज की शिकायत रहती है (क्रूर कोष्ठ)' },
      { value: 'mridu_soft', text_en: 'Soft or loose stools, multiple times daily; quick reaction (Mridu Koshtha)', text_hi: 'ढीला या नरम मल, दिन में कई बार (मृदु कोष्ठ)' },
      { value: 'madhyama_normal', text_en: 'Regular once or twice daily well-formed elimination (Madhyama Koshtha)', text_hi: 'नियमित दिन में एक या दो बार सामान्य मल त्याग (मध्यम कोष्ठ)' }
    ]
  },
  {
    id: 'ay_q7',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Ahara Shakti: How is your eating capacity and meal satisfaction?',
    question_text_hi: 'आहार शक्ति: आपके भोजन करने की मात्रा और तृप्ति की क्षमता कैसी है?',
    question_type: 'single_choice',
    clinical_field: 'ahara_shakti_capacity',
    sequence: 7,
    required: true,
    options: [
      { value: 'alpa_ahara', text_en: 'Low capacity: eats small portions, gets full fast', text_hi: 'अल्प आहार: बहुत कम मात्रा में भोजन' },
      { value: 'madhyama_ahara', text_en: 'Moderate capacity: standard 2-3 balanced meals daily', text_hi: 'मध्यम आहार: संतुलित और सामान्य मात्रा' },
      { value: 'uttama_ahara', text_en: 'High capacity: can digest large meals comfortably', text_hi: 'उत्तम आहार: अच्छी मात्रा में भोजन आसानी से पचता है' }
    ]
  },
  {
    id: 'ay_q8',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Rasa Satmya: Which taste or food types do you naturally crave or prefer?',
    question_text_hi: 'रस सात्म्य: आपको किस रस या स्वाद का भोजन सबसे अधिक प्रिय है?',
    question_type: 'single_choice',
    clinical_field: 'ahara_rasa_preference',
    sequence: 8,
    required: true,
    options: [
      { value: 'sweet_ghee', text_en: 'Sweet, dairy, rice, ghee items (Madhura priya)', text_hi: 'मीठा, घी, दूध, चावल व चिकनाई युक्त भोजन' },
      { value: 'spicy_tangy', text_en: 'Spicy, pungent, sour, tangy, fried foods (Katu-Amla priya)', text_hi: 'तीखा, चटपटा, मसालेदार, खट्टा भोजन' },
      { value: 'salty_crunchy', text_en: 'Salty, crisp snacks, warm light foods (Lavana priya)', text_hi: 'नमकीन, हल्का, कुरकुरा या गर्म भोजन' }
    ]
  },
  {
    id: 'ay_q9',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Vyayama Shakti: How is your physical stamina and tolerance to exertion?',
    question_text_hi: 'व्यायाम शक्ति: आपकी शारीरिक सहनशक्ति और परिश्रम करने की क्षमता कैसी है?',
    question_type: 'single_choice',
    clinical_field: 'vyayama_shakti_stamina',
    sequence: 9,
    required: true,
    options: [
      { value: 'low_stamina', text_en: 'Low endurance: gets breathless or fatigued after short walk', text_hi: 'कम सहनशक्ति: थोड़ा चलने पर जल्दी थकान' },
      { value: 'moderate_stamina', text_en: 'Moderate endurance: manages daily work and moderate walking', text_hi: 'मध्यम सहनशक्ति: दैनिक कार्य आराम से कर लेते हैं' },
      { value: 'high_stamina', text_en: 'High endurance: can perform intense exercise without exhaustion', text_hi: 'उत्तम सहनशक्ति: भारी परिश्रम बिना थके कर सकते हैं' }
    ]
  },
  {
    id: 'ay_q10',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Nidra Pariksha: How is the depth and quality of your sleep?',
    question_text_hi: 'निद्रा परीक्षा: आपकी नींद की गहराई और गुणवत्ता कैसी है?',
    question_type: 'single_choice',
    clinical_field: 'nidra_sleep_quality',
    sequence: 10,
    required: true,
    options: [
      { value: 'light_disturbed', text_en: 'Light, fragmented sleep; awakens at small noises (Vata)', text_hi: 'हल्की, टूटने वाली नींद; जरा सी आवाज से खुलना (वात)' },
      { value: 'moderate_sound', text_en: 'Moderate sound sleep for 6-7 hours, feels rested (Pitta)', text_hi: 'मध्यम गहरी नींद 6-7 घंटे, सुबह ताजगी (पित्त)' },
      { value: 'deep_heavy', text_en: 'Heavy, prolonged deep sleep; sluggish in mornings (Kapha)', text_hi: 'गहरी, भारी नींद; सुबह उठने में आलस्य (कफ)' }
    ]
  },
  {
    id: 'ay_q11',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Sattva / Manasa: How would you describe your mental temperament and reaction to stress?',
    question_text_hi: 'सत्त्व परीक्षा: आपकी मानसिक प्रकृति और तनाव के प्रति प्रतिक्रिया कैसी है?',
    question_type: 'single_choice',
    clinical_field: 'sattva_mental_temperament',
    sequence: 11,
    required: true,
    options: [
      { value: 'vata_anxious', text_en: 'Active, creative, but worries quickly, anxious, overthinks', text_hi: 'चंचल मन, जल्दी चिंता व घबराहट होना' },
      { value: 'pitta_driven', text_en: 'Sharp intellect, ambitious, but quick to anger/frustration', text_hi: 'तीव्र बुद्धि, लेकिन जल्दी गुस्सा या असहनशीलता' },
      { value: 'kapha_calm', text_en: 'Calm, patient, forgiving, emotionally steady', text_hi: 'शांत, धैर्यवान, सहनशील, स्थिर स्वभाव' }
    ]
  },
  {
    id: 'ay_q12',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Vihara (Daily Lifestyle): How would you characterize your daily routine and activity?',
    question_text_hi: 'विहार (दिनचर्या): आपकी दैनिक दिनचर्या और काम का स्वरूप कैसा है?',
    question_type: 'single_choice',
    clinical_field: 'vihara_lifestyle',
    sequence: 12,
    required: true,
    options: [
      { value: 'sedentary', text_en: 'Sedentary desk job with minimal movement', text_hi: 'दिनभर बैठकर काम, शारीरिक गति कम' },
      { value: 'active_labor', text_en: 'Physically active, frequent standing or walking', text_hi: 'सक्रिय दिनचर्या, शारीरिक मेहनत' },
      { value: 'irregular_shifts', text_en: 'Irregular hours, night shifts, erratic sleep timings', text_hi: 'अनियमित काम, रात्रि जागरण, कोई निश्चित समय नहीं' }
    ]
  },
  {
    id: 'ay_q13',
    template_id: 'ayush_dashavidha_v1',
    clinical_system: 'ayush',
    question_text_en: 'Vaya: Which age category represents your life stage?',
    question_text_hi: 'वय (आयु वर्ग): आप किस आयु वर्ग में आते हैं?',
    question_type: 'single_choice',
    clinical_field: 'vaya_age_stage',
    sequence: 13,
    required: true,
    options: [
      { value: 'balya_youth', text_en: 'Youth / Young Adult (Under 25 years)', text_hi: 'युवा अवस्था (25 वर्ष से कम)' },
      { value: 'madhyama_adult', text_en: 'Adult / Middle age (25 to 60 years)', text_hi: 'मध्यम आयु (25 से 60 वर्ष)' },
      { value: 'vriddha_senior', text_en: 'Elderly / Senior (Above 60 years)', text_hi: 'वृद्धावस्था (60 वर्ष से अधिक)' }
    ]
  }
];

const SEED_DOCUMENTS = [
  {
    id: 'doc-demo-001',
    patient_id: '11111111-1111-1111-1111-111111111111',
    file_name: 'apollo_prescription_feb2024.pdf',
    file_path: '/uploads/apollo_prescription_feb2024.pdf',
    document_type: 'prescription',
    document_date: '2024-02-10',
    ocr_raw_text: `APOLLO HOSPITALS OPD PRESCRIPTION
Date: 10/02/2024
Patient Name: Ramesh Sharma, Age: 54/M
Diagnosis: Essential Hypertension, Dyslipidemia
Rx:
1. Tab Telmisartan 40mg - 1-0-0 (Morning after food)
2. Tab Atorvastatin 20mg - 0-0-1 (Night after dinner)
3. Tab Ecosprin 75mg - 0-1-0 (Afternoon after lunch)
Advice: Low salt diet, 30 min daily brisk walking. Follow-up after 3 months.
Dr. V. K. Rao, MD, DM (Cardiology)`,
    extractions: {
      document_type: 'Prescription',
      patient_name: 'Ramesh Sharma',
      date: '2024-02-10',
      diagnoses: ['Essential Hypertension', 'Dyslipidemia'],
      medications: [
        { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily morning', duration: 'Ongoing' },
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily night', duration: 'Ongoing' },
        { name: 'Ecosprin', dosage: '75mg', frequency: 'Once daily afternoon', duration: 'Ongoing' }
      ],
      lab_results: [],
      procedures: [],
      abnormal_findings: []
    }
  },
  {
    id: 'doc-demo-002',
    patient_id: '11111111-1111-1111-1111-111111111111',
    file_name: 'lipid_profile_may2024.pdf',
    file_path: '/uploads/lipid_profile_may2024.pdf',
    document_type: 'lab_report',
    document_date: '2024-05-18',
    ocr_raw_text: `PATHOLOGY & BIOCHEMISTRY REPORT
Patient: Ramesh Sharma, Age: 54 / M
Date: 18/05/2024
Investigation: Lipid Profile
Total Cholesterol: 242 mg/dL (Desirable: <200) [HIGH]
Triglycerides: 198 mg/dL (Normal: <150) [HIGH]
HDL Cholesterol: 38 mg/dL (Normal: >40) [LOW]
LDL Cholesterol: 164 mg/dL (Optimal: <100) [HIGH]
Fasting Blood Sugar: 112 mg/dL (Normal: 70-99) [IMPAIRED]`,
    extractions: {
      document_type: 'Lab Report',
      patient_name: 'Ramesh Sharma',
      date: '2024-05-18',
      diagnoses: ['Hypercholesterolemia', 'Impaired Fasting Glucose'],
      medications: [],
      lab_results: [
        { test: 'Total Cholesterol', value: '242 mg/dL', normal_range: '<200 mg/dL', flag: 'HIGH' },
        { test: 'Triglycerides', value: '198 mg/dL', normal_range: '<150 mg/dL', flag: 'HIGH' },
        { test: 'HDL Cholesterol', value: '38 mg/dL', normal_range: '>40 mg/dL', flag: 'LOW' },
        { test: 'LDL Cholesterol', value: '164 mg/dL', normal_range: '<100 mg/dL', flag: 'HIGH' },
        { test: 'Fasting Blood Sugar', value: '112 mg/dL', normal_range: '70-99 mg/dL', flag: 'IMPAIRED' }
      ],
      procedures: [],
      abnormal_findings: ['Elevated LDL and Total Cholesterol', 'Borderline elevated fasting sugar']
    }
  }
];

module.exports = {
  SEED_PATIENTS,
  SEED_CONDITIONS,
  SEED_RED_FLAGS,
  SEED_QUESTIONS,
  SEED_DOCUMENTS
};
