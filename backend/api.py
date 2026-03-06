"""
IBCIB – Indigenous Breed Classification of Indian Cattle
FastAPI REST API (PyTorch + Hugging Face Hub)
"""

import io
import os
import json
import torch
import numpy as np
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
HF_MODEL_FILE = "Indian_bovine_finetuned_model.pth"
HF_CLASSES_FILE = "classes.json"

IMG_SIZE = (224, 224)
# ImageNet normalization – matches training preprocessing
IMG_MEAN = [0.485, 0.456, 0.406]
IMG_STD  = [0.229, 0.224, 0.225]

model = None
CLASS_NAMES: list[str] = []


# ---------------------------------------------------------------------------
# Startup / shutdown lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Download model from HF Hub and load into memory at startup."""
    global model, CLASS_NAMES
    try:
        from huggingface_hub import hf_hub_download
        import torchvision.models as tv_models

        print(f"[IBCIB] Downloading model from HF Hub: {HF_REPO_ID} ...")
        model_path   = hf_hub_download(HF_REPO_ID, HF_MODEL_FILE)
        classes_path = hf_hub_download(HF_REPO_ID, HF_CLASSES_FILE)

        with open(classes_path, "r") as f:
            CLASS_NAMES = json.load(f)

        print(f"[IBCIB] Loaded {len(CLASS_NAMES)} classes.")

        net = tv_models.resnet50(num_classes=len(CLASS_NAMES))
        state = torch.load(model_path, map_location="cpu", weights_only=True)
        net.load_state_dict(state)
        net.eval()
        model = net
        print("[IBCIB] Model loaded successfully.")
    except Exception as exc:
        print(f"[IBCIB] WARNING – model failed to load: {exc}")
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
def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    """Resize, normalise and batch a raw image for ResNet-50 inference."""
    from torchvision import transforms

    transform = transforms.Compose([
        transforms.Resize(IMG_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMG_MEAN, std=IMG_STD),
    ])
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return transform(img).unsqueeze(0)   # shape: (1, 3, 224, 224)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", summary="Health check")
def health():
    return {"status": "ok", "model_loaded": model is not None, "num_classes": len(CLASS_NAMES)}


@app.post("/predict", summary="Classify a cattle image")
async def predict(file: UploadFile = File(...)):
    """
    Upload a cattle image (JPG / PNG / JPEG / WebP) and receive:
    - `breed`      – predicted class label
    - `confidence` – probability of the top prediction (0–1)
    - `top5`       – list of the top-5 predictions with breed + confidence
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Please check the server logs.",
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
        with torch.no_grad():
            outputs = model(tensor)                     # (1, num_classes)
            probs   = torch.softmax(outputs, dim=1)[0]  # (num_classes,)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")

    # Top-1
    top1_idx   = int(torch.argmax(probs).item())
    top1_breed = CLASS_NAMES[top1_idx]
    top1_conf  = float(probs[top1_idx].item())

    # Top-5
    top5_vals, top5_idxs = torch.topk(probs, k=5)
    top5 = [
        {"breed": CLASS_NAMES[int(i)], "confidence": round(float(v), 4)}
        for v, i in zip(top5_vals, top5_idxs)
    ]

    return JSONResponse({
        "breed":      top1_breed,
        "confidence": round(top1_conf, 4),
        "top5":       top5,
    })
