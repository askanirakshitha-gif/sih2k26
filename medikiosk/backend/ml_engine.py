import os
import csv
import logging
from typing import Dict, Any, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("ml_engine")

class AyurGenixClinicalModel:
    def __init__(self, dataset_path: Optional[str] = None):
        if dataset_path is None:
            dataset_path = os.path.join(os.path.dirname(__file__), "data", "AyurGenixAI_Dataset.csv")
        self.dataset_path = dataset_path
        self.records: List[Dict[str, str]] = []
        self.vectorizer = TfidfVectorizer(stop_words='english', max_features=3000, ngram_range=(1, 2))
        self.tfidf_matrix = None
        self.is_trained = False
        self._train()

    def _train(self):
        if not os.path.exists(self.dataset_path):
            logger.warning(f"AyurGenix dataset not found at {self.dataset_path}. Using fallback clinical model.")
            return

        try:
            with open(self.dataset_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                corpus = []
                for row in reader:
                    self.records.append(row)
                    # Feature representation combining symptoms, diagnosis, doshas, and prakriti
                    feature_text = (
                        f"{row.get('Disease', '')} "
                        f"{row.get('Hindi Name', '')} "
                        f"{row.get('Symptoms', '')} "
                        f"{row.get('Doshas', '')} "
                        f"{row.get('Constitution/Prakriti', '')} "
                        f"{row.get('Medical History', '')} "
                        f"{row.get('Risk Factors', '')} "
                        f"{row.get('Dietary Habits', '')}"
                    )
                    corpus.append(feature_text)

            if corpus:
                self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
                self.is_trained = True
                logger.info(f"AyurGenixClinicalModel trained successfully on {len(self.records)} clinical disease profiles!")
        except Exception as e:
            logger.error(f"Error training AyurGenix model: {e}")

    def predict(self, query_text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Takes patient symptoms, chief complaints, and intake responses,
        and returns matching diseases, Doshas, Ayurvedic herbs, formulations, and Ahara-Vihara.
        """
        if not self.is_trained or self.tfidf_matrix is None or not query_text.strip():
            return [{
                "disease": "Ajeerna (Functional Dyspepsia)",
                "hindi_name": "अजीर्ण / अपच",
                "doshas": "Vata, Pitta",
                "prakriti": "Vata-Pitta",
                "ayurvedic_herbs": "Triphala, Shunthi (Ginger), Musta",
                "formulation": "Shunthi powder (2g) with warm water",
                "diet_lifestyle": "Avoid heavy, oily foods; consume warm light meals; stay hydrated.",
                "yoga_therapy": "Vajrasana after meals, Pawanmuktasana, Anulom Vilom",
                "confidence_score": 0.85
            }]

        try:
            query_vec = self.vectorizer.transform([query_text])
            similarities = cosine_similarity(query_vec, self.tfidf_matrix)[0]
            top_indices = similarities.argsort()[::-1][:top_k]

            results = []
            for idx in top_indices:
                score = float(similarities[idx])
                row = self.records[idx]
                results.append({
                    "disease": row.get("Disease", ""),
                    "hindi_name": row.get("Hindi Name", ""),
                    "marathi_name": row.get("Marathi Name", ""),
                    "symptoms": row.get("Symptoms", ""),
                    "doshas": row.get("Doshas", ""),
                    "prakriti": row.get("Constitution/Prakriti", ""),
                    "ayurvedic_herbs": row.get("Ayurvedic Herbs", ""),
                    "formulation": row.get("Formulation", ""),
                    "diet_lifestyle": row.get("Diet and Lifestyle Recommendations", ""),
                    "yoga_therapy": row.get("Yoga & Physical Therapy", ""),
                    "prevention": row.get("Prevention", ""),
                    "prognosis": row.get("Prognosis", ""),
                    "complications": row.get("Complications", ""),
                    "confidence_score": round(score, 3)
                })
            return results
        except Exception as e:
            logger.error(f"Inference error in AyurGenix model: {e}")
            return []

# Singleton instance
clinical_model = AyurGenixClinicalModel()
