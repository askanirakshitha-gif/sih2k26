const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const {
  SEED_PATIENTS,
  SEED_CONDITIONS,
  SEED_RED_FLAGS,
  SEED_QUESTIONS,
  SEED_DOCUMENTS
} = require('../utils/seedData');

let isPgConnected = false;
let pool = null;

// In-memory data store for resilient local hackathon fallback
const memoryStore = {
  patients: JSON.parse(JSON.stringify(SEED_PATIENTS)),
  conditions: JSON.parse(JSON.stringify(SEED_CONDITIONS)),
  questions: JSON.parse(JSON.stringify(SEED_QUESTIONS)),
  red_flags: JSON.parse(JSON.stringify(SEED_RED_FLAGS)),
  sessions: [],
  history_answers: [],
  documents: JSON.parse(JSON.stringify(SEED_DOCUMENTS)),
  clinical_summaries: [],
  doctor_reviews: []
};

// Seed an initial demo completed session for Ramesh Sharma so doctor dashboard has instant data on startup
const demoSessionId = '00000000-0000-0000-0000-000000000001';
memoryStore.sessions.push({
  id: demoSessionId,
  patient_id: '11111111-1111-1111-1111-111111111111',
  language: 'en',
  clinical_system: 'allopathy',
  condition_id: 'chest_pain',
  status: 'flagged',
  red_flag_detected: true,
  consent_given: true,
  opd_token_number: 'OPD-101',
  created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString()
});

memoryStore.history_answers.push(
  {
    id: uuidv4(),
    session_id: demoSessionId,
    question_id: 'cp_q1',
    clinical_field: 'chief_complaint',
    raw_answer: 'chest_pain_pressure',
    structured_value: { chief_complaint: 'Chest pain or heavy pressure' }
  },
  {
    id: uuidv4(),
    session_id: demoSessionId,
    question_id: 'cp_q2',
    clinical_field: 'site',
    raw_answer: 'center_retrosternal',
    structured_value: { site: 'Center of chest (behind breastbone)' }
  },
  {
    id: uuidv4(),
    session_id: demoSessionId,
    question_id: 'cp_q5',
    clinical_field: 'character',
    raw_answer: 'crushing_heavy',
    structured_value: { character: 'Crushing pressure, weight, or squeezing' }
  },
  {
    id: uuidv4(),
    session_id: demoSessionId,
    question_id: 'cp_q6',
    clinical_field: 'severity',
    raw_answer: '8',
    structured_value: { severity: 8 },
    is_red_flag: true
  },
  {
    id: uuidv4(),
    session_id: demoSessionId,
    question_id: 'cp_q7',
    clinical_field: 'radiation',
    raw_answer: 'left arm',
    structured_value: { radiation: 'Radiates to Left Arm and Shoulder' },
    is_red_flag: true
  },
  {
    id: uuidv4(),
    session_id: demoSessionId,
    question_id: 'cp_q10',
    clinical_field: 'breathlessness',
    raw_answer: 'yes',
    structured_value: { breathlessness: true }
  },
  {
    id: uuidv4(),
    session_id: demoSessionId,
    question_id: 'cp_q11',
    clinical_field: 'sweating',
    raw_answer: 'yes',
    structured_value: { sweating: true }
  },
  {
    id: uuidv4(),
    session_id: demoSessionId,
    question_id: 'cp_q16',
    clinical_field: 'past_medical_history',
    raw_answer: 'hypertension',
    structured_value: { past_medical_history: ['Hypertension', 'Dyslipidemia'] }
  }
);

