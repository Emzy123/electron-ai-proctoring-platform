import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FaceCapture from '../components/FaceCapture';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    matricNo: '',
    password: '',
  });
  const [faceData, setFaceData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!faceData) {
      setError('Please capture your face photo before registering.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        ...form,
        faceDescriptor: faceData.descriptor,
        faceImage: faceData.image,
      });
      login(res.data.token, res.data.user);
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 500, paddingTop: '2rem' }}>
      <div className="card">
        <h2>Student Registration</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Register with your details and a face photo for exam identity verification.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Matriculation Number</label>
            <input
              value={form.matricNo}
              onChange={(e) => setForm({ ...form, matricNo: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <div className="form-group">
            <label>Face Photo (required)</label>
            <FaceCapture onCapture={setFaceData} label="Capture Face for Registration" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Already registered? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
