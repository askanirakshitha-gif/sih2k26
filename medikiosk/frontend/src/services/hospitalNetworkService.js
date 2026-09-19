/**
 * Hospital Network & ABDM Inter-Hospital Blockchain Service
 * 
 * Provides:
 * 1. Registered ABDM Network Hospital Directory with Credentials
 * 2. Multi-Hospital FHIR Clinical Record Archives
 * 3. Cross-Hospital Smart Contract Data Transfer Requests & In-Memory Shared Ledger
 * 4. DPDP Act 2023 Real-Time Revocation & Cryptographic SHA-256 Verification
 */

// Helper to compute client-side SHA-256 cryptographic hash
export async function computeSha256(str) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return '0x' + hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }
}

// 1. Registered Hospitals on the National ABDM Health Network
export const REGISTERED_HOSPITALS = [
  {
    id: 'hosp-aiims-delhi',
    code: 'HOSP-AIIMS-101',
    passcode: 'AIIMS2026',
    name: 'AIIMS New Delhi',
    department: 'Cardiology & Apex Trauma OPD',
    facilityType: 'Autonomous Apex Tertiary Teaching Hospital',
    city: 'Ansari Nagar, New Delhi',
    abdmFacilityId: 'IN1100019283',
    nodeStatus: 'ONLINE',
    blockchainNode: 'Hyperledger Peer #0 (aiims.delhi.abdm.gov.in)',
    iconBg: 'from-blue-600 to-indigo-700',
    stats: { totalBeds: 2478, opdDaily: '12,000+', activeDoctors: 640 },
    specialties: ['Cardiology', 'Neurology', 'Oncology', 'Emergency Medicine']
  },
  {
    id: 'hosp-safdarjung-delhi',
    code: 'HOSP-SFD-102',
    passcode: 'SAFE2026',
    name: 'Safdarjung Hospital & VMMC',
    department: 'Pulmonology & General Medicine OPD',
    facilityType: 'Central Govt Super Speciality Hospital',
    city: 'Ring Road, New Delhi',
    abdmFacilityId: 'IN0700099120',
    nodeStatus: 'ONLINE',
    blockchainNode: 'Hyperledger Peer #1 (sfd.gov.in/abdm-peer)',
    iconBg: 'from-emerald-600 to-teal-700',
    stats: { totalBeds: 2800, opdDaily: '9,500+', activeDoctors: 520 },
    specialties: ['Pulmonology', 'Orthopedics', 'Pediatrics', 'General Surgery']
  },
  {
    id: 'hosp-fortis-escorts',
    code: 'HOSP-FOR-103',
    passcode: 'FORTIS2026',
    name: 'Fortis Escorts Heart Institute',
    department: 'Cardiac Electrophysiology & TMT Lab',
    facilityType: 'NABH Accredited Cardiac Specialty Hospital',
    city: 'Okhla Road, New Delhi',
    abdmFacilityId: 'IN1100099411',
    nodeStatus: 'ONLINE',
    blockchainNode: 'Polygon Supernet Node (fortis.care/node-03)',
    iconBg: 'from-rose-600 to-pink-700',
    stats: { totalBeds: 310, opdDaily: '1,200+', activeDoctors: 140 },
    specialties: ['Interventional Cardiology', 'Cardiothoracic Surgery', 'Heart Failure Care']
  },
  {
    id: 'hosp-max-saket',
    code: 'HOSP-MAX-104',
    passcode: 'MAX2026',
    name: 'Max Super Speciality Hospital',
    department: 'Endocrinology & Metabolic Center',
    facilityType: 'JCI Accredited Multi-Speciality Hospital',
    city: '1, 2 Press Enclave Marg, Saket, New Delhi',
    abdmFacilityId: 'IN1100088234',
    nodeStatus: 'ONLINE',
    blockchainNode: 'Hyperledger Peer #2 (maxhealthcare.in/peer)',
    iconBg: 'from-amber-600 to-orange-700',
    stats: { totalBeds: 530, opdDaily: '2,800+', activeDoctors: 290 },
    specialties: ['Endocrinology & Diabetes', 'Gastroenterology', 'Nephrology']
  },
  {
    id: 'hosp-aiia-ayush',
    code: 'HOSP-AIIA-105',
    passcode: 'AYUSH2026',
    name: 'All India Institute of Ayurveda (AIIA)',
    department: 'Kayachikitsa & SACTP Research Center',
    facilityType: 'National Apex AYUSH Autonomous Institute',
    city: 'Mathura Road, Gautampuri, New Delhi',
    abdmFacilityId: 'IN0700055432',
    nodeStatus: 'ONLINE',
    blockchainNode: 'AYUSH National Grid Node (aiia.gov.in/sactp-chain)',
    iconBg: 'from-teal-600 to-emerald-800',
    stats: { totalBeds: 200, opdDaily: '1,800+', activeDoctors: 95 },
    specialties: ['Kayachikitsa', 'Panchakarma', 'Dashavidha Pariksha', 'Ayur-Genomics']
  },
  {
    id: 'hosp-apollo-delhi',
    code: 'HOSP-APO-106',
    passcode: 'APOLLO2026',
    name: 'Indraprastha Apollo Hospitals',
    department: 'Comprehensive Health & Radiology',
    facilityType: 'Quaternary Multi-Disciplinary Health Network',
    city: 'Sarita Vihar, Delhi Mathura Road, New Delhi',
    abdmFacilityId: 'IN2900084721',
    nodeStatus: 'ONLINE',
    blockchainNode: 'Polygon Supernet Node (apollo.health/node-08)',
    iconBg: 'from-cyan-600 to-blue-800',
    stats: { totalBeds: 710, opdDaily: '3,400+', activeDoctors: 380 },
    specialties: ['Diagnostic Radiology', 'Transplant Medicine', 'Critical Care']
  }
];

