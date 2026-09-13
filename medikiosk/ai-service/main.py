"""
MediKiosk AI Microservice
FastAPI service supporting Clinical NLP, Entity Extraction, Document OCR, and Summarization.
"""

import os
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from services.nlp_service import extract_clinical_entities, generate_clinical_summary
from services.ocr_service import extract_from_document

app = FastAPI(
    title="MediKiosk AI Microservice",
    description="SIH26047 - Clinical NLP, OCR, and Case-Taking AI Service (Ministry of Ayush)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class EntityExtractRequest(BaseModel):
    text: str
    field: Optional[str] = "general"
    language: Optional[str] = "en"

class SummarizeRequest(BaseModel):
    system: Optional[str] = "allopathy"
    patient: Optional[Dict[str, Any]] = None
    answers: Optional[Dict[str, Any]] = {}
    red_flags: Optional[List[Dict[str, Any]]] = []

class DocumentExtractRequest(BaseModel):
    filePath: Optional[str] = None
    fileName: Optional[str] = None
    documentType: Optional[str] = "prescription"


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "medikiosk-ai-service",
        "mode": "real_llm" if os.getenv("LLM_API_KEY") else "demo_mock_mode",
        "tesseract": True
    }


@app.post("/extract-entities")
def extract_entities_endpoint(req: EntityExtractRequest):
    """
    Extract structured clinical entities from patient answers or utterances.
    """
    try:
        entities = extract_clinical_entities(
            text=req.text,
            field=req.field or "general",
            language=req.language or "en"
        )
        return {
            "success": True,
            "entities": entities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize")
def summarize_endpoint(req: SummarizeRequest):
    """
    Generate a physician-ready structured clinical summary.
    """
    try:
        summary_text = generate_clinical_summary(
            system=req.system or "allopathy",
            patient=req.patient or {},
            answers=req.answers or {},
            red_flags=req.red_flags or []
        )
        return {
            "success": True,
            "summary": summary_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-document")
def extract_document_endpoint(req: DocumentExtractRequest):
    """
    OCR and extract medical entities from an uploaded prescription or lab report.
    """
    try:
        result = extract_from_document(
            file_path=req.filePath or "",
            file_name=req.fileName or "",
            document_type=req.documentType or "prescription"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
