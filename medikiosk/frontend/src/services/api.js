import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const KioskService = {
  getPatients: async () => {
    const res = await api.get('/patients');
    return res.data;
  },

  registerPatient: async (patientData) => {
    const res = await api.post('/patients', patientData);
    return res.data;
  },

  startSession: async ({ language, system, patientId, conditionId }) => {
    const res = await api.post('/start', { language, system, patientId, conditionId });
    return res.data;
  },

  submitAnswer: async ({ sessionId, questionId, answer, voiceTranscript }) => {
    const res = await api.post('/next', { sessionId, questionId, answer, voiceTranscript });
    return res.data;
  },

  getSessionSummary: async (sessionId) => {
    const res = await api.get(`/summary/${sessionId}`);
    return res.data;
  },

  uploadDocument: async (formData) => {
    const res = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  getPatientDocuments: async (patientId) => {
    const res = await api.get(`/documents/patient/${patientId}`);
    return res.data;
  }
};

export const DoctorService = {
  getSessions: async () => {
    const res = await api.get('/doctor/sessions');
    return res.data;
  },

  getSessionDetail: async (sessionId) => {
    const res = await api.get(`/doctor/session/${sessionId}`);
    return res.data;
  },

  submitReview: async (reviewData) => {
    const res = await api.post('/doctor-review', reviewData);
    return res.data;
  },

  getFhirBundle: async (sessionId) => {
    const res = await api.get(`/fhir/${sessionId}`);
    return res.data;
  },

  pushToAbdm: async (pushData) => {
    const res = await api.post('/integrations/push', pushData);
    return res.data;
  }
};

export default api;
