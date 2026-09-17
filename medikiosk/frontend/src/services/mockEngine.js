/**
 * Self-Contained Client-Side Mock Engine for Standalone Frontend
 * Provides offline question DAG sequencing, red-flag evaluation, FHIR bundle generation,
 * and mock ABDM integration without requiring any backend server.
 */
import { dispatchEmergencyAlert } from './alertSync.js';

const SEED_PATIENTS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    abha_id: '91-2345-6789-0123',
    aadhaar_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    full_name: 'Ramesh Sharma',
    age: 54,
    gender: 'Male',
    phone: '+91 ******0001',
    blood_group: 'B+'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    abha_id: '91-8765-4321-9876',
    aadhaar_hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    full_name: 'Sunita Patel',
    age: 42,
    gender: 'Female',
    phone: '+91 ******0002',
    blood_group: 'O+'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    abha_id: '91-1122-3344-5566',
    aadhaar_hash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    full_name: 'Rajesh Kumar',
    age: 61,
    gender: 'Male',
    phone: '+91 ******0003',
    blood_group: 'A+'
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
    warning_message_kn: 'ಎಚ್ಚರಿಕೆ ಸೂಚನೆ: ಎಡ ಭುಜ ಅಥವಾ ಕೈಗೆ ಹರಡುವ ನೋವು ಹೃದಯ ಸಂಬಂಧಿ ತುರ್ತುಸ್ಥಿತಿಯ ಲಕ್ಷಣವಾಗಿರಬಹುದು. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಆಸ್ಪತ್ರೆ ಸಿಬ್ಬಂದಿಗೆ ತಿಳಿಸಿ.',
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
    warning_message_kn: 'ಎಚ್ಚರಿಕೆ ಸೂಚನೆ: ದವಡೆ ಅಥವಾ ಕುತ್ತಿಗೆಗೆ ಹರಡುವ ನೋವು ತುರ್ತು ವೈದ್ಯಕೀಯ ತಪಾಸಣೆಯನ್ನು ಬಯಸುತ್ತದೆ.',
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
    warning_message_kn: 'ತೀವ್ರ ನೋವು (8/10 ಅಥವಾ ಹೆಚ್ಚು) ವರದಿಯಾಗಿದೆ. ತಕ್ಷಣ ವೈದ್ಯರ ತಪಾಸಣೆ ಅಗತ್ಯವಿದೆ.',
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
    warning_message_kn: 'ಎಚ್ಚರಿಕೆ ಸೂಚನೆ: ಮೂರ್ಛೆ ಅಥವಾ ಹಠಾತ್ ಪ್ರಜ್ಞೆ ತಪ್ಪುವುದು ತೀವ್ರ ಅಸ್ವಸ್ಥತೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ.',
    clinical_rationale: 'Cardiogenic syncope indicates arrhythmia or severe hemodynamic compromise.'
  }
];

