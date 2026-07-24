import { useEffect, useRef, useCallback } from 'react';
import { faceapi, isLookingAway, captureSnapshot } from '../services/faceApi';

const VIOLATION_MESSAGES = {
  face_missing: 'Face not detected — please stay in frame',
  multiple_faces: 'Multiple faces detected — only you should be visible',
  gaze_away: 'Looking away detected — keep your eyes on the screen',
};

const DEBOUNCE_MS = 10000;
const DETECT_INTERVAL_MS = 2000;
const SNAPSHOT_INTERVAL_MS = 8000;

export const useProctoring = ({
  videoRef,
  sessionId,
  onViolation,
  onSnapshot,
  enabled = true,
}) => {
  const lastViolationRef = useRef({});
  const detectIntervalRef = useRef(null);
  const snapshotIntervalRef = useRef(null);

  const emitViolation = useCallback(
    async (type) => {
      const now = Date.now();
      if (lastViolationRef.current[type] && now - lastViolationRef.current[type] < DEBOUNCE_MS) {
        return;
      }
      lastViolationRef.current[type] = now;

      const video = videoRef.current;
      const snapshot = video ? captureSnapshot(video) : null;

      if (onViolation) {
        onViolation({
          type,
          message: VIOLATION_MESSAGES[type] || 'Violation detected',
          snapshot,
          sessionId,
        });
      }
    },
    [videoRef, sessionId, onViolation]
  );

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const runDetection = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detections.length === 0) {
          emitViolation('face_missing');
        } else if (detections.length > 1) {
          emitViolation('multiple_faces');
        } else if (isLookingAway(detections[0].landmarks)) {
          emitViolation('gaze_away');
        }
      } catch (err) {
        console.warn('Proctoring detection error:', err);
      }
    };

    detectIntervalRef.current = setInterval(runDetection, DETECT_INTERVAL_MS);

    snapshotIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && onSnapshot) {
        onSnapshot(captureSnapshot(video));
      }
    }, SNAPSHOT_INTERVAL_MS);

    return () => {
      clearInterval(detectIntervalRef.current);
      clearInterval(snapshotIntervalRef.current);
    };
  }, [enabled, videoRef, emitViolation, onSnapshot]);

  return { emitViolation };
};
