import { useRef, useState, useEffect } from 'react';
import { loadFaceModels, getFaceDescriptor, captureSnapshot } from '../services/faceApi';

// Webcam face capture for registration and pre-exam verification
const FaceCapture = ({ onCapture, label = 'Capture Face' }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let mediaStream = null;

    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setError('Failed to load face detection models. Run npm run download-models'));

    const startCamera = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        setError('Camera access denied. Please allow webcam permission.');
      }
    };
    startCamera();

    return () => {
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCapture = async () => {
    if (!modelsReady || !videoRef.current) return;
    setError('');

    const descriptor = await getFaceDescriptor(videoRef.current);
    if (!descriptor) {
      setError('No face detected. Please position your face in the frame.');
      return;
    }

    const image = captureSnapshot(videoRef.current, 200);
    setPreview(image);
    onCapture({ descriptor, image });
  };

  return (
    <div className="face-capture">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            maxWidth: 320,
            borderRadius: 8,
            background: '#000',
            transform: 'scaleX(-1)',
          }}
        />
        {preview && (
          <img
            src={preview}
            alt="Captured"
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid var(--success)',
            }}
          />
        )}
      </div>
      {error && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleCapture}
        disabled={!modelsReady}
        style={{ marginTop: '0.75rem' }}
      >
        {modelsReady ? label : 'Loading models...'}
      </button>
    </div>
  );
};

export default FaceCapture;
