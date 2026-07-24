import { useRef, useEffect } from 'react';
import { useProctoring } from '../hooks/useProctoring';

// Hidden webcam feed for AI proctoring — runs face detection in background
const ProctorMonitor = ({ sessionId, onViolation, onSnapshot, enabled }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Proctor camera error:', err);
      }
    };
    if (enabled) startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [enabled]);

  useProctoring({
    videoRef,
    sessionId,
    onViolation,
    onSnapshot,
    enabled,
  });

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        width: 120,
        height: 90,
        borderRadius: 6,
        opacity: 0.7,
        zIndex: 100,
        transform: 'scaleX(-1)',
      }}
    />
  );
};

export default ProctorMonitor;
