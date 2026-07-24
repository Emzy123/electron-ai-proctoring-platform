import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import ExamInterface from './pages/ExamInterface';
import FacultyDashboard from './pages/FacultyDashboard';
import Home from './pages/Home';

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route
      path="/student"
      element={
        <ProtectedRoute role="student">
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/exam/:sessionId"
      element={
        <ProtectedRoute role="student">
          <ExamInterface />
        </ProtectedRoute>
      }
    />
    <Route
      path="/faculty"
      element={
        <ProtectedRoute role="faculty">
          <FacultyDashboard />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
