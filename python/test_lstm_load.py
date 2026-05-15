import os
import sys
from pathlib import Path

BASE = Path(__file__).parent
sys.path.append(str(BASE))

try:
    import tensorflow as tf
    print(f"TensorFlow version: {tf.__version__}")
    from tensorflow.keras.models import load_model
    print("Successfully imported load_model")
    
    model_path = BASE / "intellicrash_lstm_model.h5"
    if model_path.exists():
        print(f"Model file found at {model_path}")
        model = load_model(str(model_path))
        print("Model loaded successfully")
    else:
        print(f"Model file NOT found at {model_path}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
