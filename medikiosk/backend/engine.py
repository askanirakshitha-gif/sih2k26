import re
import logging
from typing import Dict, Any, List, Optional, Tuple

from schemas import QuestionItem, OptionItem, RedFlagItem, ProgressInfo
from ml_engine import clinical_model

logger = logging.getLogger("engine")

# ==============================================================================
# DETERMINISTIC ZERO-LATENCY SAFETY INTERCEPTOR RULES
# ==============================================================================
CRITICAL_EMERGENCY_RULES = [
    {
        "id": "EMERG_CARDIAC_1",
        "category": "Cardiac",
        "name": "Crushing Retrosternal Pain / Arm-Jaw Radiation",
        "pattern": r"(crushing|heavy|severe|tight|squeezing).*(chest|retrosternal|substernal).*(radiat|arm|left arm|jaw|neck|back)",
        "severity": "CRITICAL",
        "message_en": "CRITICAL EMERGENCY: Severe crushing chest discomfort radiating to arm or jaw detected. Immediate cardiac triage required.",
        "message_hi": "गंभीर आपातकाल: छाती में भारी दबाव व हाथ/जबड़े में दर्द का संकेत। तुरंत आपातकालीन कक्ष में जाएं।",
        "message_kn": "ತೀವ್ರ ತುರ್ತುಸ್ಥಿತಿ: ಎದೆ ಭಾರ ಮತ್ತು ತೋಳು/ದವಡೆಗೆ ಹರಡುವ ನೋವು ಪತ್ತೆಯಾಗಿದೆ. ತಕ್ಷಣ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ ಪಡೆಯಿರಿ.",
        "rationale": "High-risk acute coronary syndrome (ACS) / myocardial infarction presentation requiring immediate stat ECG and troponin."
    },
    {
        "id": "EMERG_CARDIAC_2",
        "category": "Cardiac",
        "name": "Severe Anginal Pain",
        "pattern": r"(chest.*pain.*(left arm|jaw)|crushing.*pain|severe.*chest.*pressure|chest.*tightness.*breathless)",
        "severity": "CRITICAL",
        "message_en": "CRITICAL ALERT: High-risk anginal symptoms detected. Proceed to Emergency Department immediately.",
        "message_hi": "आपातकालीन चेतावनी: तीव्र सीने में दर्द। कृपया तुरंत डॉक्टर से संपर्क करें।",
        "message_kn": "ತುರ್ತು ಎಚ್ಚರಿಕೆ: ತೀವ್ರ ಎದೆ ನೋವು ಪತ್ತೆಯಾಗಿದೆ. ತಕ್ಷಣ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ.",
        "rationale": "Strong association with acute coronary artery occlusion."
    },
    {
        "id": "EMERG_NEURO_FAST",
        "category": "Neurological",
        "name": "FAST Stroke Criteria",
        "pattern": r"(face.*droop|facial.*droop|arm.*weak|paralysis|speech.*slur|slurred.*speech|sudden.*numb|cannot.*talk|loss.*balance)",
        "severity": "CRITICAL",
        "message_en": "CRITICAL EMERGENCY: Acute neurological deficit / FAST stroke signs detected. Immediate Code Stroke activation needed.",
        "message_hi": "गंभीर आपातकाल: चेहरे का झुकना, हाथ की कमजोरी या बोलने में लड़खड़ाहट (स्ट्रोक के लक्षण)। तुरंत इमरजेंसी वार्ड जाएं।",
        "message_kn": "ತೀವ್ರ ತುರ್ತುಸ್ಥಿತಿ: ಪಾರ್ಶ್ವವಾಯು (ಸ್ಟ್ರೋಕ್) ಲಕ್ಷಣಗಳು - ಮುಖ ಸೊಟ್ಟಗಾಗುವುದು, ಕೈ ದೌರ್ಬಲ್ಯ ಅಥವಾ ಮಾತು ತೊದಲುವಿಕೆ ಪತ್ತೆಯಾಗಿದೆ.",
        "rationale": "Meets Cincinnati / FAST stroke scale criteria requiring emergent non-contrast head CT and thrombolytic assessment."
    },
    {
        "id": "EMERG_RESP_1",
        "category": "Respiratory",
        "name": "Severe Dyspnea / Asphyxia / Choking",
        "pattern": r"(severe.*dyspnea|gasping|cannot.*breathe|can't.*breathe|choking|stridor|suffocating|blue.*lips)",
        "severity": "CRITICAL",
        "message_en": "CRITICAL EMERGENCY: Impending respiratory failure or choking detected. Immediate airway management needed.",
        "message_hi": "गंभीर आपातकाल: सांस लेने में अत्यधिक कठिनाई या दम घुटना। तुरंत ऑक्सीजन व मेडिकल सहायता लें।",
        "message_kn": "ತೀವ್ರ ತುರ್ತುಸ್ಥಿತಿ: ಉಸಿರಾಟದ ತೀವ್ರ ತೊಂದರೆ ಅಥವಾ ಉಸಿರುಗಟ್ಟುವಿಕೆ. ತುರ್ತು ಆಮ್ಲಜನಕ ಚಿಕಿತ್ಸೆ ಅಗತ್ಯವಿದೆ.",
        "rationale": "High risk of hypoxemic respiratory arrest."
    },
    {
        "id": "EMERG_SYNCOPE",
        "category": "Cardiovascular",
        "name": "Syncope / Collapse",
        "pattern": r"(syncope|fainted|blackout|collapsed|loss of consciousness)",
        "severity": "HIGH",
        "message_en": "URGENT ALERT: Episode of syncope or collapse reported. Immediate hemodynamic assessment required.",
        "message_hi": "चेतावनी: बेहोशी या चक्कर आना। तत्काल रक्तचाप और ईसीजी जांच आवश्यक है।",
        "message_kn": "ಎಚ್ಚರಿಕೆ: ಮೂರ್ಛೆ ಅಥವಾ ಹಠಾತ್ ಪ್ರಜ್ಞೆ ತಪ್ಪುವುದು. ತಕ್ಷಣ ಪರೀಕ್ಷೆ ಮಾಡಿಸಿ.",
        "rationale": "Cardiogenic syncope indicates arrhythmia or severe hemodynamic compromise."
    }
]

