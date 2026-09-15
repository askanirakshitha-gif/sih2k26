import re
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("voice_processor")

# Common Indian OPD acoustic noise filler words and speech artifacts across EN, HI, KN
FILLER_PATTERNS_EN = [
    r"\buh+\b", r"\bum+\b", r"\bah+\b", r"\ber+\b", r"\bhmm+\b",
    r"\blike\b", r"\byou know\b", r"\bbasically\b", r"\bactually\b",
    r"\bmy answer is\b", r"\bi think\b", r"\bi choose\b", r"\boption\b",
    r"\bnumber\b", r"\bsir\b", r"\bdoctor\b", r"\bplease\b", r"\bhello\b",
    r"\bbackground\b", r"\bnoise\b", r"\bcrowd\b", r"\bshh+\b", r"\bchatter\b",
    r"\bhospital\b", r"\bopd\b", r"\bannouncement\b", r"\bspeaker\b"
]

FILLER_PATTERNS_HI = [
    r"\bअं+\b", r"\bहम्म+\b", r"\bअरे\b", r"\bमतलब\b", r"\bयानी\b", r"\bजी\b",
    r"\bबॉस\b", r"\bसाहब\b", r"\bमेरा जवाब है\b", r"\bउत्तर\b", r"\bऑप्शन\b",
    r"\bनंबर\b", r"\bसंख्या\b", r"\bहाँ जी\b", r"\bजी हाँ\b", r"\bबताता हूँ\b", r"\bबताती हूँ\b",
    r"\bशोर\b", r"\bआवाज़\b", r"\bसुनो\b", r"\bडॉक्टर साहब\b", r"\bलाइन\b", r"\bपर्ची\b",
    r"\bभीड़\b", r"\bबाहर\b", r"\bपीछे\b", r"\bचलो\b", r"\bरुकिए\b", r"\bक्या हुआ\b"
]

FILLER_PATTERNS_KN = [
    r"\bಅಂ+\b", r"\bಹೂಂ+\b", r"\bಅಂದರೆ\b", r"\bಸರ್\b", r"\bನನ್ನ ಉತ್ತರ\b",
    r"\bಆಪ್ಷನ್\b", r"\bಸಂಖ್ಯೆ\b", r"\bಹೌದು ಸರ್\b", r"\bಹೇಳುತ್ತೇನೆ\b",
    r"\bಶಬ್ದ\b", r"\bಸಾಲು\b", r"\bಜನ\b", r"\bವೈದ್ಯರೇ\b", r"\bಹೊರಗೆ\b", r"\bಬನ್ನಿ\b", r"\bಸಾಕು\b"
]

# Non-speech sound annotations from Web Speech or Whisper engines
NON_SPEECH_NOISE_RE = re.compile(r"(\[.*?\]|\(.*?\)|<.*?>|\*+|\~+|\.{2,})")

# Multilingual Spoken Numbers Dictionary (1 to 10)
MULTILINGUAL_NUMBERS = {
    1: ["1", "one", "first", "एक", "पहला", "प्रथमा", "ಒಂದು", "ಮೊದಲ"],
    2: ["2", "two", "second", "दो", "दूसरा", "द्वितीया", "ಎರಡು", "ಎರಡನೇ"],
    3: ["3", "three", "third", "तीन", "तीसरा", "तृतीया", "ಮೂರು", "ಮೂರನೇ"],
    4: ["4", "four", "fourth", "चार", "चौथा", "चतुर्थ", "ನಾಲ್ಕು", "ನಾಲ್ಕನೇ"],
    5: ["5", "five", "fifth", "पांच", "पाँच", "पांचवां", "ಐದು", "ಐದನೇ"],
    6: ["6", "six", "sixth", "छह", "छठा", "ಆರು", "ಾರನೇ"],
    7: ["7", "seven", "seventh", "सात", "सातवां", "ಏಳು", "ಏಳನೇ"],
    8: ["8", "eight", "eighth", "आठ", "आठवां", "ಎಂಟು", "ಎಂಟನೇ"],
    9: ["9", "nine", "ninth", "नौ", "नौवां", "ಒಂಬತ್ತು", "ಒಂಬತ್ತನೇ"],
    10: ["10", "ten", "tenth", "दस", "दसवां", "ಹತ್ತು", "ಹತ್ತನೇ"]
}

# Yes / No Multilingual Synonyms
YES_SYNONYMS = [
    "yes", "yeah", "yep", "true", "correct", "haan", "ha", "han", "haji",
    "हाँ", "हां", "सही", "बिलकुल", "हौदु", "haudu", "ಹೌದು", "ಸರಿ"
]

NO_SYNONYMS = [
    "no", "nope", "false", "incorrect", "nahi", "nahin", "na",
    "नहीं", "ना", "इल्ला", "illa", "ಅಲ್ಲ"
]

