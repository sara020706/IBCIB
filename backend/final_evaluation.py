from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.efficientnet import preprocess_input
import numpy as np
from sklearn.metrics import classification_report
import matplotlib.pyplot as plt
import random
import os
from tensorflow.keras.preprocessing import image

# 1️⃣ Load your trained model
model = load_model("final_model.keras")

# 2️⃣ Prepare test data
test_gen = ImageDataGenerator(preprocessing_function=preprocess_input)

test_data = test_gen.flow_from_directory(
    "test",
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    shuffle=False  # Important for correct evaluation
)

# 3️⃣ Evaluate model
loss, accuracy = model.evaluate(test_data)
print(f"\n✅ Test Accuracy: {accuracy*100:.2f}%\n")

# 4️⃣ Classification report
y_true = test_data.classes
y_pred = np.argmax(model.predict(test_data), axis=1)
class_labels = list(test_data.class_indices.keys())

print("🔹 Classification Report:\n")
print(classification_report(y_true, y_pred, target_names=class_labels))

# 5️⃣ Optional: Show some random test images with top-5 predictions
def show_top5_predictions(model, test_folder, class_labels, num_images=5):
    all_imgs = []
    all_labels = []
    for label in class_labels:
        folder = os.path.join(test_folder, label)
        imgs = [os.path.join(folder, f) for f in os.listdir(folder)]
        all_imgs.extend(imgs)
        all_labels.extend([label]*len(imgs))

    samples = random.sample(list(zip(all_imgs, all_labels)), num_images)

    for img_path, true_label in samples:
        img = image.load_img(img_path, target_size=(224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)

        preds = model.predict(img_array)[0]
        top5_idx = preds.argsort()[-5:][::-1]
        top5_labels = [class_labels[i] for i in top5_idx]
        top5_probs = [preds[i] for i in top5_idx]

        plt.imshow(img.astype('uint8'))
        plt.axis('off')
        plt.title(f"True: {true_label}\nTop-5: {list(zip(top5_labels, [f'{p*100:.1f}%' for p in top5_probs]))}")
        plt.show()

# Uncomment below to see random images with top-5 predictions
# show_top5_predictions(model, "test", class_labels, num_images=5)