memoryStore.clinical_summaries.push({
  id: uuidv4(),
  session_id: demoSessionId,
  chief_complaint: 'Acute retrosternal crushing chest discomfort of 2 hours duration',
  hpi_summary: '54-year-old male with known hypertension presents with sudden onset crushing retrosternal chest pain (severity 8/10), radiating to left arm and shoulder. Accompanied by shortness of breath and diaphoresis.',
  past_history: 'Essential Hypertension (diagnosed 2021), Dyslipidemia.',
  medications_summary: 'Telmisartan 40mg OD, Atorvastatin 20mg OD, Ecosprin 75mg OD.',
  allergies_summary: 'No known drug allergies (NKDA).',
  family_history: 'Paternal history of myocardial infarction at age 58.',
  personal_history: 'Non-smoker, occasional alcohol.',
  review_of_systems: 'Positive for dyspnea and sweating. Denies syncope, nausea, or palpitations.',
  ayush_assessment: null,
  red_flags_summary: [
    {
      rule_name: 'Left Arm / Shoulder Radiation',
      severity: 'CRITICAL',
      warning: 'Potential warning sign detected: Pain radiating to the left arm is a high-risk symptom for acute coronary syndrome. Please alert hospital staff immediately.'
    },
    {
      rule_name: 'Severe Pain Intensity (>=8)',
      severity: 'HIGH',
      warning: 'High pain severity (8/10 or higher) reported. Triaged for immediate physician assessment.'
    }
  ],
  ai_generated_summary: 'HIGH RISK: 54-year-old male presents with classic features of Acute Coronary Syndrome (retrosternal crushing pain radiating to left arm, associated dyspnea and diaphoresis). Immediate ECG, troponin I, and cardiac stabilization indicated.',
  physician_notes: 'Urgent Stat ECG requested. Bedside telemetry initiated.'
});

async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('[DB] No DATABASE_URL provided. Running in resilient In-Memory Fallback Mode.');
    isPgConnected = false;
    return;
  }

  try {
    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 3000
    });

    // Test connection
    const res = await pool.query('SELECT NOW()');
    isPgConnected = true;
    console.log(`[DB] Connected to PostgreSQL successfully at ${res.rows[0].now}`);
  } catch (err) {
    console.warn(`[DB] PostgreSQL connection failed (${err.message}). Activating In-Memory Fallback Mode.`);
    isPgConnected = false;
  }
}

