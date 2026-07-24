import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import LockdownWrapper from '../components/LockdownWrapper';
import ProctorMonitor from '../components/ProctorMonitor';
import ExamTimer from '../components/ExamTimer';
import SyncIndicator from '../components/SyncIndicator';
import { useExamTimer } from '../hooks/useExamTimer';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { cacheExam } from '../services/indexedDB';

const VIOLATION_LABELS = {
  tab_switch: 'Tab switch detected!',
  face_missing: 'Face not detected — stay in frame',
  multiple_faces: 'Multiple faces detected!',
  gaze_away: 'Looking away detected!',
  fullscreen_exit: 'Exited fullscreen — return immediately',
  copy_paste: 'Copy/paste attempt blocked',
  multi_display: 'Multiple displays detected! Disconnect external monitors.',
  security_check_failed: 'Security check failed. Close unauthorized applications or disconnect monitors.',
};

const ExamInterface = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState(location.state?.questions || []);
  const [duration, setDuration] = useState(location.state?.duration || 30);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [warning, setWarning] = useState('');
  const [facultyWarning, setFacultyWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { syncStatus, saveAnswer, saveViolation } = useOfflineSync(sessionId);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/sessions/${sessionId}/submit`);
      navigate('/student', { state: { message: 'Exam submitted successfully!' } });
    } catch (err) {
      setWarning('Submit failed — will retry when online.');
      setSubmitting(false);
    }
  }, [sessionId, navigate, submitting]);

  const { formatted, remaining } = useExamTimer(
    duration,
    session?.startTime,
    handleSubmit
  );

  useEffect(() => {
    const loadSession = async () => {
      const res = await api.get(`/sessions/${sessionId}`);
      setSession(res.data);
      setDuration(res.data.examId?.duration || duration);

      const ansMap = {};
      res.data.answers?.forEach((a) => {
        ansMap[a.questionId] = a.selectedOption;
      });
      setAnswers(ansMap);

      if (!questions.length && res.data.shuffledQuestionOrder) {
        const examRes = await api.get(`/exams/${res.data.examId._id || res.data.examId}`);
        const ordered = res.data.shuffledQuestionOrder.map((qId) =>
          examRes.data.questions.find((q) => q._id === qId)
        ).filter(Boolean);
        setQuestions(ordered);
      }
    };
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    const socket = connectSocket();
    socket.emit('exam:join', { sessionId });

    const heartbeat = setInterval(() => {
      socket.emit('exam:heartbeat', { sessionId, timestamp: Date.now() });
    }, 10000);

    socket.on('student:warning', ({ message }) => {
      setFacultyWarning(message);
      setTimeout(() => setFacultyWarning(''), 8000);
    });

    return () => {
      clearInterval(heartbeat);
      socket.off('student:warning');
    };
  }, [sessionId]);

  useEffect(() => {
    if (questions.length) {
      cacheExam(sessionId, { questions, duration }, answers);
    }
  }, [sessionId, questions, answers, duration]);

  const handleAnswer = async (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    await saveAnswer(questionId, optionIndex);
  };

  const handleViolation = async ({ type, message, snapshot }) => {
    setWarning(message || VIOLATION_LABELS[type] || 'Violation detected');
    setTimeout(() => setWarning(''), 5000);
    await saveViolation(type, snapshot);
  };

  const handleSnapshot = (imageBase64) => {
    const socket = getSocket();
    socket?.emit('exam:snapshot', { sessionId, imageBase64 });
  };

  if (!session || !questions.length) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading exam...</div>;
  }

  const question = questions[currentQ];

  return (
    <LockdownWrapper onViolation={(type) => handleViolation({ type, message: VIOLATION_LABELS[type] })}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Header bar */}
        <div
          style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>{session.examId?.title || 'Exam'}</strong>
            <span style={{ marginLeft: '1rem', opacity: 0.8, fontSize: '0.9rem' }}>
              Q{currentQ + 1}/{questions.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <SyncIndicator status={syncStatus} />
            <ExamTimer formatted={formatted} remaining={remaining} />
          </div>
        </div>

        {/* Warnings */}
        {warning && (
          <div className="alert alert-warning" style={{ margin: '0.5rem 1.5rem', borderRadius: 6 }}>
            {warning}
          </div>
        )}
        {facultyWarning && (
          <div className="alert alert-error" style={{ margin: '0.5rem 1.5rem', borderRadius: 6 }}>
            Faculty Warning: {facultyWarning}
          </div>
        )}

        <div className="container" style={{ paddingTop: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>{question.text}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {question.options.map((opt, idx) => (
                <label
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    border: `2px solid ${answers[question._id] === idx ? 'var(--primary-light)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: answers[question._id] === idx ? '#ebf8ff' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name={`q-${question._id}`}
                    checked={answers[question._id] === idx}
                    onChange={() => handleAnswer(question._id, idx)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button
              className="btn btn-secondary"
              disabled={currentQ === 0}
              onClick={() => setCurrentQ((q) => q - 1)}
            >
              Previous
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQ(idx)}
                  style={{
                    width: 32, height: 32, borderRadius: 4, border: '1px solid var(--border)',
                    background: answers[questions[idx]._id] !== undefined ? 'var(--primary-light)' : 'white',
                    color: answers[questions[idx]._id] !== undefined ? 'white' : 'var(--text)',
                    fontSize: '0.8rem',
                  }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            {currentQ < questions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrentQ((q) => q + 1)}>
                Next
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            )}
          </div>
        </div>

        <ProctorMonitor
          sessionId={sessionId}
          onViolation={handleViolation}
          onSnapshot={handleSnapshot}
          enabled={session.status === 'in-progress'}
        />
      </div>
    </LockdownWrapper>
  );
};

export default ExamInterface;
