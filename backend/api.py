"""
IBCIB – Indigenous Breed Classification of Indian Cattle
FastAPI REST API (PyTorch + Hugging Face Hub)
"""

import io
import os
import json
import numpy as np
import onnxruntime as ort
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

# ---------------------------------------------------------------------------
# Load .env from the same directory as this file
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
_raw_origins = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS: list[str] = (
    ["*"] if _raw_origins.strip() == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

# HF repo details
HF_REPO_ID = "ujjwal75/indian-bovine-breeds-model"
# Assuming the user will upload the `.onnx` model to their repo
HF_MODEL_FILE = "Indian_bovine_finetuned_model.onnx"
HF_CLASSES_FILE = "classes.json"

IMG_SIZE = (224, 224)
# ImageNet normalization
IMG_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMG_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

ort_session = None
CLASS_NAMES: list[str] = []


# ---------------------------------------------------------------------------
# Startup / shutdown lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Download model from HF Hub and load ONNX session at startup."""
    global ort_session, CLASS_NAMES
    try:
        from huggingface_hub import hf_hub_download

        print(f"[IBCIB] Loading local ONNX model...")
        model_path   = str(BASE_DIR / HF_MODEL_FILE)
        classes_path = hf_hub_download(HF_REPO_ID, HF_CLASSES_FILE)

        with open(classes_path, "r") as f:
            CLASS_NAMES = json.load(f)

        print(f"[IBCIB] Loaded {len(CLASS_NAMES)} classes.")

        ort_session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        print("[IBCIB] ONNX Model loaded successfully.")
    except Exception as exc:
        print(f"[IBCIB] WARNING – model failed to load (did you upload the .onnx to Hugging Face?): {exc}")
    yield
    # Cleanup (nothing needed)


app = FastAPI(
    title="IBCIB API",
    description="Classify indigenous Indian cattle breeds using ResNet-50",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ORIGINS != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Resize, normalise and batch a raw image using PIL and NumPy."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE, Image.Resampling.BILINEAR)
    img_array = np.array(img, dtype=np.float32) / 255.0
    
    # Normalize channels
    img_array = (img_array - IMG_MEAN) / IMG_STD
    
    # HWC to CHW
    img_array = img_array.transpose(2, 0, 1)
    
    # Add batch dimension
    return np.expand_dims(img_array, axis=0)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", summary="Health check")
def health():
    return {"status": "ok", "model_loaded": ort_session is not None, "num_classes": len(CLASS_NAMES)}


@app.post("/predict", summary="Classify a cattle image")
async def predict(file: UploadFile = File(...)):
    """
    Upload a cattle image (JPG / PNG / JPEG / WebP) and receive:
    - `breed`      – predicted class label
    - `confidence` – probability of the top prediction (0–1)
    - `top5`       – list of the top-5 predictions with breed + confidence
    """
    if ort_session is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Please make sure the ONNX model is available on Hugging Face.",
        )

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and not content_type.startswith("image/") and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Please upload an image file.",
        )

    try:
        image_bytes = await file.read()
        tensor = preprocess_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read image: {exc}")

    try:
        inputs = {ort_session.get_inputs()[0].name: tensor}
        outputs = ort_session.run(None, inputs)[0]
        
        # Softmax
        exp_out = np.exp(outputs - np.max(outputs, axis=1, keepdims=True))
        probs = (exp_out / np.sum(exp_out, axis=1, keepdims=True))[0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")

    # Top-1
    top1_idx   = int(np.argmax(probs))
    top1_breed = CLASS_NAMES[top1_idx]
    top1_conf  = float(probs[top1_idx])

    # Top-5
    top5_idxs = np.argsort(probs)[-5:][::-1]
    top5 = [
        {"breed": CLASS_NAMES[int(i)], "confidence": round(float(probs[i]), 4)}
        for i in top5_idxs
    ]

    return JSONResponse({
        "breed":      top1_breed,
        "confidence": round(top1_conf, 4),
        "top5":       top5,
    })