const SEED_QUESTIONS = [
  // ALLOPATHY: CHEST PAIN
  {
    id: 'cp_q1',
    clinical_system: 'allopathy',
    question_text_en: 'What is your primary discomfort today?',
    question_text_hi: 'आज आपको मुख्य रूप से क्या परेशानी है?',
    question_text_kn: 'ಇಂದು ನಿಮಗೆ ಮುಖ್ಯವಾಗಿ ಇರುವ ತೊಂದರೆ ಏನು?',
    question_type: 'single_choice',
    clinical_field: 'chief_complaint',
    sequence: 1,
    required: true,
    options: [
      { value: 'chest_pain_pressure', text_en: 'Chest pain or heavy pressure', text_hi: 'छाती में दर्द या भारी दबाव', text_kn: 'ಎದೆ ನೋವು ಅಥವಾ ಭಾರವಾದ ಒತ್ತಡ' },
      { value: 'chest_burning', text_en: 'Burning sensation in chest', text_hi: 'छाती में जलन', text_kn: 'ಎದೆಯಲ್ಲಿ ಉರಿ' },
      { value: 'chest_tightness_breathless', text_en: 'Chest tightness with breathlessness', text_hi: 'छाती में जकड़न और सांस फूलना', text_kn: 'ಎದೆ ಬಿಗಿತ ಮತ್ತು ಉಸಿರಾಟದ ತೊಂದರೆ' },
      { value: 'other_discomfort', text_en: 'Other chest discomfort', text_hi: 'अन्य छाती संबंधी परेशानी', text_kn: 'ಇತರ ಎದೆ ಸಂಬಂಧಿ ಅಸ್ವಸ್ಥತೆ' }
    ]
  },
  {
    id: 'cp_q2',
    clinical_system: 'allopathy',
    question_text_en: 'Where exactly do you feel the pain or discomfort?',
    question_text_hi: 'दर्द या बेचैनी वास्तव में कहाँ महसूस हो रही है?',
    question_text_kn: 'ನೋವು ಅಥವಾ ಅಸ್ವಸ್ಥತೆ ನಿಖರವಾಗಿ ಎಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತಿದೆ?',
    question_type: 'single_choice',
    clinical_field: 'site',
    sequence: 2,
    required: true,
    options: [
      { value: 'center_retrosternal', text_en: 'Center of chest (behind breastbone)', text_hi: 'छाती के बीचों-बीच (हड्डी के पीछे)', text_kn: 'ಎದೆಯ ಮಧ್ಯಭಾಗದಲ್ಲಿ (ಎದೆ ಮೂಳೆಯ ಹಿಂದೆ)' },
      { value: 'left_side', text_en: 'Left side of chest', text_hi: 'छाती के बाईं ओर', text_kn: 'ಎದೆಯ ಎಡಭಾಗದಲ್ಲಿ' },
      { value: 'right_side', text_en: 'Right side of chest', text_hi: 'छाती के दाईं ओर', text_kn: 'ಎದೆಯ ಬಲಭಾಗದಲ್ಲಿ' },
      { value: 'upper_abdomen', text_en: 'Upper abdomen / epigastric', text_hi: 'पेट के ऊपरी हिस्से में', text_kn: 'ಹೊಟ್ಟೆಯ ಮೇಲ್ಭಾಗದಲ್ಲಿ' }
    ]
  },
  {
    id: 'cp_q3',
    clinical_system: 'allopathy',
    question_text_en: 'How did the pain start?',
    question_text_hi: 'दर्द की शुरुआत कैसे हुई?',
    question_text_kn: 'ನೋವು ಹೇಗೆ ಪ್ರಾರಂಭವಾಯಿತು?',
    question_type: 'single_choice',
    clinical_field: 'onset',
    sequence: 3,
    required: true,
    options: [
      { value: 'sudden', text_en: 'Suddenly (within minutes)', text_hi: 'अचानक (कुछ ही मिनटों में)', text_kn: 'ಹಠಾತ್ತನೆ (ಕೆಲವೇ ನಿಮಿಷಗಳಲ್ಲಿ)' },
      { value: 'gradual', text_en: 'Gradually (built up over hours/days)', text_hi: 'धीरे-धीरे (घंटों या दिनों में बढ़ा)', text_kn: 'ಕ್ರಮೇಣವಾಗಿ (ಗಂಟೆಗಳು ಅಥವಾ ದಿನಗಳಲ್ಲಿ ಹೆಚ್ಚಾಯಿತು)' }
    ]
  },
  {
    id: 'cp_q4',
    clinical_system: 'allopathy',
    question_text_en: 'How long has this pain been present?',
    question_text_hi: 'यह दर्द कितने समय से है?',
    question_text_kn: 'ಈ ನೋವು ಎಷ್ಟು ಸಮಯದಿಂದ ಇದೆ?',
    question_type: 'single_choice',
    clinical_field: 'duration',
    sequence: 4,
    required: true,
    options: [
      { value: 'under_30_mins', text_en: 'Less than 30 minutes', text_hi: '30 मिनट से कम', text_kn: '30 ನಿಮಿಷಗಳಿಗಿಂತ ಕಡಿಮೆ' },
      { value: '30_to_120_mins', text_en: '30 minutes to 2 hours', text_hi: '30 मिनट से 2 घंटे', text_kn: '30 ನಿಮಿಷಗಳಿಂದ 2 ಗಂಟೆಗಳವರೆಗೆ' },
      { value: 'several_hours', text_en: 'Several hours', text_hi: 'कई घंटों से', text_kn: 'ಹಲವು ಗಂಟೆಗಳಿಂದ' },
      { value: 'more_than_a_day', text_en: 'More than 24 hours', text_hi: 'एक दिन से अधिक', text_kn: 'ಒಂದು ದಿನಕ್ಕಿಂತ ಹೆಚ್ಚು' }
    ]
  },
  {
    id: 'cp_q5',
    clinical_system: 'allopathy',
    question_text_en: 'How would you describe the feeling of the pain?',
    question_text_hi: 'दर्द किस प्रकार का महसूस होता है?',
    question_text_kn: 'ನೋವು ಯಾವ ರೀತಿಯಲ್ಲಿ ಅನುಭವವಾಗುತ್ತಿದೆ?',
    question_type: 'single_choice',
    clinical_field: 'character',
    sequence: 5,
    required: true,
    options: [
      { value: 'crushing_heavy', text_en: 'Crushing pressure, weight, or squeezing', text_hi: 'भारी दबाव, निचोड़ने या कुचलने जैसा', text_kn: 'ಭಾರವಾದ ಒತ್ತಡ, ಹಿಂಡಿದಂತೆ ಅಥವಾ ಜಜ್ಜಿದಂತೆ' },
      { value: 'sharp_stabbing', text_en: 'Sharp, stabbing or needle-like', text_hi: 'तेज, चुभने या सुई जैसा दर्द', text_kn: 'ತೀವ್ರವಾದ, ಚುಚ್ಚುವ ಅಥವಾ ಸೂಜಿಯಂತಹ ನೋವು' },
      { value: 'burning_acidity', text_en: 'Burning or acid reflux sensation', text_hi: 'जलन या एसिडिटी जैसा दर्द', text_kn: 'ಉರಿ ಅಥವಾ ಆಸಿಡಿಟಿ ತರಹದ ಅನುಭವ' },
      { value: 'dull_ache', text_en: 'Dull continuous ache', text_hi: 'हल्का लगातार मीठा दर्द', text_kn: 'ನಿರಂತರವಾದ ಸೌಮ್ಯ ನೋವು' }
    ]
  },
  {
    id: 'cp_q6',
    clinical_system: 'allopathy',
    question_text_en: 'On a scale of 1 to 10, how severe is your pain right now?',
    question_text_hi: '1 से 10 के पैमाने पर, अभी दर्द कितना तेज है?',
    question_text_kn: '1 ರಿಂದ 10 ರ ಪ್ರಮಾಣದಲ್ಲಿ, ಪ್ರಸ್ತುತ ನೋವಿನ ತೀವ್ರತೆ ಎಷ್ಟಿದೆ?',
    question_type: 'number',
    clinical_field: 'severity',
    sequence: 6,
    required: true,
    options: []
  },
  {
    id: 'cp_q7',
    clinical_system: 'allopathy',
    question_text_en: 'Does the pain spread (radiate) to any other part of your body?',
    question_text_hi: 'क्या दर्द शरीर के किसी अन्य हिस्से में फैलता है?',
    question_text_kn: 'ನೋವು ದೇಹದ ಇತರ ಯಾವುದೇ ಭಾಗಕ್ಕೆ ಹರಡುತ್ತಿದೆಯೇ?',
    question_type: 'single_choice',
    clinical_field: 'radiation',
    sequence: 7,
    required: true,
    options: [
      { value: 'left arm', text_en: 'Radiates to Left Arm and Shoulder', text_hi: 'बाएं हाथ और कंधे में फैलता है', text_kn: 'ಎಡಗೈ ಮತ್ತು ಭುಜಕ್ಕೆ ಹರಡುತ್ತದೆ' },
      { value: 'jaw', text_en: 'Radiates to Jaw, Teeth or Neck', text_hi: 'जबड़े, दांत या गर्दन में फैलता है', text_kn: 'ದವಡೆ, ಹಲ್ಲುಗಳು ಅಥವಾ ಕುತ್ತಿಗೆಗೆ ಹರಡುತ್ತದೆ' },
      { value: 'back', text_en: 'Radiates to Upper Back', text_hi: 'पीठ के ऊपरी हिस्से में फैलता है', text_kn: 'ಬೆನ್ನಿನ ಮೇಲ್ಭಾಗಕ್ಕೆ ಹರಡುತ್ತದೆ' },
      { value: 'both_arms', text_en: 'Radiates to Both Arms', text_hi: 'दोनों हाथों में फैलता है', text_kn: 'ಎರಡೂ ಕೈಗಳಿಗೆ ಹರಡುತ್ತದೆ' },
      { value: 'none', text_en: 'No, stays in one spot only', text_hi: 'नहीं, केवल एक ही जगह रहता है', text_kn: 'ಇಲ್ಲ, ಕೇವಲ ಒಂದೇ ಜಾಗದಲ್ಲಿದೆ' }
    ]
  },
  {
    id: 'cp_q8',
    clinical_system: 'allopathy',
    question_text_en: 'What makes the pain worse?',
    question_text_hi: 'किस कारण से दर्द बढ़ जाता है?',
    question_text_kn: 'ಯಾವ ಕಾರಣದಿಂದ ನೋವು ಹೆಚ್ಚಾಗುತ್ತದೆ?',
    question_type: 'single_choice',
    clinical_field: 'aggravating_factors',
    sequence: 8,
    required: true,
    options: [
      { value: 'walking_exertion', text_en: 'Walking, stairs or physical exertion', text_hi: 'चलने, सीढ़ियां चढ़ने या मेहनत करने से', text_kn: 'ನಡೆಯುವುದು, ಮೆಟ್ಟಿಲು ಹತ್ತುವುದು ಅಥವಾ ದೈಹಿಕ ಶ್ರಮದಿಂದ' },
      { value: 'deep_breathing', text_en: 'Deep breathing or coughing', text_hi: 'गहरी सांस लेने या खांसने से', text_kn: 'ದೀರ್ಘ ಉಸಿರಾಟ ಅಥವಾ ಕೆಮ್ಮುವುದರಿಂದ' },
      { value: 'emotional_stress', text_en: 'Mental tension or emotional stress', text_hi: 'तनाव या मानसिक चिंता से', text_kn: 'ಮಾನಸಿಕ ಒತ್ತಡ ಅಥವಾ ಆತಂಕದಿಂದ' },
      { value: 'lying_flat', text_en: 'Lying down flat', text_hi: 'सीधे लेटने से', text_kn: 'ನೆಟ್ಟಗೆ ಮಲಗುವುದರಿಂದ' },
      { value: 'none', text_en: 'Nothing in particular', text_hi: 'किसी खास गतिविधि से नहीं', text_kn: 'ಯಾವುದೇ ನಿರ್ದಿಷ್ಟ ಕಾರಣವಿಲ್ಲ' }
    ]
  },
  {
    id: 'cp_q9',
    clinical_system: 'allopathy',
    question_text_en: 'What makes the pain feel better or relieve it?',
    question_text_hi: 'किस चीज़ से दर्द में आराम मिलता है?',
    question_text_kn: 'ಯಾವ ಅಂಶವು ನೋವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ ಅಥವಾ ವಿಶ್ರಾಂತಿ ನೀಡುತ್ತದೆ?',
    question_type: 'single_choice',
    clinical_field: 'relieving_factors',
    sequence: 9,
    required: true,
    options: [
      { value: 'complete_rest', text_en: 'Complete rest / sitting down', text_hi: 'पूरी तरह आराम करने या बैठने से', text_kn: 'ಸಂಪೂರ್ಣ ವಿಶ್ರಾಂತಿ / ಕುಳಿತುಕೊಳ್ಳುವುದು' },
      { value: 'sorbitrate_nitrates', text_en: 'Medicine under tongue (Nitrate/Sorbitrate)', text_hi: 'जीभ के नीचे गोली रखने से', text_kn: 'ನಾಲಿಗೆ ಕೆಳಗೆ ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳುವುದು (ಸೋರ್ಬಿಟ್ರೇಟ್)' },
      { value: 'leaning_forward', text_en: 'Sitting up and leaning forward', text_hi: 'आगे की ओर झुक कर बैठने से', text_kn: 'ಮುಂದಕ್ಕೆ ಬಾಗಿ ಕುಳಿತುಕೊಳ್ಳುವುದು' },
      { value: 'none', text_en: 'Nothing provides relief', text_hi: 'किसी चीज़ से आराम नहीं मिलता', text_kn: 'ಯಾವುದರಿಂದಲೂ ಆರಾಮ ಸಿಗುವುದಿಲ್ಲ' }
    ]
  },
  {
    id: 'cp_q10',
    clinical_system: 'allopathy',
    question_text_en: 'Are you experiencing any shortness of breath or difficulty breathing?',
    question_text_hi: 'क्या आपको सांस लेने में तकलीफ या सांस फूलने की समस्या हो रही है?',
    question_text_kn: 'ನಿಮಗೆ ಉಸಿರಾಟದ ತೊಂದರೆ ಅಥವಾ ಉಸಿರು ಕಟ್ಟಿದಂತೆ ಆಗುತ್ತಿದೆಯೇ?',
    question_type: 'yes_no',
    clinical_field: 'breathlessness',
    sequence: 10,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ', text_kn: 'ಹೌದು' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं', text_kn: 'ಇಲ್ಲ' }
    ]
  },
  {
    id: 'cp_q11',
    clinical_system: 'allopathy',
    question_text_en: 'Are you sweating unusually or feeling cold sweats (diaphoresis)?',
    question_text_hi: 'क्या आपको असामान्य पसीना या ठंडा पसीना आ रहा है?',
    question_text_kn: 'ನಿಮಗೆ ಅತಿಯಾದ ಬೆವರು ಅಥವಾ ತಣ್ಣನೆಯ ಬೆವರು ಬರುತ್ತಿದೆಯೇ?',
    question_type: 'yes_no',
    clinical_field: 'sweating',
    sequence: 11,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ', text_kn: 'ಹೌದು' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं', text_kn: 'ಇಲ್ಲ' }
    ]
  },
  {
    id: 'cp_q12',
    clinical_system: 'allopathy',
    question_text_en: 'Do you feel nauseous or have you vomited?',
    question_text_hi: 'क्या आपको उल्टी जैसा लग रहा है या उल्टी हुई है?',
    question_text_kn: 'ನಿಮಗೆ ವಾಕರಿಕೆ ಅನಿಸುತ್ತಿದೆಯೇ ಅಥವಾ ವಾಂತಿ ಮಾಡಿಕೊಂಡಿದ್ದೀರಾ?',
    question_type: 'yes_no',
    clinical_field: 'nausea_vomiting',
    sequence: 12,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ', text_kn: 'ಹೌದು' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं', text_kn: 'ಇಲ್ಲ' }
    ]
  },
  {
    id: 'cp_q13',
    clinical_system: 'allopathy',
    question_text_en: 'Do you feel your heart racing, fluttering, or pounding (palpitations)?',
    question_text_hi: 'क्या आपको दिल की धड़कन तेज या घबराहट महसूस हो रही है?',
    question_text_kn: 'ನಿಮ್ಮ ಹೃದಯ ಬಡಿತ ವೇಗವಾಗಿರುವುದು ಅಥವಾ ದಬದಬಿಸುವುದು ಅನುಭವವಾಗುತ್ತಿದೆಯೇ?',
    question_type: 'yes_no',
    clinical_field: 'palpitations',
    sequence: 13,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ', text_kn: 'ಹೌದು' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं', text_kn: 'ಇಲ್ಲ' }
    ]
  },
  {
    id: 'cp_q14',
    clinical_system: 'allopathy',
    question_text_en: 'Have you felt lightheaded, dizzy, or experienced fainting / blackout?',
    question_text_hi: 'क्या आपको चक्कर आए या आप कभी बेहोश हुए?',
    question_text_kn: 'ನಿಮಗೆ ತಲೆಸುತ್ತುವುದು, ಮಂಪರು ಅಥವಾ ಮೂರ್ಛೆ ಹೋದ ಅನುಭವವಾಗಿದೆಯೇ?',
    question_type: 'yes_no',
    clinical_field: 'syncope',
    sequence: 14,
    required: true,
    options: [
      { value: 'yes', text_en: 'Yes', text_hi: 'हाँ', text_kn: 'ಹೌದು' },
      { value: 'no', text_en: 'No', text_hi: 'नहीं', text_kn: 'ಇಲ್ಲ' }
    ]
  },
  {
    id: 'cp_q16',
    clinical_system: 'allopathy',
    question_text_en: 'Do you have any known existing medical conditions?',
    question_text_hi: 'क्या आपको पहले से कोई पुरानी बीमारी है?',
    question_text_kn: 'ನಿಮಗೆ ಈ ಹಿಂದೆ ಯಾವುದೇ ದೀರ್ಘಕಾಲಿಕ ಕಾಯಿಲೆಗಳಿವೆಯೇ?',
    question_type: 'multiple_choice',
    clinical_field: 'past_medical_history',
    sequence: 15,
    required: true,
    options: [
      { value: 'hypertension', text_en: 'High Blood Pressure (Hypertension)', text_hi: 'हाई ब्लड प्रेशर', text_kn: 'ಅಧಿಕ ರಕ್ತದೊತ್ತಡ (ಹೈ ಬಿಪಿ)' },
      { value: 'diabetes', text_en: 'Diabetes / High Blood Sugar', text_hi: 'मधुमेह / शुगर की बीमारी', text_kn: 'ಮಧುಮೇಹ (ಡಯಾಬಿಟಿಸ್)' },
      { value: 'heart_disease', text_en: 'Previous Heart Attack / Stent', text_hi: 'पुराना हार्ट अटैक / स्टेंट', text_kn: 'ಹಿಂದಿನ ಹೃದಯಾಘಾತ / ಸ್ಟೆಂಟ್' },
      { value: 'none', text_en: 'No known health conditions', text_hi: 'कोई ज्ञात बीमारी नहीं', text_kn: 'ಯಾವುದೇ ಕಾಯಿಲೆಗಳಿಲ್ಲ' }
    ]
  },
  {
    id: 'cp_q17',
    clinical_system: 'allopathy',
    question_text_en: 'Are you currently taking any regular medications?',
    question_text_hi: 'क्या आप वर्तमान में कोई नियमित दवा ले रहे हैं?',
    question_text_kn: 'ನೀವು ಪ್ರಸ್ತುತ ಯಾವುದೇ ನಿಯಮಿತ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ?',
    question_type: 'single_choice',
    clinical_field: 'current_medications',
    sequence: 16,
    required: true,
    options: [
      { value: 'bp_heart_meds', text_en: 'Taking BP / Blood Thinners (Aspirin/Atorvastatin)', text_hi: 'बीपी या खून पतला करने की दवा ले रहे हैं', text_kn: 'ಬಿಪಿ ಅಥವಾ ರಕ್ತ ತೆಳುಗೊಳಿಸುವ ಔಷಧಿಗಳು (ಆಸ್ಪಿರಿನ್/ಅಟೋರ್ವಾಸ್ಟಾಟಿನ್)' },
      { value: 'diabetes_meds', text_en: 'Taking Diabetes pills / Insulin', text_hi: 'शुगर की दवा ले रहे हैं', text_kn: 'ಮಧುಮೇಹದ ಮಾತ್ರೆಗಳು / ಇನ್ಸುಲಿನ್' },
      { value: 'none', text_en: 'Not taking any regular medications', text_hi: 'कोई नियमित दवा नहीं ले रहे', text_kn: 'ಯಾವುದೇ ನಿಯಮಿತ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿಲ್ಲ' }
    ]
  },

  // AYUSH: DASHAVIDHA PARIKSHA
  {
    id: 'ay_q1',
    clinical_system: 'ayush',
    question_text_en: 'What is your primary physical complaint or discomfort today?',
    question_text_hi: 'आज आपकी मुख्य शारीरिक समस्या या लक्षण क्या है?',
    question_text_kn: 'ಇಂದು ನಿಮ್ಮ ಮುಖ್ಯ ದೈಹಿಕ ದೂರು ಅಥವಾ ಅಸ್ವಸ್ಥತೆ ಏನು?',
    question_type: 'single_choice',
    clinical_field: 'ayush_chief_complaint',
    sequence: 1,
    required: true,
    options: [
      { value: 'digestive_issues', text_en: 'Indigestion, gas, bloating, acidity (Ajeerna / Amlapitta)', text_hi: 'पाचन संबंधी परेशानी, गैस, अफरा, खट्टी डकारें', text_kn: 'ಅಜೀರ್ಣ, ಗ್ಯಾಸ್, ಹೊಟ್ಟೆ ಉಬ್ಬರ, ಆಮ್ಲಪಿತ್ತ (ಅಜೀರ್ಣ / ಆಮ್ಲಪಿತ್ತ)' },
      { value: 'joint_muscular_pain', text_en: 'Joint pain, stiffness, body ache (Sandhivata)', text_hi: 'जोड़ों में दर्द, जकड़न (संधिवात)', text_kn: 'ಕೀಲು ನೋವು, ಬಿಗಿತ, ಮೈ-ಕೈ ನೋವು (ಸಂಧಿವಾತ)' },
      { value: 'stress_fatigue_insomnia', text_en: 'Mental fatigue, sleep trouble, low energy (Klama / Anidra)', text_hi: 'थकान, अनिद्रा, तनाव, कमजोरी', text_kn: 'ಮಾನಸಿಕ ಆಯಾಸ, ನಿದ್ರಾಹೀನತೆ, ನಿಶ್ಯಕ್ತಿ (ಕ್ಲಮ / ಅನಿದ್ರಾ)' }
    ]
  },
  {
    id: 'ay_q2',
    clinical_system: 'ayush',
    question_text_en: 'Prakriti (Body Frame): How would you describe your natural physical body build?',
    question_text_hi: 'प्रकृति (शरीर गठन): आपकी प्राकृतिक शारीरिक बनावट कैसी है?',
    question_text_kn: 'ಪ್ರಕೃತಿ (ದೇಹ ರಚನೆ): ನಿಮ್ಮ ನೈಸರ್ಗಿಕ ದೈಹಿಕ ರಚನೆಯನ್ನು ಹೇಗೆ ವಿವರಿಸುತ್ತೀರಿ?',
    question_type: 'single_choice',
    clinical_field: 'prakriti_body_build',
    sequence: 2,
    required: true,
    options: [
      { value: 'vata_lean', text_en: 'Thin, slender, difficult to gain weight (Vata)', text_hi: 'दुबला-पतला, वजन कठिनाई से बढ़ता है (वात)', text_kn: 'ತೆಳ್ಳನೆಯ ದೇಹ, ತೂಕ ಹೆಚ್ಚಾಗುವುದು ಕಷ್ಟ (ವಾತ)' },
      { value: 'pitta_medium', text_en: 'Medium build, muscular, athletic (Pitta)', text_hi: 'मध्यम गठन, सुगठित मांसपेशियां (पित्त)', text_kn: 'ಮಧ್ಯಮ ಗಾತ್ರ, ಸ್ನಾಯುಬಲ, ಸಮತೋಲನ (ಪಿತ್ತ)' },
      { value: 'kapha_broad', text_en: 'Broad frame, solid build, gains weight easily (Kapha)', text_hi: 'चौड़ा शरीर, भारी हड्डियां (कफ)', text_kn: 'ದೃಢವಾದ ದೇಹ, ವಿಶಾಲ ರಚನೆ, ಬೇಗನೆ ತೂಕ ಹೆಚ್ಚುತ್ತದೆ (ಕಫ)' }
    ]
  },
  {
    id: 'ay_q3',
    clinical_system: 'ayush',
    question_text_en: 'Agni Pariksha: How is your appetite and digestion of meals?',
    question_text_hi: 'अग्नि परीक्षा: आपकी भूख और भोजन के पाचन की स्थिति कैसी रहती है?',
    question_text_kn: 'ಅಗ್ನಿ ಪರೀಕ್ಷೆ: ನಿಮ್ಮ ಹಸಿವು ಮತ್ತು ಆಹಾರ ಜೀರ್ಣಕ್ರಿಯೆ ಹೇಗಿದೆ?',
    question_type: 'single_choice',
    clinical_field: 'agni_digestive_fire',
    sequence: 3,
    required: true,
    options: [
      { value: 'vishama_irregular', text_en: 'Irregular appetite: sometimes hungry, gas (Vishama Agni)', text_hi: 'अनियमित भूख: कभी तेज, कभी नहीं; गैस (विषम अग्नि)', text_kn: 'ಅನಿಯಮಿತ ಹಸಿವು: ಕೆಲವೊಮ್ಮೆ ಹೆಚ್ಚು, ಕೆಲವೊಮ್ಮೆ ಕಡಿಮೆ, ಗ್ಯಾಸ್ (ವಿಷಮ ಅಗ್ನಿ)' },
      { value: 'tikshna_excessive', text_en: 'Sharp/intense appetite: acidity (Tikshna Agni)', text_hi: 'तीव्र भूख: खट्टी डकारें (तीक्ष्ण अग्नि)', text_kn: 'ತೀವ್ರವಾದ ಹಸಿವು: ಹುಳಿ ತೇಗು, ಅತಿಯಾದ ದಾಹ (ತೀಕ್ಷ್ಣ ಅಗ್ನಿ)' },
      { value: 'manda_sluggish', text_en: 'Low/sluggish appetite: feels heavy (Manda Agni)', text_hi: 'धीमी भूख: पेट में भारीपन (मन्द अग्नि)', text_kn: 'ಮಂದ ಹಸಿವು: ಹೊಟ್ಟೆ ಭಾರ, ಜೀರ್ಣ ನಿಧಾನ (ಮಂದ ಅಗ್ನಿ)' },
      { value: 'sama_balanced', text_en: 'Regular, comfortable digestion with timely hunger (Sama Agni)', text_hi: 'समय पर भूख और अच्छा पाचन (सम अग्नि)', text_kn: 'ಸಮಯಕ್ಕೆ ಸರಿಯಾದ ಹಸಿವು ಮತ್ತು ಉತ್ತಮ ಜೀರ್ಣಕ್ರಿಯೆ (ಸಮ ಅಗ್ನಿ)' }
    ]
  },
  {
    id: 'ay_q4',
    clinical_system: 'ayush',
    question_text_en: 'Koshtha Pariksha: What is your usual bowel habit and elimination pattern?',
    question_text_hi: 'कोष्ठ परीक्षा: आपका मल त्याग और पेट साफ होने का स्वभाव कैसा है?',
    question_text_kn: 'ಕೋಷ್ಠ ಪರೀಕ್ಷೆ: ನಿಮ್ಮ ಮಲವಿಸರ್ಜನೆ ಮತ್ತು ಹೊಟ್ಟೆ ಸ್ವಚ್ಛತೆಯ ಅಭ್ಯಾಸ ಹೇಗಿದೆ?',
    question_type: 'single_choice',
    clinical_field: 'koshtha_bowel_pattern',
    sequence: 4,
    required: true,
    options: [
      { value: 'krura_hard', text_en: 'Hard, dry stools; prone to constipation (Krura Koshtha)', text_hi: 'कड़ा, सूखा मल; कब्ज (क्रूर कोष्ठ)', text_kn: 'ಗಟ್ಟಿಯಾದ ಮಲ, ಮಲಬದ್ಧತೆಯ ಪ್ರವೃತ್ತಿ (ಕ್ರೂರ ಕೋಷ್ಠ)' },
      { value: 'mridu_soft', text_en: 'Soft or loose stools, multiple times daily (Mridu Koshtha)', text_hi: 'ढीला या नरम मल (मृदु कोष्ठ)', text_kn: 'ಮೃದು ಅಥವಾ ಸಡಿಲ ಮಲ, ದಿನಕ್ಕೆ ಹಲವು ಬಾರಿ (ಮೃದು ಕೋಷ್ಠ)' },
      { value: 'madhyama_normal', text_en: 'Regular once or twice daily well-formed elimination (Madhyama Koshtha)', text_hi: 'नियमित सामान्य मल त्याग (मध्यम कोष्ठ)', text_kn: 'ದಿನಕ್ಕೆ ಒಂದು ಅಥವಾ ಎರಡು ಬಾರಿ ನಿಯಮಿತ ಸಾಮಾನ್ಯ ಮಲವಿಸರ್ಜನೆ (ಮಧ್ಯಮ ಕೋಷ್ಠ)' }
    ]
  },
  {
    id: 'ay_q5',
    clinical_system: 'ayush',
    question_text_en: 'Nidra Pariksha: How is the depth and quality of your sleep?',
    question_text_hi: 'निद्रा परीक्षा: आपकी नींद की गहराई और गुणवत्ता कैसी है?',
    question_text_kn: 'ನಿದ್ರಾ ಪರೀಕ್ಷೆ: ನಿಮ್ಮ ನಿದ್ರೆಯ ಆಳ ಮತ್ತು ಗುಣಮಟ್ಟ ಹೇಗಿದೆ?',
    question_type: 'single_choice',
    clinical_field: 'nidra_sleep_quality',
    sequence: 5,
    required: true,
    options: [
      { value: 'light_disturbed', text_en: 'Light, fragmented sleep; awakens easily (Vata)', text_hi: 'हल्की, टूटने वाली नींद (वात)', text_kn: 'ಹಗುರವಾದ, ಬೇಗನೆ ಎಚ್ಚರವಾಗುವ ನಿದ್ರೆ (ವಾತ)' },
      { value: 'moderate_sound', text_en: 'Moderate sound sleep 6-7 hours, feels rested (Pitta)', text_hi: 'मध्यम गहरी नींद 6-7 घंटे (पित्त)', text_kn: 'ಮಧ್ಯಮ ನೆಮ್ಮದಿಯ 6-7 ಗಂಟೆಗಳ ನಿದ್ರೆ (ಪಿತ್ತ)' },
      { value: 'deep_heavy', text_en: 'Heavy, prolonged deep sleep; morning sluggishness (Kapha)', text_hi: 'गहरी, भारी नींद (कफ)', text_kn: 'ಗಾಢವಾದ ದೀರ್ಘ ನಿದ್ರೆ, ಬೆಳಗ್ಗೆ ಎದ್ದಾಗ ಮಂಪರು (ಕಫ)' }
    ]
  }
];

