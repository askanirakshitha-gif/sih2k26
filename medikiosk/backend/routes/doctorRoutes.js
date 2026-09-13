const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { db } = require('../services/db');
const FhirGenerator = require('../services/fhirGenerator');

/**
 * GET /api/doctor/sessions
 * List all active/completed kiosk patient sessions for OPD Doctor Queue
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await db.getAllSessions();
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/doctor/session/:sessionId
 * Complete clinical case file for a patient session
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const patient = await db.getPatientById(session.patient_id);
    const answers = await db.getSessionAnswers(sessionId);
    const summary = await db.getClinicalSummary(sessionId);
    const review = await db.getDoctorReview(sessionId);
    const documents = await db.getPatientDocuments(session.patient_id);

    res.json({
      success: true,
      session,
      patient,
      summary,
      answers,
      review,
      documents
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/doctor-review
 * Doctor verifies, edits clinical summary, and signs case
 */
router.post('/doctor-review', async (req, res) => {
  try {
    const {
      sessionId,
      doctorId = 'DOC-AYUSH-104',
      doctorName = 'Dr. Vikramaditya Sharma, MD',
      verificationStatus = 'verified',
      provisionalDiagnosis,
      prescriptionNotes,
      editedSummary
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const patient = await db.getPatientById(session.patient_id);
    const answers = await db.getSessionAnswers(sessionId);
    const documents = await db.getPatientDocuments(session.patient_id);
    let summary = await db.getClinicalSummary(sessionId);

    // If doctor edited the summary, update it
    if (editedSummary && summary) {
      await db.saveClinicalSummary({
        ...summary,
        ...editedSummary,
        session_id: sessionId
      });
      summary = await db.getClinicalSummary(sessionId);
    }

    // Generate compliant FHIR Bundle
    const fhirBundle = FhirGenerator.generateBundle({
      session,
      patient,
      answers,
      summary,
      documents,
      review: { verificationStatus, provisionalDiagnosis, prescriptionNotes }
    });

    const reviewRecord = await db.saveDoctorReview({
      session_id: sessionId,
      doctor_id: doctorId,
      doctor_name: doctorName,
      verification_status: verificationStatus,
      provisional_diagnosis: provisionalDiagnosis || 'Provisional diagnosis verified by attending physician',
      prescription_notes: prescriptionNotes || '',
      fhir_bundle: fhirBundle,
      pushed_to_abdm: false
    });

    // Update session status to reviewed
    await db.updateSession(sessionId, { status: 'reviewed' });

    res.json({
      success: true,
      message: 'Clinical record verified and signed by physician',
      review: reviewRecord,
      fhirBundle
    });
  } catch (err) {
    console.error('Error saving doctor review:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/fhir/:sessionId
 * Retrieve the generated FHIR R4 Bundle for an OPD case
 */
router.get('/fhir/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const patient = await db.getPatientById(session.patient_id);
    const answers = await db.getSessionAnswers(sessionId);
    const summary = await db.getClinicalSummary(sessionId);
    const review = await db.getDoctorReview(sessionId);
    const documents = await db.getPatientDocuments(session.patient_id);

    const fhirBundle = FhirGenerator.generateBundle({
      session,
      patient,
      answers,
      summary,
      documents,
      review
    });

    res.json(fhirBundle);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/integrations/push
 * Push verified clinical record to mock ABDM / Hospital Information System (HIS)
 */
router.post('/integrations/push', async (req, res) => {
  try {
    const { sessionId, doctorId, abhaId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const patient = await db.getPatientById(session.patient_id);
    const answers = await db.getSessionAnswers(sessionId);
    const summary = await db.getClinicalSummary(sessionId);
    const documents = await db.getPatientDocuments(session.patient_id);
    const review = await db.getDoctorReview(sessionId);

    // Generate FHIR bundle if not already done
    const fhirBundle = FhirGenerator.generateBundle({
      session,
      patient,
      answers,
      summary,
      documents,
      review
    });

    // Simulate realistic ABDM Health Information Provider (HIP) Gateway Response
    const mockTxId = `ABDM-HIP-TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const hipId = 'IN08100001-DISTRICT-CIVIL-HOSP';

    await db.saveDoctorReview({
      session_id: sessionId,
      pushed_to_abdm: true,
      abdm_transaction_id: mockTxId,
      fhir_bundle: fhirBundle
    });

    res.json({
      success: true,
      message: 'Record successfully pushed to mock HIS/ABDM',
      transactionId: mockTxId,
      hipId,
      abhaId: patient ? patient.abha_id : abhaId || '91-2345-6789-0123',
      timestamp: new Date().toISOString(),
      bundleSummary: {
        resourceType: 'Bundle',
        entriesCount: fhirBundle.entry ? fhirBundle.entry.length : 0,
        resources: (fhirBundle.entry || []).map(e => e.resource.resourceType)
      }
    });
  } catch (err) {
    console.error('Error pushing to ABDM:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
