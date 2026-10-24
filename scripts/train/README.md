# Omni Loco AI: Waste Classifier Training Pipeline

This directory provides complete instructions and scripts to fine-tune an on-device MobileNetV3 / EfficientNet-Lite convolutional neural network for 10-category waste segregation, followed by quantization and export to TensorFlow.js (`tfjs_graph_model`) for WebGPU execution.

---

## 1. Dataset Recommendations
To achieve high accuracy on municipal waste streams, combine the following public datasets:
- **TrashNet (Gary Thung & Mindy Yang)**: ~2,500 images of glass, paper, cardboard, plastic, metal, and general trash.
- **TACO (Trash Annotations in Context)**: 1,500+ diverse outdoor background images with bounding boxes.
- **Drinking Container & E-Waste Addendum**: Augment with electronic scrap and hazardous battery imagery from Roboflow Universe.

Target classes:
1. `plastic`
2. `paper`
3. `cardboard`
4. `glass`
5. `metal`
6. `organic`
7. `e-waste`
8. `textile`
9. `hazardous`
10. `general`

---

## 2. Python Fine-Tuning Pipeline (`train.py`)

```python
import tensorflow as tf
from tensorflow.keras import layers, models
import tensorflowjs as tfjs

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
NUM_CLASSES = 10

# Load dataset
train_ds = tf.keras.preprocessing.image_dataset_from_directory(
    "dataset/train",
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="categorical"
)

# Base model: Pretrained MobileNetV3-Small (lightweight for 30+ FPS WebGPU)
base_model = tf.keras.applications.MobileNetV3Small(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet",
    pooling="avg"
)
base_model.trainable = False

# Head architecture
inputs = tf.keras.Input(shape=(224, 224, 3))
x = tf.keras.applications.mobilenet_v3.preprocess_input(inputs)
x = base_model(x)
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(NUM_CLASSES, activation="softmax")(x)
model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-3),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

# Phase 1: Train classification head
model.fit(train_ds, epochs=10)

# Phase 2: Fine-tune top layers of base model
base_model.trainable = True
for layer in base_model.layers[:-25]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-5),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)
model.fit(train_ds, epochs=15)

# Save Keras H5
model.save("waste_mobilenetv3.h5")
```

---

## 3. TensorFlow.js WebGPU Quantization & Export

Convert the fine-tuned model into TF.js graph format with float16 or uint8 quantization for fast client-side loading:

```bash
# Convert to TFJS Graph Model
tensorflowjs_converter \
    --input_format=keras \
    --quantization_bytes=2 \
    --output_format=tfjs_graph_model \
    waste_mobilenetv3.h5 \
    ../../public/models/waste/
```

Target output directory structure:
```
/public/models/waste/
  ├── model.json
  └── group1-shard1of1.bin
```

---

## 4. On-Device WebGPU Inference Verification
In Omni Loco AI, the exported model is loaded with:
```typescript
const model = await tf.loadGraphModel('/models/waste/model.json');
const tensor = tf.browser.fromPixels(roiElement)
  .resizeBilinear([224, 224])
  .expandDims(0)
  .div(255.0);
const predictions = await model.predict(tensor);
```
Zero frames or photos ever leave the client browser.