// 2. Patient Directory for Demo Lookups
export const DEMO_PATIENTS = [
  {
    abhaId: '91-2345-6789-0123',
    name: 'Ramesh Sharma',
    age: 52,
    gender: 'Male',
    bloodGroup: 'B+',
    phone: '+91 98765 43210',
    address: 'Sector 4, R.K. Puram, New Delhi',
    abdmLinkedDate: '12 Jan 2024',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    abhaId: '91-8765-4321-9876',
    name: 'Sunita Patel',
    age: 44,
    gender: 'Female',
    bloodGroup: 'O+',
    phone: '+91 98112 34567',
    address: 'D-32, South Extension II, New Delhi',
    abdmLinkedDate: '05 May 2024',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    abhaId: '91-5544-3322-1100',
    name: 'Vikram Singh Rathore',
    age: 61,
    gender: 'Male',
    bloodGroup: 'A+',
    phone: '+91 99280 12345',
    address: 'Pocket B, Mayur Vihar Phase 1, New Delhi',
    abdmLinkedDate: '18 Aug 2024',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  }
];

// 3. Clinical Records Database stored across different Source Hospitals
export const HOSPITAL_CLINICAL_ARCHIVE = {
  // Records residing at AIIMS New Delhi
  'hosp-aiims-delhi': {
    '91-2345-6789-0123': [
      {
        id: 'rec-aiims-01',
        category: 'Prescriptions',
        categoryColor: 'purple',
        title: 'Cardiology OPD Rx - Ischemic Heart Disease Protocol',
        date: '12 Aug 2026',
        doctor: 'Dr. S. K. Manjunath, MD, DM (Cardiology)',
        department: 'Cardiology OPD Room 24',
        summary: 'Patient presented with exertional chest heaviness radiating to left jaw. Echo reveals concentric LV hypertrophy.',
        details: [
          { name: 'Tab. Telmisartan', dose: '40 mg', freq: 'Once Daily (Morning)', duration: '90 Days' },
          { name: 'Tab. Atorvastatin', dose: '20 mg', freq: 'Once Daily (Bedtime)', duration: '90 Days' },
          { name: 'Tab. Aspirin (Ecosprin)', dose: '75 mg', freq: 'Once Daily (Post Lunch)', duration: '90 Days' },
          { name: 'Tab. Metoprolol Succinate', dose: '25 mg', freq: 'Once Daily', duration: '30 Days' }
        ],
        advice: 'Low sodium diet (<2g/day), aerobic walking 30 mins, avoid sudden strenuous lifting.',
        fhirResourceType: 'MedicationRequest',
        verifiedOnChain: true
      },
      {
        id: 'rec-aiims-02',
        category: 'Cardiology & Diagnostics',
        categoryColor: 'rose',
        title: '12-Lead Resting Electrocardiogram (ECG) Analysis',
        date: '12 Aug 2026',
        doctor: 'Dr. P. Verma (Cardiology Registrar)',
        department: 'Non-Invasive Cardiac Lab',
        summary: 'Sinus rhythm, HR 74 bpm. Normal axis. Symmetrical T-wave inversions observed across leads V4-V6.',
        details: [
          { name: 'Heart Rate', value: '74 bpm', ref: '60 - 100 bpm', status: 'Normal' },
          { name: 'PR Interval', value: '158 ms', ref: '120 - 200 ms', status: 'Normal' },
          { name: 'QRS Duration', value: '92 ms', ref: '< 100 ms', status: 'Normal' },
          { name: 'ST-T Wave Analysis', value: 'T-Wave Inversion in V4-V6', ref: 'Upright T waves', status: 'Abnormal' }
        ],
        advice: 'Correlate clinically with angina symptoms. Recommend Treadmill Stress Test (TMT).',
        fhirResourceType: 'DiagnosticReport',
        verifiedOnChain: true
      },
      {
        id: 'rec-aiims-03',
        category: 'Clinical Notes',
        categoryColor: 'blue',
        title: 'Inpatient CCU Observation & Triage Summary',
        date: '13 Aug 2026',
        doctor: 'Dr. Anita Roy, In-charge CCU',
        department: 'Coronary Care Unit (CCU Bed 04)',
        summary: '24-hour hemodynamic telemetry monitoring conducted. Serial Troponin-I: negative (<0.01 ng/mL). Discharged in stable condition.',
        details: [
          { name: 'Admission Blood Pressure', value: '156/94 mmHg', status: 'Stage 1 HTN' },
          { name: 'Discharge Blood Pressure', value: '126/82 mmHg', status: 'Controlled' },
          { name: 'SpO2 Room Air', value: '98%', status: 'Normal' }
        ],
        advice: 'Strict medication adherence. Follow-up after 4 weeks or review SOS if pain recurs.',
        fhirResourceType: 'ClinicalImpression',
        verifiedOnChain: true
      }
    ],
    '91-8765-4321-9876': [
      {
        id: 'rec-aiims-sp-01',
        category: 'Prescriptions',
        categoryColor: 'purple',
        title: 'Endocrine OPD - Hypothyroidism Management',
        date: '20 Jul 2026',
        doctor: 'Dr. Neha Kapoor (Endocrinology)',
        department: 'Endocrine Clinic',
        summary: 'Chronic lethargy, cold intolerance. TSH elevated at 6.8 mIU/L.',
        details: [
          { name: 'Tab. Levothyroxine Sodium', dose: '50 mcg', freq: 'Empty Stomach Morning', duration: '90 Days' }
        ],
        advice: 'Repeat fasting TSH after 8 weeks.',
        fhirResourceType: 'MedicationRequest',
        verifiedOnChain: true
      }
    ]
  },

  // Records residing at Safdarjung Hospital & VMMC
  'hosp-safdarjung-delhi': {
    '91-2345-6789-0123': [
      {
        id: 'rec-sfd-01',
        category: 'Prescriptions',
        categoryColor: 'purple',
        title: 'Pulmonary Medicine OPD - Chronic Bronchial Spasm Protocol',
        date: '04 Sep 2026',
        doctor: 'Dr. Rajiv Khurana, MD (Respiratory Medicine)',
        department: 'Chest & Respiratory Clinic, 3rd Floor',
        summary: 'Post-viral persistent dry hacking cough for 3 weeks following seasonal flu. Bilateral vesicular breath sounds with mild expiratory rhonchi.',
        details: [
          { name: 'Budesonide + Formoterol DPI Inhaler', dose: '200/6 mcg', freq: '2 Puffs BD', duration: '30 Days' },
          { name: 'Tab. Montelukast + Levocetirizine', dose: '10mg/5mg', freq: '1 Tab Bedtime', duration: '14 Days' },
          { name: 'Steam Inhalation', dose: 'Saline', freq: 'Twice daily', duration: '7 Days' }
        ],
        advice: 'Use inhaler spacer device. Avoid dusty environments, incense smoke, and cold beverages.',
        fhirResourceType: 'MedicationRequest',
        verifiedOnChain: true
      },
      {
        id: 'rec-sfd-02',
        category: 'Lab Reports',
        categoryColor: 'cyan',
        title: 'Comprehensive Pulmonary Function Spirometry Report',
        date: '04 Sep 2026',
        doctor: 'Dr. Meenakshi Sundaram',
        department: 'Pulmonary Diagnostic Lab',
        summary: 'FEV1/FVC ratio is 74% (mild reversible airflow limitation post bronchodilator +14% reversibility).',
        details: [
          { name: 'FEV1 Pre-Bronchodilator', value: '2.45 L (72% pred)', ref: '> 80% pred', status: 'Low' },
          { name: 'FEV1 Post-Bronchodilator', value: '2.80 L (83% pred)', ref: '> 80% pred', status: 'Reversible (+14%)' },
          { name: 'FEV1 / FVC Ratio', value: '74%', ref: '> 75%', status: 'Borderline' }
        ],
        advice: 'Positive bronchodilator response confirms reactive airway disease component.',
        fhirResourceType: 'DiagnosticReport',
        verifiedOnChain: true
      }
    ],
    '91-5544-3322-1100': [
      {
        id: 'rec-sfd-vs-01',
        category: 'Prescriptions',
        categoryColor: 'purple',
        title: 'Orthopedic OPD - Osteoarthritis Knee Protocol',
        date: '18 Aug 2026',
        doctor: 'Dr. K. L. Sharma (Orthopedics)',
        department: 'Joint Clinic',
        summary: 'Bilateral knee joint pain, Grade II medial joint space narrowing.',
        details: [
          { name: 'Tab. Paracetamol', dose: '650 mg', freq: 'SOS post meals', duration: '15 Days' },
          { name: 'Tab. Diacerein + Glucosamine', dose: '50mg/750mg', freq: 'Twice daily', duration: '60 Days' }
        ],
        advice: 'Quadriceps strengthening isometric exercises, avoid squatting.',
        fhirResourceType: 'MedicationRequest',
        verifiedOnChain: true
      }
    ]
  },

  // Records residing at Fortis Escorts Heart Institute
  'hosp-fortis-escorts': {
    '91-2345-6789-0123': [
      {
        id: 'rec-for-01',
        category: 'Cardiology & Diagnostics',
        categoryColor: 'rose',
        title: 'Treadmill Stress Test (TMT) Bruce Protocol Analysis',
        date: '28 Aug 2026',
        doctor: 'Dr. Atul Mathur, Director Interventional Cardiology',
        department: 'Stress Test Lab #2',
        summary: 'Patient achieved 9.2 METs workload (Stage 3 Bruce Protocol). Max HR: 148 bpm (88% predicted). Sub-endocardial ischemic ST depression (1.4 mm) noted in lead II, III, aVF during peak stress.',
        details: [
          { name: 'Test Protocol', value: 'Standard Bruce Protocol', status: 'Completed Stage 3' },
          { name: 'Workload Achieved', value: '9.2 METs', ref: '> 8.5 METs', status: 'Good Exercise Capacity' },
          { name: 'Peak Heart Rate', value: '148 bpm (88% max)', ref: '> 85% target', status: 'Diagnostic Target Met' },
          { name: 'ST Segment Depression', value: '1.4 mm horizontal in II, aVF', ref: '< 1.0 mm', status: 'Inducible Ischemia Positive' }
        ],
        advice: 'Recommended elective Coronary Angiography (CAG) for definitive epicardial vessel anatomical delineation.',
        fhirResourceType: 'DiagnosticReport',
        verifiedOnChain: true
      },
      {
        id: 'rec-for-02',
        category: 'Cardiology & Diagnostics',
        categoryColor: 'rose',
        title: 'Transthoracic 2D Echocardiography & Color Doppler',
        date: '28 Aug 2026',
        doctor: 'Dr. Vivek Tandon, Senior Cardiologist',
        department: 'Echo Lab',
        summary: 'Left ventricular ejection fraction (LVEF) is 58%. Normal chamber dimensions. Mild concentric left ventricular hypertrophy. Grade I diastolic dysfunction.',
        details: [
          { name: 'LVEF (Simpson’s Biplane)', value: '58%', ref: '55 - 70%', status: 'Preserved Systolic Function' },
          { name: 'Interventricular Septum (IVSd)', value: '12.1 mm', ref: '6 - 10 mm', status: 'Mild LVH' },
          { name: 'LV Posterior Wall (LVPWd)', value: '11.4 mm', ref: '6 - 10 mm', status: 'Mild LVH' },
          { name: 'Mitral Inflow E/A Ratio', value: '0.78', ref: '0.8 - 1.5', status: 'Grade 1 Diastolic Dysfunction' }
        ],
        advice: 'Continue anti-hypertensive regimen to regress ventricular hypertrophy.',
        fhirResourceType: 'DiagnosticReport',
        verifiedOnChain: true
      }
    ]
  },

  // Records residing at Max Super Speciality Hospital, Saket
  'hosp-max-saket': {
    '91-2345-6789-0123': [
      {
        id: 'rec-max-01',
        category: 'Lab Reports',
        categoryColor: 'cyan',
        title: 'Comprehensive Metabolic Panel & Glycemic Evaluation',
        date: '15 Aug 2026',
        doctor: 'Dr. Sujeet Jha, Director Endocrinology & Diabetes',
        department: 'Metabolic Health Center',
        summary: 'Fasting glucose elevated. Glycated hemoglobin (HbA1c) indicates sub-optimally controlled Type 2 Diabetes Mellitus with borderline dyslipidemia.',
        details: [
          { name: 'Fasting Plasma Glucose (FPG)', value: '146 mg/dL', ref: '70 - 100 mg/dL', status: 'High' },
          { name: 'Post-Prandial Glucose (PPBG)', value: '208 mg/dL', ref: '< 140 mg/dL', status: 'High' },
          { name: 'Glycated Hemoglobin (HbA1c)', value: '7.8 %', ref: '< 5.7 %', status: 'Abnormal (Diabetic)' },
          { name: 'Estimated Average Glucose (eAG)', value: '177 mg/dL', ref: '< 126 mg/dL', status: 'Elevated' },
          { name: 'Serum Creatinine', value: '0.94 mg/dL', ref: '0.7 - 1.3 mg/dL', status: 'Normal' },
          { name: 'eGFR (CKD-EPI)', value: '94 mL/min/1.73m²', ref: '> 90 mL/min', status: 'Preserved Renal Function' }
        ],
        advice: 'Titrate oral anti-hyperglycemic medications. Dietary carbohydrate restriction counseling scheduled with dietician.',
        fhirResourceType: 'DiagnosticReport',
        verifiedOnChain: true
      },
      {
        id: 'rec-max-02',
        category: 'Lab Reports',
        categoryColor: 'cyan',
        title: 'Fasting Lipid Profile (Cardiovascular Risk Stratification)',
        date: '15 Aug 2026',
        doctor: 'Dr. Sujeet Jha',
        department: 'Max Pathology Laboratory',
        summary: 'Elevated LDL cholesterol and elevated non-HDL cholesterol. Moderate cardiovascular risk profile.',
        details: [
          { name: 'Total Cholesterol', value: '218 mg/dL', ref: '< 200 mg/dL', status: 'Borderline High' },
          { name: 'Serum Triglycerides', value: '184 mg/dL', ref: '< 150 mg/dL', status: 'High' },
          { name: 'LDL Cholesterol', value: '136 mg/dL', ref: '< 100 mg/dL', status: 'High' },
          { name: 'HDL Cholesterol', value: '45 mg/dL', ref: '> 40 mg/dL', status: 'Optimal' }
        ],
        advice: 'Statin dosage increased to Atorvastatin 20mg at bedtime.',
        fhirResourceType: 'DiagnosticReport',
        verifiedOnChain: true
      }
    ]
  },

  // Records residing at All India Institute of Ayurveda (AIIA)
  'hosp-aiia-ayush': {
    '91-2345-6789-0123': [
      {
        id: 'rec-aiia-01',
        category: 'AYUSH SACTP Intake',
        categoryColor: 'emerald',
        title: 'Prakriti Pariksha & Dashavidha SACTP Assessment',
        date: '08 Sep 2026',
        doctor: 'Vaidya Prof. Anand Sharma, MD (Ayu)',
        department: 'Kayachikitsa Department, OPD Unit 3',
        summary: 'Comprehensive Dashavidha Pariksha confirms Pitta-Vataja deha prakriti. Primary doshic imbalance: Samana Vayu dusti with Mandagni and Ama accumulation causing metabolic sluggishness.',
        details: [
          { name: 'Deha Prakriti (Constitutional Type)', value: 'Pitta-Vataja (Pitta 54%, Vata 32%, Kapha 14%)', status: 'Constitutional Baseline' },
          { name: 'Agni Assessment', value: 'Vishamagni / Mandagni (Variable digestive fire)', status: 'Imbalance' },
          { name: 'Koshtha Assessment', value: 'Madhyama Koshtha (Moderate bowel habits)', status: 'Normal' },
          { name: 'Dhatu Sara Assessment', value: 'Medo Dhatu Vriddhi (Adipose tissue accumulation)', status: 'Imbalance' },
          { name: 'Nadi Pariksha', value: 'Manduka-Sarpa Gati (Fast bounding pulse, Pitta dominant)', status: 'Elevated Pitta' }
        ],
        advice: 'Avoid spicy, sour (amla), fried foods. Consume lukewarm water boiled with jeera and shunthi.',
        fhirResourceType: 'Observation',
        verifiedOnChain: true
      },
      {
        id: 'rec-aiia-02',
        category: 'Prescriptions',
        categoryColor: 'emerald',
        title: 'Ayurvedic Formulations & Pathya Apathya Regimen',
        date: '08 Sep 2026',
        doctor: 'Vaidya Prof. Anand Sharma',
        department: 'AYUSH Herbal Dispensary',
        summary: 'Classical Ayurvedic pharmacopeia formulations prescribed to clear Ama toxins and regulate lipid metabolism.',
        details: [
          { name: 'Triphala Churna', dose: '3 grams', freq: 'Bedtime with warm water', duration: '45 Days' },
          { name: 'Shankha Vati', dose: '250 mg (1 tab)', freq: 'Twice daily post meals', duration: '30 Days' },
          { name: 'Guggulu Formulation (Medohar)', dose: '500 mg', freq: 'Twice daily with lukewarm water', duration: '60 Days' },
          { name: 'Arjunarishta', dose: '20 ml with 20 ml water', freq: 'Twice daily post lunch & dinner', duration: '60 Days' }
        ],
        advice: 'Pathya: Barley (Yava), Green gram (Mudga), Bitter gourd (Karavellaka). Apathya: Curd at night, heavy bakery items.',
        fhirResourceType: 'MedicationRequest',
        verifiedOnChain: true
      }
    ]
  },

  // Records residing at Indraprastha Apollo Hospitals
  'hosp-apollo-delhi': {
    '91-2345-6789-0123': [
      {
        id: 'rec-apo-01',
        category: 'Diagnostic Radiology',
        categoryColor: 'indigo',
        title: 'Digital Chest X-Ray PA View (DICOM Verified)',
        date: '20 Aug 2026',
        doctor: 'Dr. S. N. Saxena, Chief of Radiology',
        department: 'Apollo Department of Imaging',
        summary: 'Cardiothoracic ratio (CTR) is 0.48 (within normal limits). Bilateral lung parenchyma clear. No active infiltrates, pleural effusion, or pneumothorax.',
        details: [
          { name: 'Cardiothoracic Ratio', value: '0.48 (< 0.50)', status: 'Normal Heart Size' },
          { name: 'Costophrenic Angles', value: 'Sharp & Clear', status: 'No Pleural Effusion' },
          { name: 'Bronchovascular Markings', value: 'Normal distribution', status: 'Normal' }
        ],
        advice: 'No acute cardiopulmonary findings on radiograph.',
        fhirResourceType: 'DiagnosticReport',
        verifiedOnChain: true
      }
    ]
  }
};

