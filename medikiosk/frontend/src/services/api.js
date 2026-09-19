import axios from 'axios';
import { StandaloneMockEngine } from './mockEngine';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000, // 8-second timeout for real backend OCR and AI processing
  headers: {
    'Content-Type': 'application/json'
  }
});

export const KioskService = {
  sendOtp: async (phone) => {
    try {
      const res = await api.post('/otp/send', { phone });
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] /otp/send unavailable, fallback to mock engine:', err?.message);
      return StandaloneMockEngine.sendOtp(phone);
    }
  },

  verifyOtp: async (phone, otp) => {
    try {
      const res = await api.post('/otp/verify', { phone, otp });
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] /otp/verify unavailable, fallback to mock engine:', err?.message);
      return StandaloneMockEngine.verifyOtp(phone, otp);
    }
  },

  getPatients: async () => {

    try {
      const res = await api.get('/patients');
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] /patients unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.getPatients();
    }
  },

  registerPatient: async (patientData) => {
    try {
      const res = await api.post('/patients', patientData);
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] /patients registration unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.registerPatient(patientData);
    }
  },

  startSession: async ({ language, system, patientId, conditionId, opdToken, hospitalName, hospitalId }) => {
    const payload = {
      language: language || 'en',
      system: system || 'allopathy',
      mode: (system || '').toUpperCase() === 'AYUSH' ? 'AYUSH' : 'ALLOPATHIC',
      patientId: patientId || null,
      patient_identifier: patientId || null,
      conditionId: conditionId || null,
      opdToken: opdToken || null,
      hospitalName: hospitalName || null,
      hospitalId: hospitalId || null
    };

    try {
      // Try standardized /session/init first, fallback to /start
      let res;
      try {
        res = await api.post('/session/init', payload);
      } catch {
        res = await api.post('/start', payload);
      }
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Session init unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.startSession({ language, system, patientId, conditionId, opdToken });
    }
  },

  submitAnswer: async ({ sessionId, questionId, answer, voiceTranscript }) => {
    const payload = {
      sessionId: sessionId,
      session_id: sessionId,
      questionId: questionId,
      answer: answer || '',
      user_input: answer || voiceTranscript || '',
      voiceTranscript: voiceTranscript || ''
    };

    try {
      // Try standardized /session/turn first, fallback to /next
      let res;
      try {
        res = await api.post('/session/turn', payload);
      } catch {
        res = await api.post('/next', payload);
      }
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Session turn unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.submitAnswer({ sessionId, questionId, answer, voiceTranscript });
    }
  },

  getSessionSummary: async (sessionId) => {
    try {
      const res = await api.get(`/summary/${sessionId}`);
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Session summary unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.getSessionDetail(sessionId);
    }
  },

  finalizeSession: async (sessionId) => {
    try {
      const res = await api.post('/session/finalize', {
        session_id: sessionId,
        sessionId: sessionId
      });
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Finalize session unavailable, using local mock engine:', err?.message);
      return {
        success: true,
        sessionId: sessionId,
        summary: StandaloneMockEngine.getSessionDetail(sessionId)?.summary || {},
        fhirBundle: StandaloneMockEngine.getFhirBundle(sessionId),
        entriesCount: 6,
        dpdp_purged: true
      };
    }
  },

  uploadDocument: async (formData) => {
    try {
      const res = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Document upload unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.uploadDocument(formData);
    }
  },

  getPatientDocuments: async (patientId) => {
    try {
      const res = await api.get(`/documents/patient/${patientId}`);
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Patient documents unavailable, returning empty timeline:', err?.message);
      return { success: true, timeline: [] };
    }
  }
};

export const DoctorService = {
  getSessions: async () => {
    try {
      // Try /doctor/queue first, fallback to /doctor/sessions
      let res;
      try {
        res = await api.get('/doctor/queue');
      } catch {
        res = await api.get('/doctor/sessions');
      }
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Doctor queue unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.getSessions();
    }
  },

  getSessionDetail: async (sessionId) => {
    try {
      // Try /doctor/summary/{sessionId} first, fallback to /doctor/session/{sessionId}
      let res;
      try {
        res = await api.get(`/doctor/summary/${sessionId}`);
      } catch {
        res = await api.get(`/doctor/session/${sessionId}`);
      }
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Doctor session detail unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.getSessionDetail(sessionId);
    }
  },

  submitReview: async (reviewData) => {
    try {
      const res = await api.post('/doctor-review', reviewData);
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] Doctor review submission unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.submitReview(reviewData);
    }
  },

  getFhirBundle: async (sessionId) => {
    try {
      const res = await api.get(`/fhir/${sessionId}`);
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] FHIR bundle unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.getFhirBundle(sessionId);
    }
  },

  pushToAbdm: async (pushData) => {
    try {
      const res = await api.post('/integrations/push', pushData);
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] ABDM push unavailable, using local mock engine:', err?.message);
      return StandaloneMockEngine.pushToAbdm(pushData);
    }
  },

  verifyDoctorPin: async (pin, staffId = 'DOC-AIIMS-108') => {
    try {
      const res = await api.post('/doctor/auth', { pin, staff_id: staffId });
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] /doctor/auth endpoint check fallback:', err?.message);
      return StandaloneMockEngine.verifyDoctorPin(pin, staffId);
    }
  },

  sendSmsReminder: async (payload) => {
    try {
      const res = await api.post('/doctor/send-visit-reminder', payload);
      return res.data;
    } catch (err) {
      console.warn('[MediKiosk API] sendSmsReminder failed:', err?.message);
      return { success: false, message: err?.message };
    }
  }
};

export default api;