// Initial state for demo session
const initialDemoSessionId = '00000000-0000-0000-0000-000000000001';
let localSessions = [
  {
    id: initialDemoSessionId,
    patient_id: '11111111-1111-1111-1111-111111111111',
    patient_name: 'Ramesh Sharma',
    age: 54,
    gender: 'Male',
    abha_id: '91-2345-6789-0123',
    language: 'en',
    clinical_system: 'allopathy',
    condition_id: 'chest_pain',
    status: 'flagged',
    red_flag_detected: true,
    pain_severity: 8,
    red_flags: [
      { ruleName: 'Severe Pain Intensity (>=8)', severity: 'CRITICAL', message: 'High pain severity (8/10 or higher) reported. Triaged for immediate physician assessment.', rationale: 'High pain score indicates urgent clinical prioritization.' },
      { ruleName: 'Left Arm / Shoulder Radiation', severity: 'CRITICAL', message: 'Potential warning sign detected: Pain radiating to the left arm is a high-risk symptom for acute coronary syndrome.', rationale: 'Radiation of chest pain to left arm is strongly associated with acute myocardial ischemia.' }
    ],
    consent_given: true,
    opd_token_number: 'OPD-101',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

let localAnswers = [
  {
    session_id: initialDemoSessionId,
    question_id: 'cp_q1',
    clinical_field: 'chief_complaint',
    raw_answer: 'chest_pain_pressure',
    is_red_flag: false
  },
  {
    session_id: initialDemoSessionId,
    question_id: 'cp_q6',
    clinical_field: 'severity',
    raw_answer: '8',
    is_red_flag: true
  },
  {
    session_id: initialDemoSessionId,
    question_id: 'cp_q7',
    clinical_field: 'radiation',
    raw_answer: 'left arm',
    is_red_flag: true
  }
];

let localDocuments = [
  {
    id: 'doc-demo-001',
    patient_id: '11111111-1111-1111-1111-111111111111',
    file_name: 'apollo_prescription_feb2024.pdf',
    document_type: 'prescription',
    document_date: '2024-02-10',
    extractions: {
      diagnoses: ['Essential Hypertension', 'Dyslipidemia'],
      medications: [
        { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily morning' },
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily night' },
        { name: 'Ecosprin', dosage: '75mg', frequency: 'Once daily afternoon' }
      ],
      lab_results: []
    }
  },
  {
    id: 'doc-demo-002',
    patient_id: '11111111-1111-1111-1111-111111111111',
    file_name: 'lipid_profile_may2024.pdf',
    document_type: 'lab_report',
    document_date: '2024-05-18',
    extractions: {
      diagnoses: ['Hypercholesterolemia'],
      medications: [],
      lab_results: [
        { test: 'Total Cholesterol', value: '242 mg/dL', flag: 'HIGH' },
        { test: 'LDL Cholesterol', value: '164 mg/dL', flag: 'HIGH' },
        { test: 'HDL Cholesterol', value: '38 mg/dL', flag: 'LOW' }
      ]
    }
  }
];

let localSummaries = {
  [initialDemoSessionId]: {
    chief_complaint: 'Acute retrosternal crushing chest discomfort of 2 hours duration (Severity 8/10)',
    hpi_summary: '54-year-old male with known hypertension presents with sudden onset crushing retrosternal chest pain (severity 8/10), radiating to left arm and shoulder. Accompanied by shortness of breath and diaphoresis. High severity risk triage alert triggered at kiosk.',
    past_history: 'Essential Hypertension (diagnosed 2021), Dyslipidemia.',
    medications_summary: 'Telmisartan 40mg OD, Atorvastatin 20mg OD, Ecosprin 75mg OD.',
    allergies_summary: 'No known drug allergies reported.',
    family_history: 'Paternal history of CAD at age 58.',
    personal_history: 'Non-smoker.',
    review_of_systems: 'Positive for dyspnea and sweating. Denies syncope.',
    red_flags_summary: [
      { rule_name: 'Severe Pain Intensity (>=8)', severity: 'CRITICAL', warning: 'High pain severity (8/10 or higher) reported. Triaged for immediate physician assessment.', rationale: 'High pain score indicates urgent clinical prioritization.' },
      { rule_name: 'Left Arm / Shoulder Radiation', severity: 'CRITICAL', warning: 'Potential warning sign detected: Pain radiating to the left arm is a high-risk symptom for acute coronary syndrome.', rationale: 'Radiation of chest pain to left arm is strongly associated with acute myocardial ischemia.' }
    ],
    physician_notes: 'Urgent Stat ECG requested. Bedside telemetry initiated.'
  }
};

let localReviews = {};

const persistSessions = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('medikiosk_local_sessions', JSON.stringify(localSessions));
      localStorage.setItem('medikiosk_local_summaries', JSON.stringify(localSummaries));
    } catch (e) {
      console.warn('[mockEngine] Failed to persist local sessions:', e);
    }
  }
};

