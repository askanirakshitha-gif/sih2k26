-- =============================================================================
-- MediKiosk - Database Schema (PostgreSQL)
-- SIH26047: Patient Case-Taking Software (Ministry of Ayush)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PATIENTS
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    abha_id VARCHAR(50) UNIQUE,
    aadhaar_hash VARCHAR(64),
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    blood_group VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CLINICAL CONDITIONS
CREATE TABLE IF NOT EXISTS conditions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    clinical_system VARCHAR(20) NOT NULL CHECK (clinical_system IN ('allopathy', 'ayush')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. HISTORY TEMPLATES
CREATE TABLE IF NOT EXISTS history_templates (
    id VARCHAR(50) PRIMARY KEY,
    condition_id VARCHAR(50) REFERENCES conditions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    clinical_system VARCHAR(20) NOT NULL CHECK (clinical_system IN ('allopathy', 'ayush')),
    version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CLINICAL QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(50) PRIMARY KEY,
    template_id VARCHAR(50) REFERENCES history_templates(id) ON DELETE CASCADE,
    question_text_en TEXT NOT NULL,
    question_text_hi TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL CHECK (question_type IN ('text', 'yes_no', 'number', 'single_choice', 'multiple_choice', 'voice')),
    clinical_field VARCHAR(50) NOT NULL,
    parent_question_id VARCHAR(50) REFERENCES questions(id) ON DELETE SET NULL,
    trigger_operator VARCHAR(20), -- 'equals', 'contains', 'greater_than', 'in'
    trigger_value TEXT,
    sequence INT NOT NULL,
    required BOOLEAN DEFAULT true,
    help_text_en TEXT,
    help_text_hi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. QUESTION OPTIONS (for choice questions)
CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id VARCHAR(50) REFERENCES questions(id) ON DELETE CASCADE,
    option_value VARCHAR(100) NOT NULL,
    option_text_en VARCHAR(200) NOT NULL,
    option_text_hi VARCHAR(200) NOT NULL,
    sequence INT NOT NULL
);

-- 6. RED FLAG RULES (Deterministic safety rules)
CREATE TABLE IF NOT EXISTS red_flags (
    id VARCHAR(50) PRIMARY KEY,
    condition_id VARCHAR(50) REFERENCES conditions(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    clinical_field VARCHAR(50) NOT NULL,
    operator VARCHAR(20) NOT NULL, -- 'equals', 'contains', 'greater_than_or_equal', 'in'
    trigger_value TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'CRITICAL', -- 'CRITICAL', 'HIGH', 'MODERATE'
    warning_message_en TEXT NOT NULL,
    warning_message_hi TEXT NOT NULL,
    clinical_rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. KIOSK SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    language VARCHAR(10) DEFAULT 'en',
    clinical_system VARCHAR(20) NOT NULL CHECK (clinical_system IN ('allopathy', 'ayush')),
    condition_id VARCHAR(50) REFERENCES conditions(id),
    status VARCHAR(30) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'reviewed', 'flagged'
    red_flag_detected BOOLEAN DEFAULT false,
    consent_given BOOLEAN DEFAULT false,
    opd_token_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. HISTORY ANSWERS
CREATE TABLE IF NOT EXISTS history_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(50) REFERENCES questions(id),
    clinical_field VARCHAR(50) NOT NULL,
    raw_answer TEXT NOT NULL,
    structured_value JSONB,
    voice_transcript TEXT,
    is_red_flag BOOLEAN DEFAULT false,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. UPLOADED DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    document_type VARCHAR(50) DEFAULT 'prescription', -- 'prescription', 'lab_report', 'discharge_summary'
    document_date DATE,
    ocr_raw_text TEXT,
    processed_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. DOCUMENT EXTRACTIONS
CREATE TABLE IF NOT EXISTS document_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    document_type VARCHAR(50),
    patient_name VARCHAR(100),
    document_date VARCHAR(50),
    diagnoses JSONB DEFAULT '[]'::jsonb,
    medications JSONB DEFAULT '[]'::jsonb,
    lab_results JSONB DEFAULT '[]'::jsonb,
    procedures JSONB DEFAULT '[]'::jsonb,
    abnormal_findings JSONB DEFAULT '[]'::jsonb,
    verified_by_doctor BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. CLINICAL SUMMARIES
CREATE TABLE IF NOT EXISTS clinical_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    chief_complaint TEXT,
    hpi_summary TEXT,
    past_history TEXT,
    medications_summary TEXT,
    allergies_summary TEXT,
    family_history TEXT,
    personal_history TEXT,
    review_of_systems TEXT,
    ayush_assessment JSONB,
    red_flags_summary JSONB DEFAULT '[]'::jsonb,
    ai_generated_summary TEXT,
    physician_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. DOCTOR REVIEWS & ABDM DISPATCH
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    doctor_id VARCHAR(50) NOT NULL,
    doctor_name VARCHAR(100) NOT NULL,
    verification_status VARCHAR(30) DEFAULT 'verified',
    provisional_diagnosis TEXT,
    prescription_notes TEXT,
    fhir_bundle JSONB,
    pushed_to_abdm BOOLEAN DEFAULT false,
    abdm_transaction_id VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_questions_template_seq ON questions(template_id, sequence);
CREATE INDEX IF NOT EXISTS idx_history_answers_session ON history_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_session ON documents(session_id);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- DEMO PATIENTS
INSERT INTO patients (id, abha_id, full_name, age, gender, phone, blood_group)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '91-2345-6789-0123', 'Ramesh Sharma', 54, 'Male', '+91 9876543210', 'B+'),
    ('22222222-2222-2222-2222-222222222222', '91-8765-4321-9876', 'Sunita Patel', 42, 'Female', '+91 9812345678', 'O+'),
    ('33333333-3333-3333-3333-333333333333', '91-1122-3344-5566', 'Rajesh Kumar', 61, 'Male', '+91 9765432109', 'A+')
ON CONFLICT (id) DO NOTHING;

-- CONDITIONS
INSERT INTO conditions (id, name, clinical_system, description)
VALUES 
    ('chest_pain', 'Acute / Subacute Chest Pain', 'allopathy', 'Evaluation of chest discomfort, coronary artery disease risk, and acute red flags.'),
    ('ayush_general', 'Dashavidha Pariksha & Rogi Assessment', 'ayush', 'Holistic clinical evaluation covering Prakriti, Agni, Koshtha, and Srotas.')
ON CONFLICT (id) DO NOTHING;

-- TEMPLATES
INSERT INTO history_templates (id, condition_id, name, clinical_system, version)
VALUES
    ('chest_pain_v1', 'chest_pain', 'OPD Chest Pain Protocol', 'allopathy', '1.0'),
    ('ayush_dashavidha_v1', 'ayush_general', 'Ayush Dashavidha Pariksha Protocol', 'ayush', '1.0')
ON CONFLICT (id) DO NOTHING;

-- RED FLAGS FOR CHEST PAIN
INSERT INTO red_flags (id, condition_id, rule_name, clinical_field, operator, trigger_value, severity, warning_message_en, warning_message_hi, clinical_rationale)
VALUES
    ('rf_radiation_arm', 'chest_pain', 'Left Arm / Jaw Radiation', 'radiation', 'contains', 'left arm', 'CRITICAL',
     'Potential warning sign detected: Pain radiating to the left arm is a high-risk symptom for acute coronary syndrome. Please alert hospital staff immediately.',
     'संभावित चेतावनी संकेत: बाएं हाथ में जाने वाला दर्द हृदय संबंधी आपातकाल का संकेत हो सकता है। कृपया तुरंत अस्पताल स्टाफ को सूचित करें।',
     'Pain radiation to left arm or jaw carries high likelihood ratio for acute myocardial ischemia.'),
     
    ('rf_radiation_jaw', 'chest_pain', 'Jaw Radiation', 'radiation', 'contains', 'jaw', 'CRITICAL',
     'Potential warning sign detected: Pain radiating to the jaw/neck requires emergency cardiac evaluation.',
     'संभावित चेतावनी संकेत: जबड़े या गर्दन तक जाने वाला दर्द तत्काल जांच की मांग करता है।',
     'Cervical and jaw dermatome radiation in anginal pain.'),
     
    ('rf_severe_pain', 'chest_pain', 'Severe Pain Intensity', 'severity', 'greater_than_or_equal', '8', 'HIGH',
     'High pain intensity (8/10 or greater) reported. Hospital staff should be alerted for immediate triage.',
     'अत्यधिक दर्द (8/10 या अधिक) दर्ज किया गया है। तुरंत डॉक्टर से मिलें।',
     'High severity chest discomfort warrants immediate ECG and troponin screening.'),
     
    ('rf_syncope', 'chest_pain', 'Loss of Consciousness / Fainting', 'syncope', 'equals', 'yes', 'CRITICAL',
     'Potential warning sign detected: Fainting or sudden loss of consciousness indicates hemodynamic instability.',
     'संभावित चेतावनी संकेत: बेहोशी या चक्कर आना गंभीर स्थिति का संकेत हो सकता है।',
     'Cardiogenic syncope indicates arrhythmia or severe left ventricular outflow obstruction.')
ON CONFLICT (id) DO NOTHING;

-- QUESTIONS: CHEST PAIN (ALLOPATHY)
INSERT INTO questions (id, template_id, question_text_en, question_text_hi, question_type, clinical_field, sequence, required, help_text_en, help_text_hi)
VALUES
    ('cp_q1', 'chest_pain_v1', 'What is your primary discomfort today?', 'आज आपको मुख्य रूप से क्या परेशानी है?', 'single_choice', 'chief_complaint', 1, true, 'Select the main reason for your OPD visit', 'अपनी मुख्य समस्या चुनें'),
    ('cp_q2', 'chest_pain_v1', 'Where exactly do you feel the pain or discomfort?', 'दर्द या बेचैनी वास्तव में कहाँ महसूस हो रही है?', 'single_choice', 'site', 2, true, 'Point to the exact area on your chest', 'छाती के सटीक हिस्से का चयन करें'),
    ('cp_q3', 'chest_pain_v1', 'How did the pain start?', 'दर्द की शुरुआत कैसे हुई?', 'single_choice', 'onset', 3, true, 'Sudden onset often indicates vascular or ischemic events', 'दर्द अचानक हुआ या धीरे-धीरे'),
    ('cp_q4', 'chest_pain_v1', 'How long has this pain been present?', 'यह दर्द कितने समय से है?', 'single_choice', 'duration', 4, true, 'Approximate duration of the current episode', 'दर्द की अवधि बताएं'),
    ('cp_q5', 'chest_pain_v1', 'How would you describe the feeling of the pain?', 'दर्द किस प्रकार का महसूस होता है?', 'single_choice', 'character', 5, true, 'Characteristics of the pain sensation', 'दर्द का प्रकार चुनें'),
    ('cp_q6', 'chest_pain_v1', 'On a scale of 1 to 10, how severe is your pain right now?', '1 से 10 के पैमाने पर, अभी दर्द कितना तेज है?', 'number', 'severity', 6, true, '1 is mild, 10 is unbearable pain', '1 का अर्थ हल्का, 10 का अर्थ असहनीय दर्द'),
    ('cp_q7', 'chest_pain_v1', 'Does the pain spread (radiate) to any other part of your body?', 'क्या दर्द शरीर के किसी अन्य हिस्से में फैलता है?', 'single_choice', 'radiation', 7, true, 'Radiation to left arm or jaw is clinically significant', 'क्या दर्द हाथ, गर्दन या पीठ में जाता है?'),
    ('cp_q8', 'chest_pain_v1', 'What makes the pain worse?', 'किस कारण से दर्द बढ़ जाता है?', 'single_choice', 'aggravating_factors', 8, true, 'Exertional worsening suggests angina', 'दर्द किस गतिविधि से बढ़ता है'),
    ('cp_q9', 'chest_pain_v1', 'What makes the pain feel better or relieve it?', 'किस चीज़ से दर्द में आराम मिलता है?', 'single_choice', 'relieving_factors', 9, true, 'Rest or medications that relieve the discomfort', 'दर्द में आराम कैसे मिलता है'),
    ('cp_q10', 'chest_pain_v1', 'Are you experiencing any shortness of breath or difficulty breathing?', 'क्या आपको सांस लेने में तकलीफ या सांस फूलने की समस्या हो रही है?', 'yes_no', 'breathlessness', 10, true, 'Associated dyspnea evaluation', 'सांस फूलने की स्थिति बताएं'),
    ('cp_q11', 'chest_pain_v1', 'Are you sweating unusually or feeling cold sweats (diaphoresis)?', 'क्या आपको असामान्य पसीना या ठंडा पसीना आ रहा है?', 'yes_no', 'sweating', 11, true, 'Autonomic response symptom', 'अत्यधिक पसीने की स्थिति'),
    ('cp_q12', 'chest_pain_v1', 'Do you feel nauseous or have you vomited?', 'क्या आपको उल्टी जैसा लग रहा है या उल्टी हुई है?', 'yes_no', 'nausea_vomiting', 12, true, 'Associated gastrointestinal symptoms', 'उल्टी या मितली की स्थिति'),
    ('cp_q13', 'chest_pain_v1', 'Do you feel your heart racing, fluttering, or pounding (palpitations)?', 'क्या आपको दिल की धड़कन तेज या घबराहट महसूस हो रही है?', 'yes_no', 'palpitations', 13, true, 'Cardiac rhythm symptoms', 'धड़कन की असामान्य गति'),
    ('cp_q14', 'chest_pain_v1', 'Have you felt lightheaded, dizzy, or experienced fainting / blackout?', 'क्या आपको चक्कर आए या आप कभी बेहोश हुए?', 'yes_no', 'syncope', 14, true, 'Syncope or presyncope screening', 'चक्कर या बेहोशी की स्थिति'),
    ('cp_q15', 'chest_pain_v1', 'Have you had similar chest pain episodes in the past?', 'क्या आपको पहले भी कभी ऐसा दर्द हुआ है?', 'yes_no', 'previous_episodes', 15, true, 'Recurrence of symptoms', 'पुराने दौरों का विवरण'),
    ('cp_q16', 'chest_pain_v1', 'Do you have any known medical conditions?', 'क्या आपको पहले से कोई पुरानी बीमारी है?', 'multiple_choice', 'past_medical_history', 16, true, 'Underlying cardiovascular co-morbidities', 'मौजूदा बीमारियां चुनें'),
    ('cp_q17', 'chest_pain_v1', 'Are you currently taking any regular medications?', 'क्या आप वर्तमान में कोई नियमित दवा ले रहे हैं?', 'single_choice', 'current_medications', 17, true, 'Current pharmacotherapy', 'वर्तमान दवाओं का विवरण'),
    ('cp_q18', 'chest_pain_v1', 'Do you have known allergies to any medicines or food?', 'क्या आपको किसी दवा या भोजन से एलर्जी है?', 'single_choice', 'allergies', 18, true, 'Patient allergy safety screening', 'एलर्जी की जानकारी'),
    ('cp_q19', 'chest_pain_v1', 'Does anyone in your direct family have a history of heart disease or sudden cardiac events?', 'क्या आपके परिवार में किसी को दिल की बीमारी का इतिहास रहा है?', 'yes_no', 'family_history', 19, true, 'Genetic predisposition check', 'पारिवारिक हृदय रोग का इतिहास'),
    ('cp_q20', 'chest_pain_v1', 'Do you use tobacco (smoking/chewing) or consume alcohol?', 'क्या आप तंबाकू (धूम्रपान/गुटखा) या शराब का सेवन करते हैं?', 'single_choice', 'habits', 20, true, 'Cardiovascular risk factor history', 'नशे या आदतों का विवरण')
ON CONFLICT (id) DO NOTHING;

-- QUESTION OPTIONS: CHEST PAIN
INSERT INTO question_options (question_id, option_value, option_text_en, option_text_hi, sequence) VALUES
-- cp_q1
('cp_q1', 'chest_pain_pressure', 'Chest pain or heavy pressure', 'छाती में दर्द या भारी दबाव', 1),
('cp_q1', 'chest_burning', 'Burning sensation in chest', 'छाती में जलन', 2),
('cp_q1', 'chest_tightness_breathless', 'Chest tightness with breathlessness', 'छाती में जकड़न और सांस फूलना', 3),
('cp_q1', 'other_discomfort', 'Other discomfort', 'अन्य परेशानी', 4),

-- cp_q2
('cp_q2', 'center_retrosternal', 'Center of chest (behind breastbone)', 'छाती के बीचों-बीच (हड्डी के पीछे)', 1),
('cp_q2', 'left_side', 'Left side of chest', 'छाती के बाईं ओर', 2),
('cp_q2', 'right_side', 'Right side of chest', 'छाती के दाईं ओर', 3),
('cp_q2', 'upper_abdomen', 'Upper abdomen / epigastric', 'पेट के ऊपरी हिस्से में', 4),

-- cp_q3
('cp_q3', 'sudden', 'Suddenly (within minutes)', 'अचानक (कुछ ही मिनटों में)', 1),
('cp_q3', 'gradual', 'Gradually (built up over hours/days)', 'धीरे-धीरे (घंटों या दिनों में बढ़ा)', 2),

-- cp_q4
('cp_q4', 'under_30_mins', 'Less than 30 minutes', '30 मिनट से कम', 1),
('cp_q4', '30_to_120_mins', '30 minutes to 2 hours', '30 मिनट से 2 घंटे', 2),
('cp_q4', 'several_hours', 'Several hours', 'कई घंटों से', 3),
('cp_q4', 'more_than_a_day', 'More than 24 hours', 'एक दिन से अधिक', 4),

-- cp_q5
('cp_q5', 'crushing_heavy', 'Crushing pressure, weight, or squeezing', 'भारी दबाव, निचोड़ने या कुचलने जैसा', 1),
('cp_q5', 'sharp_stabbing', 'Sharp, stabbing or needle-like', 'तेज, चुभने या सुई जैसा दर्द', 2),
('cp_q5', 'burning_acidity', 'Burning or acid reflux sensation', 'जलन या एसिडिटी जैसा दर्द', 3),
('cp_q5', 'dull_ache', 'Dull continuous ache', 'हल्का लगातार मीठा दर्द', 4),

-- cp_q7 (RADIATION - Triggers red flags)
('cp_q7', 'left_arm', 'Radiates to Left Arm and Shoulder', 'बाएं हाथ और कंधे में फैलता है', 1),
('cp_q7', 'jaw_neck', 'Radiates to Jaw, Teeth or Neck', 'जबड़े, दांत या गर्दन में फैलता है', 2),
('cp_q7', 'back', 'Radiates to Upper Back', 'पीठ के ऊपरी हिस्से में फैलता है', 3),
('cp_q7', 'both_arms', 'Radiates to Both Arms', 'दोनों हाथों में फैलता है', 4),
('cp_q7', 'none', 'No, stays in one spot only', 'नहीं, केवल एक ही जगह रहता है', 5),

-- cp_q8
('cp_q8', 'walking_exertion', 'Walking, stairs or physical exertion', 'चलने, सीढ़ियां चढ़ने या मेहनत करने से', 1),
('cp_q8', 'deep_breathing', 'Deep breathing or coughing', 'गहरी सांस लेने या खांसने से', 2),
('cp_q8', 'emotional_stress', 'Mental tension or emotional stress', 'तनाव या मानसिक चिंता से', 3),
('cp_q8', 'lying_flat', 'Lying down flat', 'सीधे लेटने से', 4),
('cp_q8', 'none', 'Nothing in particular', 'किसी खास गतिविधि से नहीं', 5),

-- cp_q9
('cp_q9', 'complete_rest', 'Complete rest / sitting down', 'पूरी तरह आराम करने या बैठने से', 1),
('cp_q9', 'sorbitrate_nitrates', 'Medicine under the tongue (Nitrate/Sorbitrate)', 'जीभ के नीचे गोली (नाइट्रेट) रखने से', 2),
('cp_q9', 'leaning_forward', 'Sitting up and leaning forward', 'आगे की ओर झुक कर बैठने से', 3),
('cp_q9', 'antacids', 'Antacid syrup or digestion medication', 'गैस की दवा या एंटासिड से', 4),
('cp_q9', 'none', 'Nothing provides relief', 'किसी चीज़ से आराम नहीं मिलता', 5),

-- cp_q16 (Multiple choice)
('cp_q16', 'hypertension', 'High Blood Pressure (Hypertension)', 'हाई ब्लड प्रेशर', 1),
('cp_q16', 'diabetes', 'Diabetes / High Blood Sugar', 'मधुमेह / शुगर की बीमारी', 2),
('cp_q16', 'heart_disease', 'Previous Heart Attack / Stent / Bypass', 'पुराना हार्ट अटैक / स्टेंट / बाईपास', 3),
('cp_q16', 'high_cholesterol', 'High Cholesterol (Dyslipidemia)', 'हाई कोलेस्ट्रॉल', 4),
('cp_q16', 'none', 'No known health conditions', 'कोई ज्ञात बीमारी नहीं', 5),

-- cp_q17
('cp_q17', 'bp_heart_meds', 'Taking BP / Blood Thinner (Aspirin/Atorvastatin)', 'बीपी या खून पतला करने की दवा ले रहे हैं', 1),
('cp_q17', 'diabetes_meds', 'Taking Diabetes pills / Insulin', 'शुगर की दवा या इंसुलिन ले रहे हैं', 2),
('cp_q17', 'gastric_meds', 'Taking Gas / Acidity medication', 'गैस / एंटासिड की दवा ले रहे हैं', 3),
('cp_q17', 'none', 'Not taking any regular medications', 'कोई नियमित दवा नहीं ले रहे', 4),

-- cp_q18
('cp_q18', 'penicillin_antibiotics', 'Allergy to Penicillin / Antibiotics', 'एंटीबायोटिक / पेनिसिलिन से एलर्जी', 1),
('cp_q18', 'painkillers_nsaids', 'Allergy to Painkillers (Aspirin / Brufen)', 'दर्द निवारक दवाओं से एलर्जी', 2),
('cp_q18', 'no_known_allergies', 'No known drug allergies', 'किसी दवा से कोई एलर्जी नहीं है', 3),

-- cp_q20
('cp_q20', 'smoker_daily', 'Yes, daily smoker (Beedi / Cigarette)', 'हाँ, रोजाना बीड़ी / सिगरेट पीते हैं', 1),
('cp_q20', 'tobacco_chewer', 'Yes, chew tobacco / Gutkha / Khaini', 'हाँ, तंबाकू / गुटखा / खैनी खाते हैं', 2),
('cp_q20', 'alcohol_regular', 'Yes, consume alcohol regularly', 'हाँ, शराब का नियमित सेवन करते हैं', 3),
('cp_q20', 'none', 'No tobacco or alcohol use', 'तंबाकू या शराब का सेवन नहीं करते', 4);

-- QUESTIONS: AYUSH (DASHAVIDHA PARIKSHA & AGNI/KOSHTHA)
INSERT INTO questions (id, template_id, question_text_en, question_text_hi, question_type, clinical_field, sequence, required, help_text_en, help_text_hi)
VALUES
    ('ay_q1', 'ayush_dashavidha_v1', 'What is your primary physical complaint or discomfort today?', 'आज आपकी मुख्य शारीरिक समस्या या लक्षण क्या है?', 'single_choice', 'ayush_chief_complaint', 1, true, 'AYUSH consultation primary concern', 'आयुष परामर्श का मुख्य कारण'),
    ('ay_q2', 'ayush_dashavidha_v1', 'Prakriti (Body Frame): How would you describe your natural physical body build?', 'प्रकृति (शरीर गठन): आपकी प्राकृतिक शारीरिक बनावट कैसी है?', 'single_choice', 'prakriti_body_build', 2, true, 'Sharirika Prakriti assessment', 'शारीरिक प्रकृति निर्धारण'),
    ('ay_q3', 'ayush_dashavidha_v1', 'Prakriti (Skin & Hair): What is the natural texture of your skin and hair?', 'प्रकृति (त्वचा एवं केश): आपकी त्वचा और बालों का प्राकृतिक स्वभाव कैसा है?', 'single_choice', 'prakriti_skin_hair', 3, true, 'Doshic attributes in dermatological features', 'दोष अनुसार त्वचा का लक्षण'),
    ('ay_q4', 'ayush_dashavidha_v1', 'Prakriti (Temperature Sensitivity): Which weather or climate do you find uncomfortable?', 'तापमान सहनशीलता: आपको कौन सा मौसम या तापमान सबसे अधिक असहज लगता है?', 'single_choice', 'prakriti_temperature', 4, true, 'Sheeta/Ushna tolerance assessment', 'शीत या उष्ण सहिष्णुता'),
    ('ay_q5', 'ayush_dashavidha_v1', 'Agni Pariksha: How is your appetite and digestion of meals?', 'अग्नि परीक्षा: आपकी भूख और भोजन के पाचन की स्थिति कैसी रहती है?', 'single_choice', 'agni_digestive_fire', 5, true, 'Jatharagni assessment (Vishama, Tikshna, Manda, Sama)', 'जाठराग्नि की स्थिति (विषम, तीक्ष्ण, मन्द, सम)'),
    ('ay_q6', 'ayush_dashavidha_v1', 'Koshtha Pariksha: What is your usual bowel habit and elimination pattern?', 'कोष्ठ परीक्षा: आपका मल त्याग और पेट साफ होने का स्वभाव कैसा है?', 'single_choice', 'koshtha_bowel_pattern', 6, true, 'Koshtha assessment (Krura, Mridu, Madhyama)', 'कोष्ठ का स्वभाव (क्रूर, मृदु, मध्यम)'),
    ('ay_q7', 'ayush_dashavidha_v1', 'Ahara Shakti: How is your eating capacity and meal satisfaction?', 'आहार शक्ति: आपके भोजन करने की मात्रा और तृप्ति की क्षमता कैसी है?', 'single_choice', 'ahara_shakti_capacity', 7, true, 'Capacity for food consumption and assimilation', 'आहार ग्रहण एवं पाचन क्षमता'),
    ('ay_q8', 'ayush_dashavidha_v1', 'Rasa Satmya: Which taste or food types do you naturally crave or prefer?', 'रस सात्म्य: आपको किस रस या स्वाद का भोजन सबसे अधिक प्रिय है?', 'single_choice', 'ahara_rasa_preference', 8, true, 'Dietary preference according to Shad-rasa', 'षड्रस अनुसार भोजन पसंद'),
    ('ay_q9', 'ayush_dashavidha_v1', 'Vyayama Shakti: How is your physical stamina and tolerance to exertion?', 'व्यायाम शक्ति: आपकी शारीरिक सहनशक्ति और परिश्रम करने की क्षमता कैसी है?', 'single_choice', 'vyayama_shakti_stamina', 9, true, 'Physical capacity and endurance level', 'शारीरिक परिश्रम एवं बल की स्थिति'),
    ('ay_q10', 'ayush_dashavidha_v1', 'Nidra Pariksha: How is the depth and quality of your sleep?', 'निद्रा परीक्षा: आपकी नींद की गहराई और गुणवत्ता कैसी है?', 'single_choice', 'nidra_sleep_quality', 10, true, 'Sleep duration, quality and dreams', 'नींद का समय और गुणवत्ता'),
    ('ay_q11', 'ayush_dashavidha_v1', 'Sattva / Manasa: How would you describe your mental temperament and reaction to stress?', 'सत्त्व परीक्षा: आपकी मानसिक प्रकृति और तनाव के प्रति प्रतिक्रिया कैसी है?', 'single_choice', 'sattva_mental_temperament', 11, true, 'Mental constitution (Vataja/Pittaja/Kaphaja Sattva)', 'मानसिक स्वभाव और धैर्य'),
    ('ay_q12', 'ayush_dashavidha_v1', 'Vihara (Daily Lifestyle): How would you characterize your daily routine and activity?', 'विहार (दिनचर्या): आपकी दैनिक दिनचर्या और काम का स्वरूप कैसा है?', 'single_choice', 'vihara_lifestyle', 12, true, 'Daily regimen and sedentary vs active lifestyle', 'दिनचर्या और शारीरिक सक्रियता'),
    ('ay_q13', 'ayush_dashavidha_v1', 'Vaya: Which age category represents your life stage?', 'वय (आयु वर्ग): आप किस आयु वर्ग में आते हैं?', 'single_choice', 'vaya_age_stage', 13, true, 'Ayurvedic life stage (Balya, Madhyama, Vriddha)', 'आयु का काल (बाल्य, मध्यम, वृद्ध)')
ON CONFLICT (id) DO NOTHING;

-- QUESTION OPTIONS: AYUSH
INSERT INTO question_options (question_id, option_value, option_text_en, option_text_hi, sequence) VALUES
-- ay_q1
('ay_q1', 'digestive_issues', 'Indigestion, gas, bloating, acidity (Ajeerna / Amlapitta)', 'पाचन संबंधी परेशानी, गैस, अफरा, खट्टी डकारें', 1),
('ay_q1', 'joint_muscular_pain', 'Joint pain, stiffness, body ache (Sandhivata / Amavata)', 'जोड़ों में दर्द, जकड़न, शरीर में दर्द (संधिवात)', 2),
('ay_q1', 'respiratory_allergies', 'Cough, sinus, breathing congestion (Kasa / Shwasa)', 'खांसी, सर्दी, जुकाम, कफ या सांस की तकलीफ', 3),
('ay_q1', 'stress_fatigue_insomnia', 'Mental fatigue, sleep trouble, low energy (Klama / Anidra)', 'थकान, अनिद्रा, तनाव, कमजोरी या अनिद्रा', 4),

-- ay_q2 (Prakriti Body Build)
('ay_q2', 'vata_lean', 'Thin, slender, bones prominent, difficult to gain weight (Vata)', 'दुबला-पतला, हड्डियां उभरी हुईं, वजन कठिनाई से बढ़ता है (वात)', 1),
('ay_q2', 'pitta_medium', 'Medium build, muscular, athletic, moderate weight (Pitta)', 'मध्यम गठन, सुगठित मांसपेशियां, संतुलित वजन (पित्त)', 2),
('ay_q2', 'kapha_broad', 'Broad frame, heavy bones, solid build, gains weight easily (Kapha)', 'चौड़ा शरीर, भारी हड्डियां, वजन आसानी से बढ़ जाता है (कफ)', 3),

-- ay_q3 (Skin & Hair)
('ay_q3', 'vata_skin', 'Dry, rough, cool skin; brittle or frizzy hair (Vata)', 'रूखी, खुरदरी, ठंडी त्वचा; रूखे या दोमुंहे बाल (वात)', 1),
('ay_q3', 'pitta_skin', 'Warm, flushed, sensitive skin, moles/freckles; oily/thin hair (Pitta)', 'गर्म, लालिमा युक्त, संवेदनशील त्वचा; पतले या जल्दी सफेद होने वाले बाल (पित्त)', 2),
('ay_q3', 'kapha_skin', 'Smooth, oily, thick, soft skin; thick, wavy, lustrous dark hair (Kapha)', 'मुलायम, चिकनी, मोटी, चमकदार त्वचा; घने, काले एवं मजबूत बाल (कफ)', 3),

-- ay_q4 (Temperature)
('ay_q4', 'intolerant_cold', 'Sensitive to cold weather and cold drafts (Cold averse / Vata-Kapha)', 'ठंड या ठंडी हवा बिल्कुल सहन नहीं होती (शीत असहिष्णु)', 1),
('ay_q4', 'intolerant_heat', 'Sensitive to hot weather and spicy food; prefers cold drinks (Pitta)', 'गर्मी या धूप बिल्कुल सहन नहीं होती, ठंडा मौसम पसंद है (उष्ण असहिष्णु)', 2),
('ay_q4', 'adaptable', 'Tolerates both seasons moderately well (Sama)', 'दोनों मौसम सामान्य रूप से सहन कर लेते हैं (सम स्वभाव)', 3),

-- ay_q5 (Agni)
('ay_q5', 'vishama_irregular', 'Irregular appetite: sometimes ravenous, sometimes skips meals; gas/bloating (Vishama Agni / Vata)', 'अनियमित भूख: कभी बहुत तेज, कभी बिल्कुल नहीं; पेट में गैस (विषम अग्नि)', 1),
('ay_q5', 'tikshna_excessive', 'Sharp/intense appetite: gets irritable if meals are delayed; acidity/heartburn (Tikshna Agni / Pitta)', 'तीव्र भूख: भोजन में देरी होने पर चिड़चिड़ापन, खट्टी डकारें (तीक्ष्ण अग्नि)', 2),
('ay_q5', 'manda_sluggish', 'Low/sluggish appetite: feels heavy for hours after eating (Manda Agni / Kapha)', 'धीमी भूख: थोड़ा खाने पर भी घंटों भारीपन महसूस होना (मन्द अग्नि)', 3),
('ay_q5', 'sama_balanced', 'Regular, comfortable digestion with timely hunger (Sama Agni)', 'समय पर स्वाभाविक भूख और बिना किसी परेशानी के अच्छा पाचन (सम अग्नि)', 4),

-- ay_q6 (Koshtha)
('ay_q6', 'krura_hard', 'Hard, dry stools; prone to constipation and straining (Krura Koshtha / Vata)', 'कड़ा, सूखा मल; कब्ज की शिकायत रहती है (क्रूर कोष्ठ)', 1),
('ay_q6', 'mridu_soft', 'Soft or loose stools, multiple times daily; milk or laxatives act immediately (Mridu Koshtha / Pitta)', 'ढीला या नरम मल, दिन में कई बार; दूध या फल खाते ही पेट साफ होना (मृदु कोष्ठ)', 2),
('ay_q6', 'madhyama_normal', 'Regular once or twice daily well-formed elimination (Madhyama Koshtha / Kapha-Sama)', 'नियमित दिन में एक या दो बार सामान्य मल त्याग (मध्यम कोष्ठ)', 3),

-- ay_q7 (Ahara Shakti)
('ay_q7', 'alpa_ahara', 'Low capacity: eats small portions, gets full very fast', 'अल्प आहार: बहुत कम मात्रा में भोजन कर पाते हैं', 1),
('ay_q7', 'madhyama_ahara', 'Moderate capacity: standard two or three balanced meals daily', 'मध्यम आहार: संतुलित और सामान्य मात्रा में भोजन', 2),
('ay_q7', 'uttama_ahara', 'High capacity: can digest large meals comfortably', 'उत्तम आहार: अच्छी मात्रा में भोजन आसानी से पचा लेते हैं', 3),

-- ay_q8 (Ahara Rasa)
('ay_q8', 'sweet_ghee', 'Sweet, heavy, dairy, rice, ghee items (Madhura priya)', 'मीठा, घी, दूध, चावल व चिकनाई युक्त भोजन पसंद है', 1),
('ay_q8', 'spicy_tangy', 'Spicy, pungent, sour, tangy, fried foods (Katu-Amla priya)', 'तीखा, चटपटा, मसालेदार, खट्टा भोजन पसंद है', 2),
('ay_q8', 'salty_crunchy', 'Salty, crisp snacks, warm light foods (Lavana priya)', 'नमकीन, हल्का, कुरकुरा या गर्म भोजन पसंद है', 3),

-- ay_q9 (Vyayama Shakti)
('ay_q9', 'low_stamina', 'Low endurance: gets breathless or fatigued after short walk or light work', 'कम सहनशक्ति: थोड़ा चलने या काम करने पर जल्दी थकान', 1),
('ay_q9', 'moderate_stamina', 'Moderate endurance: manages daily chores and moderate walking comfortably', 'मध्यम सहनशक्ति: दैनिक कार्य और सामान्य चलना आराम से कर लेते हैं', 2),
('ay_q9', 'high_stamina', 'High endurance: can perform intense physical labor or workouts without exhaustion', 'उत्तम सहनशक्ति: भारी शारीरिक श्रम या व्यायाम बिना थके कर सकते हैं', 3),

-- ay_q10 (Nidra)
('ay_q10', 'light_disturbed', 'Light, fragmented sleep; awakens at small noises, difficulty falling asleep (Vata)', 'हल्की, टूटने वाली नींद; जरा सी आवाज से नींद खुल जाना (वातज निद्रा)', 1),
('ay_q10', 'moderate_sound', 'Moderate sound sleep for 6-7 hours, feels rested (Pitta)', 'मध्यम गहरी नींद 6-7 घंटे, सुबह उठने पर ताजगी (पित्तज निद्रा)', 2),
('ay_q10', 'deep_heavy', 'Heavy, prolonged deep sleep; hard to wake up early in the morning (Kapha)', 'गहरी, भारी नींद; सुबह उठने में आलस्य और भारीपन (कफज निद्रा)', 3),

-- ay_q11 (Sattva)
('ay_q11', 'vata_anxious', 'Active, creative, but worries quickly, anxious, overthinks (Rajas/Vata)', 'चंचल मन, रचनात्मक लेकिन जल्दी चिंता व घबराहट होना', 1),
('ay_q11', 'pitta_driven', 'Sharp intellect, ambitious, courageous, but quick to anger/frustration (Pitta)', 'तीव्र बुद्धि, दृढ़ निश्चयी, लेकिन जल्दी गुस्सा या असहनशीलता', 2),
('ay_q11', 'kapha_calm', 'Calm, patient, forgiving, slow to react, emotionally steady (Sattva/Kapha)', 'शांत, धैर्यवान, सहनशील, आसानी से विचलित न होने वाला स्वभाव', 3),

-- ay_q12 (Vihara)
('ay_q12', 'sedentary', 'Sedentary desk job with minimal movement', 'दिनभर बैठकर काम करने की दिनचर्या, शारीरिक गति कम', 1),
('ay_q12', 'active_labor', 'Physically active, frequent standing or walking', 'सक्रिय दिनचर्या, घूमना-फिरना या शारीरिक मेहनत', 2),
('ay_q12', 'irregular_shifts', 'Irregular hours, night shifts, erratic sleep and meal times', 'अनियमित काम के घंटे, रात्रि जागरण, भोजन का कोई निश्चित समय नहीं', 3),

-- ay_q13 (Vaya)
('ay_q13', 'balya_youth', 'Youth / Young Adult (Under 25 years)', 'युवा अवस्था (25 वर्ष से कम)', 1),
('ay_q13', 'madhyama_adult', 'Adult / Middle age (25 to 60 years)', 'मध्यम आयु (25 से 60 वर्ष)', 2),
('ay_q13', 'vriddha_senior', 'Elderly / Senior (Above 60 years)', 'वृद्धावस्था (60 वर्ष से अधिक)', 3);