class SafetyInterceptor:
    def __init__(self):
        self.rules = CRITICAL_EMERGENCY_RULES

    def inspect_text(self, text: str, clinical_field: str = "", language: str = "en") -> Tuple[bool, List[RedFlagItem]]:
        if not text:
            return False, []

        text_lower = text.lower().strip()
        flagged_items: List[RedFlagItem] = []
        is_emergency = False

        for rule in self.rules:
            if re.search(rule["pattern"], text_lower):
                is_emergency = True
                msg_key = f"message_{language}"
                message = rule.get(msg_key, rule.get("message_en", "Emergency symptom detected."))
                flagged_items.append(
                    RedFlagItem(
                        ruleId=rule["id"],
                        ruleName=rule["name"],
                        severity=rule["severity"],
                        message=message,
                        clinicalRationale=rule.get("rationale")
                    )
                )

        return is_emergency, flagged_items

# ==============================================================================
# SOCRATES PROTOCOL QUESTION SEQUENCE (ALLOPATHY)
# ==============================================================================
ALLOPATHY_SOCRATES_QUESTIONS = [
    {
        "id": "cp_q1",
        "clinical_system": "allopathy",
        "protocol_stage": "SITE",
        "clinical_field": "chief_complaint",
        "sequence": 1,
        "required": True,
        "question_text_en": "Where exactly is your primary discomfort located? (Site)",
        "question_text_hi": "आपकी मुख्य परेशानी या दर्द वास्तव में शरीर में कहाँ है? (साइट)",
        "question_text_kn": "ನಿಮ್ಮ ಮುಖ್ಯ ಅಸ್ವಸ್ಥತೆ ಅಥವಾ ನೋವು ನಿಖರವಾಗಿ ಎಲ್ಲಿದೆ? (ಸ್ಥಳ)",
        "question_type": "single_choice",
        "options": [
            {"value": "chest_retrosternal", "text_en": "Center of chest (Behind breastbone / Retrosternal)", "text_hi": "छाती के बीच में (हड्डी के पीछे)", "text_kn": "ಎದೆಯ ಮಧ್ಯಭಾಗದಲ್ಲಿ"},
            {"value": "chest_left", "text_en": "Left side of chest", "text_hi": "छाती के बाईं ओर", "text_kn": "ಎದೆಯ ಎಡಭಾಗದಲ್ಲಿ"},
            {"value": "upper_abdomen", "text_en": "Upper abdomen / Epigastric", "text_hi": "पेट के ऊपरी हिस्से में", "text_kn": "ಹೊಟ್ಟೆಯ ಮೇಲ್ಭಾಗದಲ್ಲಿ"},
            {"value": "other_site", "text_en": "Other location", "text_hi": "अन्य स्थान", "text_kn": "ಇತರ ಸ್ಥಳ"}
        ]
    },
    {
        "id": "cp_q2",
        "clinical_system": "allopathy",
        "protocol_stage": "ONSET",
        "clinical_field": "onset",
        "sequence": 2,
        "required": True,
        "question_text_en": "When did this discomfort start, and was the onset sudden or gradual? (Onset)",
        "question_text_hi": "यह दर्द कब शुरू हुआ, और क्या यह अचानक शुरू हुआ या धीरे-धीरे? (आरंभ)",
        "question_text_kn": "ಈ ನೋವು ಯಾವಾಗ ಪ್ರಾರಂಭವಾಯಿತು ಮತ್ತು ಹಠಾತ್ ಅಥವಾ ನಿಧಾನವಾಗಿ ಶುರುವಾಯಿತೇ? (ಆರಂಭ)",
        "question_type": "single_choice",
        "options": [
            {"value": "sudden_today", "text_en": "Sudden onset today (within past 2-4 hours)", "text_hi": "आज अचानक (पिछले 2-4 घंटों में)", "text_kn": "ಇಂದು ಹಠಾತ್ (ಕಳೆದ 2-4 ಗಂಟೆಗಳಲ್ಲಿ)"},
            {"value": "gradual_days", "text_en": "Gradually over the past few days", "text_hi": "पिछले कुछ दिनों से धीरे-धीरे", "text_kn": "ಕಳೆದ ಕೆಲವು ದಿನಗಳಿಂದ ನಿಧಾನವಾಗಿ"},
            {"value": "chronic_weeks", "text_en": "Recurring for weeks / months", "text_hi": "कई हफ्तों या महीनों से बार-बार", "text_kn": "ಕೆಲವು ವಾರಗಳು ಅಥವಾ ತಿಂಗಳುಗಳಿಂದ"}
        ]
    },
    {
        "id": "cp_q3",
        "clinical_system": "allopathy",
        "protocol_stage": "CHARACTER",
        "clinical_field": "character",
        "sequence": 3,
        "required": True,
        "question_text_en": "How would you describe the character of the sensation? (Character)",
        "question_text_hi": "आप इस दर्द के अहसास को कैसे वर्णित करेंगे? (प्रकृति)",
        "question_text_kn": "ಈ ನೋವಿನ ಸ್ವರೂಪ ಹೇಗಿದೆ ಎಂದು ವಿವರಿಸಬಲ್ಲಿರಾ? (ಲಕ್ಷಣ)",
        "question_type": "single_choice",
        "options": [
            {"value": "crushing_pressure", "text_en": "Heavy pressure, squeezing or crushing feeling", "text_hi": "भारी दबाव, जकड़न या भारीपन", "text_kn": "ಭಾರವಾದ ಒತ್ತಡ ಅಥವಾ ಬಿಗಿತ"},
            {"value": "burning", "text_en": "Burning / Acidity sensation", "text_hi": "जलन या एसिडिटी जैसा अहसास", "text_kn": "ಉರಿ ಅಥವಾ ಆಸಿಡಿಟಿ ಅನುಭವ"},
            {"value": "sharp_stabbing", "text_en": "Sharp or stabbing pain with breathing", "text_hi": "सांस लेने पर तेज चुभने वाला दर्द", "text_kn": "ಉಸಿರಾಡುವಾಗ ಚುಚ್ಚುವಂತಹ ತೀವ್ರ ನೋವು"},
            {"value": "dull_ache", "text_en": "Continuous dull ache", "text_hi": "हल्का लेकिन लगातार दर्द", "text_kn": "ಸತತ ಮಂದ ನೋವು"}
        ]
    },
    {
        "id": "cp_q4",
        "clinical_system": "allopathy",
        "protocol_stage": "RADIATION",
        "clinical_field": "radiation",
        "sequence": 4,
        "required": True,
        "question_text_en": "Does the discomfort radiate or spread anywhere else? (Radiation)",
        "question_text_hi": "क्या दर्द शरीर के किसी अन्य हिस्से में फैलता है? (विकिरण)",
        "question_text_kn": "ನೋವು ದೇಹದ ಇತರ ಭಾಗಗಳಿಗೆ ಹರಡುತ್ತದೆಯೇ? (ವಿಕಿರಣ)",
        "question_type": "single_choice",
        "options": [
            {"value": "left_arm_shoulder", "text_en": "Radiates to left arm, shoulder, or jaw", "text_hi": "बाएं हाथ, कंधे या जबड़े तक फैलता है", "text_kn": "ಎಡಗೈ, ಭುಜ ಅಥವಾ ದವಡೆಗೆ ಹರಡುತ್ತದೆ"},
            {"value": "back", "text_en": "Radiates straight through to the back", "text_hi": "सीधे पीठ की ओर जाता है", "text_kn": "ನೇರವಾಗಿ ಬೆನ್ನಿಗೆ ಹರಡುತ್ತದೆ"},
            {"value": "epigastrium", "text_en": "Spreads down into the stomach", "text_hi": "पेट की ओर नीचे जाता है", "text_kn": "ಹೊಟ್ಟೆಯ ಭಾಗಕ್ಕೆ ಹರಡುತ್ತದೆ"},
            {"value": "no_radiation", "text_en": "No, it stays strictly in one place", "text_hi": "नहीं, केवल एक ही जगह रहता है", "text_kn": "ಇಲ್ಲ, ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ ಇರುತ್ತದೆ"}
        ]
    },
    {
        "id": "cp_q5",
        "clinical_system": "allopathy",
        "protocol_stage": "ASSOCIATIONS",
        "clinical_field": "associated_symptoms",
        "sequence": 5,
        "required": True,
        "question_text_en": "Are you experiencing any associated symptoms? (Associations)",
        "question_text_hi": "क्या आपको इसके साथ कोई अन्य लक्षण भी महसूस हो रहे हैं? (सहवर्ती लक्षण)",
        "question_text_kn": "ಇದರೊಂದಿಗೆ ಬೇರೆ ಯಾವುದೇ ಲಕ್ಷಣಗಳು ಕಂಡುಬರುತ್ತಿವೆಯೇ? (ಸಂಬಂಧಿತ ಲಕ್ಷಣಗಳು)",
        "question_type": "single_choice",
        "options": [
            {"value": "sweating_breathless", "text_en": "Profuse cold sweating & breathlessness", "text_hi": "ठंडा पसीना और सांस फूलना", "text_kn": "ತಣ್ಣನೆಯ ಬೆವರು ಮತ್ತು ಉಸಿರಾಟದ ತೊಂದರೆ"},
            {"value": "nausea_vomiting", "text_en": "Nausea, belching, or sour vomiting", "text_hi": "मतली, डकार या उल्टी", "text_kn": "ವಾಕರಿಕೆ ಅಥವಾ ಹುಳಿ ತೇಗು"},
            {"value": "palpitations_dizziness", "text_en": "Rapid pounding heart (palpitations) & dizziness", "text_hi": "दिल की धड़कन तेज होना और चक्कर", "text_kn": "ಎದೆಬಡಿತ ಹೆಚ್ಚಾಗುವುದು ಮತ್ತು ತಲೆಸುತ್ತು"},
            {"value": "no_associations", "text_en": "None of these", "text_hi": "इनमें से कोई नहीं", "text_kn": "ಯಾವುದೂ ಇಲ್ಲ"}
        ]
    },
    {
        "id": "cp_q6",
        "clinical_system": "allopathy",
        "protocol_stage": "TIMING",
        "clinical_field": "timing",
        "sequence": 6,
        "required": True,
        "question_text_en": "How does the pain behave over time? (Timing)",
        "question_text_hi": "समय के साथ यह दर्द कैसा रहता है? (समय)",
        "question_text_kn": "ಸಮಯ ಕಳೆದಂತೆ ನೋವು ಹೇಗಿರುತ್ತದೆ? (ಸಮಯಾವಧಿ)",
        "question_type": "single_choice",
        "options": [
            {"value": "continuous_constant", "text_en": "Continuous and constant without relief", "text_hi": "लगातार बिना किसी राहत के", "text_kn": "ವಿರಾಮವಿಲ್ಲದೆ ನಿರಂತರವಾಗಿ"},
            {"value": "intermittent_episodes", "text_en": "Comes and goes in episodes (5-20 minutes)", "text_hi": "रुक-रुक कर आता है (5-20 मिनट)", "text_kn": "ಬಂದು ಹೋಗುತ್ತಿರುತ್ತದೆ (5-20 ನಿಮಿಷ)"},
            {"value": "post_prandial", "text_en": "Worse 30-60 minutes after eating", "text_hi": "खाना खाने के 30-60 मिनट बाद बढ़ता है", "text_kn": "ಊಟದ ನಂತರ ಹೆಚ್ಚಾಗುತ್ತದೆ"}
        ]
    },
    {
        "id": "cp_q7",
        "clinical_system": "allopathy",
        "protocol_stage": "EXACERBATING_RELIEVING",
        "clinical_field": "exacerbating_relieving",
        "sequence": 7,
        "required": True,
        "question_text_en": "Does physical exertion, rest, or posture change it? (Exacerbating/Relieving)",
        "question_text_hi": "क्या चलने-फिरने से दर्द बढ़ता है और आराम करने से घटता है? (घटने/बढ़ने के कारक)",
        "question_text_kn": "ಶ್ರಮದಿಂದ ನೋವು ಹೆಚ್ಚುತ್ತದೆಯೇ ಮತ್ತು ವಿಶ್ರಾಂತಿಯಿಂದ ಕಡಿಮೆಯಾಗುತ್ತದೆಯೇ? (ಹೆಚ್ಚಿಸುವ/ತಗ್ಗಿಸುವ ಅಂಶಗಳು)",
        "question_type": "single_choice",
        "options": [
            {"value": "worse_exertion_relieved_rest", "text_en": "Worse on walking/stairs, relieved by rest", "text_hi": "चलने या सीढ़ियों से बढ़ता है, आराम से घटता है", "text_kn": "ನಡೆಯುವಾಗ ಹೆಚ್ಚುತ್ತದೆ, ವಿಶ್ರಾಂತಿಯಿಂದ ತಗ್ಗುತ್ತದೆ"},
            {"value": "worse_lying_flat", "text_en": "Worse when lying flat, better sitting upright", "text_hi": "सीधे लेटने पर बढ़ता है, बैठने पर आराम", "text_kn": "ಮಲಗಿದಾಗ ಹೆಚ್ಚುತ್ತದೆ, ಕುಳಿತಾಗ ಆರಾಮ"},
            {"value": "relieved_antacid", "text_en": "Relieved after drinking water or antacids", "text_hi": "पानी या एंटासिड लेने से आराम मिलता है", "text_kn": "ನೀರು ಅಥವಾ ಆಂಟಾಸಿಡ್ ಸೇವಿಸಿದಾಗ ಆರಾಮ"},
            {"value": "no_change", "text_en": "No specific triggers found", "text_hi": "कोई विशेष बदलाव नहीं", "text_kn": "ಯಾವುದೇ ವ್ಯತ್ಯಾಸವಿಲ್ಲ"}
        ]
    },
    {
        "id": "cp_q8",
        "clinical_system": "allopathy",
        "protocol_stage": "SEVERITY",
        "clinical_field": "severity",
        "sequence": 8,
        "required": True,
        "question_text_en": "On a scale of 1 to 10, how severe is your pain right now? (Severity)",
        "question_text_hi": "1 से 10 के पैमाने पर, अभी आपका दर्द कितना तीव्र है? (तीव्रता)",
        "question_text_kn": "1 ರಿಂದ 10 ರ ಅಳತೆಯಲ್ಲಿ, ಈಗ ನೋವು ಎಷ್ಟು ತೀವ್ರವಾಗಿದೆ? (ತೀವ್ರತೆ)",
        "question_type": "single_choice",
        "options": [
            {"value": "mild_1_3", "text_en": "1 to 3 (Mild - noticeable but manageable)", "text_hi": "1 से 3 (हल्का - सहन करने योग्य)", "text_kn": "1 ರಿಂದ 3 (ಸೌಮ್ಯ)"},
            {"value": "moderate_4_6", "text_en": "4 to 6 (Moderate - interferes with activities)", "text_hi": "4 से 6 (मध्यम - काम में बाधा)", "text_kn": "4 ರಿಂದ 6 (ಮಧ್ಯಮ)"},
            {"value": "severe_7_8", "text_en": "7 to 8 (Severe - distressing)", "text_hi": "7 से 8 (तीव्र - बहुत कष्टदायी)", "text_kn": "7 ರಿಂದ 8 (ತೀವ್ರ)"},
            {"value": "critical_9_10", "text_en": "9 to 10 (Critical / Worst pain imaginable)", "text_hi": "9 से 10 (अत्यधिक असहनीय दर्द)", "text_kn": "9 ರಿಂದ 10 (ಅತ್ಯಂತ ತೀವ್ರ ನೋವು)"}
        ]
    }
]

