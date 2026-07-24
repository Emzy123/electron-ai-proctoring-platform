import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { identifier, password });
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'faculty' ? '/faculty' : '/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: '3rem' }}>
      <div className="card">
        <h2 style={{ marginBottom: '0.5rem' }}>CUSTECH Osara</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Online Examination System
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Matric Number</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="student@custech.edu or CUST2024001"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          New student? <Link to="/register">Register here</Link>
        </p>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Test Credentials</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '4px 0', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '4px 0', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '4px 0', fontWeight: 600 }}>Password</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 0' }}>Faculty</td>
                <td style={{ padding: '6px 0' }}><code style={{ background: 'var(--bg-muted)', padding: '2px 4px', borderRadius: '3px' }}>faculty@custech.edu</code></td>
                <td style={{ padding: '6px 0' }}><code style={{ background: 'var(--bg-muted)', padding: '2px 4px', borderRadius: '3px' }}>Faculty@123</code></td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0' }}>Student</td>
                <td style={{ padding: '6px 0' }}><code style={{ background: 'var(--bg-muted)', padding: '2px 4px', borderRadius: '3px' }}>student@custech.edu</code></td>
                <td style={{ padding: '6px 0' }}><code style={{ background: 'var(--bg-muted)', padding: '2px 4px', borderRadius: '3px' }}>Student@123</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Login;