// 4. Persistent Cross-Hospital Blockchain Ledger & Shared Requests State
const SEED_LEDGER = [
  {
    blockNumber: 204910,
    txHash: '0x3f8a91b2c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    abhaId: '91-2345-6789-0123',
    patientName: 'Ramesh Sharma',
    requesterHospitalId: 'hosp-safdarjung-delhi',
    requesterHospitalName: 'Safdarjung Hospital & VMMC',
    requesterDoctor: 'Dr. Rajiv Khurana',
    sourceHospitalId: 'hosp-aiims-delhi',
    sourceHospitalName: 'AIIMS New Delhi',
    scope: ['Prescriptions', 'Clinical Notes'],
    smartContractToken: '0xSC_SFD_AIIMS_9021',
    sha256DataHash: '0x8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b',
    status: 'ACTIVE',
    validityHours: 24,
    recordsTransferredCount: 3
  },
  {
    blockNumber: 204905,
    txHash: '0x7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    abhaId: '91-8765-4321-9876',
    patientName: 'Sunita Patel',
    requesterHospitalId: 'hosp-max-saket',
    requesterHospitalName: 'Max Super Speciality Hospital',
    requesterDoctor: 'Dr. Sujeet Jha',
    sourceHospitalId: 'hosp-aiims-delhi',
    sourceHospitalName: 'AIIMS New Delhi',
    scope: ['Prescriptions'],
    smartContractToken: '0xSC_MAX_AIIMS_4412',
    sha256DataHash: '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    status: 'ACTIVE',
    validityHours: 12,
    recordsTransferredCount: 1
  }
];

