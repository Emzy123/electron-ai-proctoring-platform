import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
let modelsLoaded = false;

// Load face-api.js models from public/models directory
export const loadFaceModels = async () => {
  if (modelsLoaded) return true;

  // Models are stored flat in /public/models/ with their default manifest names
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
  return true;
};

export const getFaceDescriptor = async (videoEl) => {
  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return Array.from(detection.descriptor);
};

export const compareFaces = (storedDescriptor, liveDescriptor) => {
  if (!storedDescriptor?.length || !liveDescriptor?.length) return Infinity;
  const distance = faceapi.euclideanDistance(storedDescriptor, liveDescriptor);
  return distance;
};

export const FACE_MATCH_THRESHOLD = 0.6;

// Gaze heuristic: check if nose is significantly off-center relative to jaw
export const isLookingAway = (landmarks) => {
  const nose = landmarks.getNose();
  const jaw = landmarks.getJawOutline();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const faceLeft = Math.min(...jaw.map((p) => p.x));
  const faceRight = Math.max(...jaw.map((p) => p.x));
  const faceCenter = (faceLeft + faceRight) / 2;
  const faceWidth = faceRight - faceLeft;

  const noseTip = nose[3];
  const noseOffset = Math.abs(noseTip.x - faceCenter) / faceWidth;

  // Head roll from eye line angle
  const eyeMidLeft = leftEye[0];
  const eyeMidRight = rightEye[3];
  const eyeAngle = Math.atan2(
    eyeMidRight.y - eyeMidLeft.y,
    eyeMidRight.x - eyeMidLeft.x
  );
  const rollDegrees = Math.abs((eyeAngle * 180) / Math.PI);

  return noseOffset > 0.22 || rollDegrees > 18;
};

export const captureSnapshot = (videoEl, maxWidth = 320) => {
  const canvas = document.createElement('canvas');
  const scale = maxWidth / videoEl.videoWidth;
  canvas.width = maxWidth;
  canvas.height = videoEl.videoHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.6);
};

export { faceapi };
