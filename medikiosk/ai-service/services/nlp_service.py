"""
NLP and Entity Extraction Service
Supports dual-mode: Real LLM mode (if API key configured) and high-precision Deterministic Fallback mode.
"""

import os
import re
import json
import requests

LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY") or ""
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock").lower()

def extract_clinical_entities(text: str, field: str = "general", language: str = "en") -> dict:
    """
    Extract structured clinical entities from patient utterance or text input.
    """
    if LLM_API_KEY and LLM_PROVIDER in ["openai", "gemini"]:
        try:
            return _call_llm_for_entities(text, field, language)
        except Exception as e:
            print(f"[NLP Service] LLM call failed, falling back to deterministic extraction: {e}")

    return _deterministic_entity_extraction(text, field, language)


def _deterministic_entity_extraction(text: str, field: str, language: str) -> dict:
    """
    High-precision deterministic regex & clinical taxonomy extraction.
    """
    text_lower = text.lower().strip()
    
    entities = {
        "symptoms": [],
        "duration": "",
        "severity": "",
        "location": "",
        "radiation": "",
        "associated_symptoms": [],
        "medications": [],
        "allergies": []
    }

    # Extract location
    if any(loc in text_lower for loc in ["retrosternal", "center", "centre", "breastbone", "middle"]):
        entities["location"] = "Retrosternal / Central chest"
    elif "left" in text_lower and "arm" not in text_lower:
        entities["location"] = "Left precordium / Left chest"
    elif "right" in text_lower:
        entities["location"] = "Right hemithorax"
    elif "epigastric" in text_lower or "abdomen" in text_lower or "pet" in text_lower:
        entities["location"] = "Epigastric / Upper abdomen"

    # Extract radiation
    if "left arm" in text_lower or "arm" in text_lower or "haath" in text_lower:
        entities["radiation"] = "Left arm / shoulder"
    elif "jaw" in text_lower or "neck" in text_lower or "gardan" in text_lower or "jabda" in text_lower:
        entities["radiation"] = "Jaw / cervical region"
    elif "back" in text_lower or "peeth" in text_lower:
        entities["radiation"] = "Interscapular / Upper back"

    # Extract duration
    dur_match = re.search(r'(\d+)\s*(minute|min|hour|hr|day|week|month)s?', text_lower)
    if dur_match:
        entities["duration"] = f"{dur_match.group(1)} {dur_match.group(2)}s"
    elif "under 30" in text_lower or "less than 30" in text_lower:
        entities["duration"] = "< 30 minutes"
    elif "hours" in text_lower:
        entities["duration"] = "Several hours"
    elif "day" in text_lower:
        entities["duration"] = "> 24 hours"

    # Extract severity
    sev_match = re.search(r'\b(10|[1-9])\b', text_lower)
    if sev_match:
        entities["severity"] = f"{sev_match.group(1)}/10"
    elif any(word in text_lower for word in ["severe", "unbearable", "crushing", "bahut tez"]):
        entities["severity"] = "8/10 (Severe)"
    elif any(word in text_lower for word in ["moderate", "madhyam"]):
        entities["severity"] = "5/10 (Moderate)"
    elif any(word in text_lower for word in ["mild", "halka"]):
        entities["severity"] = "2/10 (Mild)"

    # Associated symptoms
    if any(w in text_lower for w in ["breathless", "dyspnea", "shortness of breath", "saans"]):
        entities["associated_symptoms"].append("Dyspnea / Shortness of breath")
    if any(w in text_lower for w in ["sweat", "perspiration", "paseena", "diaphoresis"]):
        entities["associated_symptoms"].append("Diaphoresis / Sweating")
    if any(w in text_lower for w in ["nausea", "vomit", "ulti"]):
        entities["associated_symptoms"].append("Nausea / Vomiting")
    if any(w in text_lower for w in ["palpitation", "flutter", "dhadkan"]):
        entities["associated_symptoms"].append("Palpitations")
    if any(w in text_lower for w in ["faint", "syncope", "dizzy", "chakkar", "behosh"]):
        entities["associated_symptoms"].append("Presyncope / Dizziness")

    # Medications
    if any(m in text_lower for m in ["bp", "blood pressure", "telmisartan", "amlodipine", "aspirin", "atorvastatin", "ecosprin"]):
        entities["medications"].append("Antihypertensive / Cardiovascular agents")
    if any(m in text_lower for m in ["diabetes", "metformin", "insulin", "sugar"]):
        entities["medications"].append("Antidiabetic therapy")

    # Allergies
    if any(a in text_lower for a in ["penicillin", "antibiotic"]):
        entities["allergies"].append("Penicillin / Beta-lactam antibiotics")
    if any(a in text_lower for a in ["painkiller", "nsaid", "brufen", "aspirin"]):
        entities["allergies"].append("NSAIDs / Analgesics")

    # Primary symptoms
    if any(s in text_lower for s in ["pain", "pressure", "heaviness", "burning", "tightness", "dard"]):
        entities["symptoms"].append("Chest discomfort")

    return entities