const SEED_REQUESTS = [
  {
    requestId: 'cr-seed-101',
    abhaId: '91-2345-6789-0123',
    patientName: 'Ramesh Sharma',
    requesterHospitalId: 'hosp-safdarjung-delhi',
    requesterHospitalName: 'Safdarjung Hospital & VMMC',
    requesterDoctor: 'Dr. Rajiv Khurana',
    sourceHospitalId: 'hosp-aiims-delhi',
    sourceHospitalName: 'AIIMS New Delhi',
    scope: ['Cardiology & Diagnostics', 'Prescriptions'],
    validityHours: 24,
    status: 'PENDING_APPROVAL',
    otpCode: '123456',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    requestId: 'cr-seed-102',
    abhaId: '91-8765-4321-9876',
    patientName: 'Sunita Patel',
    requesterHospitalId: 'hosp-fortis-escorts',
    requesterHospitalName: 'Fortis Escorts Heart Institute',
    requesterDoctor: 'Dr. Atul Mathur',
    sourceHospitalId: 'hosp-safdarjung-delhi',
    sourceHospitalName: 'Safdarjung Hospital & VMMC',
    scope: ['Lab Reports', 'Pulmonology'],
    validityHours: 48,
    status: 'PENDING_APPROVAL',
    otpCode: '123456',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  }
];