const loadPersistedSessions = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem('medikiosk_local_sessions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localSessions = parsed;
        }
      }
      const rawSumm = window.localStorage.getItem('medikiosk_local_summaries');
      if (rawSumm) {
        localSummaries = { ...localSummaries, ...JSON.parse(rawSumm) };
      }
    } catch (e) {
      console.warn('[mockEngine] Failed to load persisted sessions:', e);
    }
  }
};

// Initial load
loadPersistedSessions();

// Adaptive Dynamic Question Generator based on patient's previous answer
export function generateAdaptiveNextQuestion({ session, lastAnswer, answersForSession }) {
  const answeredCount = answersForSession.length;
  const system = session.clinical_system || 'ayush';
  const TOTAL_QUESTIONS = 5;

  if (answeredCount >= TOTAL_QUESTIONS) {
    return null; // Session completed
  }

  const q1Answer = String(answersForSession[0]?.raw_answer || '').toLowerCase();

  // --------------------------------------------------------------------------
  // AYUSH ADAPTIVE QUESTION TREE
  // --------------------------------------------------------------------------
  if (system === 'ayush') {
    // Step 2: Auto-generate based on Q1 Chief Complaint
    if (answeredCount === 1) {
      if (q1Answer.includes('digest') || q1Answer.includes('gas') || q1Answer.includes('acid') || q1Answer.includes('ajeerna')) {
        return {
          id: 'ay_dig_q2',
          clinical_field: 'digestion_pattern',
          sequence: 2,
          question_type: 'single_choice',
          question_text_en: 'Based on your digestive discomfort, what is the primary symptom you experience after meals?',
          question_text_hi: 'आपकी पाचन समस्या के आधार पर, भोजन के बाद आपको मुख्य रूप से क्या लक्षण महसूस होते हैं?',
          question_text_kn: 'ನಿಮ್ಮ ಜೀರ್ಣಕ್ರಿಯೆಯ ತೊಂದರೆಯ ಆಧಾರದ ಮೇಲೆ, ಊಟದ ನಂತರ ಮುಖ್ಯವಾಗಿ ಯಾವ ಲಕ್ಷಣ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತದೆ?',
          options: [
            { value: 'burning_reflux', text_en: 'Burning sensation in chest/throat with sour burps (Amlapitta)', text_hi: 'सीने या गले में जलन व खट्टी डकारें (अम्लपित्त)', text_kn: 'ಎದೆ ಅಥವಾ ಗಂಟಲಲ್ಲಿ ಉರಿ, ಹುಳಿ ತೇಗು (ಆಮ್ಲಪಿತ್ತ)' },
            { value: 'gas_bloating', text_en: 'Severe abdominal bloating, heaviness and flatulence (Adhmana)', text_hi: 'पेट में भारीपन, गैस और अफरा (आध्मान)', text_kn: 'ಹೊಟ್ಟೆ ಉಬ್ಬರ, ಭಾರ ಮತ್ತು ಗ್ಯಾಸ್ (ಆಧ್ಮಾನ)' },
            { value: 'low_appetite_sluggish', text_en: 'Poor appetite, sluggish digestion, food feels stuck for hours', text_hi: 'कम भूख लगना, मंद पाचन, खाना देर तक न पचना (मंदाग्नि)', text_kn: 'ಕಡಿಮೆ ಹಸಿವು, ಮಂದ ಜೀರ್ಣಕ್ರಿಯೆ, ಹೊಟ್ಟೆ ಭಾರ' },
            { value: 'cramps_irregular_bowel', text_en: 'Cramping stomach discomfort relieved after passing stool', text_hi: 'पेट में मरोड़ और दर्द, पेट साफ होने पर आराम', text_kn: 'ಹೊಟ್ಟೆಯಲ್ಲಿ ಸೆಳೆತ ಮತ್ತು ನೋವು, ಮಲವಿಸರ್ಜನೆಯ ನಂತರ ಆರಾಮ' }
          ],
          progress: { current: 2, total: TOTAL_QUESTIONS, percent: 40 }
        };
      } else if (q1Answer.includes('joint') || q1Answer.includes('pain') || q1Answer.includes('sandhivata')) {
        return {
          id: 'ay_jnt_q2',
          clinical_field: 'joint_location',
          sequence: 2,
          question_type: 'single_choice',
          question_text_en: 'Regarding your joint or muscular discomfort, which parts of your body are most affected?',
          question_text_hi: 'जोड़ों या मांसपेशियों के दर्द में, आपके शरीर का कौन सा भाग सबसे अधिक प्रभावित है?',
          question_text_kn: 'ಕೀಲು ಅಥವಾ ಸ್ನಾಯು ನೋವಿನಲ್ಲಿ ನಿಮ್ಮ ದೇಹದ ಯಾವ ಭಾಗ ಹೆಚ್ಚು ತೊಂದರೆಗೊಳಗಾಗಿದೆ?',
          options: [
            { value: 'knees_spine', text_en: 'Knee joints and lower back (weight-bearing joints)', text_hi: 'घुटने और पीठ का निचला हिस्सा (भार सहने वाले जोड़)', text_kn: 'ಮಂಡಿ ಕೀಲುಗಳು ಮತ್ತು ಕೆಳಬೆನ್ನು (ತೂಕ ಹೊರುವ ಕೀಲುಗಳು)' },
            { value: 'hands_wrists', text_en: 'Small joints of fingers, hands, and wrists with morning stiffness', text_hi: 'उंगलियों, हाथों और कलाई के छोटे जोड़, सुबह जकड़न', text_kn: 'ಬೆರಳುಗಳು, ಕೈಗಳು ಮತ್ತು ಮಣಿಕಟ್ಟಿನ ಸಣ್ಣ ಕೀಲುಗಳು' },
            { value: 'neck_shoulders', text_en: 'Neck, shoulders, and upper cervical spine stiffness', text_hi: 'गर्दन और कंधों में अकड़न व दर्द', text_kn: 'ಕುತ್ತಿಗೆ ಮತ್ತು ಭುಜದ ಬಿಗಿತ ಮತ್ತು ನೋವು' },
            { value: 'generalized_ache', text_en: 'Widespread muscle soreness, heaviness and generalized ache', text_hi: 'पूरे शरीर की मांसपेशियों में भारीपन व दर्द', text_kn: 'ಸಂಪೂರ್ಣ ದೇಹದ ಸ್ನಾಯು ನೋವು ಮತ್ತು ಭಾರ' }
          ],
          progress: { current: 2, total: TOTAL_QUESTIONS, percent: 40 }
        };
      } else {
        return {
          id: 'ay_str_q2',
          clinical_field: 'stress_manifestation',
          sequence: 2,
          question_type: 'single_choice',
          question_text_en: 'Regarding your fatigue and mental stress, what is the most challenging symptom you face?',
          question_text_hi: 'तनाव और मानसिक थकान के संबंध में, आप सबसे अधिक किस परेशानी का सामना कर रहे हैं?',
          question_text_kn: 'ಮಾನಸಿಕ ಒತ್ತಡ ಮತ್ತು ಆಯಾಸದ ಸಂಬಂಧದಲ್ಲಿ, ನೀವು ಎದುರಿಸುತ್ತಿರುವ ಪ್ರಮುಖ ಸಮಸ್ಯೆ ಏನು?',
          options: [
            { value: 'racing_thoughts_sleepless', text_en: 'Difficulty falling asleep due to an overactive, racing mind (Vata)', text_hi: 'मन में अत्यधिक विचारों के कारण नींद न आना (वात)', text_kn: 'ಮನಸ್ಸಿನಲ್ಲಿ ಹೆಚ್ಚು ಆಲೋಚನೆಗಳಿಂದ ನಿದ್ರೆ ಬಾರದಿರುವುದು (ವಾತ)' },
            { value: 'mid_night_waking_irritation', text_en: 'Waking up around 2-3 AM with heat, restlessness or irritability (Pitta)', text_hi: 'रात 2-3 बजे नींद टूटना, पसीना व चिड़चिड़ापन (पित्त)', text_kn: 'ರಾತ್ರಿ 2-3 ಗಂಟೆಗೆ ಬೆವರಿನೊಂದಿಗೆ ಎಚ್ಚರವಾಗುವುದು (ಪಿತ್ತ)' },
            { value: 'daytime_brain_fog', text_en: 'Heavy head, morning lethargy, brain fog and lack of motivation (Kapha)', text_hi: 'सुबह भारीपन, काम में मन न लगना, अत्यधिक आलस्य (कफ)', text_kn: 'ತಲೆ ಭಾರ, ದಿನವಿಡೀ ಆಲಸ್ಯ ಮತ್ತು ಏಕಾಗ್ರತೆಯ ಕೊರತೆ (ಕಫ)' },
            { value: 'tension_headaches', text_en: 'Physical tension headaches, neck stiffness, and eye fatigue', text_hi: 'तनाव से सिरदर्द, गर्दन में जकड़न और आंखों में खिंचाव', text_kn: 'ಒತ್ತಡದಿಂದ ತಲೆನೋವು, ಕುತ್ತಿಗೆ ಬಿಗಿತ ಮತ್ತು ಕಣ್ಣಿನ ಆಯಾಸ' }
          ],
          progress: { current: 2, total: TOTAL_QUESTIONS, percent: 40 }
        };
      }
    }

    // Step 3: Modalities / triggers
    if (answeredCount === 2) {
      if (q1Answer.includes('digest') || q1Answer.includes('gas') || q1Answer.includes('acid')) {
        return {
          id: 'ay_dig_q3',
          clinical_field: 'dietary_triggers',
          sequence: 3,
          question_type: 'single_choice',
          question_text_en: 'Which dietary or daily habit triggers or worsens your digestive symptoms most?',
          question_text_hi: 'कौन सा खान-पान या आदत आपकी पाचन समस्या को सबसे ज्यादा बढ़ाती है?',
          question_text_kn: 'ಯಾವ ಆಹಾರ ಅಥವಾ ದಿನಚರಿ ನಿಮ್ಮ ಜೀರ್ಣಕ್ರಿಯೆಯ ತೊಂದರೆಯನ್ನು ಹೆಚ್ಚು ಮಾಡುತ್ತದೆ?',
          options: [
            { value: 'spicy_oily', text_en: 'Spicy, fried foods, tea/coffee or pickles', text_hi: 'मसालेदार, तला-भुना खाना या चाय-कॉफ़ी', text_kn: 'ಖಾರ, ಎಣ್ಣೆಯುಕ್ತ ಆಹಾರ ಅಥವಾ ಚಹಾ-ಕಾಫಿ' },
            { value: 'late_irregular_meals', text_en: 'Irregular meal timings or eating late at night', text_hi: 'अनियमित समय पर खाना या देर रात भोजन', text_kn: 'ಅನಿಯಮಿತ ಅಥವಾ ತಡರಾತ್ರಿಯ ಊಟ' },
            { value: 'heavy_dairy_wheat', text_en: 'Dairy, heavy sweets, or refined wheat products', text_hi: 'दूध-दही, भारी मिठाइयां या मैदा', text_kn: 'ಹಾಲು, ಭಾರವಾದ ಸಿಹಿತಿಂಡಿ ಅಥವಾ ಮೈದಾ' },
            { value: 'stress_anxiety', text_en: 'Mental stress, hurry, or eating while anxious', text_hi: 'मानसिक तनाव, जल्दबाजी या चिंता में भोजन करना', text_kn: 'ಮಾನಸಿಕ ಒತ್ತಡ ಅಥವಾ ಆತಂಕದಲ್ಲಿ ಊಟ ಮಾಡುವುದು' }
          ],
          progress: { current: 3, total: TOTAL_QUESTIONS, percent: 60 }
        };
      } else if (q1Answer.includes('joint') || q1Answer.includes('pain')) {
        return {
          id: 'ay_jnt_q3',
          clinical_field: 'pain_modality',
          sequence: 3,
          question_type: 'single_choice',
          question_text_en: 'How does the pain behave with temperature, warmth, or movement?',
          question_text_hi: 'तापमान, गर्माहट या हलचल से आपके दर्द पर क्या असर पड़ता है?',
          question_text_kn: 'ತಾಪಮಾನ, ಬೆಚ್ಚಗಿನ ಶಾಖ ಅಥವಾ ಚಲನೆಯಿಂದ ನೋವಿನಲ್ಲಿ ಏನು ವ್ಯತ್ಯಾಸವಾಗುತ್ತದೆ?',
          options: [
            { value: 'worse_cold_better_heat', text_en: 'Worse in cold/damp weather, relieved by hot fomentation (Vata)', text_hi: 'ठंड में बढ़ता है, गर्म सेंक से आराम मिलता है (वात)', text_kn: 'ಚಳಿಯಲ್ಲಿ ಹೆಚ್ಚಾಗುತ್ತದೆ, ಬಿಸಿನೀರಿನ ಶಾಖದಿಂದ ಗುಣವಾಗುತ್ತದೆ (ವಾತ)' },
            { value: 'burning_warm_touch', text_en: 'Warm to touch, burning sensation, relieved by cool air (Pitta)', text_hi: 'छूने पर गर्म, जलन होती है, ठंडी हवा से आराम (पित्त)', text_kn: 'ಮುಟ್ಟಿದರೆ ಬಿಸಿ, ಉರಿತ, ತಂಪು ಗಾಳಿಯಿಂದ ಆರಾಮ (ಪಿತ್ತ)' },
            { value: 'morning_stiffness_heavy', text_en: 'Severe morning stiffness over 30 mins, heavy swelling (Kapha)', text_hi: 'सुबह उठने पर अत्यधिक जकड़न और सूजन (कफ)', text_kn: 'ಬೆಳಗಿನ ಜಾವದಲ್ಲಿ ತೀವ್ರ ಬಿಗಿತ ಮತ್ತು ಊತ (ಕಫ)' },
            { value: 'worse_continuous_walking', text_en: 'Worsens after prolonged walking or standing, needs rest', text_hi: 'ज्यादा चलने या खड़े रहने पर बढ़ता है', text_kn: 'ಹೆಚ್ಚು ನಡೆದರೆ ಅಥವಾ ನಿಂತರೆ ನೋವು ಹೆಚ್ಚಾಗುತ್ತದೆ' }
          ],
          progress: { current: 3, total: TOTAL_QUESTIONS, percent: 60 }
        };
      } else {
        return {
          id: 'ay_str_q3',
          clinical_field: 'stress_duration',
          sequence: 3,
          question_type: 'single_choice',
          question_text_en: 'How long have you been experiencing this fatigue or mental stress?',
          question_text_hi: 'आप कितने समय से इस थकान या मानसिक तनाव का अनुभव कर रहे हैं?',
          question_text_kn: 'ನೀವು ಎಷ್ಟು ಸಮಯದಿಂದ ಈ ಆಯಾಸ ಅಥವಾ ಮಾನಸಿಕ ಒತ್ತಡವನ್ನು ಅನುಭವಿಸುತ್ತಿದ್ದೀರಿ?',
          options: [
            { value: 'recent_days', text_en: 'Recent onset (past 1-2 weeks due to temporary workload)', text_hi: 'हाल ही में (पिछले 1-2 हफ्तों से, किसी काम की वजह से)', text_kn: 'ಇತ್ತೀಚೆಗೆ (ಕಳೆದ 1-2 ವಾರಗಳಿಂದ)' },
            { value: 'one_three_months', text_en: 'Ongoing for 1 to 3 months', text_hi: 'पिछले 1 से 3 महीनों से लगातार', text_kn: 'ಕಳೆದ 1 ರಿಂದ 3 ತಿಂಗಳುಗಳಿಂದ' },
            { value: 'chronic_six_months', text_en: 'Chronic concern lasting more than 6 months', text_hi: 'दीर्घकालिक (6 महीने से अधिक समय से)', text_kn: 'ದೀರ್ಘಕಾಲಿಕ (6 ತಿಂಗಳಿಗಿಂತ ಹೆಚ್ಚು ಸಮಯದಿಂದ)' }
          ],
          progress: { current: 3, total: TOTAL_QUESTIONS, percent: 60 }
        };
      }
    }

    // Step 4: Koshtha / Functional mobility
    if (answeredCount === 3) {
      if (q1Answer.includes('digest') || q1Answer.includes('gas') || q1Answer.includes('acid')) {
        return {
          id: 'ay_dig_q4',
          clinical_field: 'koshtha_bowel',
          sequence: 4,
          question_type: 'single_choice',
          question_text_en: 'Koshtha Pariksha: How is your stool consistency and daily bowel movement?',
          question_text_hi: 'कोष्ठ परीक्षा: आपका पेट साफ होने की स्थिति और मल त्याग का स्वभाव कैसा है?',
          question_text_kn: 'ಕೋಷ್ಠ ಪರೀಕ್ಷೆ: ನಿಮ್ಮ ಮಲವಿಸರ್ಜನೆ ಮತ್ತು ಹೊಟ್ಟೆ ಸ್ವಚ್ಛತೆಯ ಅಭ್ಯಾಸ ಹೇಗಿದೆ?',
          options: [
            { value: 'krura_constipated', text_en: 'Hard, dry stools with tendency for constipation (Krura Koshtha)', text_hi: 'कड़ा, सूखा मल; कब्ज की प्रवृत्ति (क्रूर कोष्ठ)', text_kn: 'ಗಟ್ಟಿಯಾದ ಮಲ, ಮಲಬದ್ಧತೆಯ ಪ್ರವೃತ್ತಿ (ಕ್ರೂರ ಕೋಷ್ಠ)' },
            { value: 'mridu_loose', text_en: 'Soft or loose stools, multiple times daily (Mridu Koshtha)', text_hi: 'ढीला या नरम मल, दिन में कई बार (मृदु कोष्ठ)', text_kn: 'ಮೃದು ಅಥವಾ ಸಡಿಲ ಮಲ, ದಿನಕ್ಕೆ ಹಲವು ಬಾರಿ (ಮೃದು ಕೋಷ್ಠ)' },
            { value: 'madhyama_regular', text_en: 'Regular once or twice daily well-formed elimination (Madhyama Koshtha)', text_hi: 'नियमित एक या दो बार सामान्य मल त्याग (मध्यम कोष्ठ)', text_kn: 'ದಿನಕ್ಕೆ ಒಂದು ಅಥವಾ ಎರಡು ಬಾರಿ ಸಾಮಾನ್ಯ ಮಲವಿಸರ್ಜನೆ (ಮಧ್ಯಮ ಕೋಷ್ಠ)' }
          ],
          progress: { current: 4, total: TOTAL_QUESTIONS, percent: 80 }
        };
      } else if (q1Answer.includes('joint') || q1Answer.includes('pain')) {
        return {
          id: 'ay_jnt_q4',
          clinical_field: 'mobility_impact',
          sequence: 4,
          question_type: 'single_choice',
          question_text_en: 'How significantly does this joint pain restrict your daily movement and mobility?',
          question_text_hi: 'यह दर्द आपकी दैनिक गतिविधियों और चलने-फिरने को कितना सीमित करता है?',
          question_text_kn: 'ಈ ನೋವು ನಿಮ್ಮ ದೈನಂದಿನ ಚಲನೆ ಮತ್ತು ಕೆಲಸಗಳನ್ನು ಎಷ್ಟು ಮಿತಿಗೊಳಿಸುತ್ತದೆ?',
          options: [
            { value: 'mild_independent', text_en: 'Mild ache, fully independent in all routine tasks', text_hi: 'हल्का दर्द, सभी दैनिक कार्य आसानी से कर लेते हैं', text_kn: 'ಸೌಮ್ಯ ನೋವು, ಎಲ್ಲಾ ಕೆಲಸಗಳನ್ನು ಸುಲಭವಾಗಿ ಮಾಡಬಹುದು' },
            { value: 'stairs_squatting_difficult', text_en: 'Difficulty climbing stairs, squatting, or getting up from floor', text_hi: 'सीढ़ियां चढ़ने, उकड़ू बैठने या जमीन से उठने में कठिनाई', text_kn: 'ಮೆಟ್ಟಿಲು ಹತ್ತುವುದು, ನೆಲದಿಂದ ಏಳುವುದು ಕಷ್ಟ' },
            { value: 'requires_support', text_en: 'Severe pain, requires stick or human support to walk', text_hi: 'अधिक दर्द, चलने के लिए सहारे की आवश्यकता', text_kn: 'ತೀವ್ರ ನೋವು, ನಡೆಯಲು ಊರುಗೋಲು ಅಥವಾ ಇತರರ ನೆರವು ಬೇಕು' }
          ],
          progress: { current: 4, total: TOTAL_QUESTIONS, percent: 80 }
        };
      } else {
        return {
          id: 'ay_str_q4',
          clinical_field: 'stress_appetite',
          sequence: 4,
          question_type: 'single_choice',
          question_text_en: 'Agni Pariksha: How does this mental stress affect your hunger and food digestion?',
          question_text_hi: 'अग्नि परीक्षा: इस तनाव का आपकी भूख और पाचन पर क्या असर पड़ता है?',
          question_text_kn: 'ಅಗ್ನಿ ಪರೀಕ್ಷೆ: ಈ ಒತ್ತಡ ನಿಮ್ಮ ಹಸಿವು ಮತ್ತು ಜೀರ್ಣಕ್ರಿಯೆಯ ಮೇಲೆ ಹೇಗೆ ಪರಿಣಾಮ ಬೀರುತ್ತದೆ?',
          options: [
            { value: 'loss_of_appetite', text_en: 'Complete loss of appetite, forget to eat meals (Vishama Agni)', text_hi: 'भूख पूरी तरह खत्म हो जाती है, खाना भूल जाते हैं', text_kn: 'ಹಸಿವಾಗುವುದಿಲ್ಲ, ಊಟವನ್ನೇ ಮರೆತುಬಿಡುತ್ತೇನೆ' },
            { value: 'acid_reflux_craving', text_en: 'Excessive cravings for sugar, coffee, or sharp acid reflux (Tikshna Agni)', text_hi: 'मीठा या चाय-कॉफ़ी की तीव्र तलब, एसिडिटी', text_kn: 'ಸಿಹಿ ಅಥವಾ ಚಹಾ-ಕಾಫಿಯ ಹಂಬಲ, ಅಸಿಡಿಟಿ' },
            { value: 'digestive_heaviness', text_en: 'Digestive heaviness, food feels undigested (Manda Agni)', text_hi: 'पेट में भारीपन, खाना न पचना', text_kn: 'ಹೊಟ್ಟೆ ಭಾರ, ಜೀರ್ಣವಾಗದಿರುವುದು' },
            { value: 'normal_meals', text_en: 'Appetite remains largely normal and unaffected', text_hi: 'भूख सामान्य रहती है, कोई विशेष बदलाव नहीं', text_kn: 'ಹಸಿವು ಸಾಮಾನ್ಯವಾಗಿರುತ್ತದೆ' }
          ],
          progress: { current: 4, total: TOTAL_QUESTIONS, percent: 80 }
        };
      }
    }

    // Step 5: Final synthesis
    if (answeredCount === 4) {
      return {
        id: 'ay_gen_q5',
        clinical_field: 'prakriti_temp',
        sequence: 5,
        question_type: 'single_choice',
        question_text_en: 'Prakriti & Bala: How would you describe your natural energy stamina and temperature tolerance?',
        question_text_hi: 'प्रकृति व बल: आपकी शारीरिक शक्ति और तापमान सहनशीलता कैसी है?',
        question_text_kn: 'ಪ್ರಕೃತಿ ಮತ್ತು ಬಲ: ನಿಮ್ಮ ನೈಸರ್ಗಿಕ ಶಕ್ತಿ ಮತ್ತು ತಾಪಮಾನ ಸಹಿಷ್ಣುತೆ ಹೇಗಿದೆ?',
        options: [
          { value: 'vata_cold_slender', text_en: 'Slender build, sensitive to cold breeze, quick fatigue (Vata)', text_hi: 'दुबला शरीर, ठंड जल्दी लगती है, ऊर्जा जल्दी खत्म होती है (वात)', text_kn: 'ತೆಳ್ಳನೆಯ ದೇಹ, ಚಳಿ ಸಹಿಸಲಾಗುವುದಿಲ್ಲ, ಬೇಗನೆ ಸುಸ್ತಾಗುತ್ತದೆ (ವಾತ)' },
          { value: 'pitta_warm_medium', text_en: 'Medium build, sweats easily, intolerant to heat (Pitta)', text_hi: 'मध्यम गठन, गर्मी सहन नहीं होती, पसीना जल्दी आता है (पित्त)', text_kn: 'ಮಧ್ಯಮ ದೇಹ, ಸೆಖೆ ಸಹಿಸಲಾಗುವುದಿಲ್ಲ, ಬೇಗ ಬೆವರುತ್ತದೆ (ಪಿತ್ತ)' },
          { value: 'kapha_solid_calm', text_en: 'Solid heavy build, calm endurance, slow digestion (Kapha)', text_hi: 'मजबूत चौड़ा शरीर, अच्छा शारीरिक बल, शांत स्वभाव (कफ)', text_kn: 'ದೃಢವಾದ ದೇಹ, ಉತ್ತಮ ಶಕ್ತಿ ಮತ್ತು ಸಹಿಷ್ಣುತೆ (ಕಫ)' }
        ],
        progress: { current: 5, total: TOTAL_QUESTIONS, percent: 95 }
      };
    }
  }

  // --------------------------------------------------------------------------
  // ALLOPATHY ADAPTIVE QUESTION TREE
  // --------------------------------------------------------------------------
  if (system === 'allopathy') {
    if (answeredCount === 1) {
      if (q1Answer.includes('pressure') || q1Answer.includes('pain')) {
        return {
          id: 'cp_rad_q2',
          clinical_field: 'radiation',
          sequence: 2,
          question_type: 'single_choice',
          question_text_en: 'Does the chest discomfort radiate to any other parts of your body?',
          question_text_hi: 'क्या छाती का दर्द शरीर के किसी अन्य हिस्से में फैलता है?',
          question_text_kn: 'ಎದೆ ನೋವು ದೇಹದ ಯಾವುದೇ ಇತರ ಭಾಗಗಳಿಗೆ ಹರಡುತ್ತದೆಯೇ?',
          options: [
            { value: 'left arm', text_en: 'Radiating to left arm or shoulder', text_hi: 'बाएं हाथ या कंधे में जाता है', text_kn: 'ಎಡಗೈ ಅಥವಾ ಭುಜಕ್ಕೆ ಹರಡುತ್ತದೆ' },
            { value: 'jaw', text_en: 'Radiating to neck or jaw', text_hi: 'गर्दन या जबड़े में जाता है', text_kn: 'ಕುತ್ತಿಗೆ ಅಥವಾ ದವಡೆಗೆ ಹರಡುತ್ತದೆ' },
            { value: 'back', text_en: 'Radiating to back between shoulder blades', text_hi: 'पीठ में दोनों कंधों के बीच जाता है', text_kn: 'ಬೆನ್ನಿಗೆ ಹರಡುತ್ತದೆ' },
            { value: 'no_radiation', text_en: 'Localized to chest, does not radiate', text_hi: 'केवल छाती में, कहीं नहीं फैलता', text_kn: 'ಕೇವಲ ಎದೆಯಲ್ಲಿ ಮಾತ್ರ' }
          ],
          progress: { current: 2, total: TOTAL_QUESTIONS, percent: 40 }
        };
      } else if (q1Answer.includes('burn')) {
        return {
          id: 'cp_burn_q2',
          clinical_field: 'burning_posture',
          sequence: 2,
          question_type: 'single_choice',
          question_text_en: 'Does this burning sensation worsen after meals or when lying flat?',
          question_text_hi: 'क्या यह जलन भोजन के बाद या सीधे लेटने पर बढ़ जाती है?',
          question_text_kn: 'ಈ ಉರಿತವು ಊಟದ ನಂತರ ಅಥವಾ ಮಲಗಿದಾಗ ಹೆಚ್ಚಾಗುತ್ತದೆಯೇ?',
          options: [
            { value: 'worse_lying_flat', text_en: 'Worsens significantly when lying flat in bed', text_hi: 'बिस्तर पर लेटने पर बहुत बढ़ जाता है', text_kn: 'ಮಲಗಿದಾಗ ತೀವ್ರವಾಗಿ ಹೆಚ್ಚಾಗುತ್ತದೆ' },
            { value: 'relieved_antacids', text_en: 'Relieved by antacids or cold milk', text_hi: 'एंटासिड या ठंडे दूध से आराम मिलता है', text_kn: 'ಆಂಟಾಸಿಡ್ ಅಥವಾ ತಣ್ಣನೆಯ ಹಾಲಿನಿಂದ ಶಮನ' },
            { value: 'worse_exertion', text_en: 'Worsens during physical exertion or walking', text_hi: 'चलने या मेहनत करने पर बढ़ता है', text_kn: 'ನಡೆದಾಗ ಅಥವಾ ವ್ಯಾಯಾಮದಿಂದ ಹೆಚ್ಚಾಗುತ್ತದೆ' },
            { value: 'constant_burning', text_en: 'Constant burning irrespective of posture', text_hi: 'लगातार जलन, स्थिति का कोई असर नहीं', text_kn: 'ಯಾವಾಗಲೂ ನಿರಂತರ ಉರಿತ' }
          ],
          progress: { current: 2, total: TOTAL_QUESTIONS, percent: 40 }
        };
      } else {
        return {
          id: 'cp_sob_q2',
          clinical_field: 'rest_vs_exertion',
          sequence: 2,
          question_type: 'single_choice',
          question_text_en: 'Does the breathlessness occur even when sitting completely still at rest?',
          question_text_hi: 'क्या सांस फूलने की समस्या आराम से बैठे रहने पर भी होती है?',
          question_text_kn: 'ವಿಶ್ರಾಂತಿಯಲ್ಲಿ ಕುಳಿತಾಗಲೂ ಉಸಿರಾಟದ ತೊಂದರೆ ಉಂಟಾಗುತ್ತದೆಯೇ?',
          options: [
            { value: 'rest_breathless', text_en: 'Yes, breathless even at complete rest', text_hi: 'हाँ, आराम से बैठने पर भी सांस फूलती है', text_kn: 'ಹೌದು, ವಿಶ್ರಾಂತಿಯಲ್ಲೂ ಉಸಿರಾಟ ಕಷ್ಟ' },
            { value: 'exertion_only', text_en: 'Only when walking, climbing stairs, or carrying weights', text_hi: 'केवल चलने या सीढ़ियां चढ़ने पर', text_kn: 'ಕೇವಲ ನಡೆದಾಗ ಅಥವಾ ಮೆಟ್ಟಿಲು ಹತ್ತಿದಾಗ' },
            { value: 'night_waking', text_en: 'Awakens from sleep gasping for air (PND)', text_hi: 'रात में सांस टूटने से अचानक नींद खुल जाती है', text_kn: 'ರಾತ್ರಿ ಉಸಿರುಗಟ್ಟಿ ಎಚ್ಚರವಾಗುವುದು' }
          ],
          progress: { current: 2, total: TOTAL_QUESTIONS, percent: 40 }
        };
      }
    }

    if (answeredCount === 2) {
      return {
        id: 'cp_assoc_q3',
        clinical_field: 'associated_symptoms',
        sequence: 3,
        question_type: 'single_choice',
        question_text_en: 'Are you experiencing associated cold sweating (diaphoresis), nausea, or lightheadedness?',
        question_text_hi: 'क्या आपको ठंडा पसीना, मिचली या चक्कर आने का अनुभव हो रहा है?',
        question_text_kn: 'ನಿಮಗೆ ತಣ್ಣನೆಯ ಬೆವರು, ವಾಕರಿಕೆ ಅಥವಾ ತಲೆತಿರುಗುವಿಕೆ ಉಂಟಾಗುತ್ತಿದೆಯೇ?',
        options: [
          { value: 'cold_sweats_nausea', text_en: 'Profuse cold sweats and nausea', text_hi: 'बहुत अधिक ठंडा पसीना और मिचली', text_kn: 'ಅತಿಯಾದ ತಣ್ಣನೆಯ ಬೆವರು ಮತ್ತು ವಾಕರಿಕೆ' },
          { value: 'syncope_fainting', text_en: 'Fainting or momentary blackout (Syncope)', text_hi: 'बेहोशी या चक्कर खाकर गिरना', text_kn: 'ಪ್ರಜ್ಞೆ ತಪ್ಪುವುದು ಅಥವಾ ಮೂರ್ಛೆ' },
          { value: 'mild_dizziness', text_en: 'Mild dizziness without fainting', text_hi: 'हल्का चक्कर आना', text_kn: 'ಸೌಮ್ಯ ತಲೆತಿರುಗುವಿಕೆ' },
          { value: 'none_associated', text_en: 'None of these associated symptoms', text_hi: 'इनमें से कोई लक्षण नहीं', text_kn: 'ಯಾವುದೂ ಇಲ್ಲ' }
        ],
        progress: { current: 3, total: TOTAL_QUESTIONS, percent: 60 }
      };
    }

    if (answeredCount === 3) {
      return {
        id: 'cp_sev_q4',
        clinical_field: 'severity',
        sequence: 4,
        question_type: 'number',
        question_text_en: 'Pain Severity: On a scale of 1 to 10, how intense is your discomfort right now?',
        question_text_hi: 'दर्द की तीव्रता: 1 से 10 के पैमाने पर, आपका दर्द कितना तीव्र है?',
        question_text_kn: 'ನೋವಿನ ತೀವ್ರತೆ: 1 ರಿಂದ 10 ರ ಪ್ರಮಾಣದಲ್ಲಿ, ನೋವು ಎಷ್ಟು ತೀವ್ರವಾಗಿದೆ?',
        progress: { current: 4, total: TOTAL_QUESTIONS, percent: 80 }
      };
    }

    if (answeredCount === 4) {
      return {
        id: 'cp_meds_q5',
        clinical_field: 'medical_history',
        sequence: 5,
        question_type: 'single_choice',
        question_text_en: 'Do you have any known medical conditions or take regular medications?',
        question_text_hi: 'क्या आपको पहले से कोई बीमारी है या नियमित दवाएं ले रहे हैं?',
        question_text_kn: 'ನಿಮಗೆ ಮೊದಲೇ ಯಾವುದೇ ಕಾಯಿಲೆಗಳಿವೆಯೇ ಅಥವಾ ನಿಯಮಿತ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ?',
        options: [
          { value: 'hypertension', text_en: 'Hypertension (High Blood Pressure)', text_hi: 'उच्च रक्तचाप (हाई बीपी)', text_kn: 'ರಕ್ತದೊತ್ತಡ (ಹೈ ಬಿಪಿ)' },
          { value: 'diabetes', text_en: 'Diabetes Mellitus', text_hi: 'मधुमेह (शुगर)', text_kn: 'ಮಧುಮೇಹ (ಡಯಾಬಿಟಿಸ್)' },
          { value: 'both_htn_dm', text_en: 'Both High BP and Diabetes', text_hi: 'हाई बीपी और शुगर दोनों', text_kn: 'ಬಿಪಿ ಮತ್ತು ಶುಗರ್ ಎರಡೂ' },
          { value: 'known_heart', text_en: 'Previous heart stent / angioplasty / CAD', text_hi: 'पूर्व हृदय रोग / स्टेंट / एंजियोप्लास्टी', text_kn: 'ಹೃದಯ ಸಂಬಂಧಿ ಕಾಯಿಲೆ / ಸ್ಟೆಂಟ್' },
          { value: 'none', text_en: 'No known chronic conditions', text_hi: 'कोई पुरानी बीमारी नहीं', text_kn: 'ಯಾವುದೇ ದೀರ್ಘಕಾಲಿಕ ಕಾಯಿಲೆ ಇಲ್ಲ' }
        ],
        progress: { current: 5, total: TOTAL_QUESTIONS, percent: 95 }
      };
    }
  }

  return null;
}