# ==============================================================================
# AIIA STANDARDIZED AYURVEDIC CASE TAKING PROTOCOL (SACTP) - DASHAVIDHA PARIKSHA
# ==============================================================================
AYUSH_SACTP_QUESTIONS = [
    {
        "id": "ayush_q1",
        "clinical_system": "ayush",
        "protocol_stage": "PRAKRITI",
        "clinical_field": "prakriti_pariksha",
        "sequence": 1,
        "required": True,
        "question_text_en": "(SACTP Prakriti) What is your physical constitution and climatic sensitivity?",
        "question_text_hi": "(प्रकृति परीक्षा) आपकी शारीरिक बनावट और मौसम के प्रति संवेदनशीलता कैसी है?",
        "question_text_kn": "(ಪ್ರಕೃತಿ ಪರೀಕ್ಷೆ) ನಿಮ್ಮ ದೇಹ ಪ್ರಕೃತಿ ಮತ್ತು ಹವಾಮಾನ ಸೂಕ್ಷ್ಮತೆ ಹೇಗಿದೆ?",
        "question_type": "single_choice",
        "options": [
            {"value": "vata_lean_cold", "text_en": "Lean build, dry skin, sensitive to cold breezes (Vata)", "text_hi": "दुबला शरीर, रूखी त्वचा, ठंड से संवेदनशीलता (वात)", "text_kn": "ತೆಳ್ಳನೆಯ ಮೈಕಟ್ಟು, ಒಣ ಚರ್ಮ, ಶೀತಕ್ಕೆ ಸಂವೇದನೆ (ವಾತ)"},
            {"value": "pitta_medium_heat", "text_en": "Medium build, warm skin, sensitive to heat/sun (Pitta)", "text_hi": "मध्यम शरीर, गर्म त्वचा, गर्मी और धूप से असहनशीलता (पित्त)", "text_kn": "ಮಧ್ಯಮ ಮೈಕಟ್ಟು, ಉಷ್ಣತೆ ಸಹಿಸದಿರುವುದು (ಪಿತ್ತ)"},
            {"value": "kapha_solid_calm", "text_en": "Sturdy solid build, oily skin, calm disposition (Kapha)", "text_hi": "मजबूत गठीला शरीर, तैलीय त्वचा, शांत स्वभाव (कफ)", "text_kn": "ದೃಢವಾದ ಮೈಕಟ್ಟು, ಜಿಡ್ಡು ಚರ್ಮ, ಶಾಂತ ಸ್ವಭಾವ (ಕಫ)"},
            {"value": "dvandvaja_mixed", "text_en": "Mixed traits (Vata-Pitta / Pitta-Kapha)", "text_hi": "मिश्रित लक्षण (वात-पित्त / पित्त-कफ)", "text_kn": "ಮಿಶ್ರ ಲಕ್ಷಣಗಳು"}
        ]
    },
    {
        "id": "ayush_q2",
        "clinical_system": "ayush",
        "protocol_stage": "VIKRITI",
        "clinical_field": "vikriti_pariksha",
        "sequence": 2,
        "required": True,
        "question_text_en": "(SACTP Vikriti) What is your primary current imbalance or complaint?",
        "question_text_hi": "(विकृति परीक्षा) वर्तमान में आपकी मुख्य शारीरिक विकृति या असंतुलन क्या है?",
        "question_text_kn": "(ವಿಕೃತಿ ಪರೀಕ್ಷೆ) ಪ್ರಸ್ತುತ ನಿಮ್ಮ ಪ್ರಮುಖ ದೈಹಿಕ ಅಸಮತೋಲನ ಯಾವುದು?",
        "question_type": "single_choice",
        "options": [
            {"value": "ajeerna_dyspepsia", "text_en": "Ajeerna (Indigestion, gas, acid belching, bloating)", "text_hi": "अजीर्ण (अपच, पेट फूलना, खट्टी डकारें)", "text_kn": "ಅಜೀರ್ಣ (ಉಬ್ಬರ, ಹುಳಿ ತೇಗು, ಗ್ಯಾಸ್)"},
            {"value": "sandhivata_joint_pain", "text_en": "Sandhivata (Joint aches, stiffness, crackling)", "text_hi": "संधिवात (जोड़ों का दर्द, जकड़न)", "text_kn": "ಸಂಧಿವಾತ (ಕೀಲು ನೋವು, ಬಿಗಿತ)"},
            {"value": "shwasa_respiratory", "text_en": "Kasa-Shwasa (Cough, chest congestion, breathlessness)", "text_hi": "कास-श्वास (खांसी, सांस लेने में तकलीफ)", "text_kn": "ಕೆಮ್ಮು, ಉಸಿರಾಟದ ತೊಂದರೆ"},
            {"value": "nidranasha_stress", "text_en": "Nidranasha (Insomnia, anxiety, mental fatigue)", "text_hi": "निद्रानाश (अनिद्रा, तनाव, बेचैनी)", "text_kn": "ನಿದ್ರಾಹೀನತೆ, ಮಾನಸಿಕ ಒತ್ತಡ"}
        ]
    },
    {
        "id": "ayush_q3",
        "clinical_system": "ayush",
        "protocol_stage": "AGNI_KOSHTHA",
        "clinical_field": "agni_koshtha",
        "sequence": 3,
        "required": True,
        "question_text_en": "(SACTP Agni & Koshtha) How is your digestive power (Agni) and bowel pattern (Koshtha)?",
        "question_text_hi": "(अग्नि एवं कोष्ठ) आपकी पाचन अग्नि और पेट साफ होने की स्थिति कैसी है?",
        "question_text_kn": "(ಅಗ್ನಿ ಮತ್ತು ಕೋಷ್ಠ) ನಿಮ್ಮ ಜೀರ್ಣಶಕ್ತಿ ಮತ್ತು ಮಲವಿಸರ್ಜನೆಯ ಸ್ಥಿತಿ ಹೇಗಿದೆ?",
        "question_type": "single_choice",
        "options": [
            {"value": "mandagni_sluggish", "text_en": "Mandagni (Sluggish appetite, heavy stomach for hours, Manda Koshtha)", "text_hi": "मंदाग्नि (कम भूख, खाने के बाद देर तक पेट भारी रहना)", "text_kn": "ಮಂದಾಗ್ನಿ (ಹಸಿವು ಕಡಿಮೆ, ಹೊಟ್ಟೆ ಭಾರ)"},
            {"value": "tikshnagni_hyperacidic", "text_en": "Tikshnagni (Excess intense hunger, burning acidity, loose stools)", "text_hi": "तीक्ष्णाग्नि (अत्यधिक भूख, जलन, एसिडिटी, मृदु कोष्ठ)", "text_kn": "ತೀಕ್ಷ್ಣಾಗ್ನಿ (ಅತಿಯಾದ ಹಸಿವು, ಎದೆಯುರಿ)"},
            {"value": "vishamagni_irregular", "text_en": "Vishamagni (Unpredictable appetite, dry hard constipation / Krura Koshtha)", "text_hi": "विषमाग्नि (अनियमित भूख, कब्ज / क्रूर कोष्ठ)", "text_kn": "ವಿಷಮಾಗ್ನಿ (ಅನಿಯಮಿತ ಹಸಿವು, ಮಲಬದ್ಧತೆ)"},
            {"value": "samagni_balanced", "text_en": "Samagni (Balanced healthy appetite, regular daily evacuation)", "text_hi": "समाग्नि (संतुलित भूख, नियमित पेट साफ)", "text_kn": "ಸಮಾಗ್ನಿ (ಸಮತೋಲಿತ ಜೀರ್ಣಕ್ರಿಯೆ)"}
        ]
    },
    {
        "id": "ayush_q4",
        "clinical_system": "ayush",
        "protocol_stage": "SARA",
        "clinical_field": "sara_pariksha",
        "sequence": 4,
        "required": True,
        "question_text_en": "(SACTP Sara & Bala) How is your tissue vitality, stamina, and physical endurance?",
        "question_text_hi": "(सार एवं बल परीक्षा) आपकी शारीरिक शक्ति, ऊर्जा और सहनशक्ति कैसी है?",
        "question_text_kn": "(ಸಾರ ಮತ್ತು ಬಲ) ನಿಮ್ಮ ಶಾರೀರಿಕ ಬಲ, ಶಕ್ತಿ ಮತ್ತು ಸಹಿಷ್ಣುತೆ ಹೇಗಿದೆ?",
        "question_type": "single_choice",
        "options": [
            {"value": "pravara_sara_high", "text_en": "Pravara (High physical stamina, strong muscular & bone vitality)", "text_hi": "प्रवर (उत्कृष्ट शक्ति और उच्च सहनशीलता)", "text_kn": "ಪ್ರವರ (ಉತ್ತಮ ಶಕ್ತಿ ಮತ್ತು ಬಲ)"},
            {"value": "madhyama_sara_moderate", "text_en": "Madhyama (Moderate endurance, tires after normal daily labor)", "text_hi": "मध्यम (सामान्य शक्ति और सहनशीलता)", "text_kn": "ಮಧ್ಯಮ (ಸಾಮಾನ್ಯ ಶಕ್ತಿ)"},
            {"value": "avara_sara_low", "text_en": "Avara (Low vitality, easily exhausted, chronic weakness)", "text_hi": "अवर (कम शक्ति, जल्दी थकान महसूस होना)", "text_kn": "ಅವರ (ಕಡಿಮೆ ಶಕ್ತಿ, ಬೇಗ ಸುಸ್ತಾಗುವುದು)"}
        ]
    },
    {
        "id": "ayush_q5",
        "clinical_system": "ayush",
        "protocol_stage": "AHARA_VIHARA",
        "clinical_field": "ahara_vihara",
        "sequence": 5,
        "required": True,
        "question_text_en": "(SACTP Ahara & Vihara) What best describes your daily diet, routine, and sleep pattern?",
        "question_text_hi": "(आहार एवं विहार) आपका दैनिक खान-पान, दिनचर्या और नींद का तरीका कैसा है?",
        "question_text_kn": "(ಆಹಾರ ಮತ್ತು ವಿಹಾರ) ನಿಮ್ಮ ಆಹಾರ ಶೈಲಿ, ದಿನಚರಿ ಮತ್ತು ನಿದ್ರೆ ಹೇಗಿದೆ?",
        "question_type": "single_choice",
        "options": [
            {"value": "irregular_spicy_late", "text_en": "Irregular meal timings, oily/spicy diet, late night sleep", "text_hi": "अनियमित भोजन समय, तला-भुना/मसालेदार खाना, देर रात सोना", "text_kn": "ಅನಿಯಮಿತ ಊಟ, ಖಾರ/ಎಣ್ಣೆಯುಕ್ತ ಆಹಾರ, ತಡವಾಗಿ ಮಲಗುವುದು"},
            {"value": "sedentary_tea_stress", "text_en": "Sedentary screen desk work, excessive tea/coffee, mental stress", "text_hi": "बैठकर काम, अधिक चाय/कॉफ़ी, मानसिक तनाव", "text_kn": "ಕುಳಿತು ಕೆಲಸ, ಅತಿಯಾದ ಕಾಫಿ/ಟೀ, ಮಾನಸಿಕ ಒತ್ತಡ"},
            {"value": "balanced_active_early", "text_en": "Wholesome home-cooked food, active lifestyle, restful sleep", "text_hi": "घर का सात्विक भोजन, सक्रिय दिनचर्या, शांत निद्रा", "text_kn": "ಮನೆಯ ಸಾತ್ವಿಕ ಆಹಾರ, ನಿಯಮಿತ ನಿದ್ರೆ"}
        ]
    }
]

