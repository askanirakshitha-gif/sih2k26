import axios from 'axios';
import { StandaloneMockEngine } from './mockEngine';

const api = axios.create({
  baseURL: '/api',
  timeout: 1000, // Quick timeout for seamless standalone fallback
  headers: {
    'Content-Type': 'application/json'
  }
});

export const KioskService = {
  getPatients: async () => {
    try {
      const res = await api.get('/patients');
      return res.data;
    } catch {
      return StandaloneMockEngine.getPatients();
    }
  },

  registerPatient: async (patientData) => {
    try {
      const res = await api.post('/patients', patientData);
      return res.data;
    } catch {
      return StandaloneMockEngine.registerPatient(patientData);
    }
  },

  startSession: async ({ language, system, patientId, conditionId }) => {
    try {
      const res = await api.post('/start', { language, system, patientId, conditionId });
      return res.data;
    } catch {
      return StandaloneMockEngine.startSession({ language, system, patientId, conditionId });
    }
  },

  submitAnswer: async ({ sessionId, questionId, answer, voiceTranscript }) => {
    try {
      const res = await api.post('/next', { sessionId, questionId, answer, voiceTranscript });
      return res.data;
    } catch {
      return StandaloneMockEngine.submitAnswer({ sessionId, questionId, answer, voiceTranscript });
    }
  },

  getSessionSummary: async (sessionId) => {
    try {
      const res = await api.get(`/summary/${sessionId}`);
      return res.data;
    } catch {
      return StandaloneMockEngine.getSessionDetail(sessionId);
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
    } catch {
      return StandaloneMockEngine.uploadDocument(formData);
    }
  },

  getPatientDocuments: async (patientId) => {
    try {
      const res = await api.get(`/documents/patient/${patientId}`);
      return res.data;
    } catch {
      return { success: true, timeline: [] };
    }
  }
};

export const DoctorService = {
  getSessions: async () => {
    try {
      const res = await api.get('/doctor/sessions');
      return res.data;
    } catch {
      return StandaloneMockEngine.getSessions();
    }
  },

  getSessionDetail: async (sessionId) => {
    try {
      const res = await api.get(`/doctor/session/${sessionId}`);
      return res.data;
    } catch {
      return StandaloneMockEngine.getSessionDetail(sessionId);
    }
  },

  submitReview: async (reviewData) => {
    try {
      const res = await api.post('/doctor-review', reviewData);
      return res.data;
    } catch {
      return StandaloneMockEngine.submitReview(reviewData);
    }
  },

  getFhirBundle: async (sessionId) => {
    try {
      const res = await api.get(`/fhir/${sessionId}`);
      return res.data;
    } catch {
      return StandaloneMockEngine.getFhirBundle(sessionId);
    }
  },

  pushToAbdm: async (pushData) => {
    try {
      const res = await api.post('/integrations/push', pushData);
      return res.data;
    } catch {
      return StandaloneMockEngine.pushToAbdm(pushData);
    }
  }
};

export default api;