export const StandaloneMockEngine = {
  getPatients: () => ({ success: true, patients: SEED_PATIENTS }),

  registerPatient: (patientData) => {
    const newP = {
      id: `p-${Date.now()}`,
      abha_id: patientData.abha_id || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: patientData.full_name,
      age: parseInt(patientData.age, 10) || 30,
      gender: patientData.gender || 'Male',
      phone: patientData.phone || '',
      blood_group: patientData.blood_group || 'O+',
      chief_complaint: patientData.chief_complaint || '',
      past_history: patientData.past_history || '',
      medications_summary: patientData.medications_summary || '',
      allergies_summary: patientData.allergies_summary || '',
      family_history: patientData.family_history || '',
      personal_history: patientData.personal_history || '',
      review_of_systems: patientData.review_of_systems || ''
    };
    SEED_PATIENTS.push(newP);
    return { success: true, patient: newP };
  },

  startSession: ({ language = 'en', system = 'ayush', patientId, opdToken }) => {
    const sessionPatient = SEED_PATIENTS.find(p => p.id === patientId) || SEED_PATIENTS[0];
    const newSessionId = `sess-${Date.now()}`;
    const token = opdToken || `OPD-${Math.floor(100 + Math.random() * 900)}`;

    const newSession = {
      id: newSessionId,
      patient_id: sessionPatient.id,
      patient_name: sessionPatient.full_name,
      age: sessionPatient.age,
      gender: sessionPatient.gender,
      abha_id: sessionPatient.abha_id,
      language,
      clinical_system: system,
      status: 'in_progress',
      red_flag_detected: false,
      pain_severity: null,
      red_flags: [],
      consent_given: true,
      opd_token_number: token,
      created_at: new Date().toISOString()
    };

    localSessions.unshift(newSession);
    persistSessions();

    // Pick first question for this system
    const systemQuestions = SEED_QUESTIONS.filter(q => q.clinical_system === system);
    const firstQ = systemQuestions[0];

    return {
      success: true,
      sessionId: newSessionId,
      opdToken: token,
      patient: sessionPatient,
      nextQuestion: {
        id: firstQ.id,
        clinicalField: firstQ.clinical_field,
        type: firstQ.question_type,
        text: language === 'hi' ? firstQ.question_text_hi : language === 'kn' ? (firstQ.question_text_kn || firstQ.question_text_en) : firstQ.question_text_en,
        sequence: firstQ.sequence,
        required: firstQ.required,
        options: firstQ.options.map(opt => ({
          value: opt.value,
          text: language === 'hi' ? opt.text_hi : language === 'kn' ? (opt.text_kn || opt.text_en) : opt.text_en
        }))
      },
      progress: { current: 1, total: systemQuestions.length, percent: 5 }
    };
  },

  submitAnswer: ({ sessionId, questionId, answer, voiceTranscript }) => {
    const session = localSessions.find(s => s.id === sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    const systemQuestions = SEED_QUESTIONS.filter(q => q.clinical_system === session.clinical_system);
    const currentQ = systemQuestions.find(q => q.id === questionId);
    const clinicalField = currentQ ? currentQ.clinical_field : 'field';

    // Deterministic Red-Flag check
    let isRedFlag = false;
    const triggeredFlags = [];
    const ansLower = String(answer || '').toLowerCase().trim();

    if (clinicalField === 'radiation' && ansLower.includes('left arm')) {
      isRedFlag = true;
      triggeredFlags.push({
        ruleName: 'Left Arm / Shoulder Radiation',
        message: session.language === 'hi' 
          ? 'संभावित चेतावनी संकेत: बाएं हाथ में जाने वाला दर्द हृदय संबंधी आपातकाल का संकेत हो सकता है। कृपया तुरंत अस्पताल स्टाफ को सूचित करें।'
          : session.language === 'kn'
          ? 'ಎಚ್ಚರಿಕೆ ಸೂಚನೆ: ಎಡ ಭುಜ ಅಥವಾ ಕೈಗೆ ಹರಡುವ ನೋವು ಹೃದಯ ಸಂಬಂಧಿ ತುರ್ತುಸ್ಥಿತಿಯ ಲಕ್ಷಣವಾಗಿರಬಹುದು. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಆಸ್ಪತ್ರೆ ಸಿಬ್ಬಂದಿಗೆ ತಿಳಿಸಿ.'
          : 'Potential warning sign detected: Pain radiating to the left arm is a high-risk symptom for acute coronary syndrome. Please alert hospital staff immediately.',
        rationale: 'Left arm pain radiation has high specificity for acute myocardial ischemia.'
      });
    } else if (clinicalField === 'radiation' && ansLower.includes('jaw')) {
      isRedFlag = true;
      triggeredFlags.push({
        ruleName: 'Jaw / Neck Radiation',
        message: session.language === 'hi'
          ? 'संभावित चेतावनी संकेत: जबड़े या गर्दन तक जाने वाला दर्द तत्काल जांच की मांग करता है।'
          : session.language === 'kn'
          ? 'ಎಚ್ಚರಿಕೆ ಸೂಚನೆ: ದವಡೆ ಅಥವಾ ಕುತ್ತಿಗೆಗೆ ಹರಡುವ ನೋವು ತುರ್ತು ವೈದ್ಯಕೀಯ ತಪಾಸಣೆಯನ್ನು ಬಯಸುತ್ತದೆ.'
          : 'Potential warning sign detected: Pain radiating to the jaw/neck requires emergency clinical evaluation.'
      });
    } else if (clinicalField === 'severity' && parseFloat(ansLower) >= 8) {
      isRedFlag = true;
      triggeredFlags.push({
        ruleName: 'Severe Pain Intensity (>=8)',
        message: session.language === 'hi'
          ? 'अत्यधिक दर्द (8/10 या अधिक) दर्ज किया गया है। तुरंत डॉक्टर से मिलें।'
          : session.language === 'kn'
          ? 'ತೀವ್ರ ನೋವು (8/10 ಅಥವಾ ಹೆಚ್ಚು) ವರದಿಯಾಗಿದೆ. ತಕ್ಷಣ ವೈದ್ಯರ ತಪಾಸಣೆ ಅಗತ್ಯವಿದೆ.'
          : 'High pain severity (8/10 or higher) reported. Triaged for immediate physician assessment.'
      });
    } else if (clinicalField === 'syncope' && ansLower === 'yes') {
      isRedFlag = true;
      triggeredFlags.push({
        ruleName: 'Syncope or Fainting',
        message: session.language === 'hi'
          ? 'संभावित चेतावनी संकेत: बेहोशी या चक्कर आना गंभीर स्थिति का संकेत हो सकता है।'
          : session.language === 'kn'
          ? 'ಎಚ್ಚರಿಕೆ ಸೂಚನೆ: ಮೂರ್ಛೆ ಅಥವಾ ಹಠಾತ್ ಪ್ರಜ್ಞೆ ತಪ್ಪುವುದು ತೀವ್ರ ಅಸ್ವಸ್ಥತೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ.'
          : 'Potential warning sign detected: Fainting or sudden loss of consciousness indicates hemodynamic instability.'
      });
    }

    if (clinicalField === 'severity') {
      session.pain_severity = parseFloat(ansLower);
    }

    if (isRedFlag) {
      session.red_flag_detected = true;
      session.status = 'flagged';
      if (!session.red_flags) session.red_flags = [];
      triggeredFlags.forEach(tf => {
        if (!session.red_flags.some(r => r.ruleName === tf.ruleName)) {
          session.red_flags.push(tf);
        }
      });

      // Automatically dispatch alert to doctor workstation
      try {
        dispatchEmergencyAlert({
          sessionId: session.id,
          opdToken: session.opd_token_number,
          patientName: session.patient_name,
          age: session.age,
          gender: session.gender,
          redFlags: triggeredFlags,
          painSeverity: session.pain_severity,
          clinicalSystem: session.clinical_system
        });
      } catch (err) {
        console.warn('[mockEngine] Could not dispatch alert:', err);
      }
    }

    localAnswers.push({
      session_id: sessionId,
      question_id: questionId,
      clinical_field: clinicalField,
      raw_answer: answer,
      is_red_flag: isRedFlag
    });

    const answersForSession = localAnswers.filter(a => a.session_id === sessionId);
    const nextQ = generateAdaptiveNextQuestion({
      session,
      lastAnswer: answer,
      answersForSession
    });

    const total = 5;
    const answeredCount = answersForSession.length;
    const percent = Math.min(100, Math.round((answeredCount / total) * 100));

    if (!nextQ) {
      // Completed session
      session.status = session.red_flag_detected ? 'flagged' : 'completed';
      const answersForSession = localAnswers.filter(a => a.session_id === sessionId);
      const severityAns = answersForSession.find(a => a.clinical_field === 'severity')?.raw_answer || session.pain_severity;
      const radiationAns = answersForSession.find(a => a.clinical_field === 'radiation')?.raw_answer;
      const chiefAns = answersForSession.find(a => a.clinical_field === 'chief_complaint')?.raw_answer;
      const characterAns = answersForSession.find(a => a.clinical_field === 'character')?.raw_answer;

      const matchedPatient = SEED_PATIENTS.find(p => p.id === session.patient_id) || {};
      const chiefComplaintVal = chiefAns || matchedPatient.chief_complaint || (
        session.clinical_system === 'ayush' 
          ? 'AYUSH Consultation - Ajeerna / Dashavidha Pariksha' 
          : (session.red_flag_detected ? `Acute Chest Pain (Severity ${severityAns || '8'}/10) - High Severity Risk Triage` : 'Acute Chest Discomfort')
      );

      const pastHistoryVal = matchedPatient.past_history || answersForSession.find(a => a.clinical_field === 'past_medical_history')?.raw_answer || 'None reported';
      const medicationsVal = matchedPatient.medications_summary || answersForSession.find(a => a.clinical_field === 'current_medications')?.raw_answer || 'No regular modern medications';
      const allergiesVal = matchedPatient.allergies_summary || answersForSession.find(a => a.clinical_field === 'allergies')?.raw_answer || 'No known allergies reported';
      const familyVal = matchedPatient.family_history || 'Negative';
      const personalVal = matchedPatient.personal_history || 'Sedentary routine, irregular meal timings';
      const rosVal = matchedPatient.review_of_systems || answersForSession.find(a => a.clinical_field === 'review_of_systems')?.raw_answer || (
        session.clinical_system === 'ayush' ? 'Positive for digestive fullness. Denies syncope.' : 'Positive for chest heaviness. Evaluated for diaphoresis.'
      );

      localSummaries[sessionId] = {
        chief_complaint: chiefComplaintVal,
        hpi_summary: session.clinical_system === 'ayush'
          ? `Patient attended OPD Kiosk. Completed structured case-taking for AYUSH. Clinical feature analysis indicates: ${chiefComplaintVal} with Vata-Pitta predominance.`
          : `Patient presented to OPD Kiosk reporting ${chiefComplaintVal}. Pain severity rated as ${severityAns || '8'}/10${characterAns ? `, described as ${characterAns}` : ''}.${radiationAns ? ` Radiation noted: ${radiationAns}.` : ''} ${session.red_flag_detected ? 'CRITICAL ALERT: Emergency high severity risk flagged at kiosk. Urgent clinical review and STAT ECG recommended.' : 'Patient hemodynamically stable, standard OPD triage.'}`,
        past_history: pastHistoryVal,
        medications_summary: medicationsVal,
        allergies_summary: allergiesVal,
        family_history: familyVal,
        personal_history: personalVal,
        review_of_systems: rosVal,
        red_flags_summary: (session.red_flags && session.red_flags.length > 0)
          ? session.red_flags.map(rf => ({
              rule_name: rf.ruleName,
              severity: rf.severity || 'CRITICAL',
              warning: rf.message,
              rationale: rf.rationale
            }))
          : (session.red_flag_detected ? [
              { rule_name: `Severe Pain Intensity (${severityAns || 8}/10)`, severity: 'CRITICAL', warning: 'High pain severity reported. Triaged for immediate physician assessment.', rationale: 'Urgent clinical prioritization for acute pain score >= 8.' }
            ] : []),
        ayush_assessment: session.clinical_system === 'ayush' ? {
          prakriti: { body_build: 'Vata-Pitta', skin_hair: 'Dry / Cool', temperature_tolerance: 'Sheeta Asahishnu' },
          agni: 'Vishama Agni',
          koshtha: 'Krura Koshtha',
          ahara_shakti: 'Madhyama',
          rasa_preference: 'Katu-Amla',
          vyayama_shakti: 'Madhyama',
          nidra: 'Alpa / Light',
          sattva: 'Rajas / Driven',
          vihara: 'Sedentary',
          vaya: 'Madhyama (Adult)'
        } : null,
        physician_notes: session.red_flag_detected ? 'HIGH SEVERITY ALERT: Urgent physician evaluation and Stat ECG requested.' : ''
      };

      persistSessions();

      return {
        success: true,
        completed: true,
        nextQuestion: null,
        progress: { current: total, total, percent: 100 },
        isRedFlag,
        redFlags: triggeredFlags
      };
    }

    persistSessions();

    const lang = session.language || 'en';
    return {
      success: true,
      completed: false,
      nextQuestion: {
        id: nextQ.id,
        clinicalField: nextQ.clinical_field,
        type: nextQ.question_type,
        text: lang === 'hi' ? nextQ.question_text_hi : lang === 'kn' ? (nextQ.question_text_kn || nextQ.question_text_en) : nextQ.question_text_en,
        sequence: nextQ.sequence,
        required: nextQ.required !== false,
        options: (nextQ.options || []).map(opt => ({
          value: opt.value,
          text: lang === 'hi' ? opt.text_hi : lang === 'kn' ? (opt.text_kn || opt.text_en) : opt.text_en
        }))
      },
      progress: nextQ.progress || { current: answeredCount + 1, total, percent },
      isRedFlag,
      redFlags: triggeredFlags
    };
  },

  uploadDocument: (formData) => {
    const docId = `doc-${Date.now()}`;
    const newDoc = {
      id: docId,
      file_name: 'Uploaded_Prescription.pdf',
      document_type: 'Prescription',
      document_date: new Date().toISOString().split('T')[0],
      extractions: {
        diagnoses: ['Clinical document digitized via OCR'],
        medications: [
          { name: 'Standard OPD Medication', dosage: 'As directed', frequency: 'Twice daily' }
        ],
        lab_results: []
      }
    };
    localDocuments.push(newDoc);
    return {
      success: true,
      documentId: docId,
      fileName: 'Uploaded_Prescription.pdf',
      extractions: newDoc.extractions
    };
  },

  getSessions: () => {
    loadPersistedSessions();
    return {
      success: true,
      sessions: localSessions
    };
  },

  getSessionDetail: (sessionId) => {
    loadPersistedSessions();
    const session = localSessions.find(s => s.id === sessionId) || localSessions[0];
    const patient = SEED_PATIENTS.find(p => p.id === session.patient_id) || SEED_PATIENTS[0];
    let summary = localSummaries[session.id];
    if (!summary) {
      if (session.red_flag_detected) {
        summary = {
          chief_complaint: `Acute Chest Discomfort - High Severity Risk (Score: ${session.pain_severity || 8}/10)`,
          hpi_summary: `Patient attended OPD Kiosk. High heart pain severity (${session.pain_severity || 8}/10) recorded. Emergency red-flag safety alert triggered at kiosk intake.`,
          past_history: 'None reported',
          medications_summary: 'None reported',
          allergies_summary: 'No known allergies reported',
          family_history: 'Negative',
          personal_history: 'None reported',
          review_of_systems: 'Recorded at kiosk',
          red_flags_summary: (session.red_flags && session.red_flags.length > 0)
            ? session.red_flags.map(rf => ({
                rule_name: rf.ruleName || rf.rule_name,
                severity: rf.severity || 'CRITICAL',
                warning: rf.message || rf.warning,
                rationale: rf.rationale
              }))
            : [
                { rule_name: `Severe Pain Intensity (${session.pain_severity || 8}/10)`, severity: 'CRITICAL', warning: 'High pain severity reported. Triaged for immediate physician assessment.', rationale: 'Urgent clinical prioritization for acute pain score >= 8.' }
              ],
          physician_notes: 'CRITICAL ALERT: Emergency high severity risk flagged at kiosk.'
        };
      } else {
        summary = {
          chief_complaint: patient?.chief_complaint || (
            session.clinical_system === 'ayush'
              ? 'AYUSH Consultation - Intake Completed'
              : 'General OPD Case Intake'
          ),
          hpi_summary: `Patient ${patient?.full_name || 'Walk-in'} attended OPD Kiosk. Clinical history and case intake recorded. ${patient?.chief_complaint ? `Chief Complaint: ${patient.chief_complaint}.` : ''}`,
          past_history: patient?.past_history || 'None reported',
          medications_summary: patient?.medications_summary || 'No regular modern medications',
          allergies_summary: patient?.allergies_summary || 'No known allergies reported',
          family_history: patient?.family_history || 'Negative',
          personal_history: patient?.personal_history || 'Standard routine',
          review_of_systems: patient?.review_of_systems || 'Recorded at kiosk',
          red_flags_summary: [],
          ayush_assessment: session.clinical_system === 'ayush' ? {
            prakriti: { body_build: 'Vata-Pitta', skin_hair: 'Normal / Cool', temperature_tolerance: 'Samana' },
            agni: 'Sama Agni',
            koshtha: 'Madhyama Koshtha',
            ahara_shakti: 'Madhyama',
            rasa_preference: 'Madhura-Amla',
            vyayama_shakti: 'Madhyama',
            nidra: 'Samyak (Normal)',
            sattva: 'Sattva',
            vihara: 'Active',
            vaya: 'Madhyama (Adult)'
          } : null,
          physician_notes: ''
        };
      }
    }
    const review = localReviews[session.id] || null;
    const documents = localDocuments.filter(d => d.patient_id === patient.id);

    return {
      success: true,
      session,
      patient,
      summary,
      review,
      documents
    };
  },

  submitReview: (reviewData) => {
    loadPersistedSessions();
    const sessionId = reviewData.sessionId;
    const session = localSessions.find(s => s.id === sessionId);
    if (session) session.status = 'reviewed';
    persistSessions();

    const patient = SEED_PATIENTS.find(p => p.id === session?.patient_id) || SEED_PATIENTS[0];

    const fhirBundle = {
      resourceType: 'Bundle',
      id: `bundle-${sessionId}`,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle']
      },
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: patient.id,
            name: [{ text: patient.full_name }],
            gender: patient.gender.toLowerCase()
          }
        },
        {
          resource: {
            resourceType: 'Condition',
            code: { text: reviewData.provisionalDiagnosis || 'Suspected Angina / Acute Coronary Syndrome' },
            verificationStatus: { coding: [{ code: 'confirmed' }] }
          }
        }
      ]
    };

    localReviews[sessionId] = {
      ...reviewData,
      fhir_bundle: fhirBundle,
      reviewed_at: new Date().toISOString()
    };

    return {
      success: true,
      message: 'Case verified & signed',
      fhirBundle
    };
  },

  getFhirBundle: (sessionId) => {
    const session = localSessions.find(s => s.id === sessionId) || localSessions[0];
    const patient = SEED_PATIENTS.find(p => p.id === session.patient_id) || SEED_PATIENTS[0];

    return {
      resourceType: 'Bundle',
      id: `bundle-${sessionId}`,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle']
      },
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: patient.id,
            name: [{ text: patient.full_name }],
            telecom: [{ value: patient.phone }],
            gender: patient.gender.toLowerCase()
          }
        },
        {
          resource: {
            resourceType: 'Encounter',
            status: 'finished',
            class: { display: 'Ambulatory OPD Kiosk' }
          }
        },
        {
          resource: {
            resourceType: 'Condition',
            code: { text: session.clinical_system === 'ayush' ? 'Ajeerna / Dashavidha Rogi Pariksha' : 'Chest Pain / Angina Pectoris' }
          }
        },
        {
          resource: {
            resourceType: 'Observation',
            code: { text: 'Emergency Red-Flag Screening' },
            valueString: session.red_flag_detected ? 'CRITICAL_FLAG_DETECTED' : 'NORMAL'
          }
        }
      ]
    };
  },

  sendOtp: (phone) => {
    const digits = (phone || '').replace(/\D/g, '');
    const clean10 = digits.slice(-10);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const masked = clean10.length === 10 ? `+91 ******${clean10.slice(-4)}` : '******';
    
    if (!_mockOtpStore) window._mockOtpStore = new Map();
    (window._mockOtpStore || _mockOtpStore).set(clean10, {
      code,
      createdAt: Date.now(),
      attempts: 0
    });

    console.log(`[MockEngine] Generated OTP for ${masked}: ${code}`);
    return {
      success: true,
      message: `OTP sent to ${masked} via Offline Kiosk Engine`,
      phone_masked: masked,
      otp: code,
      gateway: 'Offline Kiosk Engine',
      expires_in_seconds: 300
    };
  },

  verifyOtp: (phone, otp) => {
    const digits = (phone || '').replace(/\D/g, '');
    const clean10 = digits.slice(-10);
    const store = window._mockOtpStore || _mockOtpStore;
    const record = store ? store.get(clean10) : null;

    if (!record) {
      return {
        success: false,
        verified: false,
        message: 'No active OTP request found. Please request a new OTP.'
      };
    }

    if (Date.now() - record.createdAt > 300000) {
      store.delete(clean10);
      return {
        success: false,
        verified: false,
        message: 'OTP has expired. Please request a new OTP.'
      };
    }

    if ((otp || '').trim() === record.code) {
      store.delete(clean10);
      return {
        success: true,
        verified: true,
        message: 'Mobile number verified successfully.'
      };
    }

    record.attempts += 1;
    return {
      success: false,
      verified: false,
      message: 'Invalid OTP code. Please check the code and try again.'
    };
  },

  pushToAbdm: (pushData) => ({
    success: true,
    message: 'Record successfully pushed to mock HIS/ABDM',
    transactionId: `ABDM-HIP-TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    hipId: 'IN08100001-DISTRICT-CIVIL-HOSP',
    abhaId: pushData.abhaId || '91-2345-6789-0123',
    timestamp: new Date().toISOString(),
    bundleSummary: {
      resourceType: 'Bundle',
      entriesCount: 4,
      resources: ['Patient', 'Encounter', 'Condition', 'Observation']
    }
  })
};

const _mockOtpStore = new Map();

