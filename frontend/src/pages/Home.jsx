import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleDashboardRedirect = (role) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (role === 'student') {
      navigate('/student');
    } else if (role === 'faculty') {
      navigate('/faculty');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f8fafc', fontFamily: "'Outfit', 'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
            O
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.5px' }}>CUSTECH Osara</span>
        </div>
        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Logged in as <strong>{user.name}</strong></span>
              <button 
                className="btn btn-primary" 
                onClick={() => handleDashboardRedirect(user.role === 'faculty' ? 'faculty' : 'student')}
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
              >
                Go to Dashboard &rarr;
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/login" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '5rem 2rem 4rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-block', marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.2)' }}>
          SECURE & INTEGRATED COMPUTER BASED TESTING
        </span>
        <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.5rem', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Smart Online Examinations For Modern Institutions
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          CUSTECH Osara is an enterprise-grade CBT system powered by local face verification, robust client process lockdown, and real-time proctor surveillance.
        </p>

        {/* Portals Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
          {/* Student Portal Card */}
          <div 
            onClick={() => handleDashboardRedirect('student')}
            style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '2rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s ease', transform: 'translateY(0)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(59,130,246,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ width: '48px', height: '48px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
              🎓
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Student Portal</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Register for upcoming exams, reserve time/seating slots, perform face matches, and launch your lockdown exams.
            </p>
            <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Enter Portal &rarr;
            </span>
          </div>

          {/* Faculty Portal Card */}
          <div 
            onClick={() => handleDashboardRedirect('faculty')}
            style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '2rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s ease', transform: 'translateY(0)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(168,85,247,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ width: '48px', height: '48px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
              💼
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Faculty Portal</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Design exams with seating slots, manage bulk enrollments, watch active students live, and review automated violation logs.
            </p>
            <span style={{ color: '#a855f7', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Enter Portal &rarr;
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '4rem 2rem 6rem', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(15,23,42,0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '3rem', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Integrated Anti-Cheating & Exam Operations
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            {/* Feature 1 */}
            <div>
              <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.75rem' }}>🔒</span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Strict Kiosk Lockdown</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Electron wrapper monitors multi-display configurations, blocks clipboard operations, and force-terminates blacklisted applications.
              </p>
            </div>

            {/* Feature 2 */}
            <div>
              <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.75rem' }}>📸</span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Biometric Verification</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Local and server-side Euclidean match verification logs every attempt, capturing distance scores and snapshots to ensure student identity integrity.
              </p>
            </div>

            {/* Feature 3 */}
            <div>
              <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.75rem' }}>📅</span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Seating Time-Slots</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Capacity slot reservation system locks allocations once limits are met. Generates signed admit cards valid for offline verification.
              </p>
            </div>

            {/* Feature 4 */}
            <div>
              <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.75rem' }}>📺</span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Live Proctor Monitor</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Websockets pipeline delivers continuous snapshots, proctor warning notifications, and grouped student violation history panels.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
