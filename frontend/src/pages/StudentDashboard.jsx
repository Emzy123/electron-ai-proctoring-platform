import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import FaceCapture from '../components/FaceCapture';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const [exams, setExams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [verifyExam, setVerifyExam] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [storedDescriptor, setStoredDescriptor] = useState(null);

  // States for registration dialog
  const [registeringExam, setRegisteringExam] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  
  // State for admit card dialog
  const [showAdmitCard, setShowAdmitCard] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    api.get('/auth/me').then((res) => {
      if (res.data.faceDescriptor) setStoredDescriptor(res.data.faceDescriptor);
    });
  }, []);

  const loadData = async () => {
    try {
      const [examsRes, sessionsRes, regRes] = await Promise.all([
        api.get('/exams'),
        api.get('/sessions/my'),
        api.get('/registrations/my-registrations'),
      ]);
      setExams(examsRes.data);
      setSessions(sessionsRes.data);
      setMyRegistrations(regRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const getSessionForExam = (examId) =>
    sessions.find((s) => s.examId?._id === examId || s.examId === examId);

  const getRegistrationForExam = (examId) =>
    myRegistrations.find((r) => r.examId?._id === examId || r.examId === examId);

  const handleStartExam = (exam) => {
    const existing = getSessionForExam(exam._id);
    if (existing?.status === 'submitted') return;
    if (existing?.status === 'in-progress') {
      navigate(`/exam/${existing._id}`);
      return;
    }
    setVerifyExam(exam);
    setVerifyError('');
  };

  const handleFaceVerified = async ({ descriptor, image }) => {
    try {
      setVerifyError('');
      const res = await api.post(`/sessions/start/${verifyExam._id}`, { faceDescriptor: descriptor, faceImage: image });
      navigate(`/exam/${res.data.session._id}`, {
        state: { questions: res.data.questions, duration: res.data.duration },
      });
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Failed to start exam');
    }
  };

  const startRegistrationFlow = (exam) => {
    setRegisteringExam(exam);
    setSelectedSlotId('');
    setRegistrationError('');
    setConsentChecked(false);
  };

  const handleSignConsent = async () => {
    try {
      setRegistrationError('');
      await api.post('/auth/consent', { agreementVersion: '1.0' });
      // Retry registration immediately after signing consent
      await api.post('/registrations/register', {
        examId: registeringExam._id,
        slotId: selectedSlotId || undefined,
      });
      setRegisteringExam(null);
      loadData();
    } catch (err) {
      setRegistrationError(err.response?.data?.message || 'Failed to sign consent.');
    }
  };

  const submitRegistration = async () => {
    try {
      setRegistrationError('');
      await api.post('/registrations/register', {
        examId: registeringExam._id,
        slotId: selectedSlotId || undefined,
      });
      setRegisteringExam(null);
      loadData();
    } catch (err) {
      setRegistrationError(err.response?.data?.message || 'Failed to submit registration request.');
    }
  };

  return (
    <>
      <Navbar title="Student Dashboard" />
      <div className="container">
        <h2 style={{ marginBottom: '1rem' }}>Available Exams</h2>
        <div className="grid-2">
          {exams.map((exam) => {
            const session = getSessionForExam(exam._id);
            const registration = getRegistrationForExam(exam._id);
            const isSubmitted = session?.status === 'submitted';
            const isActive = session?.status === 'in-progress';

            return (
              <div key={exam._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{exam.title}</span>
                    {registration && (
                      <span className={`badge ${
                        registration.status === 'approved' ? 'badge-success' :
                        registration.status === 'pending' ? 'badge-warning' : 'badge-danger'
                      }`} style={{ fontSize: '0.75rem' }}>
                        {registration.status.toUpperCase()}
                      </span>
                    )}
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {exam.courseCode} · {exam.duration} min
                  </p>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    Scheduled: {new Date(exam.scheduledDate).toLocaleString()}
                  </p>
                  
                  {registration?.slot?.startTime && (
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>
                      Assigned Slot: {new Date(registration.slot.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(registration.slot.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  {isSubmitted ? (
                    <div style={{ width: '100%' }}>
                      <span className="badge badge-success" style={{ display: 'inline-block', width: '100%', textAlign: 'center' }}>Submitted</span>
                      {session.scoreReleased && (
                        <p style={{ marginTop: '0.5rem', fontWeight: 600, textAlign: 'center' }}>
                          Score: {session.score}%
                        </p>
                      )}
                    </div>
                  ) : !registration ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => startRegistrationFlow(exam)}
                    >
                      Register for Exam
                    </button>
                  ) : registration.status === 'pending' ? (
                    <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
                      Pending Approval
                    </button>
                  ) : registration.status === 'rejected' ? (
                    <button className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }} disabled>
                      Registration Rejected
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => handleStartExam(exam)}
                      >
                        {isActive ? 'Resume' : 'Start'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setShowAdmitCard(registration)}
                      >
                        Admit Card
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {exams.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>No published exams available.</p>
          )}
        </div>

        <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>My Exam History</h2>
        <table className="table card" style={{ padding: 0, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th>Exam</th>
              <th>Status</th>
              <th>Score</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s._id}>
                <td>{s.examId?.title || 'N/A'}</td>
                <td>
                  <span className={`badge ${s.status === 'submitted' ? 'badge-success' : 'badge-warning'}`}>
                    {s.status}
                  </span>
                </td>
                <td>{s.scoreReleased ? `${s.score}%` : s.status === 'submitted' ? 'Pending release' : '-'}</td>
                <td>{new Date(s.startTime).toLocaleDateString()}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: '1rem' }}>
                  No historical sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 1. Registration Dialog Modal */}
      {registeringExam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card" style={{ maxWidth: 450, width: '90%', padding: '1.5rem' }}>
            <h3>Register for Exam</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
              Confirm your seating and session slot for <strong>{registeringExam.title}</strong> ({registeringExam.courseCode}).
            </p>
            
            {registrationError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{registrationError}</div>}
            
            {registrationError && registrationError.includes('consent') && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-muted)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input 
                    type="checkbox" 
                    checked={consentChecked} 
                    onChange={(e) => setConsentChecked(e.target.checked)} 
                    style={{ marginTop: '0.15rem', cursor: 'pointer' }}
                  />
                  <span>I agree to the proctoring privacy policy and consent to webcam/screen monitoring during the exam.</span>
                </label>
                <button 
                  className="btn btn-primary btn-sm" 
                  style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.8rem', padding: '6px' }}
                  disabled={!consentChecked}
                  onClick={handleSignConsent}
                >
                  Sign Consent & Register
                </button>
              </div>
            )}
            
            {registeringExam.slots && registeringExam.slots.length > 0 ? (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Select Exam Time Slot</label>
                <select 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'inherit' }}
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                >
                  <option value="">-- Choose an Available Slot --</option>
                  {registeringExam.slots.map(s => (
                    <option key={s._id} value={s._id}>
                      {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(s.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {s.capacity > 0 ? `(Cap: ${s.capacity})` : '(Unlimited)'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem', color: 'var(--success)' }}>
                ✓ No capacity batch slots required. You will take the exam during the scheduled slot.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRegisteringExam(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={submitRegistration}
                disabled={registeringExam.slots && registeringExam.slots.length > 0 && !selectedSlotId}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Admit Card Dialog Modal */}
      {showAdmitCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card" style={{ maxWidth: 500, width: '95%', border: '2px solid var(--success)', borderRadius: '12px', padding: '1.75rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '2px dashed var(--border)', paddingBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, color: 'var(--success)', letterSpacing: '1px', fontSize: '1.4rem' }}>OFFICIAL ADMIT CARD</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>CUSTECH CBT ENTERPRISE SECURITY GATEWAY</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 600 }}>CANDIDATE</span>
                <strong>{user?.name}</strong>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 600 }}>MATRIC NO</span>
                <strong>{user?.matricNo || 'N/A'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 600 }}>EXAM COURSE</span>
                <strong>{showAdmitCard.examId?.courseCode} - {showAdmitCard.examId?.title}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 600 }}>SESSION / SLOT</span>
                <strong>
                  {showAdmitCard.slot?.startTime ? (
                    `${new Date(showAdmitCard.slot.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} - ${new Date(showAdmitCard.slot.endTime).toLocaleTimeString([], { timeStyle: 'short' })}`
                  ) : (
                    new Date(showAdmitCard.examId?.scheduledDate).toLocaleString()
                  )}
                </strong>
              </div>
            </div>

            <div style={{ background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
              <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Secure Admit Token (Offline Verification):</span>
              <code style={{ wordBreak: 'break-all', display: 'block', color: 'var(--success)', maxHeight: '60px', overflowY: 'auto', fontSize: '0.7rem' }}>
                {showAdmitCard.admitToken}
              </code>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.7rem', padding: '4px' }}
                onClick={() => {
                  navigator.clipboard.writeText(showAdmitCard.admitToken);
                  alert('Token copied to clipboard! You can use this for offline gateway validation.');
                }}
              >
                Copy Admit Token
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdmitCard(null)}>
                Close
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                Print Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Pre-Exam Face Verification Dialog Modal */}
      {verifyExam && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}
        >
          <div className="card" style={{ maxWidth: 400, width: '90%' }}>
            <h3>Pre-Exam Face Verification</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              Verify your identity before starting <strong>{verifyExam.title}</strong>
            </p>
            {verifyError && <div className="alert alert-error">{verifyError}</div>}
            <FaceCapture onCapture={handleFaceVerified} label="Verify Face & Start" />
            <button
              className="btn btn-secondary"
              style={{ marginTop: '0.75rem', width: '100%' }}
              onClick={() => setVerifyExam(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentDashboard;
