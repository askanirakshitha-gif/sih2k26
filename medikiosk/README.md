# MediKiosk – Patient Case-Taking & Triage Software

> **Smart India Hackathon 2026 Prototype**  
> **Problem Statement:** SIH26047 – Patient Case-Taking Software  
> **Ministry:** Ministry of Ayush, Government of India  
> **Category:** Software / Healthcare Triage & Outpatient Automation  

---

## 1. Project Overview

**MediKiosk** is a physical hospital outpatient department (OPD) kiosk and physician workstation designed for Indian government hospitals and healthcare facilities. It solves the critical OPD crowding bottleneck by enabling patients to complete structured, adaptive clinical history-taking before seeing the doctor.

### Key Capabilities
- **Dual-System Clinical Workflows**: Supports both **Allopathy** (evidence-based acute triage such as Chest Pain) and **AYUSH** (Ayurvedic Dashavidha Pariksha, Prakriti, Agni, Koshtha, Ahara-Vihara).
- **Multilingual Accessibility**: High-contrast, large-button touch UI with bilingual support for English and Hindi (extensible to all Eighth Schedule Indian languages).
- **Voice-Enabled Input**: Web Speech API integration with voice waveforms and Indian English/Hindi ASR + TTS read-aloud, abstracted for future Bhashini integration.
- **Deterministic Red-Flag Safety Engine**: Instant detection of high-risk emergency warning signs (e.g. left arm/jaw pain radiation, syncope, severe dyspnea) alerting hospital triage nurses and attending doctors.
- **Medical Document Digitization (OCR)**: Scans past prescriptions, blood test reports, and discharge summaries to construct an automated chronological document timeline.
- **ABDM & FHIR R4 Standardized Output**: Generates valid FHIR R4 Document Bundles and simulates pushing verified records to the Ayushman Bharat Digital Mission (ABDM) / Hospital Information System (HIS) gateway.
- **Zero External Dependency Guarantee**: Works completely offline/locally without requiring external paid LLMs or a live PostgreSQL server (auto-detects and activates local fallback store).

---

## 2. System Architecture

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │                     PATIENT KIOSK                      │
                                    │  - Full-screen high-contrast touch UI                  │
                                    │  - VoiceProvider (Browser Speech API / Bhashini ready) │
                                    │  - Multilingual (EN / HI) dictionary                   │
                                    │  - Document upload & OCR preview                       │
                                    │  - Deterministic Red-Flag Emergency Screen             │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │ HTTP REST (Port 3000 -> 5000)
                                                                ▼
┌──────────────────────────────────────┐    ┌────────────────────────────────────────────────┐
│         POSTGRESQL DATABASE          │    │           NODE.JS / EXPRESS BACKEND            │
│  - schema.sql                        │◄───┤  - Dual-mode Storage (pg + local fallback)     │
│  - Patients, Sessions, Questions     │    │  - Deterministic Question DAG Engine           │
│  - Red Flag Rules, Answers, Extractions   │  - Deterministic Red-Flag Safety Engine        │
│  - Clinical Summaries, Doctor Reviews│    │  - FHIR R4 Bundle Generator                    │
└──────────────────────────────────────┘    │  - Mock ABDM HIP Dispatch Service              │
                                            └───────┬────────────────────────────────┬───────┘
                                                    │ HTTP                           │ HTTP
                                                    ▼                                ▼
                        ┌──────────────────────────────────────┐ ┌───────────────────────────────────┐
                        │        PYTHON AI MICROSERVICE        │ │      DOCTOR OPD WORKSTATION       │
                        │  - FastAPI (Port 8000)               │ │  - Live OPD Queue                 │
                        │  - /extract-entities                 │ │  - HPI, Past, Drug, Allergy Notes │
                        │  - /summarize                        │ │  - AYUSH Dashavidha Matrix        │
                        │  - /extract-document (OCR)           │ │  - Medical Document Timeline      │
                        │  - Real LLM + Mock Fallback          │ │  - Editable Clinical Summary      │
                        │  - PyTesseract + Clinical Taxonomy   │ │  - Verify & Sign Case Record      │
                        └──────────────────────────────────────┘ │  - Inspect FHIR / Push to ABDM    │
                                                                 └───────────────────────────────────┘
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: Node.js, Express.js, `pg` (PostgreSQL client), Multer, UUID, Cors, Dotenv.
- **AI Microservice**: Python 3, FastAPI, Uvicorn, Pydantic, Pillow, PyTesseract.
- **Database**: PostgreSQL 16 (with built-in seamless in-memory fallback store).
- **Interoperability**: HL7 FHIR R4 standard (Ayushman Bharat Digital Mission compliant).

