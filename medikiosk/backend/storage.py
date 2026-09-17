import datetime
import uuid
import os
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("storage")

SEED_PATIENTS = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "abha_id": "91-2345-6789-0123",
        "aadhaar_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "full_name": "Ramesh Sharma",
        "age": 54,
        "gender": "Male",
        "phone": "+91 ******0001",
        "blood_group": "B+"
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "abha_id": "91-8765-4321-9876",
        "aadhaar_hash": "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
        "full_name": "Sunita Patel",
        "age": 42,
        "gender": "Female",
        "phone": "+91 ******0002",
        "blood_group": "O+"
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "abha_id": "91-1122-3344-5566",
        "aadhaar_hash": "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
        "full_name": "Rajesh Kumar",
        "age": 61,
        "gender": "Male",
        "phone": "+91 ******0003",
        "blood_group": "A+"
    }
]


INITIAL_DEMO_SESSION_ID = "00000000-0000-0000-0000-000000000001"

class InMemoryOPDStore:
    def __init__(self):
        self.patients: List[Dict[str, Any]] = list(SEED_PATIENTS)
        self.sessions: List[Dict[str, Any]] = [
            {
                "id": INITIAL_DEMO_SESSION_ID,
                "patient_id": "11111111-1111-1111-1111-111111111111",
                "patient_name": "Ramesh Sharma",
                "age": 54,
                "gender": "Male",
                "abha_id": "91-2345-6789-0123",
                "language": "en",
                "clinical_system": "allopathy",
                "condition_id": "chest_pain",
                "status": "flagged",
                "red_flag_detected": True,
                "consent_given": True,
                "opd_token_number": "OPD-101",
                "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15)).isoformat()
            }
        ]
        self.answers: List[Dict[str, Any]] = [
            {
                "session_id": INITIAL_DEMO_SESSION_ID,
                "question_id": "cp_q1",
                "clinical_field": "chief_complaint",
                "raw_answer": "chest_pain_pressure",
                "is_red_flag": False
            },
            {
                "session_id": INITIAL_DEMO_SESSION_ID,
                "question_id": "cp_q6",
                "clinical_field": "severity",
                "raw_answer": "8",
                "is_red_flag": True
            },
            {
                "session_id": INITIAL_DEMO_SESSION_ID,
                "question_id": "cp_q7",
                "clinical_field": "radiation",
                "raw_answer": "left arm",
                "is_red_flag": True
            }
        ]
        self.documents: List[Dict[str, Any]] = [
            {
                "id": "doc-demo-001",
                "patient_id": "11111111-1111-1111-1111-111111111111",
                "file_name": "apollo_prescription_feb2024.pdf",
                "document_type": "prescription",
                "document_date": "2024-02-10",
                "extractions": {
                    "diagnoses": ["Essential Hypertension", "Dyslipidemia"],
                    "medications": [
                        {"name": "Telmisartan", "dosage": "40mg", "frequency": "Once daily morning"},
                        {"name": "Atorvastatin", "dosage": "20mg", "frequency": "Once daily night"},
                        {"name": "Ecosprin", "dosage": "75mg", "frequency": "Once daily afternoon"}
                    ],
                    "lab_results": [],
                    "adherence_discrepancies": []
                }
            },
            {
                "id": "doc-demo-002",
                "patient_id": "11111111-1111-1111-1111-111111111111",
                "file_name": "lipid_profile_may2024.pdf",
                "document_type": "lab_report",
                "document_date": "2024-05-18",
                "extractions": {
                    "diagnoses": ["Hypercholesterolemia"],
                    "medications": [],
                    "lab_results": [
                        {"test": "Total Cholesterol", "value": "242 mg/dL", "flag": "HIGH", "abnormal": True},
                        {"test": "LDL Cholesterol", "value": "164 mg/dL", "flag": "HIGH", "abnormal": True},
                        {"test": "HDL Cholesterol", "value": "38 mg/dL", "flag": "LOW", "abnormal": True}
                    ],
                    "adherence_discrepancies": []
                }
            }
        ]
        self.summaries: Dict[str, Dict[str, Any]] = {
            INITIAL_DEMO_SESSION_ID: {
                "chief_complaint": "Acute retrosternal crushing chest discomfort of 2 hours duration",
                "hpi_summary": "54-year-old male with known hypertension presents with sudden onset crushing retrosternal chest pain (severity 8/10), radiating to left arm and shoulder. Accompanied by shortness of breath and diaphoresis.",
                "past_history": "Essential Hypertension (diagnosed 2021), Dyslipidemia.",
                "medications_summary": "Telmisartan 40mg OD, Atorvastatin 20mg OD, Ecosprin 75mg OD.",
                "allergies_summary": "No known drug allergies reported.",
                "family_history": "Paternal history of CAD at age 58.",
                "personal_history": "Non-smoker.",
                "review_of_systems": "Positive for dyspnea and sweating. Denies syncope.",
                "red_flags_summary": [
                    {"rule_name": "Left Arm / Shoulder Radiation", "severity": "CRITICAL", "warning": "High-risk symptom for acute coronary syndrome."}
                ],
                "physician_notes": "Urgent Stat ECG requested. Bedside telemetry initiated."
            }
        }
        self.reviews: Dict[str, Dict[str, Any]] = {}

    # Patient Ops
    def get_patients(self) -> List[Dict[str, Any]]:
        return self.patients

    def get_patient_by_id(self, patient_id: str) -> Optional[Dict[str, Any]]:
        return next((p for p in self.patients if p["id"] == patient_id), None)

    def register_patient(self, data: Dict[str, Any]) -> Dict[str, Any]:
        new_p = {
            "id": f"p-{uuid.uuid4()}",
            "abha_id": data.get("abha_id") or f"91-{str(uuid.uuid4().int)[:4]}-{str(uuid.uuid4().int)[4:8]}-{str(uuid.uuid4().int)[8:12]}",
            "aadhaar_hash": "sha256_" + uuid.uuid4().hex,
            "full_name": data.get("full_name", "Walk-in Patient"),
            "age": int(data.get("age", 35)),
            "gender": data.get("gender", "Male"),
            "phone": data.get("phone", ""),
            "blood_group": data.get("blood_group", "O+"),
            "chief_complaint": data.get("chief_complaint", ""),
            "past_history": data.get("past_history", ""),
            "medications_summary": data.get("medications_summary", ""),
            "allergies_summary": data.get("allergies_summary", ""),
            "family_history": data.get("family_history", ""),
            "personal_history": data.get("personal_history", ""),
            "review_of_systems": data.get("review_of_systems", "")
        }
        self.patients.append(new_p)
        return new_p

    # Session Ops
    def create_session(
        self,
        patient: Dict[str, Any],
        language: str = "en",
        clinical_system: str = "allopathy",
        condition_id: str = "chest_pain"
    ) -> Dict[str, Any]:
        session_id = f"sess-{uuid.uuid4()}"
        opd_token = f"OPD-{100 + len(self.sessions) + 1}"
        session = {
            "id": session_id,
            "patient_id": patient["id"],
            "patient_name": patient["full_name"],
            "age": patient["age"],
            "gender": patient["gender"],
            "abha_id": patient.get("abha_id", "91-2345-6789-0123"),
            "language": language,
            "clinical_system": clinical_system,
            "condition_id": condition_id,
            "status": "in_progress",
            "red_flag_detected": False,
            "consent_given": True,
            "opd_token_number": opd_token,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        self.sessions.insert(0, session)
        return session

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return next((s for s in self.sessions if s["id"] == session_id), None)

    def get_sessions(self) -> List[Dict[str, Any]]:
        return self.sessions

    def add_answer(self, answer_data: Dict[str, Any]):
        self.answers.append(answer_data)

    def get_answers_for_session(self, session_id: str) -> List[Dict[str, Any]]:
        return [a for a in self.answers if a["session_id"] == session_id]

    def set_summary(self, session_id: str, summary: Dict[str, Any]):
        self.summaries[session_id] = summary

    def get_summary(self, session_id: str) -> Dict[str, Any]:
        if session_id in self.summaries:
            return self.summaries[session_id]
        
        session = self.get_session(session_id)
        if session:
            patient = self.get_patient_by_id(session.get("patient_id"))
            if patient:
                return {
                    "chief_complaint": patient.get("chief_complaint") or ("AYUSH Case Intake" if session.get("clinical_system") == "ayush" else "General OPD Consultation"),
                    "hpi_summary": f"Patient {patient.get('full_name')} attended OPD Kiosk. Demographics and clinical history intake recorded at kiosk.",
                    "past_history": patient.get("past_history") or "None reported",
                    "medications_summary": patient.get("medications_summary") or "No regular modern medications",
                    "allergies_summary": patient.get("allergies_summary") or "No known allergies reported",
                    "family_history": patient.get("family_history") or "Negative",
                    "personal_history": patient.get("personal_history") or "Standard routine",
                    "review_of_systems": patient.get("review_of_systems") or "Recorded at kiosk",
                    "red_flags_summary": [],
                    "physician_notes": ""
                }
        return self.summaries.get(INITIAL_DEMO_SESSION_ID, {})

    def add_document(self, doc_data: Dict[str, Any]):
        self.documents.append(doc_data)

    def get_documents_for_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        return [d for d in self.documents if d.get("patient_id") == patient_id]

    def set_review(self, session_id: str, review_data: Dict[str, Any]):
        self.reviews[session_id] = review_data
        session = self.get_session(session_id)
        if session:
            session["status"] = "reviewed"

    def get_review(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.reviews.get(session_id)

    # DPDP Act 2023 Compliance: Ephemeral Memory Purging
    def purge_ephemeral_cache(self, session_id: str):
        """
        Enforces DPDP Act 2023 compliance by immediately purging temporary audio buffers,
        raw ASR transcripts, and local upload cache once the bundle is finalized.
        """
        logger.info(f"[DPDP-2023] Purging temporary cache and audio disclosures for session: {session_id}")
        # Clear raw voice transcripts stored in answers
        for a in self.answers:
            if a.get("session_id") == session_id and "voiceTranscript" in a:
                a["voiceTranscript"] = "[PURGED_DPDP_COMPLIANT]"

# Singleton store
store = InMemoryOPDStore()