class VoiceNoiseFilterAndMatcher:
    """
    Backend Noise Cancellation, Speech Normalization, and Multilingual Option Matcher
    for Indian Regional OPD Kiosk Voice Inputs (English, Hindi, Kannada).
    """

    def clean_voice_transcript(self, raw_text: str, language: str = "en") -> str:
        if not raw_text:
            return ""

        text = raw_text.strip()
        # 1. Remove non-speech noise annotations like [cough], (laughter), ***
        text = NON_SPEECH_NOISE_RE.sub(" ", text)

        # 2. Lowercase for English, trim extra punctuation
        text_lower = text.lower()

        # 3. Strip language-specific filler words & OPD noise tokens
        all_fillers = FILLER_PATTERNS_EN + FILLER_PATTERNS_HI + FILLER_PATTERNS_KN
        for pattern in all_fillers:
            text_lower = re.sub(pattern, " ", text_lower, flags=re.IGNORECASE)

        # 4. Remove leftover standalone noise symbols
        text_clean = re.sub(r"[^\w\s\u0900-\u097F\u0C80-\u0CFF]", " ", text_lower)
        # 5. Normalize whitespace
        text_clean = re.sub(r"\s+", " ", text_clean).strip()

        # Return clean text or fallback to original stripped text if over-cleared
        return text_clean if text_clean else text.strip()

    def resolve_spoken_option(
        self,
        raw_text: str,
        question_data: Dict[str, Any],
        language: str = "en"
    ) -> Tuple[Optional[str], Optional[str], str]:
        """
        Takes raw spoken transcript and question definition (with options).
        Returns: (matched_option_value, matched_option_text, cleaned_transcript)
        """
        clean_transcript = self.clean_voice_transcript(raw_text, language)
        if not clean_transcript:
            return None, None, ""

        options = question_data.get("options", [])
        q_type = question_data.get("question_type", question_data.get("type", "single_choice"))

        # --- Strategy A: Check for Spoken Choice Numbers (1-10) ---
        words = clean_transcript.split()
        for idx, option in enumerate(options, start=1):
            if idx in MULTILINGUAL_NUMBERS:
                num_tokens = MULTILINGUAL_NUMBERS[idx]
                if any(w in num_tokens for w in words) or clean_transcript in num_tokens:
                    opt_val = option.get("value")
                    opt_text = option.get(f"text_{language}", option.get("text_en", option.get("text", opt_val)))
                    logger.info(f"[VoiceMatcher] Spoken number match -> Option #{idx}: {opt_val}")
                    return opt_val, opt_text, clean_transcript

        # --- Strategy B: Check Yes / No Synonyms ---
        if q_type == "yes_no" or any(opt.get("value") in ["yes", "no"] for opt in options):
            is_yes = any(y_word in clean_transcript for y_word in YES_SYNONYMS)
            is_no = any(n_word in clean_transcript for n_word in NO_SYNONYMS)
            if is_yes and not is_no:
                yes_opt = next((o for o in options if o.get("value") == "yes"), None)
                val = yes_opt.get("value") if yes_opt else "yes"
                txt = yes_opt.get("text", "Yes") if yes_opt else "Yes"
                return val, txt, clean_transcript
            elif is_no and not is_yes:
                no_opt = next((o for o in options if o.get("value") == "no"), None)
                val = no_opt.get("value") if no_opt else "no"
                txt = no_opt.get("text", "No") if no_opt else "No"
                return val, txt, clean_transcript

        # --- Strategy C: Multilingual Phrase & Substring Overlap ---
        best_match_val = None
        best_match_text = None
        highest_score = 0.0

        for option in options:
            val = option.get("value", "")
            # Check all translations of this option
            candidate_texts = [
                val,
                option.get("text", ""),
                option.get("text_en", ""),
                option.get("text_hi", ""),
                option.get("text_kn", "")
            ]

            for cand in candidate_texts:
                if not cand:
                    continue
                cand_clean = self.clean_voice_transcript(cand, language)
                if not cand_clean:
                    continue

                # Exact equality or direct containment
                if cand_clean in clean_transcript or clean_transcript in cand_clean:
                    logger.info(f"[VoiceMatcher] Direct text match -> Option value: {val} (Cand: {cand_clean})")
                    return val, option.get("text", cand), clean_transcript

                # Jaccard / Token Overlap
                spoken_words = set(clean_transcript.split())
                cand_words = set(cand_clean.split())
                intersection = spoken_words.intersection(cand_words)
                if cand_words:
                    score = len(intersection) / float(len(cand_words))
                    if score > highest_score and score >= 0.4:
                        highest_score = score
                        best_match_val = val
                        best_match_text = option.get("text", cand)

        if best_match_val:
            logger.info(f"[VoiceMatcher] Token overlap match (score={highest_score:.2f}) -> Option: {best_match_val}")
            return best_match_val, best_match_text, clean_transcript

        # Fallback: No specific option matched, return clean transcript
        return None, None, clean_transcript

voice_processor = VoiceNoiseFilterAndMatcher()