---

## 4. Folder Structure

```
medikiosk/
├── database/
│   └── schema.sql              # Complete PostgreSQL schema & seed question banks
├── backend/
│   ├── server.js               # Express application entry point
│   ├── package.json            # Node backend dependencies
│   ├── .env.example            # Environment template
│   ├── routes/
│   │   ├── kioskRoutes.js      # /api/start, /api/next, /api/summary
│   │   ├── documentRoutes.js   # /api/documents/upload, timeline
│   │   └── doctorRoutes.js     # /api/doctor-review, /api/fhir, /api/integrations/push
│   ├── services/
│   │   ├── db.js               # Dual-mode database layer (PostgreSQL + Fallback)
│   │   ├── questionEngine.js   # Deterministic question sequencing
│   │   ├── redFlagEngine.js    # Deterministic emergency triage rules
│   │   └── fhirGenerator.js    # FHIR R4 Bundle JSON generator
│   └── utils/
│       └── seedData.js         # Embedded seed question banks & demo patients
├── ai-service/
│   ├── main.py                 # FastAPI microservice entry point
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # AI service environment template
│   └── services/
│       ├── nlp_service.py      # Dual-mode entity extraction & summarization
│       └── ocr_service.py      # Local OCR & medical document normalization
├── frontend/
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.js          # Vite config with backend proxy
│   ├── index.html              # HTML shell with Inter & Outfit typography
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── src/
│       ├── main.jsx            # React root mount
│       ├── App.jsx             # Top-level kiosk/doctor switcher
│       ├── index.css           # Design tokens, kiosk buttons, voice animations
│       ├── components/
│       │   ├── KioskNavbar.jsx # Header with language toggle and emergency alert
│       │   ├── VoiceWaveform.jsx # Animated audio bars for microphone
│       │   ├── RedFlagModal.jsx # Clinical emergency alert popup
│       │   └── FhirModal.jsx   # FHIR R4 bundle JSON viewer & downloader
│       ├── pages/
│       │   ├── KioskApp.jsx    # Patient self-service kiosk UI
│       │   └── DoctorDashboard.jsx # OPD physician clinical workstation
│       └── services/
│           ├── api.js          # Axios API client
│           ├── voiceProvider.js # BrowserSpeechProvider + Bhashini abstraction
│           └── i18n.js         # English & Hindi localization dictionary
├── docker-compose.yml          # Optional PostgreSQL container
└── README.md                   # Full documentation & demo guide
```

---

## 5. Quick Start (Run in 3 Terminals)

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.10 or higher)

> **Note on PostgreSQL & LLM API Keys:**  
> Neither PostgreSQL nor external LLM API keys are required to run this prototype! The system includes an automatic in-memory clinical fallback store and high-precision clinical NLP engine so you can run and demonstrate the entire project immediately out of the box.

---

### 🚀 Unified Single-Link Startup (Recommended)
You can run the entire full-stack system from a single command and access everything through **one unified link**:

```powershell
# Windows (PowerShell)
cd medikiosk
powershell -ExecutionPolicy Bypass -File .\run_dev.ps1
```

