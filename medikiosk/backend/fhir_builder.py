import datetime
import uuid
from typing import Dict, Any, List, Optional

class FhirBundleBuilder:
    @staticmethod
    def build_op_consult_bundle(
        session: Dict[str, Any],
        patient: Dict[str, Any],
        summary: Dict[str, Any],
        doctor_review: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        session_id = session.get("id", str(uuid.uuid4()))
        patient_id = patient.get("id", str(uuid.uuid4()))
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Clinical system determination
        is_ayush = "ayush" in str(session.get("clinical_system", "allopathy")).lower()
        
        # Double-coding resolution
        if is_ayush:
            traditional_code = "QE20.1"
            traditional_display = "Ajeerna (Functional Digestive Disorder - WHO ICD-11 TM2)"
            namaste_code = "AYU-DG-0412"
            namaste_display = "Agnimandya / Ajeerna Rogi Pariksha"
            biomedical_code = "MD90.1"
            biomedical_display = "Dyspepsia / Gastrointestinal Motility Disorder"
        else:
            traditional_code = "QE11.0"
            traditional_display = "Hridroga (Pitta-Vataja Sula - WHO ICD-11 TM2)"
            namaste_code = "AYU-CD-0108"
            namaste_display = "Vatika Hridroga / Anginal Distress"
            biomedical_code = "BA41"
            biomedical_display = "Acute Coronary Syndrome / Angina Pectoris (WHO ICD-11 MMS)"

        provisional_dx = (
            doctor_review.get("provisionalDiagnosis") if doctor_review and doctor_review.get("provisionalDiagnosis")
            else traditional_display if is_ayush else biomedical_display
        )

        entries = []

        # 1. Composition: OPConsultRecord (Anchor Resource)
        composition_id = f"comp-{session_id}"
        entries.append({
            "fullUrl": f"urn:uuid:{composition_id}",
            "resource": {
                "resourceType": "Composition",
                "id": composition_id,
                "meta": {
                    "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord"]
                },
                "status": "final",
                "type": {
                    "coding": [{
                        "system": "http://snomed.info/sct",
                        "code": "371530004",
                        "display": "Clinical consultation report"
                    }],
                    "text": "Outpatient Clinical Consultation Record"
                },
                "subject": { "reference": f"urn:uuid:patient-{patient_id}", "display": patient.get("full_name", "Patient") },
                "date": now_iso,
                "author": [{
                    "reference": "urn:uuid:practitioner-aiims-108",
                    "display": doctor_review.get("doctorName", "Dr. Vikramaditya Sharma, MD") if doctor_review else "Attending OPD Physician"
                }],
                "title": "Outpatient Consultation Record (MediKiosk Digitized)",
                "section": [
                    {
                        "title": "Chief Complaints & HPI",
                        "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "422843007", "display": "Chief complaint section" }] },
                        "text": { "status": "generated", "div": f"<div>{summary.get('hpi_summary', 'Kiosk intake completed.')}</div>" }
                    },
                    {
                        "title": "Condition Diagnosis (Automated Double-Coding)",
                        "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "29308-4", "display": "Diagnosis" }] },
                        "entry": [{ "reference": f"urn:uuid:condition-{session_id}" }]
                    },
                    {
                        "title": "Emergency Red-Flag Screening",
                        "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "86859003", "display": "Triage evaluation" }] },
                        "entry": [{ "reference": f"urn:uuid:observation-triage-{session_id}" }]
                    }
                ]
            }
        })

        # 2. Patient Resource
        entries.append({
            "fullUrl": f"urn:uuid:patient-{patient_id}",
            "resource": {
                "resourceType": "Patient",
                "id": f"patient-{patient_id}",
                "identifier": [
                    {
                        "type": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "MR", "display": "Medical Record Number" }] },
                        "system": "https://healthid.ndhm.gov.in",
                        "value": patient.get("abha_id", "91-2345-6789-0123")
                    },
                    {
                        "type": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "SB", "display": "Social Beneficiary Identifier" }] },
                        "system": "https://uidai.gov.in/aadhaar",
                        "value": patient.get("aadhaar_hash", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
                    }
                ],
                "name": [{ "text": patient.get("full_name", "Ramesh Sharma") }],
                "telecom": [{ "system": "phone", "value": patient.get("phone", "") }],
                "gender": str(patient.get("gender", "male")).lower(),
                "birthDate": str(datetime.date.today().year - int(patient.get("age", 40))) + "-01-01"
            }
        })

        # 3. Encounter Resource
        entries.append({
            "fullUrl": f"urn:uuid:encounter-{session_id}",
            "resource": {
                "resourceType": "Encounter",
                "id": f"encounter-{session_id}",
                "status": "finished",
                "class": {
                    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                    "code": "AMB",
                    "display": "Ambulatory OPD Kiosk"
                },
                "subject": { "reference": f"urn:uuid:patient-{patient_id}" },
                "period": { "start": session.get("created_at", now_iso), "end": now_iso }
            }
        })

        # 4. Condition: Automated Double-Coding Microservice (Traditional + Biomedical)
        entries.append({
            "fullUrl": f"urn:uuid:condition-{session_id}",
            "resource": {
                "resourceType": "Condition",
                "id": f"condition-{session_id}",
                "clinicalStatus": {
                    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active" }]
                },
                "verificationStatus": {
                    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "provisional" if not doctor_review else "confirmed" }]
                },
                "code": {
                    "text": provisional_dx,
                    "coding": [
                        # Traditional Medicine Coding (NAMASTE & WHO ICD-11 TM2)
                        {
                            "system": "http://namstp.ayush.gov.in",
                            "code": namaste_code,
                            "display": namaste_display
                        },
                        {
                            "system": "http://id.who.int/icd/release/11/tm2",
                            "code": traditional_code,
                            "display": traditional_display
                        },
                        # Conventional Biomedical Coding (WHO ICD-11 MMS)
                        {
                            "system": "http://id.who.int/icd/release/11/mms",
                            "code": biomedical_code,
                            "display": biomedical_display
                        }
                    ]
                },
                "subject": { "reference": f"urn:uuid:patient-{patient_id}" }
            }
        })

        # 5. Observation: Red Flag Triage Screening
        entries.append({
            "fullUrl": f"urn:uuid:observation-triage-{session_id}",
            "resource": {
                "resourceType": "Observation",
                "id": f"observation-triage-{session_id}",
                "status": "final",
                "code": {
                    "coding": [{ "system": "http://snomed.info/sct", "code": "86859003", "display": "Emergency Red-Flag Clinical Screening" }],
                    "text": "Emergency Red-Flag Clinical Screening"
                },
                "subject": { "reference": f"urn:uuid:patient-{patient_id}" },
                "valueString": "CRITICAL_FLAG_DETECTED" if session.get("red_flag_detected") else "NORMAL",
                "interpretation": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        "code": "AA" if session.get("red_flag_detected") else "N",
                        "display": "Abnormal Alert" if session.get("red_flag_detected") else "Normal"
                    }]
                }]
            }
        })

        # 6. Practitioner
        entries.append({
            "fullUrl": "urn:uuid:practitioner-aiims-108",
            "resource": {
                "resourceType": "Practitioner",
                "id": "practitioner-aiims-108",
                "identifier": [{ "system": "https://mciindia.org", "value": "MCI-DL-2014-98765" }],
                "name": [{ "text": doctor_review.get("doctorName", "Dr. Vikramaditya Sharma, MD") if doctor_review else "Dr. Vikramaditya Sharma, MD" }]
            }
        })

        return {
            "resourceType": "Bundle",
            "id": f"bundle-{session_id}",
            "meta": {
                "lastUpdated": now_iso,
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"]
            },
            "type": "document",
            "timestamp": now_iso,
            "entry": entries
        }

fhir_builder = FhirBundleBuilder()
