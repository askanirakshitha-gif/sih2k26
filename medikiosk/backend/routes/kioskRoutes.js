const express = require('express');
const axios = require('axios');
const router = express.Router();
const { db } = require('../services/db');
const QuestionEngine = require('../services/questionEngine');
const RedFlagEngine = require('../services/redFlagEngine');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * GET /api/patients
 * List demo or registered patients
 */
router.get('/patients', async (req, res) => {
  try {
    const patients = await db.getPatients();
    res.json({ success: true, patients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/patients
 * Register a new patient at the kiosk
 */
router.post('/patients', async (req, res) => {
  try {
    const { full_name, age, gender, phone, blood_group, abha_id } = req.body;
    if (!full_name || !age || !gender) {
      return res.status(400).json({ success: false, error: 'Full name, age, and gender are required' });
    }

    const patient = await db.createPatient({
      full_name,
      age: parseInt(age, 10),
      gender,
      phone: phone || '+91 9000000000',
      blood_group: blood_group || 'O+',
      abha_id
    });

    res.status(201).json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/start
 * Start a new kiosk case-taking session
 */
router.post('/start', async (req, res) => {
  try {
    const { language = 'en', system = 'allopathy', patientId, conditionId } = req.body;

    let patient = null;
    if (patientId) {
      patient = await db.getPatientById(patientId);
    }
    if (!patient) {
      const allPatients = await db.getPatients();
      patient = allPatients[0]; // default to first demo patient
    }

    const session = await db.createSession({
      patient_id: patient ? patient.id : null,
      language: language === 'hi' ? 'hi' : 'en',
      clinical_system: system === 'ayush' ? 'ayush' : 'allopathy',
      condition_id: conditionId || (system === 'ayush' ? 'ayush_general' : 'chest_pain'),
      consent_given: true
    });

    // Get the first adaptive question
    const nextResult = await QuestionEngine.getNextQuestion(session);

    res.json({
      success: true,
      sessionId: session.id,
      patient,
      clinicalSystem: session.clinical_system,
      opdToken: session.opd_token_number,
      nextQuestion: nextResult.question,
      progress: nextResult.progress
    });
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/next
 * Submit an answer and retrieve the next question or completion state
 */
router.post('/next', async (req, res) => {
  try {
    const { sessionId, questionId, answer, voiceTranscript } = req.body;

    if (!sessionId || !questionId) {
      return res.status(400).json({ success: false, error: 'sessionId and questionId are required' });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Retrieve question details to identify clinical_field
    const allQuestions = await db.getQuestions(session.clinical_system, session.condition_id);
    const question = allQuestions.find(q => q.id === questionId);
    const clinicalField = question ? question.clinical_field : 'general_field';

    // Retrieve past session answers for compound red-flag rules
    const previousAnswers = await db.getSessionAnswers(sessionId);

    // Evaluate Deterministic Red-Flag Safety Rules
    const redFlagResult = await RedFlagEngine.evaluate({
      conditionId: session.condition_id,
      clinicalField,
      answerValue: answer,
      previousAnswers,
      language: session.language
    });

    // Extract structured entity via AI microservice (or local fallback)
    let structuredValue = { [clinicalField]: answer };
    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/extract-entities`, {
        text: String(answer),
        field: clinicalField,
        language: session.language
      }, { timeout: 2000 });

      if (aiResponse.data && aiResponse.data.entities) {
        structuredValue = { ...structuredValue, ...aiResponse.data.entities };
      }
    } catch (aiErr) {
      // Graceful fallback to deterministic dictionary
      structuredValue = { [clinicalField]: answer };
    }

    // Save answer
    await db.saveAnswer({
      session_id: sessionId,
      question_id: questionId,
      clinical_field: clinicalField,
      raw_answer: answer,
      structured_value: structuredValue,
      voice_transcript: voiceTranscript,
      is_red_flag: redFlagResult.isRedFlag
    });

    // If red flag triggered, update session status
    if (redFlagResult.isRedFlag) {
      await db.updateSession(sessionId, {
        red_flag_detected: true,
        status: 'flagged'
      });
    }

    // Determine the next question
    const nextResult = await QuestionEngine.getNextQuestion(session);

    // If all questions answered, finalize clinical summary
    if (nextResult.completed) {
      await db.updateSession(sessionId, {
        status: session.red_flag_detected || redFlagResult.isRedFlag ? 'flagged' : 'completed'
      });

      // Generate structured clinical summary
      await generateAndSaveSummary(session);
    }

    res.json({
      success: true,
      completed: nextResult.completed,
      nextQuestion: nextResult.question,
      progress: nextResult.progress,
      isRedFlag: redFlagResult.isRedFlag,
      redFlags: redFlagResult.redFlags
    });
  } catch (err) {
    console.error('Error in /api/next:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/summary/:sessionId
 * Fetch full structured summary of a completed or in-progress session
 */
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const patient = await db.getPatientById(session.patient_id);
    const answers = await db.getSessionAnswers(sessionId);
    const documents = await db.getPatientDocuments(session.patient_id);
    let summary = await db.getClinicalSummary(sessionId);

    if (!summary && answers.length > 0) {
      summary = await generateAndSaveSummary(session);
    }

    res.json({
      success: true,
      session,
      patient,
      summary,
      answers,
      documents
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Helper function to synthesize answers into clinical summary
 */
async function generateAndSaveSummary(session) {
  const patient = await db.getPatientById(session.patient_id);
  const answers = await db.getSessionAnswers(session.id);
  const documents = await db.getPatientDocuments(session.patient_id);

  const answerMap = {};
  const redFlags = [];

  for (const a of answers) {
    answerMap[a.clinical_field] = a.raw_answer;
    if (a.is_red_flag) {
      redFlags.push({
        field: a.clinical_field,
        value: a.raw_answer,
        alert: `High risk reported for ${a.clinical_field}`
      });
    }
  }

  let chiefComplaint = answerMap.chief_complaint || answerMap.ayush_chief_complaint || 'General OPD Consultation';
  let hpi = '';
  let ayushAssessment = null;

  if (session.clinical_system === 'allopathy') {
    hpi = `Patient reports ${answerMap.character || 'discomfort'} at ${answerMap.site || 'chest area'} of ${answerMap.duration || 'recent'} duration. Severity rated ${answerMap.severity || 'N/A'}/10. Radiation: ${answerMap.radiation || 'none reported'}. Aggravated by ${answerMap.aggravating_factors || 'N/A'}, relieved by ${answerMap.relieving_factors || 'N/A'}. Associated symptoms: breathlessness (${answerMap.breathlessness || 'no'}), diaphoresis (${answerMap.sweating || 'no'}), nausea (${answerMap.nausea_vomiting || 'no'}).`;
  } else {
    hpi = `AYUSH consultation for ${chiefComplaint}. Evaluated across Dashavidha Pariksha criteria.`;
    ayushAssessment = {
      prakriti: {
        body_build: answerMap.prakriti_body_build || 'Unspecified',
        skin_hair: answerMap.prakriti_skin_hair || 'Unspecified',
        temperature_tolerance: answerMap.prakriti_temperature || 'Unspecified'
      },
      agni: answerMap.agni_digestive_fire || 'Unspecified',
      koshtha: answerMap.koshtha_bowel_pattern || 'Unspecified',
      ahara_shakti: answerMap.ahara_shakti_capacity || 'Unspecified',
      rasa_preference: answerMap.ahara_rasa_preference || 'Unspecified',
      vyayama_shakti: answerMap.vyayama_shakti_stamina || 'Unspecified',
      nidra: answerMap.nidra_sleep_quality || 'Unspecified',
      sattva: answerMap.sattva_mental_temperament || 'Unspecified',
      vihara: answerMap.vihara_lifestyle || 'Unspecified',
      vaya: answerMap.vaya_age_stage || 'Unspecified'
    };
  }

  // Call AI Microservice for physician summary (or fallback)
  let aiSummary = '';
  try {
    const aiResp = await axios.post(`${AI_SERVICE_URL}/summarize`, {
      system: session.clinical_system,
      patient: patient ? { name: patient.full_name, age: patient.age, gender: patient.gender } : null,
      answers: answerMap,
      red_flags: redFlags
    }, { timeout: 2500 });

    aiSummary = aiResp.data ? aiResp.data.summary : '';
  } catch (e) {
    aiSummary = `${session.clinical_system === 'ayush' ? 'AYUSH Holistic Assessment' : 'Allopathy Clinical History'} completed via Kiosk. ${redFlags.length > 0 ? 'WARNING: Emergency warning signs detected. Immediate physician review required.' : 'Routine OPD consultation queue.'}`;
  }

  const summaryRecord = await db.saveClinicalSummary({
    session_id: session.id,
    chief_complaint: chiefComplaint,
    hpi_summary: hpi,
    past_history: answerMap.past_medical_history || 'None reported',
    medications_summary: answerMap.current_medications || 'None reported',
    allergies_summary: answerMap.allergies || 'No known allergies reported',
    family_history: answerMap.family_history || 'Negative',
    personal_history: answerMap.habits || 'No high risk habits reported',
    review_of_systems: `Breathlessness: ${answerMap.breathlessness || 'No'}, Sweating: ${answerMap.sweating || 'No'}, Palpitations: ${answerMap.palpitations || 'No'}, Syncope: ${answerMap.syncope || 'No'}`,
    ayush_assessment: ayushAssessment,
    red_flags_summary: redFlags,
    ai_generated_summary: aiSummary,
    physician_notes: ''
  });

  return summaryRecord;
}

module.exports = router;
