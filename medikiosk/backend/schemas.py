from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class OptionItem(BaseModel):
    value: str
    text: str

class QuestionItem(BaseModel):
    id: str
    questionText: str
    text: Optional[str] = None
    questionType: str = "single_choice"
    type: Optional[str] = "single_choice"
    options: Optional[List[OptionItem]] = []
    clinicalField: str
    required: bool = True

class RedFlagItem(BaseModel):
    ruleId: str
    ruleName: str
    severity: str
    message: str
    clinicalRationale: Optional[str] = None

class ProgressInfo(BaseModel):
    current: int
    total: int
    percent: int

class PatientCreate(BaseModel):
    full_name: str
    age: int
    gender: str
    phone: Optional[str] = None
    abha_id: Optional[str] = None
    blood_group: Optional[str] = None

class Patient(BaseModel):
    id: str
    full_name: str
    age: int
    gender: str
    phone: Optional[str] = None
    abha_id: Optional[str] = None
    blood_group: Optional[str] = None

class SessionInitRequest(BaseModel):
    patient_identifier: Optional[str] = None
    patientId: Optional[str] = None
    mode: Optional[str] = Field(default="ALLOPATHIC", description="Either ALLOPATHIC or AYUSH")
    system: Optional[str] = Field(default="allopathy")
    language: Optional[str] = Field(default="en")
    conditionId: Optional[str] = None

class SessionInitResponse(BaseModel):
    success: bool = True
    sessionId: str
    session_id: Optional[str] = None
    state: Optional[str] = "INIT"
    prompt: Optional[str] = None
    quick_taps: Optional[List[str]] = None
    quick_tap_options: Optional[List[str]] = None
    opdToken: Optional[str] = None
    patient: Optional[Dict[str, Any]] = None
    nextQuestion: Optional[QuestionItem] = None
    progress: Optional[ProgressInfo] = None
    system: Optional[str] = None
    language: Optional[str] = "en"

class EmergencyPayload(BaseModel):
    is_emergency: bool = True
    diversion_message: str
    flagged_condition: str
    action: Optional[str] = "EMERGENCY_DIVERT"
    destination: Optional[str] = "Hospital Emergency Room / Triage Desk"
    instructions: Optional[str] = "Alert hospital staff immediately. Stat clinical assessment required."

class SessionTurnRequest(BaseModel):
    session_id: Optional[str] = None
    sessionId: Optional[str] = None
    state: Optional[str] = None
    user_input: Optional[str] = None
    answer: Optional[str] = None
    voiceTranscript: Optional[str] = None
    questionId: Optional[str] = None

class SessionTurnResponse(BaseModel):
    success: bool = True
    completed: bool = False
    session_id: Optional[str] = None
    sessionId: Optional[str] = None
    state: Optional[str] = None
    prompt: Optional[str] = None
    quick_taps: Optional[List[str]] = None
    quick_tap_options: Optional[List[str]] = None
    isRedFlag: bool = False
    is_emergency: bool = False
    redFlags: Optional[List[RedFlagItem]] = []
    emergency_details: Optional[EmergencyPayload] = None
    diversionPayload: Optional[Dict[str, Any]] = None
    nextQuestion: Optional[QuestionItem] = None
    progress: Optional[ProgressInfo] = None
    cleanedTranscript: Optional[str] = None
    matchedOption: Optional[str] = None

class MedicationItem(BaseModel):
    name: str
    drug: Optional[str] = None
    dosage: str
    frequency: str
    reconciled: bool = True
    pharmacopoeia_match: Optional[str] = None
    confidence: Optional[float] = 1.0

class LabResultItem(BaseModel):
    test: str
    analyte: Optional[str] = None
    value: str
    unit: Optional[str] = None
    reference_range: str
    abnormal: bool
    flag: Optional[str] = "NORMAL"

class DocumentExtractions(BaseModel):
    medications: List[MedicationItem] = []
    lab_results: List[LabResultItem] = []
    discrepancies: List[str] = []
    discrepancies_flagged: bool = False

class DocumentUploadResponse(BaseModel):
    success: bool = True
    documentId: str
    document_id: Optional[str] = None
    fileName: str
    documentType: str
    extractions: DocumentExtractions
    rawTextPreview: Optional[str] = None

class FinalizeRequest(BaseModel):
    session_id: Optional[str] = None
    sessionId: Optional[str] = None

class FinalizeResponse(BaseModel):
    success: bool = True
    session_id: Optional[str] = None
    sessionId: Optional[str] = None
    summary: Dict[str, Any]
    fhirBundle: Dict[str, Any]
    entriesCount: int
    dpdp_purged: bool = True

class DoctorReviewRequest(BaseModel):
    sessionId: str
    doctorName: Optional[str] = "Dr. Vikramaditya Sharma, MD"
    doctorId: Optional[str] = "DOC-AIIMS-0810"
    provisionalDiagnosis: Optional[str] = None
    verifiedMeds: Optional[List[Dict[str, Any]]] = []
    clinicalNotes: Optional[str] = None
    abdmConsentVerified: Optional[bool] = True

class DoctorReviewResponse(BaseModel):
    success: bool = True
    message: str
    fhirBundle: Dict[str, Any]

class AbdmPushRequest(BaseModel):
    sessionId: str
    abhaId: Optional[str] = None

class AbdmPushResponse(BaseModel):
    success: bool = True
    message: str
    transactionId: str
    hipId: str
    abhaId: str
    timestamp: str
    bundleSummary: Dict[str, Any]

class QueuePatient(BaseModel):
    session_id: str
    sessionId: Optional[str] = None
    patient_identifier: str
    patient_name: Optional[str] = None
    mode: str
    status: str
    priority: str

class DoctorQueueResponse(BaseModel):
    success: bool = True
    queue: Optional[List[QueuePatient]] = None
    sessions: Optional[List[Dict[str, Any]]] = None

class DoctorSummaryResponse(BaseModel):
    success: bool = True
    session_id: Optional[str] = None
    sessionId: Optional[str] = None
    summary: Dict[str, Any]
    vitals: Optional[Dict[str, Any]] = None
    session: Optional[Dict[str, Any]] = None
    patient: Optional[Dict[str, Any]] = None
    review: Optional[Dict[str, Any]] = None
    documents: Optional[List[Dict[str, Any]]] = None

class OtpSendRequest(BaseModel):
    phone: str

class OtpSendResponse(BaseModel):
    success: bool = True
    message: str
    phone_masked: Optional[str] = None
    gateway: Optional[str] = None
    expires_in_seconds: Optional[int] = 300
    live_sms_sent: Optional[bool] = False
    otp: Optional[str] = None
    status_detail: Optional[str] = None


class OtpVerifyRequest(BaseModel):
    phone: str
    otp: str

class OtpVerifyResponse(BaseModel):
    success: bool = True
    verified: bool = False
    message: str