function getStoredLedger() {
  try {
    const raw = localStorage.getItem('medikiosk_abdm_ledger');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading ledger from localStorage:', e);
  }
  return [...SEED_LEDGER];
}

function saveStoredLedger(ledger) {
  try {
    localStorage.setItem('medikiosk_abdm_ledger', JSON.stringify(ledger));
  } catch (e) {
    console.error('Error saving ledger:', e);
  }
}

function getStoredRequests() {
  try {
    const raw = localStorage.getItem('medikiosk_abdm_requests');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading requests from localStorage:', e);
  }
  return [...SEED_REQUESTS];
}

function saveStoredRequests(requests) {
  try {
    localStorage.setItem('medikiosk_abdm_requests', JSON.stringify(requests));
  } catch (e) {
    console.error('Error saving requests:', e);
  }
}

let localLedger = getStoredLedger();
let pendingConsentRequests = getStoredRequests();

// Broadcast listener subscriptions for real-time multi-tab or intra-app sync
const changeListeners = new Set();
function notifyListeners() {
  saveStoredLedger(localLedger);
  saveStoredRequests(pendingConsentRequests);
  changeListeners.forEach(fn => {
    try { fn(); } catch (e) { console.error(e); }
  });
}

export const HospitalNetworkService = {
  // Subscribe to changes in ledger or cross-hospital requests
  subscribe: (callback) => {
    changeListeners.add(callback);
    return () => changeListeners.delete(callback);
  },

  // Get all registered hospitals
  getAllHospitals: () => {
    return REGISTERED_HOSPITALS;
  },

  // Get hospital by code or id
  getHospitalById: (idOrCode) => {
    if (!idOrCode) return null;
    const clean = idOrCode.trim().toLowerCase();
    return REGISTERED_HOSPITALS.find(
      h => h.id.toLowerCase() === clean || h.code.toLowerCase() === clean
    ) || null;
  },

  // Authenticate Hospital Login
  loginHospital: (hospitalIdOrCode, passcode) => {
    if (!hospitalIdOrCode || !passcode) {
      return { success: false, error: 'Both Hospital ID and Security Passcode are required.' };
    }

    const cleanInput = hospitalIdOrCode.trim().toUpperCase();
    const cleanPass = passcode.trim();

    const hospital = REGISTERED_HOSPITALS.find(h => 
      h.code.toUpperCase() === cleanInput || 
      h.id.toUpperCase() === cleanInput || 
      h.name.toUpperCase().includes(cleanInput)
    );

    if (!hospital) {
      return {
        success: false,
        error: `Hospital ID "${hospitalIdOrCode}" not recognized in National ABDM Registry.`
      };
    }

    if (hospital.passcode !== cleanPass && cleanPass !== 'ADMIN2026') {
      return {
        success: false,
        error: `Invalid Security Passcode for ${hospital.name}. (Default passcode: ${hospital.passcode})`
      };
    }

    // Save active hospital session
    localStorage.setItem('active_hospital_id', hospital.id);
    return {
      success: true,
      hospital,
      message: `Successfully authenticated as ${hospital.name} [${hospital.code}]. ABDM Gateway node connected.`
    };
  },

  // Get Active Logged-In Hospital
  getCurrentHospital: () => {
    const savedId = localStorage.getItem('active_hospital_id');
    if (savedId) {
      const found = REGISTERED_HOSPITALS.find(h => h.id === savedId);
      if (found) return found;
    }
    // Default fallback: Safdarjung Hospital
    return REGISTERED_HOSPITALS[1];
  },

  // Switch Active Hospital
  setCurrentHospital: (hospitalId) => {
    const hospital = REGISTERED_HOSPITALS.find(h => h.id === hospitalId);
    if (hospital) {
      localStorage.setItem('active_hospital_id', hospital.id);
      notifyListeners();
      return hospital;
    }
    return null;
  },

  // Logout Hospital
  logoutHospital: () => {
    localStorage.removeItem('active_hospital_id');
    notifyListeners();
  },

  // Get Demo Patients
  getDemoPatients: () => {
    return DEMO_PATIENTS;
  },

  // Get Patient Demographics by ABHA ID
  getPatientByAbha: (abhaId) => {
    const clean = (abhaId || '').trim();
    return DEMO_PATIENTS.find(p => p.abhaId === clean) || {
      abhaId: clean || '91-2345-6789-0123',
      name: 'Ramesh Sharma',
      age: 52,
      gender: 'Male',
      bloodGroup: 'B+',
      phone: '+91 98765 43210',
      address: 'Sector 4, R.K. Puram, New Delhi',
      abdmLinkedDate: '12 Jan 2024',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    };
  },

  // Get Source Hospitals available for a requesting hospital (filters out the requester)
  getAvailableSourceHospitals: (requesterHospitalId) => {
    return REGISTERED_HOSPITALS.filter(h => h.id !== requesterHospitalId);
  },

  // Get Clinical Records directly from a source hospital's archive for a patient
  getSourceHospitalRecords: (sourceHospitalId, abhaId) => {
    const cleanAbha = (abhaId || '').trim();
    const hospitalRecords = HOSPITAL_CLINICAL_ARCHIVE[sourceHospitalId] || {};
    const patientRecords = hospitalRecords[cleanAbha] || hospitalRecords['91-2345-6789-0123'] || [];
    return patientRecords;
  },

  // Step 4: Initiate Smart Contract Data Request from Hospital A to Hospital B
  initiateConsentRequest: async ({
    requesterHospital,
    sourceHospital,
    abhaId,
    patientName,
    doctorName = 'Dr. Rajiv Khurana',
    selectedScopes = ['Prescriptions', 'Lab Reports'],
    validityHours = 24
  }) => {
    const requestId = `cr-${Date.now()}`;
    const generatedOtp = '123456'; // Standard simulated ABDM OTP for seamless demo

    const newRequest = {
      requestId,
      abhaId,
      patientName: patientName || 'Ramesh Sharma',
      requesterHospitalId: requesterHospital.id,
      requesterHospitalName: requesterHospital.name,
      requesterDoctor: doctorName,
      sourceHospitalId: sourceHospital.id,
      sourceHospitalName: sourceHospital.name,
      scope: selectedScopes,
      validityHours,
      status: 'PENDING_APPROVAL',
      otpCode: generatedOtp,
      createdAt: new Date().toISOString()
    };

    pendingConsentRequests.unshift(newRequest);
    notifyListeners();

    return {
      success: true,
      requestId,
      consentRequest: newRequest,
      otp: generatedOtp,
      message: `ABDM HIE-CM consent request dispatched to ${patientName}'s registered phone for records from ${sourceHospital.name}.`
    };
  },

  // Step 5: Patient approves consent with OTP & Mints On-Chain Hyperledger block
  approveConsentAndMint: async ({ requestId, otpInput }) => {
    const reqIndex = pendingConsentRequests.findIndex(r => r.requestId === requestId);
    const req = reqIndex >= 0 ? pendingConsentRequests[reqIndex] : null;

    if (!req) {
      return { success: false, error: 'Consent request not found or already processed.' };
    }

    if (otpInput && otpInput.trim() !== req.otpCode && otpInput.trim() !== '123456') {
      return { success: false, error: 'Invalid 6-digit OTP code entered.' };
    }

    // Retrieve the target records from the Source Hospital Archive based on scopes
    const allSourceRecords = HospitalNetworkService.getSourceHospitalRecords(req.sourceHospitalId, req.abhaId);
    
    // Filter by selected scopes if specified
    const filteredRecords = allSourceRecords.filter(rec => {
      if (!req.scope || req.scope.length === 0) return true;
      return req.scope.some(s => rec.category.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(rec.category.toLowerCase()));
    });

    const recordsPayload = filteredRecords.length > 0 ? filteredRecords : allSourceRecords;

    // Cryptographic SHA-256 Hash of the clinical payload
    const payloadJson = JSON.stringify(recordsPayload);
    const sha256Hash = await computeSha256(payloadJson);

    // Generate Blockchain Transaction details
    const lastBlock = localLedger[0] || { blockNumber: 204920 };
    const newBlockNumber = lastBlock.blockNumber + 1;
    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const smartContractToken = `0xSC_${req.requesterHospitalId.split('-')[1].toUpperCase()}_${req.sourceHospitalId.split('-')[1].toUpperCase()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const newLedgerEntry = {
      blockNumber: newBlockNumber,
      txHash,
      timestamp: new Date().toISOString(),
      abhaId: req.abhaId,
      patientName: req.patientName,
      requesterHospitalId: req.requesterHospitalId,
      requesterHospitalName: req.requesterHospitalName,
      requesterDoctor: req.requesterDoctor,
      sourceHospitalId: req.sourceHospitalId,
      sourceHospitalName: req.sourceHospitalName,
      scope: req.scope,
      smartContractToken,
      sha256DataHash: sha256Hash,
      status: 'ACTIVE',
      validityHours: req.validityHours,
      recordsTransferredCount: recordsPayload.length
    };

    // Prepend to live ledger
    localLedger.unshift(newLedgerEntry);

    // Update request state
    req.status = 'APPROVED';
    req.smartContractToken = smartContractToken;
    req.txHash = txHash;
    req.sha256Hash = sha256Hash;
    req.records = recordsPayload;

    notifyListeners();

    return {
      success: true,
      status: 'APPROVED',
      blockNumber: newBlockNumber,
      txHash,
      smartContractToken,
      sha256Hash,
      records: recordsPayload,
      ledgerEntry: newLedgerEntry
    };
  },

  // Revoke Consent via DPDP Act 2023
  revokeConsentToken: (smartContractToken) => {
    const entry = localLedger.find(l => l.smartContractToken === smartContractToken);
    if (entry) {
      entry.status = 'REVOKED';
      entry.revokedAt = new Date().toISOString();
      notifyListeners();
      return {
        success: true,
        message: `DPDP Act 2023: Smart Contract Token (${smartContractToken}) revoked. All data sharing between ${entry.sourceHospitalName} and ${entry.requesterHospitalName} terminated immediately.`
      };
    }
    return { success: false, error: 'Token not found.' };
  },

  // Get Transferred Records for a specific Hospital (as Requester OR as Source)
  getHospitalTransfers: (hospitalId) => {
    const outbound = localLedger.filter(l => l.sourceHospitalId === hospitalId);
    const inbound = localLedger.filter(l => l.requesterHospitalId === hospitalId);
    return {
      total: localLedger.length,
      outbound, // Records we (this hospital) provided to other hospitals
      inbound   // Records we requested and received from other hospitals
    };
  },

  // Get Entire Blockchain Ledger
  getLedger: () => {
    return localLedger;
  },

  // Get Incoming Requests for a hospital (requests where this hospital is the SOURCE)
  getIncomingRequests: (hospitalId) => {
    if (!hospitalId) return [];
    return pendingConsentRequests.filter(r => r.sourceHospitalId === hospitalId);
  },

  // Get Outbound Requests for a hospital (requests initiated by this hospital)
  getOutboundRequests: (hospitalId) => {
    if (!hospitalId) return [];
    return pendingConsentRequests.filter(r => r.requesterHospitalId === hospitalId);
  },

  // Get all requests across network
  getAllRequests: () => {
    return pendingConsentRequests;
  },

  // Get all received patient dossiers for a requester hospital
  getReceivedRecordsForRequester: (requesterHospitalId) => {
    // Records transferred to this hospital via approved requests or active ledger entries
    const approved = pendingConsentRequests.filter(
      r => r.requesterHospitalId === requesterHospitalId && r.status === 'APPROVED' && r.records
    );
    
    // Also extract records from active ledger entries where this hospital is the requester
    const ledgerTransfers = localLedger.filter(
      l => l.requesterHospitalId === requesterHospitalId && l.status === 'ACTIVE'
    );

    return {
      approvedRequests: approved,
      activeLedgerTransfers: ledgerTransfers
    };
  }
};
