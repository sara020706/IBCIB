"""
IBCIB – Indigenous Breed Classification of Indian Cattle
FastAPI REST API
"""

import io
import os
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
# CORS_ORIGINS: comma-separated list, or * for all
_raw_origins = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS: list[str] = (
    ["*"] if _raw_origins.strip() == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

# ---------------------------------------------------------------------------
# Class labels – must match the order used during training
# ---------------------------------------------------------------------------
CLASS_NAMES = [
    "Alambadi",
    "Amritmahal",
    "Ayrshire",
    "Banni",
    "Bargur",
    "Bhadawari",
    "Brown_Swiss",
    "Dangi",
    "Deoni",
    "Gir",
]

IMG_SIZE = (224, 224)

# We load the model once at startup and keep it in app state
model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the Keras model when the server starts."""
    global model
    try:
        import keras
        from keras.layers import Dense

        # -----------------------------------------------------------------------
        # Monkey-patch Dense.from_config to ignore unknown keys like
        # 'quantization_config' that appear in models saved with newer Keras 3.
        # -----------------------------------------------------------------------
        _original_dense_from_config = Dense.from_config.__func__

        @classmethod  # type: ignore[misc]
        def _patched_dense_from_config(cls, config):
            config.pop("quantization_config", None)
            return _original_dense_from_config(cls, config)

        Dense.from_config = _patched_dense_from_config  # type: ignore[method-assign]
        # -----------------------------------------------------------------------

        model_path = BASE_DIR / "best_model.keras"
        print(f"[IBCIB] Loading model from: {model_path}")
        model = keras.models.load_model(str(model_path))
        print("[IBCIB] Model loaded successfully.")
    except Exception as exc:
        print(f"[IBCIB] WARNING – model failed to load: {exc}")
    yield
    # Cleanup (nothing needed)


app = FastAPI(
    title="IBCIB API",
    description="Classify indigenous Indian cattle breeds using EfficientNetB0",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS – origins loaded from .env (CORS_ORIGINS)
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
    """Resize and preprocess a raw image into a batch tensor."""
    from tensorflow.keras.applications.efficientnet import preprocess_input
    from tensorflow.keras.preprocessing import image as keras_image

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = keras_image.img_to_array(img)
    arr = np.expand_dims(arr, axis=0)  # (1, 224, 224, 3)
    arr = preprocess_input(arr)
    return arr


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", summary="Health check")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", summary="Classify a cattle image")
async def predict(file: UploadFile = File(...)):
    """
    Upload a cattle image (JPG / PNG / JPEG) and receive:
    - `breed`      – predicted class label
    - `confidence` – probability of the top prediction (0–1)
    - `top5`       – list of the top-5 predictions with breed + confidence
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Please check the server logs.",
        )

    # Validate content type – strip optional params like "; charset=..."
    # and accept any image/* type (PIL will reject non-images anyway)
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and not content_type.startswith("image/") and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Please upload an image file.",
        )

    try:
        image_bytes = await file.read()
        arr = preprocess_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read image: {exc}")

    try:
        preds = model.predict(arr, verbose=0)[0]  # shape: (NUM_CLASSES,)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")

    # Top-1
    top1_idx = int(np.argmax(preds))
    top1_breed = CLASS_NAMES[top1_idx]
    top1_conf = float(preds[top1_idx])

    # Top-5
    top5_indices = preds.argsort()[-5:][::-1]
    top5 = [
        {"breed": CLASS_NAMES[int(i)], "confidence": float(preds[int(i)])}
        for i in top5_indices
    ]

    return JSONResponse(
        {
            "breed": top1_breed,
            "confidence": round(top1_conf, 4),
            "top5": [
                {"breed": item["breed"], "confidence": round(item["confidence"], 4)}
                for item in top5
            ],
        }
    )
