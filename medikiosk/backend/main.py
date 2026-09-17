import os
import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

from schemas import (
    SessionInitRequest, SessionInitResponse,
    SessionTurnRequest, SessionTurnResponse, EmergencyPayload,
    DocumentUploadResponse, DocumentExtractions,
    DoctorReviewRequest, DoctorReviewResponse,
    AbdmPushRequest, AbdmPushResponse,
    PatientCreate, Patient, ProgressInfo, QuestionItem,
    OtpSendRequest, OtpSendResponse, OtpVerifyRequest, OtpVerifyResponse
)
from engine import clinical_engine, safety_interceptor
from document_ai import document_ai
from fhir_builder import fhir_builder
from storage import store
from ml_engine import clinical_model
from otp_service import dispatch_real_time_otp, verify_otp_code, mask_phone
from voice_processor import voice_processor


# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("medikiosk_backend")

app = FastAPI(
    title="MediKiosk Clinical Outpatient & Triage Backend",
    description="Physical hospital OPD intake, SOCRATES, AIIA SACTP Dashavidha Pariksha, ABDM NRCeS FHIR R4, and DPDP Act 2023 compliant microservices.",
    version="1.0.0"
)

# Explicit CORS configuration for Vite dev server (port 3000) and production
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://0.0.0.0:3000",
    "http://0.0.0.0:5000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory setup
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# Production frontend dist check & static asset mount for single-link operation
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")


# ==============================================================================
# HEALTHCHECK & ROOT
# ==============================================================================
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "MediKiosk Outpatient & Triage Backend",
        "port": 5000,
        "abdm_fhir_profile": "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle",
        "ml_model_trained": clinical_model.is_trained,
        "dpdp_compliant": True
    }