// Data access operations
const db = {
  isPostgres() {
    return isPgConnected;
  },

  async getPatients() {
    if (isPgConnected) {
      try {
        const { rows } = await pool.query('SELECT * FROM patients ORDER BY full_name ASC');
        return rows;
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }
    return memoryStore.patients;
  },

  async getPatientById(id) {
    if (isPgConnected) {
      try {
        const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
        return rows[0] || null;
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }
    return memoryStore.patients.find(p => p.id === id) || null;
  },

  async createPatient(patientData) {
    const id = patientData.id || uuidv4();
    const newPatient = {
      id,
      abha_id: patientData.abha_id || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      aadhaar_hash: patientData.aadhaar_hash || 'demo-hash',
      full_name: patientData.full_name,
      age: parseInt(patientData.age, 10) || 30,
      gender: patientData.gender || 'Other',
      phone: patientData.phone || '+91 9000000000',
      blood_group: patientData.blood_group || 'Unknown',
      created_at: new Date().toISOString()
    };

    if (isPgConnected) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO patients (id, abha_id, aadhaar_hash, full_name, age, gender, phone, blood_group)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [newPatient.id, newPatient.abha_id, newPatient.aadhaar_hash, newPatient.full_name, newPatient.age, newPatient.gender, newPatient.phone, newPatient.blood_group]
        );
        return rows[0];
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }

    memoryStore.patients.push(newPatient);
    return newPatient;
  },

  async createSession(sessionData) {
    const id = uuidv4();
    const tokenNumber = `OPD-${Math.floor(100 + Math.random() * 900)}`;
    const newSession = {
      id,
      patient_id: sessionData.patient_id,
      language: sessionData.language || 'en',
      clinical_system: sessionData.clinical_system || 'allopathy',
      condition_id: sessionData.condition_id || (sessionData.clinical_system === 'ayush' ? 'ayush_general' : 'chest_pain'),
      status: 'in_progress',
      red_flag_detected: false,
      consent_given: !!sessionData.consent_given,
      opd_token_number: tokenNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isPgConnected) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO sessions (id, patient_id, language, clinical_system, condition_id, status, red_flag_detected, consent_given, opd_token_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [newSession.id, newSession.patient_id, newSession.language, newSession.clinical_system, newSession.condition_id, newSession.status, newSession.red_flag_detected, newSession.consent_given, newSession.opd_token_number]
        );
        return rows[0];
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }

    memoryStore.sessions.push(newSession);
    return newSession;
  },

  async getSession(id) {
    if (isPgConnected) {
      try {
        const { rows } = await pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
        return rows[0] || null;
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }
    return memoryStore.sessions.find(s => s.id === id) || null;
  },

  async updateSession(id, updates) {
    if (isPgConnected) {
      try {
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, val] of Object.entries(updates)) {
          fields.push(`${key} = $${idx++}`);
          values.push(val);
        }
        values.push(id);
        const query = `UPDATE sessions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
        const { rows } = await pool.query(query, values);
        return rows[0];
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }

    const session = memoryStore.sessions.find(s => s.id === id);
    if (session) {
      Object.assign(session, updates, { updated_at: new Date().toISOString() });
      return session;
    }
    return null;
  },

  async getAllSessions() {
    if (isPgConnected) {
      try {
        const { rows } = await pool.query(`
          SELECT s.*, p.full_name as patient_name, p.age, p.gender, p.abha_id
          FROM sessions s
          LEFT JOIN patients p ON s.patient_id = p.id
          ORDER BY s.created_at DESC
        `);
        return rows;
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }

    return memoryStore.sessions.map(s => {
      const patient = memoryStore.patients.find(p => p.id === s.patient_id) || {};
      return {
        ...s,
        patient_name: patient.full_name || 'Anonymous Patient',
        age: patient.age || 0,
        gender: patient.gender || 'Unknown',
        abha_id: patient.abha_id || ''
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getQuestions(clinicalSystem, conditionId) {
    if (isPgConnected) {
      try {
        const { rows } = await pool.query(`
          SELECT q.*, 
            json_agg(
              json_build_object(
                'value', qo.option_value,
                'text_en', qo.option_text_en,
                'text_hi', qo.option_text_hi,
                'sequence', qo.sequence
              ) ORDER BY qo.sequence
            ) FILTER (WHERE qo.id IS NOT NULL) as options
          FROM questions q
          JOIN history_templates ht ON q.template_id = ht.id
          LEFT JOIN question_options qo ON q.id = qo.question_id
          WHERE ht.clinical_system = $1 OR ht.condition_id = $2
          GROUP BY q.id
          ORDER BY q.sequence ASC
        `, [clinicalSystem, conditionId]);
        return rows;
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }

    return memoryStore.questions.filter(q => q.clinical_system === clinicalSystem);
  },

  async getRedFlags(conditionId) {
    if (isPgConnected) {
      try {
        const { rows } = await pool.query('SELECT * FROM red_flags WHERE condition_id = $1', [conditionId]);
        return rows;
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }
    return memoryStore.red_flags.filter(r => r.condition_id === conditionId);
  },

  async saveAnswer(answerData) {
    const id = uuidv4();
    const record = {
      id,
      session_id: answerData.session_id,
      question_id: answerData.question_id,
      clinical_field: answerData.clinical_field,
      raw_answer: String(answerData.raw_answer),
      structured_value: answerData.structured_value || {},
      voice_transcript: answerData.voice_transcript || null,
      is_red_flag: !!answerData.is_red_flag,
      answered_at: new Date().toISOString()
    };

    if (isPgConnected) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO history_answers (id, session_id, question_id, clinical_field, raw_answer, structured_value, voice_transcript, is_red_flag)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [record.id, record.session_id, record.question_id, record.clinical_field, record.raw_answer, JSON.stringify(record.structured_value), record.voice_transcript, record.is_red_flag]
        );
        return rows[0];
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }

    memoryStore.history_answers.push(record);
    return record;
  },

  async getSessionAnswers(sessionId) {
    if (isPgConnected) {
      try {
        const { rows } = await pool.query(
          'SELECT * FROM history_answers WHERE session_id = $1 ORDER BY answered_at ASC',
          [sessionId]
        );
        return rows;
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }
    return memoryStore.history_answers.filter(a => a.session_id === sessionId);
  },

  async saveDocument(docData) {
    const id = docData.id || uuidv4();
    const doc = {
      id,
      session_id: docData.session_id,
      patient_id: docData.patient_id,
      file_name: docData.file_name,
      file_path: docData.file_path,
      document_type: docData.document_type || 'prescription',
      document_date: docData.document_date || new Date().toISOString().split('T')[0],
      ocr_raw_text: docData.ocr_raw_text || '',
      processed_status: docData.processed_status || 'pending',
      uploaded_at: new Date().toISOString(),
      extractions: docData.extractions || null
    };

    if (isPgConnected) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO documents (id, session_id, patient_id, file_name, file_path, document_type, document_date, ocr_raw_text, processed_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [doc.id, doc.session_id, doc.patient_id, doc.file_name, doc.file_path, doc.document_type, doc.document_date, doc.ocr_raw_text, doc.processed_status]
        );
        return rows[0];
      } catch (e) {
        console.warn('[DB Error] Falling back to memory store:', e.message);
      }
    }

    memoryStore.documents.push(doc);
    return doc;
  },

  async updateDocument(id, updates) {
    const doc = memoryStore.documents.find(d => d.id === id);
    if (doc) {
      Object.assign(doc, updates);
      return doc;
    }
    return null;
  },

  async getDocumentById(id) {
    return memoryStore.documents.find(d => d.id === id) || null;
  },

  async getPatientDocuments(patientId) {
    return memoryStore.documents
      .filter(d => d.patient_id === patientId)
      .sort((a, b) => {
        const da = a.document_date || a.uploaded_at || '';
        const db = b.document_date || b.uploaded_at || '';
        return db.localeCompare(da);
      });
  },

  async saveClinicalSummary(summaryData) {
    const id = uuidv4();
    const existing = memoryStore.clinical_summaries.find(s => s.session_id === summaryData.session_id);
    if (existing) {
      Object.assign(existing, summaryData, { updated_at: new Date().toISOString() });
      return existing;
    }

    const record = {
      id,
      session_id: summaryData.session_id,
      chief_complaint: summaryData.chief_complaint,
      hpi_summary: summaryData.hpi_summary,
      past_history: summaryData.past_history,
      medications_summary: summaryData.medications_summary,
      allergies_summary: summaryData.allergies_summary,
      family_history: summaryData.family_history,
      personal_history: summaryData.personal_history,
      review_of_systems: summaryData.review_of_systems,
      ayush_assessment: summaryData.ayush_assessment || null,
      red_flags_summary: summaryData.red_flags_summary || [],
      ai_generated_summary: summaryData.ai_generated_summary,
      physician_notes: summaryData.physician_notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.clinical_summaries.push(record);
    return record;
  },

  async getClinicalSummary(sessionId) {
    return memoryStore.clinical_summaries.find(s => s.session_id === sessionId) || null;
  },

  async saveDoctorReview(reviewData) {
    const id = uuidv4();
    const existing = memoryStore.doctor_reviews.find(r => r.session_id === reviewData.session_id);
    if (existing) {
      Object.assign(existing, reviewData, { reviewed_at: new Date().toISOString() });
      return existing;
    }

    const record = {
      id,
      session_id: reviewData.session_id,
      doctor_id: reviewData.doctor_id || 'DOC-404',
      doctor_name: reviewData.doctor_name || 'Dr. Ananya Joshi, MD',
      verification_status: reviewData.verification_status || 'verified',
      provisional_diagnosis: reviewData.provisional_diagnosis || '',
      prescription_notes: reviewData.prescription_notes || '',
      fhir_bundle: reviewData.fhir_bundle || null,
      pushed_to_abdm: !!reviewData.pushed_to_abdm,
      abdm_transaction_id: reviewData.abdm_transaction_id || null,
      reviewed_at: new Date().toISOString()
    };

    memoryStore.doctor_reviews.push(record);
    return record;
  },

  async getDoctorReview(sessionId) {
    return memoryStore.doctor_reviews.find(r => r.session_id === sessionId) || null;
  }
};

module.exports = {
  initDb,
  db
};