def generate_clinical_summary(system: str, patient: dict, answers: dict, red_flags: list) -> str:
    """
    Generate a concise, physician-friendly clinical summary.
    """
    if LLM_API_KEY and LLM_PROVIDER in ["openai", "gemini"]:
        try:
            return _call_llm_for_summary(system, patient, answers, red_flags)
        except Exception as e:
            print(f"[NLP Service] LLM summary failed, using deterministic summary: {e}")

    patient_name = patient.get("name", "Patient") if patient else "Patient"
    age = patient.get("age", "N/A") if patient else "N/A"
    gender = patient.get("gender", "N/A") if patient else "N/A"

    has_red_flags = len(red_flags) > 0
    flag_text = ""
    if has_red_flags:
        flag_text = "\n\n*** RED FLAG ALERT ***\n" + "\n".join([f"- {rf.get('alert', 'Warning sign detected')} ({rf.get('field', '')}: {rf.get('value', '')})" for rf in red_flags])
        flag_text += "\nClinical action: Immediate physician review and STAT diagnostic triage recommended."

    if system == "ayush":
        summary = (
            f"AYUSH OUTPATIENT CASE-RECORD (Dashavidha Pariksha)\n"
            f"Patient: {patient_name} | Age/Gender: {age}/{gender}\n"
            f"Primary Concern: {answers.get('ayush_chief_complaint', 'Holistic Health Evaluation')}\n\n"
            f"1. Prakriti Assessment: Body Frame={answers.get('prakriti_body_build', 'N/A')}, "
            f"Skin/Hair={answers.get('prakriti_skin_hair', 'N/A')}, Climate Tolerance={answers.get('prakriti_temperature', 'N/A')}.\n"
            f"2. Agni Pariksha: Digestive state characterized as {answers.get('agni_digestive_fire', 'N/A')}.\n"
            f"3. Koshtha Pariksha: Bowel elimination tendency identified as {answers.get('koshtha_bowel_pattern', 'N/A')}.\n"
            f"4. Ahara & Satmya: Consumption capacity is {answers.get('ahara_shakti_capacity', 'N/A')}; Rasa preference is {answers.get('ahara_rasa_preference', 'N/A')}.\n"
            f"5. Vyayama Shakti: Physical stamina rated as {answers.get('vyayama_shakti_stamina', 'N/A')}.\n"
            f"6. Nidra & Manasa: Sleep quality={answers.get('nidra_sleep_quality', 'N/A')}; Sattva/temperament={answers.get('sattva_mental_temperament', 'N/A')}.\n"
            f"7. Vihara & Vaya: Routine={answers.get('vihara_lifestyle', 'N/A')}; Life stage={answers.get('vaya_age_stage', 'N/A')}."
        )
    else:
        summary = (
            f"ALLOPATHY OPD CLINICAL TRIAGE DOSSIER\n"
            f"Patient: {patient_name} | Age/Gender: {age}/{gender}\n"
            f"Chief Complaint: {answers.get('chief_complaint', 'Chest discomfort')}\n"
            f"History of Present Illness (HPI):\n"
            f"Onset was {answers.get('onset', 'N/A')}, located at {answers.get('site', 'chest')}, "
            f"persisting for {answers.get('duration', 'recent duration')}. Character described as {answers.get('character', 'discomfort')}, "
            f"severity rated {answers.get('severity', 'N/A')}/10. Radiation: {answers.get('radiation', 'None')}. "
            f"Aggravated by: {answers.get('aggravating_factors', 'N/A')}. Relieved by: {answers.get('relieving_factors', 'N/A')}.\n"
            f"Associated Signs: Dyspnea: {answers.get('breathlessness', 'No')}, Diaphoresis: {answers.get('sweating', 'No')}, "
            f"Nausea/Vomiting: {answers.get('nausea_vomiting', 'No')}, Palpitations: {answers.get('palpitations', 'No')}, "
            f"Syncope/Dizziness: {answers.get('syncope', 'No')}.\n"
            f"Co-morbidities: {answers.get('past_medical_history', 'None reported')}.\n"
            f"Medications: {answers.get('current_medications', 'None reported')}.\n"
            f"Allergies: {answers.get('allergies', 'No known allergies')}."
        )

    return summary + flag_text


def _call_llm_for_entities(text: str, field: str, language: str) -> dict:
    """Call external LLM if configured"""
    prompt = f"Extract clinical entities from this patient response: '{text}' in context of field '{field}'. Return JSON with keys symptoms, duration, severity, location, radiation, associated_symptoms, medications, allergies."
    # Standard OpenAI compatible fallback
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o-mini",
            "messages": [{"role": "system", "content": "You are a clinical NLP entity extractor. Output strictly JSON."}, {"role": "user", "content": prompt}],
            "temperature": 0.0
        },
        timeout=3
    )
    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    cleaned = re.sub(r'```json|```', '', content).strip()
    return json.loads(cleaned)


def _call_llm_for_summary(system: str, patient: dict, answers: dict, red_flags: list) -> str:
    """Call external LLM for summary if configured"""
    prompt = f"Synthesize a physician clinical summary for a hospital OPD case: System={system}, Patient={json.dumps(patient)}, Answers={json.dumps(answers)}, RedFlags={json.dumps(red_flags)}. Keep it objective and concise. Do NOT make a definitive diagnosis."
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o-mini",
            "messages": [{"role": "system", "content": "You are an assistant medical scribe. Output professional clinical notes."}, {"role": "user", "content": prompt}],
            "temperature": 0.2
        },
        timeout=3
    )
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()