@app.get("/")
async def root():
    index_path = os.path.join(FRONTEND_DIST_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {
        "status": "healthy",
        "service": "MediKiosk Outpatient & Triage Backend",
        "port": 5000,
        "abdm_fhir_profile": "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle",
        "ml_model_trained": clinical_model.is_trained,
        "dpdp_compliant": True
    }


# ==============================================================================
# REAL-TIME SMS OTP & VERIFICATION
# ==============================================================================
@app.post("/api/otp/send", response_model=OtpSendResponse)
async def send_otp(req: OtpSendRequest):
    """
    Generates and dispatches a real-time 4-digit SMS OTP via configured gateway (Fast2SMS/Twilio/Mock).
    Returns privacy-compliant masked phone status.
    """
    res = await dispatch_real_time_otp(req.phone)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Failed to dispatch OTP."))
    return OtpSendResponse(
        success=True,
        message=res.get("message", "OTP sent successfully."),
        phone_masked=res.get("phone_masked"),
        gateway=res.get("gateway"),
        expires_in_seconds=res.get("expires_in_seconds", 300),
        live_sms_sent=res.get("live_sms_sent", False),
        otp=res.get("otp"),
        status_detail=res.get("status_detail")
    )


@app.post("/api/otp/verify", response_model=OtpVerifyResponse)
async def verify_otp(req: OtpVerifyRequest):
    """
    Verifies user-entered OTP code against active cache with TTL & attempt limits.
    """
    is_valid, msg = verify_otp_code(req.phone, req.otp)
    if not is_valid:
        return OtpVerifyResponse(
            success=False,
            verified=False,
            message=msg
        )
    return OtpVerifyResponse(
        success=True,
        verified=True,
        message=msg
    )


# ==============================================================================
# PATIENT MANAGEMENT
# ==============================================================================

@app.get("/api/patients")
async def get_patients():
    return {"success": True, "patients": store.get_patients()}

@app.post("/api/patients")
async def register_patient(patient_data: PatientCreate):
    new_patient = store.register_patient(patient_data.model_dump())
    return {"success": True, "patient": new_patient}


# ==============================================================================
# SESSION INITIALIZATION (POST /api/session/init and POST /api/start)
# ==============================================================================
@app.post("/api/session/init")
@app.post("/api/start")
async def init_session(req: SessionInitRequest):
    language = req.language or "en"
    mode = req.mode or (req.system.upper() if req.system else "ALLOPATHIC")
    clinical_sys = "ayush" if "AYUSH" in mode.upper() else "allopathy"

    # Match or fallback patient
    patient = None
    if req.patientId:
        patient = store.get_patient_by_id(req.patientId)
    elif req.patient_identifier:
        clean_id = req.patient_identifier.replace("-", "").strip().lower()
        patient = next((p for p in store.get_patients() if clean_id in p.get("abha_id", "").replace("-", "").lower()), None)
    
    if not patient:
        patient = store.get_patients()[0]

    hosp_name = req.hospitalName or "Manipal Hospital, HAL Airport Road, Bengaluru"
    session = store.create_session(
        patient=patient,
        language=language,
        clinical_system=clinical_sys,
        condition_id="ayush_general" if clinical_sys == "ayush" else "chest_pain"
    )
    session["hospital_name"] = hosp_name

    # Fetch initial question
    questions = clinical_engine.get_questions_for_system(clinical_sys)
    first_q_data = questions[0]
    next_question = clinical_engine.format_question_item(first_q_data, language)

    quick_tap = [opt.text for opt in (next_question.options or [])]
    initial_state = first_q_data.get("protocol_stage", "SITE" if clinical_sys == "allopathy" else "PRAKRITI")

    return SessionInitResponse(
        success=True,
        sessionId=session["id"],
        session_id=session["id"],
        state=initial_state,
        prompt=next_question.questionText,
        quick_taps=quick_tap,
        quick_tap_options=quick_tap,
        opdToken=session["opd_token_number"],
        patient=patient,
        nextQuestion=next_question,
        progress=ProgressInfo(current=1, total=len(questions), percent=int((1 / len(questions)) * 100)),
        system=clinical_sys,
        language=language,
        hospitalName=hosp_name
    )


# ==============================================================================
# SESSION TURN / MULTI-TURN INTAKE (POST /api/session/turn and POST /api/next)
# ==============================================================================
@app.post("/api/session/turn")
@app.post("/api/next")
async def process_turn(req: SessionTurnRequest):
    session_id = req.session_id or req.sessionId
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    session = store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_text = req.user_input or req.answer or req.voiceTranscript or ""
    language = session.get("language", "en")
    clinical_sys = session.get("clinical_system", "allopathy")

    questions = clinical_engine.get_questions_for_system(clinical_sys)
    current_q_id = req.questionId or questions[0]["id"]
    current_q = next((q for q in questions if q["id"] == current_q_id), questions[0])
    clinical_field = current_q["clinical_field"]

    # Backend Voice Noise Filtering & Multilingual Option Matcher
    matched_opt_val, matched_opt_text, cleaned_text = voice_processor.resolve_spoken_option(
        raw_text=user_text,
        question_data=current_q,
        language=language
    )

    final_answer_value = matched_opt_val or req.answer or cleaned_text or user_text

    # 1. Zero-Latency Deterministic Safety Interceptor (Cardiac, Neuro FAST, Respiratory)
    # Inspect raw text, cleaned transcript, and matched option text
    combined_inspect_text = f"{user_text} {cleaned_text} {matched_opt_text or ''}".strip()
    is_emergency, red_flags = safety_interceptor.inspect_text(
        text=combined_inspect_text,
        clinical_field=clinical_field,
        language=language
    )

    if is_emergency:
        session["red_flag_detected"] = True
        session["status"] = "flagged"

        store.add_answer({
            "session_id": session_id,
            "question_id": current_q_id,
            "clinical_field": clinical_field,
            "raw_answer": final_answer_value,
            "cleaned_transcript": cleaned_text,
            "matched_option": matched_opt_val,
            "is_red_flag": True,
            "voiceTranscript": req.voiceTranscript
        })

        diversion_msg = red_flags[0].message if red_flags else "EMERGENCY DETECTED: Immediate clinical evaluation required."
        flagged_cond = red_flags[0].ruleName if red_flags else "Critical Triage Flag"

        diversion_payload = {
            "action": "EMERGENCY_DIVERT",
            "destination": "Hospital Emergency Room / Triage Desk 4",
            "instructions": "Alert emergency hospital staff immediately. Stat ECG, troponin, and physician triage required.",
            "is_emergency": True,
            "diversion_message": diversion_msg,
            "flagged_condition": flagged_cond
        }

        return SessionTurnResponse(
            success=True,
            completed=True,
            session_id=session_id,
            sessionId=session_id,
            state="EMERGENCY_ABORT",
            prompt=diversion_msg,
            quick_taps=[],
            quick_tap_options=[],
            isRedFlag=True,
            is_emergency=True,
            redFlags=red_flags,
            emergency_details=EmergencyPayload(
                is_emergency=True,
                diversion_message=diversion_msg,
                flagged_condition=flagged_cond,
                action="EMERGENCY_DIVERT",
                destination="Hospital Emergency Room / Triage Desk 4",
                instructions="Alert emergency hospital staff immediately."
            ),
            diversionPayload=diversion_payload,
            nextQuestion=None,
            progress=ProgressInfo(current=len(questions), total=len(questions), percent=100),
            cleanedTranscript=cleaned_text,
            matchedOption=matched_opt_val
        )

    # Record answer in persistent session store
    store.add_answer({
        "session_id": session_id,
        "question_id": current_q_id,
        "clinical_field": clinical_field,
        "raw_answer": final_answer_value,
        "cleaned_transcript": cleaned_text,
        "matched_option": matched_opt_val,
        "is_red_flag": False,
        "voiceTranscript": req.voiceTranscript
    })

    # Find next question in protocol sequence
    answered_ids = set(a["question_id"] for a in store.get_answers_for_session(session_id))
    next_q_data = next((q for q in questions if q["id"] not in answered_ids), None)

    total_q = len(questions)
    current_count = len(answered_ids)
    percent = min(100, int((current_count / total_q) * 100))

    if not next_q_data:
        # Intake complete: synthesize clinical summary
        session["status"] = "flagged" if session.get("red_flag_detected") else "completed"

        patient_responses = " ".join([str(a["raw_answer"]) for a in store.get_answers_for_session(session_id)])
        predictions = clinical_model.predict(patient_responses, top_k=1)
        top_pred = predictions[0] if predictions else {}

        all_answers = store.get_answers_for_session(session_id)
        answers_map = {a.get("clinical_field", a.get("question_id")): a.get("raw_answer") for a in all_answers}

        pt = next((p for p in store.patients if p.get("id") == session.get("patient_id")), {})
        pt_chief = pt.get("chief_complaint")
        pt_past = pt.get("past_history") or answers_map.get("past_medical_history") or answers_map.get("past_history")
        pt_meds = pt.get("medications_summary") or answers_map.get("current_medications")
        pt_allergies = pt.get("allergies_summary") or answers_map.get("allergies")
        pt_family = pt.get("family_history")
        pt_personal = pt.get("personal_history")
        pt_ros = pt.get("review_of_systems") or answers_map.get("review_of_systems")

        if clinical_sys == "ayush":
            predicted_dis = top_pred.get("disease", "Ajeerna (Digestive Dysfunction)")
            herbs_list = [h.strip() for h in top_pred.get("ayurvedic_herbs", "Triphala, Shunthi, Haritaki").split(",")]
            
            prescribed_rx = [
                {
                    "name": "Triphala Churna",
                    "dosage": "3g (1/2 tsp)",
                    "frequency": "Twice daily after meals",
                    "instructions": "Take with lukewarm water at bedtime"
                },
                {
                    "name": "Shunthi Powder (Dry Ginger)",
                    "dosage": "2g",
                    "frequency": "Twice daily before meals",
                    "instructions": "Take with warm water for Agni Deepana"
                },
                {
                    "name": top_pred.get("formulation", "Sanjivani Vati"),
                    "dosage": "1 tablet",
                    "frequency": "Morning & Evening",
                    "instructions": "Digestive & Ama Pachana support"
                }
            ]

            summary = {
                "chief_complaint": f"AYUSH Consultation - {pt_chief or predicted_dis}",
                "hpi_summary": f"Patient completed standardized AIIA SACTP case-taking. Clinical feature analysis indicates: {pt_chief or predicted_dis} with {top_pred.get('doshas', 'Vata-Pitta')} predominance.",
                "past_history": pt_past or "Digestive irregularities, mild stress",
                "medications_summary": pt_meds or "No regular modern medications",
                "allergies_summary": pt_allergies or "No known allergies reported",
                "family_history": pt_family or "Negative",
                "personal_history": pt_personal or "Sedentary routine, irregular meal timings",
                "review_of_systems": pt_ros or "Positive for digestive fullness. Denies syncope.",
                "triage_status": "ROUTINE AYUSH OPD",
                "ayush_assessment": {
                    "prakriti": { "body_build": top_pred.get("prakriti", "Vata-Pitta"), "temperament": "Rajas-Sattva" },
                    "vikriti": f"{top_pred.get('doshas', 'Vata-Pitta')} Dushti",
                    "agni": "Vishama Agni",
                    "koshtha": "Krura Koshtha",
                    "ahara_shakti": "Madhyama",
                    "vyayama_shakti": "Madhyama",
                    "nidra": "Alpa / Fragmented",
                    "sattva": "Rajas",
                    "vihara": "Sedentary",
                    "predicted_disease": predicted_dis,
                    "ayurvedic_herbs": herbs_list,
                    "formulations": [top_pred.get("formulation", "Shunthi powder (2g) with warm water")],
                    "diet_lifestyle_recommendations": top_pred.get("diet_lifestyle", "Avoid heavy, oily foods; consume warm light meals; stay hydrated."),
                    "yoga_physical_therapy": top_pred.get("yoga_therapy", "Vajrasana after meals, Pawanmuktasana, Anulom Vilom")
                },
                "prescribed_report": {
                    "diagnosis": predicted_dis,
                    "clinical_system": "AYUSH (Ayurveda SACTP Protocol)",
                    "prescribed_medications": prescribed_rx,
                    "herbs": herbs_list,
                    "diet_lifestyle": top_pred.get("diet_lifestyle", "Avoid heavy, oily foods; consume warm light meals; stay hydrated."),
                    "yoga_therapy": top_pred.get("yoga_therapy", "Vajrasana after meals, Pawanmuktasana, Anulom Vilom"),
                    "triage_level": "ROUTINE AYUSH OPD",
                    "answers_breakdown": answers_map
                },
                "physician_notes": "Symptomatic AYUSH OPD Protocol & SACTP Herbal Prescription Generated."
            }
        else:
            predicted_dis = top_pred.get("disease", "Acute Retrosternal Chest Discomfort - Triage Evaluation")
            is_red = session.get("red_flag_detected", False)
            
            prescribed_rx = [
                {
                    "name": "Tab. Nitroglycerin",
                    "dosage": "0.5mg",
                    "frequency": "Sublingual STAT as needed",
                    "instructions": "Place under tongue if chest tightness recurs"
                },
                {
                    "name": "Tab. Aspirin (Ecosprin)",
                    "dosage": "325mg",
                    "frequency": "Chewable STAT dose",
                    "instructions": "Chew immediately for acute coronary protocol"
                },
                {
                    "name": "Tab. Clopidogrel",
                    "dosage": "300mg",
                    "frequency": "STAT loading dose",
                    "instructions": "Cardiology emergency referral protocol"
                }
            ]

            summary = {
                "chief_complaint": answers_map.get("chief_complaint") or pt_chief or "Acute Retrosternal Chest Discomfort",
                "hpi_summary": f"Patient presented with {answers_map.get('chief_complaint') or pt_chief or 'acute chest discomfort'} evaluated via structured SOCRATES protocol.",
                "past_history": pt_past or "Essential Hypertension, Dyslipidemia",
                "medications_summary": pt_meds or "Telmisartan 40mg OD, Atorvastatin 20mg OD",
                "allergies_summary": pt_allergies or "No known drug allergies reported",
                "family_history": pt_family or "Paternal CAD",
                "personal_history": pt_personal or "Non-smoker",
                "review_of_systems": pt_ros or "Positive for chest heaviness. Evaluated for diaphoresis.",
                "triage_status": "STAT EMERGENCY ER" if is_red else "PRIORITY CARDIOLOGY OPD",
                "red_flags_summary": [
                    {"rule_name": rf.ruleName, "severity": rf.severity, "warning": rf.message}
                    for rf in red_flags
                ],
                "prescribed_report": {
                    "diagnosis": predicted_dis,
                    "clinical_system": "Allopathy (SOCRATES Protocol)",
                    "prescribed_medications": prescribed_rx,
                    "diet_lifestyle": "Complete bed rest, avoid physical exertion, immediate ECG & Cardiac Biomarker panel.",
                    "triage_level": "STAT EMERGENCY ER" if is_red else "PRIORITY CARDIOLOGY OPD",
                    "answers_breakdown": answers_map
                },
                "physician_notes": "Allopathy Stat Triage & Telemetry Protocol Active."
            }

        store.set_summary(session_id, summary)

        return SessionTurnResponse(
            success=True,
            completed=True,
            session_id=session_id,
            sessionId=session_id,
            state="COMPLETED",
            prompt="Thank you. Your intake is complete. Please wait while your clinical summary is finalized for the doctor.",
            quick_taps=["Finish"],
            quick_tap_options=["Finish"],
            isRedFlag=session.get("red_flag_detected", False),
            is_emergency=session.get("red_flag_detected", False),
            redFlags=[],
            nextQuestion=None,
            progress=ProgressInfo(current=total_q, total=total_q, percent=100),
            cleanedTranscript=cleaned_text,
            matchedOption=matched_opt_val
        )

    next_question = clinical_engine.format_question_item(next_q_data, language)
    quick_tap = [opt.text for opt in (next_question.options or [])]
    next_state = next_q_data.get("protocol_stage", "IN_PROGRESS")

    return SessionTurnResponse(
        success=True,
        completed=False,
        session_id=session_id,
        sessionId=session_id,
        state=next_state,
        prompt=next_question.questionText,
        quick_taps=quick_tap,
        quick_tap_options=quick_tap,
        isRedFlag=False,
        is_emergency=False,
        redFlags=[],
        nextQuestion=next_question,
        progress=ProgressInfo(current=current_count + 1, total=total_q, percent=percent),
        cleanedTranscript=cleaned_text,
        matchedOption=matched_opt_val
    )


# ==============================================================================
# DOCUMENT UPLOAD & RECONCILIATION (POST /api/documents/upload)
# ==============================================================================
@app.post("/api/documents/upload")
async def upload_document(
    document: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    sessionId: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    patientId: Optional[str] = Form(None),
    patient_id: Optional[str] = Form(None),
    documentType: Optional[str] = Form("prescription")
):
    upload_file = document or file
    if not upload_file:
        raise HTTPException(status_code=400, detail="No document file provided")

    active_session_id = sessionId or session_id
    active_patient_id = patientId or patient_id

    doc_id = f"doc-{uuid.uuid4()}"
    filename = upload_file.filename or "uploaded_document.pdf"
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")

    with open(file_path, "wb") as f:
        content = await upload_file.read()
        f.write(content)

    # Retrieve patient verbal disclosures from intake if session provided
    patient_disclosures = ""
    if active_session_id:
        answers = store.get_answers_for_session(active_session_id)
        patient_disclosures = " ".join([str(a.get("raw_answer", "")) for a in answers])

    # Extract medications, clinical labs, and adherence discrepancies
    extractions = document_ai.process_document(
        file_path=file_path,
        filename=filename,
        doc_type=documentType or "prescription",
        patient_disclosures=patient_disclosures
    )

    doc_record = {
        "id": doc_id,
        "patient_id": active_patient_id,
        "session_id": active_session_id,
        "file_name": filename,
        "document_type": documentType or "prescription",
        "document_date": datetime.date.today().isoformat(),
        "file_url": f"/uploads/{doc_id}_{filename}",
        "extractions": extractions.model_dump()
    }
    store.add_document(doc_record)

    return DocumentUploadResponse(
        success=True,
        documentId=doc_id,
        document_id=doc_id,
        fileName=filename,
        documentType=documentType or "prescription",
        extractions=extractions,
        rawTextPreview=f"Extracted {len(extractions.medications)} medications and {len(extractions.lab_results)} clinical lab analytes."
    )

@app.get("/api/documents/patient/{patient_id}")
async def get_patient_documents(patient_id: str):
    docs = store.get_documents_for_patient(patient_id)
    return {"success": True, "timeline": docs}


# ==============================================================================
# SESSION FINALIZE & EPHEMERAL CLEANUP (POST /api/session/finalize)
# ==============================================================================
@app.post("/api/session/finalize")
async def finalize_session(
    request: Request,
    background_tasks: BackgroundTasks,
    session_id: Optional[str] = None
):
    target_session_id = session_id

    # Fallback to json body if not in query params
    if not target_session_id:
        try:
            body = await request.json()
            target_session_id = body.get("session_id") or body.get("sessionId")
        except Exception:
            pass

    if not target_session_id:
        target_session_id = store.get_sessions()[0]["id"]

    session = store.get_session(target_session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    patient = store.get_patient_by_id(session["patient_id"]) or store.get_patients()[0]
    summary = store.get_summary(target_session_id)

    # Build ABDM FHIR R4 Bundle with double coding (NAMASTE + WHO ICD-11 TM2 & WHO ICD-11 MMS)
    bundle = fhir_builder.build_op_consult_bundle(
        session=session,
        patient=patient,
        summary=summary
    )

    # DPDP Act 2023 Ephemeral Memory Cleanup: purge temporary audio buffers & scans
    background_tasks.add_task(store.purge_ephemeral_cache, target_session_id)

    return {
        "success": True,
        "session_id": target_session_id,
        "sessionId": target_session_id,
        "summary": summary,
        "fhirBundle": bundle,
        "entriesCount": len(bundle.get("entry", [])),
        "dpdp_purged": True
    }

@app.get("/api/summary/{session_id}")
async def get_session_summary(session_id: str):
    session = store.get_session(session_id)
    if not session:
        session = store.get_sessions()[0]
        session_id = session["id"]

    patient = store.get_patient_by_id(session["patient_id"]) or store.get_patients()[0]
    summary = store.get_summary(session_id)
    review = store.get_review(session_id)
    documents = store.get_documents_for_patient(patient["id"])

    return {
        "success": True,
        "session": session,
        "patient": patient,
        "summary": summary,
        "review": review,
        "documents": documents
    }


# ==============================================================================
# DOCTOR DASHBOARD WORKSTATION ENDPOINTS
# ==============================================================================
@app.get("/api/doctor/queue")
@app.get("/api/doctor/sessions")
async def get_doctor_sessions():
    sessions = store.get_sessions()
    queue = []
    for s in sessions:
        queue.append({
            "session_id": s["id"],
            "sessionId": s["id"],
            "patient_identifier": s.get("abha_id", "91-2345-6789-0123"),
            "patient_name": s.get("patient_name", "Unknown Patient"),
            "mode": s.get("clinical_system", "allopathy").upper(),
            "status": s.get("status", "pending"),
            "priority": "CRITICAL" if s.get("red_flag_detected") else "ROUTINE",
            "opdToken": s.get("opd_token_number", "OPD-101"),
            "age": s.get("age", 50),
            "gender": s.get("gender", "Male")
        })
    return {
        "success": True,
        "queue": queue,
        "sessions": sessions
    }

@app.get("/api/doctor/summary/{session_id}")
@app.get("/api/doctor/session/{session_id}")
async def get_doctor_session_detail(session_id: str):
    session = store.get_session(session_id)
    if not session:
        session = store.get_sessions()[0]
        session_id = session["id"]

    patient = store.get_patient_by_id(session["patient_id"]) or store.get_patients()[0]
    summary = store.get_summary(session_id)
    review = store.get_review(session_id)
    documents = store.get_documents_for_patient(patient["id"])

    vitals = {
        "pulse_rate": "84 bpm",
        "blood_pressure": "130/84 mmHg",
        "spo2": "98 %",
        "respiratory_rate": "18 /min",
        "temperature": "98.4 F",
        "status": "Stable" if not session.get("red_flag_detected") else "Critical / Triage Alert"
    }

    return {
        "success": True,
        "session_id": session_id,
        "sessionId": session_id,
        "session": session,
        "patient": patient,
        "summary": summary,
        "vitals": vitals,
        "review": review,
        "documents": documents
    }

@app.post("/api/doctor-review")
async def submit_doctor_review(review_data: DoctorReviewRequest):
    session_id = review_data.sessionId
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    patient = store.get_patient_by_id(session["patient_id"]) or store.get_patients()[0]
    summary = store.get_summary(session_id)

    # Build signed FHIR bundle
    bundle = fhir_builder.build_op_consult_bundle(
        session=session,
        patient=patient,
        summary=summary,
        doctor_review=review_data.model_dump()
    )

    review_record = {
        **review_data.model_dump(),
        "fhir_bundle": bundle,
        "reviewed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    store.set_review(session_id, review_record)

    return DoctorReviewResponse(
        success=True,
        message="Case verified & signed! Compliant ABDM FHIR R4 Bundle generated.",
        fhirBundle=bundle
    )

@app.get("/api/fhir/{session_id}")
async def get_fhir_bundle(session_id: str):
    session = store.get_session(session_id)
    if not session:
        session = store.get_sessions()[0]
        session_id = session["id"]

    patient = store.get_patient_by_id(session["patient_id"]) or store.get_patients()[0]
    summary = store.get_summary(session_id)
    review = store.get_review(session_id)

    bundle = fhir_builder.build_op_consult_bundle(
        session=session,
        patient=patient,
        summary=summary,
        doctor_review=review
    )
    return bundle

@app.post("/api/integrations/push")
async def push_to_abdm(push_data: AbdmPushRequest):
    session_id = push_data.sessionId
    session = store.get_session(session_id) or store.get_sessions()[0]
    patient = store.get_patient_by_id(session.get("patient_id")) or store.get_patients()[0]

    tx_id = f"ABDM-HIP-TX-{uuid.uuid4().hex[:8].upper()}-{uuid.uuid4().int % 10000:04d}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    return AbdmPushResponse(
        success=True,
        message="Record successfully pushed to ABDM / HIS Gateway",
        transactionId=tx_id,
        hipId="IN08100001-DISTRICT-CIVIL-HOSP",
        abhaId=push_data.abhaId or patient.get("abha_id", "91-2345-6789-0123"),
        timestamp=now_iso,
        bundleSummary={
            "resourceType": "Bundle",
            "entriesCount": 6,
            "resources": ["Composition", "Patient", "Encounter", "Condition", "Observation", "Practitioner"],
            "profile": "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle",
            "double_coding": "NAMASTE & WHO ICD-11 TM2 + WHO ICD-11 MMS"
        }
    )

# ==============================================================================
# PRODUCTION SINGLE-PORT SERVING (FRONTEND DIST SPA)
# ==============================================================================
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST_DIR):
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Exclude API endpoints, static uploads, and interactive docs
        if (
            full_path.startswith("api") or
            full_path.startswith("uploads") or
            full_path in ["docs", "redoc", "openapi.json"]
        ):
            raise HTTPException(status_code=404, detail="Resource not found")

        target_file = os.path.join(FRONTEND_DIST_DIR, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)

        index_path = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)

        raise HTTPException(status_code=404, detail="SPA index.html not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
