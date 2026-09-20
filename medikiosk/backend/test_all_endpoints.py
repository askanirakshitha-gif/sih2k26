import urllib.request
import json

BASE = "http://localhost:5000/api"

def get(path):
    req = urllib.request.Request(f"{BASE}{path}", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode('utf-8'))

def post(path, data):
    payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(f"{BASE}{path}", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode('utf-8'))

def test():
    print("--- 1. Testing Health ---")
    status, data = get("/health")
    print("Health:", status, data.get("status"))
    assert status == 200

    print("\n--- 2. Testing Patients ---")
    status, data = get("/patients")
    patients = data.get("patients", [])
    print("Patients count:", len(patients))
    assert status == 200
    patient_id = patients[0]["id"] if patients else None

    print("\n--- 3. Testing Doctor Queue & Sessions ---")
    status, data = get("/doctor/sessions")
    sessions = data.get("sessions", [])
    print("Sessions count:", len(sessions))
    assert status == 200
    session_id = sessions[0]["id"] if sessions else None

    if session_id:
        print(f"\n--- 4. Testing Doctor Session Detail for {session_id} ---")
        status, data = get(f"/doctor/session/{session_id}")
        print("Detail status:", status)
        print("  -> patient_name:", data.get("patient_name"))
        print("  -> age:", data.get("age"))
        print("  -> gender:", data.get("gender"))
        print("  -> opd_token_number:", data.get("opd_token_number"))
        print("  -> clinical_system:", data.get("clinical_system"))
        assert status == 200
        assert data.get("patient_name") is not None
        assert data.get("opd_token_number") is not None

        print("\n--- 5. Testing FHIR Bundle Endpoint ---")
        status, data = get(f"/fhir/{session_id}")
        print("FHIR resourceType:", data.get("resourceType"))
        assert status == 200

        print("\n--- 6. Testing Doctor Review Endpoint ---")
        status, data = post("/doctor-review", {
            "sessionId": session_id,
            "doctorId": "DOC-AIIMS-108",
            "doctorName": "Dr. Vikramaditya Sharma",
            "provisionalDiagnosis": "Essential Hypertension",
            "clinicalNotes": "Verified and completed.",
            "verifiedMeds": ["Telmisartan 40mg"],
            "abdmConsentVerified": True
        })
        print("Doctor Review success:", data.get("success"))
        assert status == 200

        print("\n--- 7. Testing ABDM Push Endpoint ---")
        status, data = post("/integrations/push", {
            "sessionId": session_id,
            "doctorId": "DOC-AIIMS-108",
            "abhaId": "91-2345-6789-0123"
        })
        print("ABDM Push transactionId:", data.get("transactionId"))
        assert status == 200

    print("\n--- 8. Testing Session Init (New Kiosk Session) ---")
    status, data = post("/session/init", {
        "language": "en",
        "system": "ayush",
        "patientId": patient_id,
        "conditionId": "general_digestive",
        "opdToken": "OPD-109"
    })
    print("Session Init success:", data.get("success"), "Token:", data.get("opdToken"))
    assert status == 200
    new_sess_id = data.get("sessionId")
    next_q = data.get("nextQuestion")

    if new_sess_id and next_q:
        print("\n--- 9. Testing Session Turn (Answer Submission) ---")
        status, data = post("/session/turn", {
            "sessionId": new_sess_id,
            "questionId": next_q["id"],
            "answer": "moderate"
        })
        print("Session Turn success:", data.get("success"))
        assert status == 200

    print("\n========================================================")
    print("SUCCESS: ALL BACKEND ENDPOINTS ARE FULLY OPERATIONAL!")
    print("========================================================")

if __name__ == "__main__":
    test()
