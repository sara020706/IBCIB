from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.efficientnet import preprocess_input
import numpy as np
from PIL import Image
import requests
from io import BytesIO

# =====================
# 1️⃣ Load your trained model
# =====================
model = load_model("final_model.keras")

# =====================
# 2️⃣ Class names (same as your training)
# =====================
class_names = [
    'Alambadi', 'Amritmahal', 'Ayrshire', 'Banni', 'Bargur',
    'Bhadawari', 'Brown_Swiss', 'Dangi', 'Deoni', 'Gir'
]

# =====================
# 3️⃣ Input image URL or local path
# =====================
img_input = input("Paste image URL or local path: ")

# Load image from URL
if img_input.startswith("http"):
    response = requests.get(img_input)
    img = Image.open(BytesIO(response.content)).convert("RGB")
else:  # Load from local file
    img = Image.open(img_input).convert("RGB")

# =====================
# 4️⃣ Preprocess image
# =====================
img = img.resize((224, 224))
img_array = image.img_to_array(img)
img_array = np.expand_dims(img_array, axis=0)
img_array = preprocess_input(img_array)

# =====================
# 5️⃣ Predict
# =====================
pred = model.predict(img_array)
pred_class = class_names[np.argmax(pred)]
confidence = np.max(pred)

# =====================
# 6️⃣ Show result
# =====================
print(f"\nPredicted Breed: {pred_class}")
print(f"Confidence: {confidence*100:.2f}%\n")