```bash
# Linux / macOS (Bash)
cd medikiosk
chmod +x run_dev.sh
./run_dev.sh
```

**Single Unified Live URL:**
- **App & Kiosk Workstation:** [http://localhost:5000](http://localhost:5000)
- **FastAPI Interactive Docs:** [http://localhost:5000/docs](http://localhost:5000/docs)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

### Independent Service Startup (Development Mode)

#### Terminal 1: FastAPI Unified Backend
```bash
cd medikiosk/backend
python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```
*Backend runs on `http://localhost:5000` (FastAPI Swagger docs at `http://localhost:5000/docs`).*

#### Terminal 2: Vite React Kiosk (Hot Reload)
```bash
cd medikiosk/frontend
npm run dev
```
*Hot-reload dev frontend opens on `http://localhost:3000`.*

---

## 6. Optional: Running with PostgreSQL & Docker

If you have PostgreSQL or Docker installed and wish to test against live PostgreSQL:

### Option A: Using Docker Compose
```bash
cd medikiosk
docker-compose up -d
```

### Option B: Local PostgreSQL Installation
1. Open PostgreSQL command line or pgAdmin.
2. Create database:
   ```sql
   CREATE DATABASE medikiosk;
   ```
3. Run the schema script:
   ```bash
   psql -U postgres -d medikiosk -f database/schema.sql
   ```
4. Verify `backend/.env` has your database password:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/medikiosk
   ```

---

## 7. Environment Variables Configuration

### `backend/.env`
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medikiosk
AI_SERVICE_URL=http://localhost:8000
UPLOAD_DIR=./uploads
MOCK_HIS_ENDPOINT=https://mock-his.abdm.gov.in/v1/clinical-records
USE_FALLBACK_DB=true
```

### `ai-service/.env`
```env
PORT=8000
LLM_PROVIDER=mock
LLM_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
```
*(Leave `LLM_API_KEY` blank to use high-precision deterministic demo mode, or add your OpenAI/Gemini API key for real AI generation).*

---

## 8. Clinical Question Banks & Red-Flag Triggers

### A. Allopathy Demonstration (Condition: Acute Chest Pain)
Features **20+ granular clinical questions**:
1. **Chief complaint**: Retrosternal pressure, heaviness, tightness.
2. **Site / Location**: Center of chest behind breastbone, left chest, upper abdomen.
3. **Onset**: Sudden (within minutes) vs Gradual.
4. **Duration**: <30 mins, 30-120 mins, several hours, >24 hrs.
5. **Character**: Crushing/squeezing, sharp/stabbing, burning/acidity, dull ache.
6. **Severity**: 1 to 10 visual rating scale.
7. **Radiation**: **Left arm/shoulder (TRIGGERS RED FLAG)**, Jaw/neck (TRIGGERS RED FLAG), Upper back, None.
8. **Aggravating factors**: Walking/exertion, deep breathing, lying flat.
9. **Relieving factors**: Rest, sublingual nitrate, leaning forward.
10. **Associated symptoms**: Dyspnea, diaphoresis, nausea, syncope.
11. **Breathlessness**: Yes/No (Combined with high severity triggers emergency alert).
12. **Sweating / Diaphoresis**: Yes/No.
13. **Nausea / Vomiting**: Yes/No.
14. **Palpitations**: Yes/No.
15. **Dizziness / Fainting (Syncope)**: **Yes (TRIGGERS RED FLAG)**.
16. **Previous episodes**: Yes/No.
17. **Past medical history**: Hypertension, Diabetes, Dyslipidemia, Prior MI.
18. **Current medications**: Blood pressure pills, blood thinners, antidiabetics.
19. **Known allergies**: Penicillin, NSAIDs, None.
20. **Family history of premature CAD**: Yes/No.
21. **Personal habits**: Tobacco/smoking, alcohol.

### B. AYUSH Demonstration (Dashavidha Pariksha)
Features **13 comprehensive Ayurvedic assessment criteria**:
1. **Primary Complaint**: Ajeerna (indigestion), Sandhivata (joint pain), Shwasa (respiratory), Anidra (insomnia).
2. **Prakriti (Sharirika)**: Vata (thin/slender), Pitta (medium/muscular), Kapha (broad/heavy).
3. **Prakriti (Twak & Kesh)**: Dry/rough (Vata), Warm/flushed (Pitta), Smooth/oily (Kapha).
4. **Prakriti (Temperature tolerance)**: Sheeta asahishnu (cold intolerant), Ushna asahishnu (heat intolerant).
5. **Agni Pariksha**: Vishama (irregular), Tikshna (sharp/intense), Manda (sluggish), Sama (balanced).
6. **Koshtha Pariksha**: Krura (hard/constipated), Mridu (soft/loose), Madhyama (regular).
7. **Ahara Shakti**: Low portion, moderate, high consumption capacity.
8. **Ahara Rasa Satmya**: Madhura (sweet), Amla/Katu (sour/spicy), Lavana (salty).
9. **Vyayama Shakti**: Alpa (low endurance), Madhyama, Uttama (high physical stamina).
10. **Nidra Pariksha**: Alpa/chanchala (light/broken), Madhyama (sound), Atinidra (heavy).
11. **Sattva (Mental temperament)**: Quick to worry (Vata), Ambitious/irritable (Pitta), Calm/steady (Kapha).
12. **Vihara (Lifestyle)**: Sedentary desk work, Active physical labor, Irregular night shifts.
13. **Vaya (Life stage)**: Balya (youth), Madhyama (adult), Vriddha (elderly).

---

## 9. Step-by-Step Demonstration Walkthrough (For Hackathon Jury)

### Demonstration Flow 1: Allopathy Chest Pain with Red-Flag Emergency Triage
1. Open the kiosk at `http://localhost:3000`.
2. **Select Language**: Click **English**.
3. **Select System**: Click **Allopathy (Modern Medicine)**.
4. **Patient Identification**: Select demo patient **Ramesh Sharma (54 Yrs, Male, ABHA: 91-2345-6789-0123)** and click **Continue**.
5. **Consent Screen**: Check the ABDM consent checkbox and click **I Agree & Begin Consultation**.
6. **Answering Questions**:
   - Question 1 (Chief complaint): Select **Chest pain or heavy pressure**.
   - Question 2 (Location): Select **Center of chest (behind breastbone)**.
   - Question 3 (Onset): Select **Suddenly (within minutes)**.
   - Question 4 (Duration): Select **30 minutes to 2 hours**.
   - Question 5 (Character): Select **Crushing pressure, weight, or squeezing**.
   - Question 6 (Severity): Move the slider to **8/10**.
   - Question 7 (Radiation): Select **Radiates to Left Arm and Shoulder** (or tap the microphone and speak *"Radiates to left arm"*).
7. **Red Flag Triggered!**:
   - A high-contrast emergency warning modal pops up immediately:
     > *"Potential warning sign detected: Pain radiating to the left arm is a high-risk symptom for acute coronary syndrome. Please alert hospital staff immediately."*
   - Click **Alert Staff & Continue**.
8. Continue answering the remaining history questions (breathlessness, sweating, medications, allergies).
9. **Document Upload**: Click to upload or skip previous prescriptions.
10. **Receipt Screen**: Displays the generated **OPD Token Number (e.g. OPD-101)**. Click **Open Doctor Workstation**.

### Demonstration Flow 2: Doctor Review, FHIR R4 Inspection & ABDM Push
1. On the Doctor Dashboard, find **Ramesh Sharma** in the OPD queue with the prominent **RED FLAG TRIAGE** badge.
2. Click on the patient to inspect the dossier:
   - Review the synthesized Chief Complaint, HPI, and Past History.
   - View the **Document Timeline** with OCR extracted findings.
   - Switch to the **Doctor Notes & Verification** tab.
   - Edit the provisional diagnosis (e.g. *"Suspected Acute Coronary Syndrome / Angina Pectoris"*).
   - Click **Verify, Sign & Generate FHIR**.
3. Click **Inspect FHIR R4**:
   - A modal displays the complete HL7 FHIR R4 Bundle containing `Patient`, `Encounter`, `Condition`, `Observation`, `MedicationStatement`, and `AllergyIntolerance` resources.
   - Test the **Copy JSON** or **Download** feature.
4. Click **Push to HIS/ABDM**:
   - An immediate transaction receipt dialog appears with a realistic ABDM transaction ID (e.g. `ABDM-HIP-TX-XXXX`) and Health Information Provider ACK response.

### Demonstration Flow 3: AYUSH Dashavidha Pariksha Case-Taking
1. Return to the Kiosk, select **हिंदी (Hindi)**.
2. Select **आयुष (आयुर्वेद एवं पारंपरिक चिकित्सा)**.
3. Select demo patient **Sunita Patel** or **Rajesh Kumar**.
4. Go through the Hindi questions for **Prakriti (Sharirika & Twak)**, **Agni Pariksha**, **Koshtha Pariksha**, and **Ahara-Vihara**.
5. Open the Doctor Dashboard to observe the specialized **AYUSH Dashavidha Pariksha Matrix** populated with structured doshic attributes!

---

## 10. API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status & DB connection check |
| `GET` | `/api/patients` | Retrieve list of demo patients |
| `POST` | `/api/patients` | Register new walk-in patient |
| `POST` | `/api/start` | Initialize kiosk session & get 1st question |
| `POST` | `/api/next` | Submit answer & retrieve adaptive next question |
| `GET` | `/api/summary/:sessionId` | Retrieve structured clinical summary |
| `POST` | `/api/documents/upload` | Upload medical document image/PDF (multipart) |
| `POST` | `/api/documents/:id/process` | Run OCR extraction pipeline |
| `GET` | `/api/documents/patient/:id` | Chronological document timeline |
| `GET` | `/api/doctor/sessions` | List OPD doctor queue |
| `GET` | `/api/doctor/session/:id` | Retrieve full clinical case file |
| `POST` | `/api/doctor-review` | Physician verification, edits & signature |
| `GET` | `/api/fhir/:sessionId` | Generate FHIR R4 Bundle |
| `POST` | `/api/integrations/push` | Mock dispatch to ABDM / HIS gateway |
| `POST` | `http://localhost:8000/extract-entities` | AI microservice entity extraction |
| `POST` | `http://localhost:8000/summarize` | AI microservice clinical summarization |
| `POST` | `http://localhost:8000/extract-document` | AI microservice document OCR extraction |

---

## 11. Clinical Safety & Non-Diagnostic Disclaimer

> [!IMPORTANT]
> **MediKiosk is an interactive case-taking and triage support assistant, NOT an autonomous diagnostic system.**
> - The software structures patient symptoms, identifies predetermined emergency warning signs, and digitizes physical documents for physician review.
> - It does not prescribe medications, establish definitive diagnoses, or replace licensed medical professionals.
> - All red flags are framed non-diagnostically (e.g. *"Potential warning sign detected. Please alert hospital staff immediately."*).
> - All OCR extracted medications and diagnoses are marked *"Requires attending physician verification."*

---

## 12. Troubleshooting

- **Microphone / Voice input not working**: Browser Web Speech API requires Chrome, Edge, or Safari on `localhost` or an `https://` connection. If microphone permission is denied, use the touch buttons or manual text input field.
- **Port 5000 or 8000 already in use**: Change the port in `backend/.env` or `ai-service/.env` and update the proxy in `frontend/vite.config.js`.
- **Database connection warning**: The backend will automatically log that PostgreSQL was not reachable and activate the in-memory fallback store. All features will continue to work seamlessly.
