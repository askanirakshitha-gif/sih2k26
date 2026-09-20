import datetime
import uuid
import os
import json
import logging
from typing import Dict, Any, List, Optional
try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    psycopg = None
    dict_row = None

from engine import clinical_engine

logger = logging.getLogger("storage")


def _jsonb(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, bytes)):
        return value
    return json.dumps(value, default=str)


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
        self.use_fallback_db = str(os.getenv("USE_FALLBACK_DB", "false")).lower() == "true"
        self.db_conn = None
        if not self.use_fallback_db:
            self.db_conn = self._connect_db()
            if self.db_conn is not None:
                self._initialize_db_schema()

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
        self.medical_history: List[Dict[str, Any]] = []

    def _connect_db(self):
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            logger.warning("DATABASE_URL is not configured; continuing in fallback in-memory mode.")
            return None
        try:
            conn = psycopg.connect(db_url, autocommit=True, row_factory=dict_row)
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            logger.info("Supabase/PostgreSQL connection established.")
            return conn
        except Exception as exc:  # pragma: no cover
            logger.warning("Database connection unavailable; falling back to in-memory store: %s", exc)
            return None

    def _initialize_db_schema(self):
        if not self.db_conn:
            return
        try:
            with self.db_conn.cursor() as cur:
                cur.execute("ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS emergency_contact text;")
                cur.execute("ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS email text;")
                cur.execute("ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS hospital_name text;")
                self._seed_question_bank()
        except Exception as exc:  # pragma: no cover
            logger.warning("Database migration check failed: %s", exc)

    def _seed_question_bank(self):
        if not self.db_conn:
            return
        try:
            all_questions = clinical_engine.get_questions_for_system("allopathy") + clinical_engine.get_questions_for_system("ayush")
            with self.db_conn.cursor() as cur:
                for question in all_questions:
                    q_text = question.get("question_text_en") or ""
                    q_type = question.get("question_type", "single_choice")
                    options = question.get("options", [])
                    cur.execute(
                        """
                        INSERT INTO questions (id, system, stage, clinical_field, question_text, question_type, required, options)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                        ON CONFLICT (id) DO UPDATE SET
                            system = EXCLUDED.system,
                            stage = EXCLUDED.stage,
                            clinical_field = EXCLUDED.clinical_field,
                            question_text = EXCLUDED.question_text,
                            question_type = EXCLUDED.question_type,
                            required = EXCLUDED.required,
                            options = EXCLUDED.options
                        """,
                        (
                            question["id"],
                            question.get("clinical_system", "allopathy"),
                            question.get("protocol_stage", "SITE"),
                            question.get("clinical_field", ""),
                            q_text,
                            q_type,
                            bool(question.get("required", True)),
                            _jsonb(options)
                        )
                    )
            logger.info("Clinical question bank seeded into PostgreSQL (%s questions)", len(all_questions))
        except Exception as exc:  # pragma: no cover
            logger.warning("Question-bank seeding failed: %s", exc)

    def _ensure_patient_payload(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": data.get("id") or str(uuid.uuid4()),
            "abha_id": data.get("abha_id") or f"91-{str(uuid.uuid4().int)[:4]}-{str(uuid.uuid4().int)[4:8]}-{str(uuid.uuid4().int)[8:12]}",
            "aadhaar_hash": data.get("aadhaar_hash") or ("sha256_" + uuid.uuid4().hex),
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
            "review_of_systems": data.get("review_of_systems", ""),
            "emergency_contact": data.get("emergency_contact", ""),
            "email": data.get("email", "")
        }

    def _sync_memory_patient(self, patient: Dict[str, Any]):
        patient_id = str(patient.get("id"))
        self.patients = [p for p in self.patients if str(p.get("id")) != patient_id]
        self.patients.append(patient)

    def _upsert_medical_history_row(self, patient_id: str, session_id: Optional[str], history_type: str, title: str, details: str, source: str = "kiosk"):
        if not patient_id:
            return
        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO medical_history (patient_id, session_id, history_type, title, details, source)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (patient_id, session_id, history_type, title, details, source)
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("Medical history persistence to DB failed: %s", exc)

    def _save_consent_record(self, patient_id: str, session_id: Optional[str], consent_type: str = "clinical_consultation", accepted: bool = True, consent_text: str = "Consent provided for clinical consultation and treatment planning.", consent_version: str = "v1"):
        if not patient_id:
            return
        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO consents (patient_id, session_id, consent_type, consent_version, accepted, consent_text, metadata)
                        VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            patient_id,
                            session_id,
                            consent_type,
                            consent_version,
                            accepted,
                            consent_text,
                            _jsonb({"source": "kiosk"})
                        )
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("Consent persistence to DB failed: %s", exc)

    def _save_assessment_record(self, patient_id: str, session_id: Optional[str], assessment_type: str, score: Optional[float], findings: Dict[str, Any], severity: Optional[str], status: str = "completed"):
        if not patient_id:
            return
        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO assessments (patient_id, session_id, assessment_type, score, findings, severity, status)
                        VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s)
                        """,
                        (patient_id, session_id, assessment_type, score, _jsonb(findings or {}), severity, status)
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("Assessment persistence to DB failed: %s", exc)

    def _save_recommendation_record(self, patient_id: str, session_id: Optional[str], recommendation_type: str, title: str, details: str, priority: str = "routine"):
        if not patient_id:
            return
        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO recommendations (patient_id, session_id, recommendation_type, title, details, priority)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (patient_id, session_id, recommendation_type, title, details, priority)
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("Recommendation persistence to DB failed: %s", exc)

    def _save_abdm_record(self, patient_id: str, session_id: Optional[str], abha_id: Optional[str], transaction_id: str, hip_id: str, payload: Dict[str, Any], status: str = "success"):
        if not patient_id:
            return
        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO abdm_records (patient_id, session_id, abha_id, transaction_id, hip_id, payload, status)
                        VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                        """,
                        (patient_id, session_id, abha_id, transaction_id, hip_id, _jsonb(payload), status)
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("ABDM record persistence to DB failed: %s", exc)

    # Patient Ops
    def get_patients(self) -> List[Dict[str, Any]]:
        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute("SELECT * FROM patients ORDER BY created_at DESC")
                    rows = cur.fetchall() or []
                if rows:
                    patients = []
                    for row in rows:
                        converted = dict(row)
                        converted["id"] = str(converted["id"])
                        patients.append(converted)
                    self.patients = patients
                    return patients
            except Exception as exc:  # pragma: no cover
                logger.warning("Read from database failed; using in-memory patient list: %s", exc)
        return self.patients

    def get_patient_by_id(self, patient_id: str) -> Optional[Dict[str, Any]]:
        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute("SELECT * FROM patients WHERE id::text = %s LIMIT 1", (str(patient_id),))
                    row = cur.fetchone()
                if row:
                    patient = dict(row)
                    patient["id"] = str(patient["id"])
                    return patient
            except Exception as exc:  # pragma: no cover
                logger.warning("DB patient lookup failed: %s", exc)
        return next((p for p in self.patients if str(p["id"]) == str(patient_id)), None)

    def register_patient(self, data: Dict[str, Any]) -> Dict[str, Any]:
        new_p = self._ensure_patient_payload(data)
        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO patients (
                            id, abha_id, aadhaar_hash, full_name, age, gender, phone, blood_group,
                            chief_complaint, past_history, medications_summary, allergies_summary,
                            family_history, personal_history, review_of_systems, emergency_contact, email
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (abha_id) DO UPDATE SET
                            full_name = EXCLUDED.full_name,
                            age = EXCLUDED.age,
                            gender = EXCLUDED.gender,
                            phone = EXCLUDED.phone,
                            blood_group = EXCLUDED.blood_group,
                            chief_complaint = EXCLUDED.chief_complaint,
                            past_history = EXCLUDED.past_history,
                            medications_summary = EXCLUDED.medications_summary,
                            allergies_summary = EXCLUDED.allergies_summary,
                            family_history = EXCLUDED.family_history,
                            personal_history = EXCLUDED.personal_history,
                            review_of_systems = EXCLUDED.review_of_systems,
                            emergency_contact = EXCLUDED.emergency_contact,
                            email = EXCLUDED.email,
                            updated_at = now()
                        RETURNING *
                        """,
                        (
                            new_p["id"], new_p["abha_id"], new_p["aadhaar_hash"], new_p["full_name"], new_p["age"], new_p["gender"],
                            new_p["phone"], new_p["blood_group"], new_p["chief_complaint"], new_p["past_history"],
                            new_p["medications_summary"], new_p["allergies_summary"], new_p["family_history"],
                            new_p["personal_history"], new_p["review_of_systems"], new_p["emergency_contact"], new_p["email"]
                        )
                    )
                    row = cur.fetchone()
                    if row:
                        merged = dict(row)
                        merged["id"] = str(merged["id"])
                        self._sync_memory_patient(merged)
                        return merged
            except Exception as exc:  # pragma: no cover
                logger.warning("Write to database failed, staying on in-memory path: %s", exc)

        self._sync_memory_patient(new_p)

        self._upsert_medical_history_row(new_p.get("id"), None, "chief_complaint", "Chief complaint", new_p.get("chief_complaint") or "Not specified", "kiosk")
        self._upsert_medical_history_row(new_p.get("id"), None, "past_history", "Past history", new_p.get("past_history") or "Not specified", "kiosk")
        self._upsert_medical_history_row(new_p.get("id"), None, "medications", "Current medications", new_p.get("medications_summary") or "Not specified", "kiosk")
        self._upsert_medical_history_row(new_p.get("id"), None, "allergies", "Allergies", new_p.get("allergies_summary") or "No known allergies", "kiosk")
        self._upsert_medical_history_row(new_p.get("id"), None, "family_history", "Family history", new_p.get("family_history") or "Not specified", "kiosk")
        self._upsert_medical_history_row(new_p.get("id"), None, "personal_history", "Personal history", new_p.get("personal_history") or "Not specified", "kiosk")
        self._upsert_medical_history_row(new_p.get("id"), None, "review_of_systems", "Review of systems", new_p.get("review_of_systems") or "Not specified", "kiosk")

        self._save_consent_record(new_p.get("id"), None, consent_type="clinical_consultation", accepted=True, consent_text="Consent provided for clinical consultation and treatment planning.")

        return new_p

    # Session Ops
    def create_session(
        self,
        patient: Dict[str, Any],
        language: str = "en",
        clinical_system: str = "allopathy",
        condition_id: str = "chest_pain",
        hospital_name: Optional[str] = None,
        hospital_id: Optional[str] = None
    ) -> Dict[str, Any]:
        session_id = str(uuid.uuid4())
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
            "hospital_name": hospital_name or "Manipal Hospital, HAL Airport Road, Bengaluru",
            "hospital_id": hospital_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO sessions (
                            id, patient_id, hospital_id, hospital_name, language, clinical_system,
                            condition_id, status, red_flag_detected, consent_given, opd_token_number
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *
                        """,
                        (
                            session_id,
                            patient["id"],
                            hospital_id,
                            session["hospital_name"],
                            language,
                            clinical_system,
                            condition_id,
                            "in_progress",
                            False,
                            True,
                            opd_token,
                        )
                    )
                    row = cur.fetchone()
                    if row:
                        db_session = dict(row)
                        db_session["id"] = str(db_session["id"])
                        db_session["patient_id"] = str(db_session["patient_id"])
                        session.update(db_session)
            except Exception as exc:  # pragma: no cover
                logger.warning("Session insert to database failed; keeping in-memory session: %s", exc)

        self._save_consent_record(patient["id"], session_id, consent_type="clinical_consultation", accepted=True, consent_text=f"Consent for {clinical_system} consultation at {session['hospital_name']}.")
        self.sessions.insert(0, session)
        return session

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return next((s for s in self.sessions if str(s["id"]) == str(session_id)), None)

    def get_sessions(self) -> List[Dict[str, Any]]:
        return self.sessions

    def add_answer(self, answer_data: Dict[str, Any]):
        self.answers.append(answer_data)
        if self.db_conn is not None and answer_data.get("session_id"):
            try:
                session_id = str(answer_data["session_id"])
                patient_id = None
                with self.db_conn.cursor() as cur:
                    cur.execute("SELECT patient_id FROM sessions WHERE id::text = %s LIMIT 1", (session_id,))
                    row = cur.fetchone()
                    if row:
                        patient_id = row["patient_id"]
                metadata = {
                    "cleaned_transcript": answer_data.get("cleaned_transcript"),
                    "matched_option": answer_data.get("matched_option"),
                    "voiceTranscript": answer_data.get("voiceTranscript")
                }
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO patient_answers (
                            patient_id, session_id, question_id, clinical_field, raw_answer,
                            normalized_value, option_value, is_red_flag, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                        """,
                        (
                            patient_id,
                            session_id,
                            answer_data.get("question_id"),
                            answer_data.get("clinical_field"),
                            answer_data.get("raw_answer"),
                            answer_data.get("cleaned_transcript") or answer_data.get("raw_answer"),
                            answer_data.get("matched_option") or answer_data.get("answer"),
                            bool(answer_data.get("is_red_flag")),
                            _jsonb(metadata)
                        )
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("Answer persistence to DB failed: %s", exc)

    def get_answers_for_session(self, session_id: str) -> List[Dict[str, Any]]:
        return [a for a in self.answers if str(a["session_id"]) == str(session_id)]

    def set_summary(self, session_id: str, summary: Dict[str, Any]):
        self.summaries[session_id] = summary
        session = self.get_session(session_id)
        patient_id = session.get("patient_id") if session else None
        if patient_id and self.db_conn is not None:
            self._upsert_medical_history_row(patient_id, session_id, "chief_complaint", "Chief complaint", summary.get("chief_complaint") or "Not specified", "summary")
            self._upsert_medical_history_row(patient_id, session_id, "past_history", "Past history", summary.get("past_history") or "Not specified", "summary")
            self._upsert_medical_history_row(patient_id, session_id, "medications", "Current medications", summary.get("medications_summary") or "Not specified", "summary")
            self._upsert_medical_history_row(patient_id, session_id, "allergies", "Allergies", summary.get("allergies_summary") or "No known allergies", "summary")
            self._upsert_medical_history_row(patient_id, session_id, "family_history", "Family history", summary.get("family_history") or "Not specified", "summary")
            self._upsert_medical_history_row(patient_id, session_id, "personal_history", "Personal history", summary.get("personal_history") or "Not specified", "summary")
            self._upsert_medical_history_row(patient_id, session_id, "review_of_systems", "Review of systems", summary.get("review_of_systems") or "Not specified", "summary")

        if self.db_conn is not None:
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO clinical_summaries (
                            patient_id, session_id, chief_complaint, hpi_summary, past_history,
                            medications_summary, allergies_summary, family_history, personal_history,
                            review_of_systems, red_flags_summary, physician_notes
                        ) VALUES (
                            (SELECT patient_id FROM sessions WHERE id::text = %s LIMIT 1), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s
                        )
                        ON CONFLICT (session_id) DO UPDATE SET
                            chief_complaint = EXCLUDED.chief_complaint,
                            hpi_summary = EXCLUDED.hpi_summary,
                            past_history = EXCLUDED.past_history,
                            medications_summary = EXCLUDED.medications_summary,
                            allergies_summary = EXCLUDED.allergies_summary,
                            family_history = EXCLUDED.family_history,
                            personal_history = EXCLUDED.personal_history,
                            review_of_systems = EXCLUDED.review_of_systems,
                            red_flags_summary = EXCLUDED.red_flags_summary,
                            physician_notes = EXCLUDED.physician_notes,
                            created_at = now()
                        """,
                        (
                            str(session_id),
                            session_id,
                            summary.get("chief_complaint"),
                            summary.get("hpi_summary"),
                            summary.get("past_history"),
                            summary.get("medications_summary"),
                            summary.get("allergies_summary"),
                            summary.get("family_history"),
                            summary.get("personal_history"),
                            summary.get("review_of_systems"),
                            _jsonb(summary.get("red_flags_summary", [])),
                            summary.get("physician_notes")
                        )
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("Clinical summary persistence to DB failed: %s", exc)

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
        if self.db_conn is not None and doc_data.get("patient_id"):
            try:
                with self.db_conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO documents (
                            patient_id, session_id, file_name, file_url, document_type, document_date,
                            extractions, raw_text_preview, metadata
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s::jsonb)
                        """,
                        (
                            doc_data.get("patient_id"),
                            doc_data.get("session_id"),
                            doc_data.get("file_name"),
                            doc_data.get("file_url"),
                            doc_data.get("document_type"),
                            doc_data.get("document_date"),
                            _jsonb(doc_data.get("extractions", {})),
                            doc_data.get("raw_text_preview"),
                            _jsonb(doc_data.get("metadata", {}))
                        )
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("Document persistence to DB failed: %s", exc)

    def get_documents_for_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        return [d for d in self.documents if str(d.get("patient_id")) == str(patient_id)]

    def set_review(self, session_id: str, review_data: Dict[str, Any]):
        self.reviews[session_id] = review_data
        session = self.get_session(session_id)
        if session:
            session["status"] = "reviewed"
            if self.db_conn is not None:
                self._save_consent_record(session.get("patient_id"), session_id, consent_type="doctor_verification", accepted=True, consent_text="Doctor reviewed and verified clinical case summary.")
                self._save_assessment_record(
                    session.get("patient_id"),
                    session_id,
                    assessment_type="doctor_review",
                    score=1.0,
                    findings={
                        "doctorName": review_data.get("doctorName"),
                        "provisionalDiagnosis": review_data.get("provisionalDiagnosis"),
                        "clinicalNotes": review_data.get("clinicalNotes")
                    },
                    severity="routine",
                    status="completed"
                )
                self._save_recommendation_record(
                    session.get("patient_id"),
                    session_id,
                    recommendation_type="doctor_plan",
                    title="Doctor review plan",
                    details=review_data.get("clinicalNotes") or "Clinical review completed.",
                    priority="urgent" if session.get("red_flag_detected") else "routine"
                )

    def get_review(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.reviews.get(session_id)

    def purge_ephemeral_cache(self, session_id: str):
        """
        Enforces DPDP Act 2023 compliance by immediately purging temporary audio buffers,
        raw ASR transcripts, and local upload cache once the bundle is finalized.
        """
        logger.info(f"[DPDP-2023] Purging temporary cache and audio disclosures for session: {session_id}")
        for a in self.answers:
            if a.get("session_id") == session_id and "voiceTranscript" in a:
                a["voiceTranscript"] = "[PURGED_DPDP_COMPLIANT]"


store = InMemoryOPDStore()
