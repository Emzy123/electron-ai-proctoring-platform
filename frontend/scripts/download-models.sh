#!/bin/bash
# Download face-api.js model weights into public/models/
set -e

MODELS_DIR="$(dirname "$0")/../public/models"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

mkdir -p "$MODELS_DIR"

echo "Downloading face-api.js models to $MODELS_DIR..."

# Tiny Face Detector
curl -sL "$BASE_URL/tiny_face_detector_model-weights_manifest.json" -o "$MODELS_DIR/tiny_face_detector_model-weights_manifest.json"
curl -sL "$BASE_URL/tiny_face_detector_model-shard1" -o "$MODELS_DIR/tiny_face_detector_model-shard1"

# Face Landmark 68
curl -sL "$BASE_URL/face_landmark_68_model-weights_manifest.json" -o "$MODELS_DIR/face_landmark_68_model-weights_manifest.json"
curl -sL "$BASE_URL/face_landmark_68_model-shard1" -o "$MODELS_DIR/face_landmark_68_model-shard1"

# Face Recognition
curl -sL "$BASE_URL/face_recognition_model-weights_manifest.json" -o "$MODELS_DIR/face_recognition_model-weights_manifest.json"
curl -sL "$BASE_URL/face_recognition_model-shard1" -o "$MODELS_DIR/face_recognition_model-shard1"
curl -sL "$BASE_URL/face_recognition_model-shard2" -o "$MODELS_DIR/face_recognition_model-shard2"

echo "Done. Model files:"
ls -la "$MODELS_DIR"
