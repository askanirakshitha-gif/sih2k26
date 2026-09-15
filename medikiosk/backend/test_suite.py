import os
import json
import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_all_endpoints():
    print("==================================================")
    print("RUNNING MEDIKIOSK FASTAPI BACKEND TEST SUITE")
    print("==================================================")

    # 1. Healthcheck & SPA serving
    res = client.get("/api/health")
    assert res.status_code == 200, f"Healthcheck failed: {res.text}"
    health_data = res.json()
    assert health_data["status"] == "healthy"
    print("[PASS] Healthcheck passed:", health_data["service"])

    # SPA Root check
    spa_res = client.get("/")
    assert spa_res.status_code == 200
    print("[PASS] Production SPA single-port serving verified at /")

    # 2. Patient Registration & List
    res = client.get("/api/patients")
    assert res.status_code == 200
    patients = res.json()["patients"]
    assert len(patients) >= 1
    print(f"[PASS] Patients list retrieved: {len(patients)} patients")

    # 3. Session Init (Allopathic)
    init_payload = {
        "patient_identifier": "91-2345-6789-0123",
        "mode": "ALLOPATHIC",
        "language": "en"
    }
    res = client.post("/api/session/init", json=init_payload)
    assert res.status_code == 200, f"Session init failed: {res.text}"
    init_data = res.json()
    session_id = init_data["sessionId"]
    assert init_data["state"] == "SITE"
    assert len(init_data["quick_taps"]) > 0
    print(f"[PASS] Session init (Allopathic) passed. Session ID: {session_id}, State: {init_data['state']}")

    # 4. Zero-Latency Deterministic Safety Interceptor (Red Flag Abort)
    emergency_turn_payload = {
        "session_id": session_id,
        "state": "SITE",
        "user_input": "I have crushing chest pain radiating to left arm and jaw, feeling dizzy"
    }
    res = client.post("/api/session/turn", json=emergency_turn_payload)
    assert res.status_code == 200
    turn_data = res.json()
    assert turn_data["is_emergency"] is True
    assert turn_data["isRedFlag"] is True
    assert turn_data["state"] == "EMERGENCY_ABORT"
    assert turn_data["diversionPayload"] is not None
    assert turn_data["diversionPayload"]["action"] == "EMERGENCY_DIVERT"
    print("[PASS] Safety Interceptor passed: Emergency detected, standard intake aborted, diversion payload returned.")

    # 5. Stable Multi-Turn Intake (SOCRATES progression)
    # Start fresh session for stable flow
    res = client.post("/api/session/init", json={"patient_identifier": "91-8765-4321-9876", "mode": "ALLOPATHIC", "language": "en"})
    stable_session_id = res.json()["sessionId"]
    
    stable_turn_payload = {
        "session_id": stable_session_id,
        "state": "SITE",
        "user_input": "Mild discomfort on the left side of chest"
    }
    res = client.post("/api/session/turn", json=stable_turn_payload)
    assert res.status_code == 200
    turn_data = res.json()
    assert turn_data["is_emergency"] is False
    assert turn_data["nextQuestion"] is not None
    print(f"[PASS] Stable turn intake passed. Next Question: {turn_data['nextQuestion']['id']} - {turn_data['state']}")

    # 6. AYUSH Mode SACTP (Dashavidha Pariksha) Session
    ayush_res = client.post("/api/session/init", json={"patient_identifier": "91-1122-3344-5566", "mode": "AYUSH", "language": "en"})
    ayush_session_id = ayush_res.json()["sessionId"]
    assert ayush_res.json()["state"] == "PRAKRITI"
    print(f"[PASS] AYUSH session init passed. Session ID: {ayush_session_id}, State: {ayush_res.json()['state']}")

    # 7. Document Upload & AI Reconciliation
    sample_doc_text = (
        "OUTPATIENT CLINICAL RECORD\n"
        "Rx:\n"
        "1. Tab Telmisartan 40mg - Once daily morning\n"
        "2. Tab Atorvastatin 20mg - Once daily night\n"
        "CLINICAL LABS:\n"
        "HbA1c: 7.9 %\n"
        "Fasting Blood Glucose: 154 mg/dL\n"
        "Serum Creatinine: 1.1 mg/dL\n"
    )
    file_bytes = io.BytesIO(sample_doc_text.encode("utf-8"))
    upload_res = client.post(
        "/api/documents/upload",
        files={"document": ("prescription.txt", file_bytes, "text/plain")},
        data={"sessionId": stable_session_id, "documentType": "prescription"}
    )
    assert upload_res.status_code == 200, f"Document upload failed: {upload_res.text}"
    doc_data = upload_res.json()
    assert doc_data["success"] is True
    meds = doc_data["extractions"]["medications"]
    labs = doc_data["extractions"]["lab_results"]
    assert len(meds) >= 2, f"Expected medications, got {meds}"
    assert len(labs) >= 2, f"Expected labs, got {labs}"
    hba1c_lab = next((l for l in labs if l["analyte"] == "hba1c"), None)
    assert hba1c_lab is not None and hba1c_lab["abnormal"] is True
    print(f"[PASS] Document AI Upload passed: Reconciled {len(meds)} meds, {len(labs)} labs (HbA1c flagged abnormal: {hba1c_lab['abnormal']})")

    # 8. Session Finalization & ABDM FHIR R4 Generation with Double-Coding
    fin_res = client.post("/api/session/finalize", json={"session_id": stable_session_id})
    assert fin_res.status_code == 200, f"Finalize failed: {fin_res.text}"
    fin_data = fin_res.json()
    bundle = fin_data["fhirBundle"]
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "document"
    assert len(bundle["entry"]) >= 4
    # Check double coding in condition
    condition_entry = next((e for e in bundle["entry"] if e["resource"]["resourceType"] == "Condition"), None)
    assert condition_entry is not None
    codings = condition_entry["resource"]["code"]["coding"]
    has_icd11 = any("who.int" in c.get("system", "") for c in codings)
    has_namaste = any("ayush.gov.in" in c.get("system", "") or "namaste" in c.get("system", "") for c in codings)
    assert has_icd11 and has_namaste
    assert fin_data["dpdp_purged"] is True
    print(f"[PASS] Finalization & FHIR Bundle passed: {fin_data['entriesCount']} resources bundled, double-coded (ICD-11 + NAMASTE), DPDP cache purged.")

    # 9. Doctor Dashboard Workstation Endpoints
    q_res = client.get("/api/doctor/queue")
    assert q_res.status_code == 200
    queue = q_res.json()["queue"]
    assert len(queue) > 0
    print(f"[PASS] Doctor Queue retrieved: {len(queue)} patients in queue")

    summ_res = client.get(f"/api/doctor/summary/{stable_session_id}")
    assert summ_res.status_code == 200
    summ_data = summ_res.json()
    assert "summary" in summ_data and "vitals" in summ_data
    print("[PASS] Doctor Summary & Vitals endpoint passed.")

    # 10. Doctor Review & Sign
    review_res = client.post("/api/doctor-review", json={
        "sessionId": stable_session_id,
        "doctorName": "Dr. Vikramaditya Sharma, MD",
        "doctorId": "DOC-AIIMS-0810",
        "provisionalDiagnosis": "Essential Hypertension with Anginal Distress",
        "clinicalNotes": "Verified through MediKiosk intake and uploaded prescription."
    })
    assert review_res.status_code == 200
    assert review_res.json()["success"] is True
    print("[PASS] Doctor review & digital signing passed.")

    # 11. Push to ABDM
    abdm_res = client.post("/api/integrations/push", json={"sessionId": stable_session_id})
    assert abdm_res.status_code == 200
    abdm_data = abdm_res.json()
    assert abdm_data["success"] is True
    print("[PASS] ABDM HIS Gateway push passed. Tx ID:", abdm_data["transactionId"])

    print("==================================================")
    print("ALL 11 TEST SUITE VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_all_endpoints()
