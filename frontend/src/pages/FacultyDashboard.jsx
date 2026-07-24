import { useState, useEffect } from 'react';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import Navbar from '../components/Navbar';
import { useExamTimer } from '../hooks/useExamTimer';

const EMPTY_QUESTION = { text: '', options: ['', '', '', ''], correctAnswer: 0 };

const FacultyDashboard = () => {
  const [tab, setTab] = useState('exams');
  const [exams, setExams] = useState([]);
  const [violations, setViolations] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  
  // Exam creation form state
  const [examForm, setExamForm] = useState({
    title: '', courseCode: '', duration: 30,
    scheduledDate: '', maxCapacity: undefined, slots: [], questions: [{ ...EMPTY_QUESTION }],
  });
  
  const [message, setMessage] = useState('');
  const [warnTarget, setWarnTarget] = useState(null);
  const [warnText, setWarnText] = useState('');
  const [selectedStudentViolations, setSelectedStudentViolations] = useState(null);
  const [faceAudits, setFaceAudits] = useState([]);

  // States for registrations management tab
  const [registrationsExamId, setRegistrationsExamId] = useState('');
  const [examRegistrations, setExamRegistrations] = useState([]);
  const [bulkMatricsText, setBulkMatricsText] = useState('');
  const [bulkEnrollSlotId, setBulkEnrollSlotId] = useState('');
  const [bulkResult, setBulkResult] = useState(null);

  const handleViewStudentViolations = async (group) => {
    setSelectedStudentViolations(group);
    setFaceAudits([]);
    try {
      const studentId = group.list[0]?.studentId?._id || group.list[0]?.studentId;
      if (studentId) {
        const res = await api.get(`/admin/face-audits?studentId=${studentId}`);
        setFaceAudits(res.data);
      }
    } catch (err) {
      console.error('Failed to load face audits:', err);
    }
  };

  const getGroupedViolations = () => {
    const groups = {};
    violations.forEach((v) => {
      const studentId = v.studentId?._id || 'unknown';
      if (!groups[studentId]) {
        groups[studentId] = {
          studentName: v.studentId?.name || 'Unknown Student',
          matricNo: v.studentId?.matricNo || 'N/A',
          examTitle: v.examId?.title || 'Unknown Exam',
          violationCount: 0,
          latestTime: v.timestamp,
          list: [],
        };
      }
      groups[studentId].violationCount++;
      groups[studentId].list.push(v);
      if (new Date(v.timestamp) > new Date(groups[studentId].latestTime)) {
        groups[studentId].latestTime = v.timestamp;
      }
    });
    return Object.values(groups);
  };

  useEffect(() => {
    loadExams();
    loadViolations();

    const socket = connectSocket();
    socket.emit('faculty:join');

    socket.on('monitor:update', setActiveSessions);
    socket.on('monitor:violation', () => loadViolations());
    socket.on('monitor:snapshot', ({ sessionId, imageBase64 }) => {
      setActiveSessions((prev) =>
        prev.map((s) =>
          s.sessionId === sessionId ? { ...s, lastSnapshot: imageBase64 } : s
        )
      );
    });

    return () => {
      socket.off('monitor:update');
      socket.off('monitor:violation');
      socket.off('monitor:snapshot');
    };
  }, []);

  const loadExams = async () => {
    const res = await api.get('/exams');
    setExams(res.data);
  };

  const loadViolations = async () => {
    const res = await api.get('/violations');
    setViolations(res.data);
  };

  const loadResults = async (examId) => {
    const res = await api.get(`/reports/exam/${examId}/results`);
    setResults(res.data);
    setSelectedExam(examId);
  };

  const loadExamRegistrations = async (examId) => {
    if (!examId) {
      setExamRegistrations([]);
      return;
    }
    try {
      const res = await api.get(`/registrations/exam/${examId}`);
      setExamRegistrations(res.data);
    } catch (err) {
      console.error('Failed to load registrations:', err);
    }
  };

  useEffect(() => {
    if (tab === 'registrations') {
      loadExamRegistrations(registrationsExamId);
    }
  }, [registrationsExamId, tab]);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exams', {
        ...examForm,
        scheduledDate: new Date(examForm.scheduledDate).toISOString(),
        questions: examForm.questions.filter((q) => q.text.trim()),
      });
      setMessage('Exam created successfully');
      setExamForm({
        title: '', courseCode: '', duration: 30,
        scheduledDate: '', maxCapacity: undefined, slots: [], questions: [{ ...EMPTY_QUESTION }],
      });
      loadExams();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create exam');
    }
  };

  const handlePublish = async (examId, isPublished) => {
    await api.patch(`/exams/${examId}/publish`, { isPublished });
    loadExams();
  };

  const handleReview = async (violationId, status) => {
    await api.patch(`/violations/${violationId}/review`, { status, comment: '' });
    const socket = getSocket();
    socket?.emit('faculty:review-violation', { violationId, status, comment: '' });
    loadViolations();
  };

  const handleWarn = () => {
    const socket = getSocket();
    socket?.emit('faculty:warn', { sessionId: warnTarget, message: warnText });
    setWarnTarget(null);
    setWarnText('');
    setMessage('Warning sent to student');
  };

  const handleRelease = async (sessionId) => {
    await api.patch(`/sessions/${sessionId}/release`, { release: true });
    if (selectedExam) loadResults(selectedExam);
  };

  const handleExport = async (sessionId, format) => {
    const res = await api.get(`/reports/session/${sessionId}/${format}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${sessionId}.${format}`;
    a.click();
  };

  const handleReviewRegistration = async (registrationId, status) => {
    try {
      await api.post('/registrations/review', { registrationId, status });
      setMessage(`Registration successfully ${status}.`);
      loadExamRegistrations(registrationsExamId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update registration status.');
    }
  };

  const handleBulkEnroll = async (e) => {
    e.preventDefault();
    if (!registrationsExamId) return;
    try {
      setBulkResult(null);
      const matricNumbers = bulkMatricsText
        .split(/[\n,]+/)
        .map(m => m.trim())
        .filter(Boolean);

      const res = await api.post('/registrations/bulk-enroll', {
        examId: registrationsExamId,
        matricNumbers,
        slotId: bulkEnrollSlotId || undefined,
      });

      setBulkResult(res.data);
      setBulkMatricsText('');
      setMessage(`Bulk enrollment completed: ${res.data.enrolledCount} enrolled.`);
      loadExamRegistrations(registrationsExamId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to bulk enroll students.');
    }
  };

  const addQuestion = () => {
    setExamForm((f) => ({
      ...f,
      questions: [...f.questions, { ...EMPTY_QUESTION }],
    }));
  };

  const addSlot = () => {
    setExamForm((f) => ({
      ...f,
      slots: [...(f.slots || []), { startTime: '', endTime: '', capacity: 0 }]
    }));
  };

  const updateSlot = (idx, field, value) => {
    setExamForm((f) => {
      const slots = [...(f.slots || [])];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...f, slots };
    });
  };

  const removeSlot = (idx) => {
    setExamForm((f) => ({
      ...f,
      slots: (f.slots || []).filter((_, i) => i !== idx)
    }));
  };

  const parseCSV = (text) => {
    const lines = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target.result;
      const rows = parseCSV(csvText);
      
      let startIdx = 0;
      if (rows.length > 0) {
        const firstRow = rows[0];
        if (isNaN(parseInt(firstRow[firstRow.length - 1]))) {
          startIdx = 1;
        }
      }

      const importedQuestions = [];
      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 6) continue;

        const text = row[0]?.trim();
        const options = [
          row[1]?.trim() || '',
          row[2]?.trim() || '',
          row[3]?.trim() || '',
          row[4]?.trim() || '',
        ];
        let correctAnswer = parseInt(row[5]?.trim());
        if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
          correctAnswer = 0;
        }

        if (text) {
          importedQuestions.push({ text, options, correctAnswer });
        }
      }

      if (importedQuestions.length > 0) {
        setExamForm((prev) => ({
          ...prev,
          questions: importedQuestions,
        }));
        setMessage(`Imported ${importedQuestions.length} questions from CSV.`);
      } else {
        setMessage('No valid questions found in CSV.');
      }
    };
    reader.readAsText(file);
  };

  const updateQuestion = (idx, field, value) => {
    setExamForm((f) => {
      const questions = [...f.questions];
      questions[idx] = { ...questions[idx], [field]: value };
      return { ...f, questions };
    });
  };

  const updateOption = (qIdx, oIdx, value) => {
    setExamForm((f) => {
      const questions = [...f.questions];
      const options = [...questions[qIdx].options];
      options[oIdx] = value;
      questions[qIdx] = { ...questions[qIdx], options };
      return { ...f, questions };
    });
  };

  return (
    <>
      <Navbar title="Faculty Dashboard" />
      <div className="container">
        {message && (
          <div className="alert alert-success" onClick={() => setMessage('')} style={{ cursor: 'pointer' }}>
            {message}
          </div>
        )}

        <div className="tabs">
          {['exams', 'registrations', 'monitor', 'violations', 'results'].map((t) => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'exams' ? 'Exam Management' :
               t === 'registrations' ? 'Enrollments / Registration' :
               t === 'monitor' ? 'Live Monitor' :
               t === 'violations' ? 'Violations' : 'Results'}
            </button>
          ))}
        </div>

        {/* Exam Management */}
        {tab === 'exams' && (
          <div className="grid-2">
            <div className="card">
              <h3>Create New Exam</h3>
              <form onSubmit={handleCreateExam}>
                <div className="form-group">
                  <label>Title</label>
                  <input value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Course Code</label>
                  <input value={examForm.courseCode} onChange={(e) => setExamForm({ ...examForm, courseCode: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input type="number" value={examForm.duration} onChange={(e) => setExamForm({ ...examForm, duration: +e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Scheduled Date & Time</label>
                  <input type="datetime-local" value={examForm.scheduledDate} onChange={(e) => setExamForm({ ...examForm, scheduledDate: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label>Max Seating Capacity (Optional)</label>
                  <input type="number" value={examForm.maxCapacity || ''} onChange={(e) => setExamForm({ ...examForm, maxCapacity: e.target.value ? +e.target.value : undefined })} placeholder="e.g. 150" />
                </div>

                <h4 style={{ margin: '1rem 0 0.5rem' }}>Time Slots / Batches (Optional)</h4>
                {examForm.slots?.map((slot, sIdx) => (
                  <div key={sIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <input type="datetime-local" value={slot.startTime} onChange={(e) => updateSlot(sIdx, 'startTime', e.target.value)} required style={{ flex: 2, padding: '0.4rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'inherit' }} />
                    <input type="datetime-local" value={slot.endTime} onChange={(e) => updateSlot(sIdx, 'endTime', e.target.value)} required style={{ flex: 2, padding: '0.4rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'inherit' }} />
                    <input type="number" value={slot.capacity || ''} onChange={(e) => updateSlot(sIdx, 'capacity', e.target.value ? +e.target.value : 0)} placeholder="Cap" style={{ flex: 1, padding: '0.4rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'inherit' }} />
                    <button type="button" className="btn btn-secondary" onClick={() => removeSlot(sIdx)} style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>×</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addSlot} style={{ marginBottom: '1.25rem', display: 'block', width: '100%' }}>
                  + Add Seating Slot
                </button>

                <h4 style={{ margin: '1rem 0 0.5rem' }}>Questions</h4>
                {examForm.questions.map((q, qIdx) => (
                  <div key={qIdx} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label>Question {qIdx + 1}</label>
                      <input value={q.text} onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)} />
                    </div>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={q.correctAnswer === oIdx}
                          onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                        />
                        <input value={opt} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} style={{ flex: 1 }} />
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={addQuestion} style={{ flex: 1 }}>
                    + Add Question
                  </button>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, flex: 1, textAlign: 'center' }}>
                    + Import Questions (CSV)
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Exam</button>
              </form>
            </div>

            <div>
              <h3>Exams List</h3>
              <div className="grid-1">
                {exams.map((ex) => (
                  <div key={ex._id} className="card">
                    <h4>{ex.title} ({ex.courseCode})</h4>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                      Date: {new Date(ex.scheduledDate).toLocaleString()} · Duration: {ex.duration} mins
                    </p>
                    {ex.slots && ex.slots.length > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                        <strong>Configured Slots:</strong>
                        {ex.slots.map((s, idx) => (
                          <div key={s._id} style={{ color: 'var(--success)' }}>
                            - Slot {idx + 1}: {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(s.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Cap: {s.capacity || 'Unlim'})
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        className={`btn ${ex.isPublished ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        onClick={() => handlePublish(ex._id, !ex.isPublished)}
                      >
                        {ex.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Enrollments & Registrations Management */}
        {tab === 'registrations' && (
          <div className="grid-2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
            <div className="card">
              <h3>Manage Student Registrations</h3>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Select Exam</label>
                <select
                  value={registrationsExamId}
                  onChange={(e) => setRegistrationsExamId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'inherit' }}
                >
                  <option value="">-- Choose an Exam --</option>
                  {exams.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {ex.courseCode} - {ex.title}
                    </option>
                  ))}
                </select>
              </div>

              {registrationsExamId ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Matric No</th>
                        <th>Slot</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examRegistrations.map((reg) => (
                        <tr key={reg._id}>
                          <td><strong>{reg.studentId?.name}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{reg.studentId?.email}</span></td>
                          <td><code>{reg.studentId?.matricNo}</code></td>
                          <td>
                            {reg.slot?.startTime ? (
                              `${new Date(reg.slot.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(reg.slot.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                            ) : (
                              'Default'
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              reg.status === 'approved' ? 'badge-success' :
                              reg.status === 'pending' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              {reg.status !== 'approved' && (
                                <button className="btn btn-primary btn-sm" onClick={() => handleReviewRegistration(reg._id, 'approved')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Approve</button>
                              )}
                              {reg.status !== 'rejected' && (
                                <button className="btn btn-secondary btn-sm" onClick={() => handleReviewRegistration(reg._id, 'rejected')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}>Reject</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {examRegistrations.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                            No registration requests found for this exam.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>
                  Please select an exam from the list to view and manage student registrations.
                </p>
              )}
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3>Bulk Student Enrollment</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Import/register multiple students instantly by pasting their matriculation numbers.
              </p>
              
              <form onSubmit={handleBulkEnroll}>
                <div className="form-group">
                  <label>Paste Matric Numbers (comma/line separated)</label>
                  <textarea
                    rows="6"
                    value={bulkMatricsText}
                    onChange={(e) => setBulkMatricsText(e.target.value)}
                    placeholder="CUST2024001&#10;CUST2024002&#10;CUST2024003"
                    disabled={!registrationsExamId}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'inherit' }}
                    required
                  />
                </div>

                {registrationsExamId && exams.find(e => e._id === registrationsExamId)?.slots?.length > 0 && (
                  <div className="form-group">
                    <label>Assign to Time Slot (Optional)</label>
                    <select
                      value={bulkEnrollSlotId}
                      onChange={(e) => setBulkEnrollSlotId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'inherit' }}
                    >
                      <option value="">-- Choose Time Slot --</option>
                      {exams.find(e => e._id === registrationsExamId).slots.map((s) => (
                        <option key={s._id} value={s._id}>
                          {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(s.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.75rem' }}
                  disabled={!registrationsExamId}
                >
                  Bulk Enroll Students
                </button>
              </form>

              {bulkResult && (
                <div style={{ marginTop: '1rem', background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  <strong>Bulk Enrollment Report:</strong>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                    <li style={{ color: 'var(--success)' }}>Enrolled: {bulkResult.enrolledCount}</li>
                    <li style={{ color: 'var(--danger)' }}>Skipped: {bulkResult.skippedCount}</li>
                  </ul>
                  {bulkResult.skipped && bulkResult.skipped.length > 0 && (
                    <div style={{ marginTop: '0.5rem', maxHeight: '100px', overflowY: 'auto' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)' }}>Skipped list:</span>
                      {bulkResult.skipped.map((s, idx) => (
                        <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          - <code>{s.matric}</code>: {s.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Monitor */}
        {tab === 'monitor' && (
          <div className="grid-3">
            {activeSessions.map((session) => (
              <MonitorCard
                key={session.sessionId}
                session={session}
                onWarn={() => {
                  setWarnTarget(session.sessionId);
                  setWarnText('');
                }}
              />
            ))}
            {activeSessions.length === 0 && (
              <p style={{ color: 'var(--muted)' }}>No active exam sessions.</p>
            )}
          </div>
        )}

        {/* Violations */}
        {tab === 'violations' && (
          <div>
            {selectedStudentViolations ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <div>
                    <button className="btn btn-secondary" onClick={() => setSelectedStudentViolations(null)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', marginRight: '0.75rem' }}>
                      &larr; Back to Student Groups
                    </button>
                    <h3 style={{ display: 'inline-block', margin: 0 }}>
                      Violations for {selectedStudentViolations.studentName} ({selectedStudentViolations.matricNo})
                    </h3>
                  </div>
                  <span className="badge badge-danger">
                    {selectedStudentViolations.violationCount} Violations total
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Timestamp</th>
                        <th>Evidence / Snapshot</th>
                        <th>Review Status</th>
                        <th>Review Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudentViolations.list.map((v) => (
                        <tr key={v._id}>
                          <td>
                            <strong>{v.type}</strong>
                          </td>
                          <td>{new Date(v.timestamp).toLocaleString()}</td>
                          <td>
                            {v.snapshot ? (
                              <img src={v.snapshot} alt="violation snapshot" style={{ width: 120, borderRadius: 4 }} />
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No image evidence</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              v.facultyReviewStatus === 'approved' ? 'badge-success' :
                              v.facultyReviewStatus === 'pending' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {v.facultyReviewStatus}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              {v.facultyReviewStatus !== 'approved' && (
                                <button className="btn btn-primary btn-sm" onClick={() => handleReview(v._id, 'approved')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                  Approve
                                </button>
                              )}
                              {v.facultyReviewStatus !== 'dismissed' && (
                                <button className="btn btn-secondary btn-sm" onClick={() => handleReview(v._id, 'dismissed')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                  Dismiss
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Identity Verification Audits</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Exam</th>
                        <th>Match Distance</th>
                        <th>Result</th>
                        <th>Snapshot</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faceAudits.map((a) => (
                        <tr key={a._id}>
                          <td><strong>{a.actionType === 'pre_exam_verify' ? 'Pre-Exam Verification' : 'Live Proctoring'}</strong></td>
                          <td>{a.examId?.title}</td>
                          <td>{a.distance.toFixed(2)}</td>
                          <td>
                            <span className={`badge ${a.passed ? 'badge-success' : 'badge-danger'}`}>
                              {a.passed ? 'Matched' : 'Mismatch'}
                            </span>
                          </td>
                          <td>
                            {a.snapshot && (
                              <img src={a.snapshot} alt="verification snapshot" style={{ width: 80, borderRadius: 4 }} />
                            )}
                          </td>
                          <td>{new Date(a.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                      {faceAudits.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                            No face verification audits found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card" style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Matric Number</th>
                      <th>Exam</th>
                      <th>Total Violations</th>
                      <th>Latest Occurrence</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getGroupedViolations().map((group) => (
                      <tr key={group.matricNo} style={{ cursor: 'pointer' }} onClick={() => handleViewStudentViolations(group)}>
                        <td>
                          <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
                            {group.studentName}
                          </span>
                        </td>
                        <td>{group.matricNo}</td>
                        <td>{group.examTitle}</td>
                        <td>
                          <span className="badge badge-danger">
                            {group.violationCount} violations
                          </span>
                        </td>
                        <td>{new Date(group.latestTime).toLocaleString()}</td>
                        <td>
                          <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={(e) => { e.stopPropagation(); handleViewStudentViolations(group); }}>
                            View Violations
                          </button>
                        </td>
                      </tr>
                    ))}
                    {getGroupedViolations().length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                          No violations recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {tab === 'results' && (
          <div>
            <div className="form-group" style={{ maxWidth: 300 }}>
              <label>Select Exam</label>
              <select
                value={selectedExam || ''}
                onChange={(e) => loadResults(e.target.value)}
              >
                <option value="">Choose exam...</option>
                {exams.map((e) => (
                  <option key={e._id} value={e._id}>{e.title}</option>
                ))}
              </select>
            </div>
            {results.length > 0 && (
              <table className="table card">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Score</th>
                    <th>Violations</th>
                    <th>Flagged</th>
                    <th>Released</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(({ session, violationCount, flaggedCount }) => (
                    <tr key={session._id}>
                      <td>{session.studentId?.name}</td>
                      <td>{session.score}%</td>
                      <td>{violationCount}</td>
                      <td>{flaggedCount}</td>
                      <td>{session.scoreReleased ? 'Yes' : 'No'}</td>
                      <td style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {!session.scoreReleased && (
                          <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleRelease(session._id)}>Release Score</button>
                        )}
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleExport(session._id, 'csv')}>CSV</button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleExport(session._id, 'pdf')}>PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {warnTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card" style={{ maxWidth: 400, width: '90%' }}>
            <h3>Send Warning to Student</h3>
            <div className="form-group">
              <textarea value={warnText} onChange={(e) => setWarnText(e.target.value)} rows={3} placeholder="Warning message..." />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-danger" onClick={handleWarn} disabled={!warnText.trim()}>Send</button>
              <button className="btn btn-secondary" onClick={() => setWarnTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const MonitorCard = ({ session, onWarn }) => {
  const { formatted, remaining } = useExamTimer(
    session.duration,
    session.startTime,
    null
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <strong>{session.studentName}</strong>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{session.matricNo}</p>
        </div>
        <span className={`badge ${session.connected ? 'badge-success' : 'badge-danger'}`}>
          {session.connected ? 'Online' : 'Disconnected'}
        </span>
      </div>
      <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>{session.examTitle}</p>
      {session.lastSnapshot ? (
        <img src={session.lastSnapshot} alt="snapshot" style={{ width: '100%', borderRadius: 6, marginBottom: '0.5rem' }} />
      ) : (
        <div style={{ background: '#000', height: 120, borderRadius: 6, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem' }}>
          Waiting for snapshot...
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span>Time: {formatted}</span>
        <span className="badge badge-danger">{session.violationCount || 0} violations</span>
      </div>
      <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Answers: {session.answersCount || 0}</p>
      <button className="btn btn-secondary" style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.8rem' }} onClick={onWarn}>
        Send Warning
      </button>
    </div>
  );
};

export default FacultyDashboard;