class ClinicalEngine:
    def __init__(self):
        self.allopathy_questions = ALLOPATHY_SOCRATES_QUESTIONS
        self.ayush_questions = AYUSH_SACTP_QUESTIONS

    def get_questions_for_system(self, system: str) -> List[Dict[str, Any]]:
        sys_clean = (system or "allopathy").lower()
        if "ayush" in sys_clean:
            return self.ayush_questions
        return self.allopathy_questions

    def format_question_item(self, q_data: Dict[str, Any], language: str = "en") -> QuestionItem:
        q_text_key = f"question_text_{language}"
        question_text = q_data.get(q_text_key, q_data.get("question_text_en", ""))

        options_list: List[OptionItem] = []
        for opt in q_data.get("options", []):
            opt_text_key = f"text_{language}"
            text_val = opt.get(opt_text_key, opt.get("text_en", opt.get("value", "")))
            options_list.append(OptionItem(value=opt["value"], text=text_val))

        q_type = q_data.get("question_type", "single_choice")
        return QuestionItem(
            id=q_data["id"],
            questionText=question_text,
            text=question_text,
            questionType=q_type,
            type=q_type,
            options=options_list,
            clinicalField=q_data["clinical_field"],
            required=q_data.get("required", True)
        )

clinical_engine = ClinicalEngine()
safety_interceptor = SafetyInterceptor()
