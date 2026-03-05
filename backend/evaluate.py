from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.efficientnet import preprocess_input

model = load_model("final_model.keras")
test_gen = ImageDataGenerator(
    preprocessing_function=preprocess_input
)

class_names = [
    'Alambadi', 'Amritmahal', 'Ayrshire', 'Banni', 'Bargur',
    'Bhadawari', 'Brown_Swiss', 'Dangi', 'Deoni', 'Gir'
]

test_data = test_gen.flow_from_directory(
    "test",
    target_size=(224,224),
    batch_size=32,
    class_mode='categorical',
    shuffle=False,
    classes=class_names
)

loss, acc = model.evaluate(test_data)
print("✅ Test Accuracy:", acc)
