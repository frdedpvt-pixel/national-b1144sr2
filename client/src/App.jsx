import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/student/Dashboard';
import Feed from './pages/student/Feed';
import Calendar from './pages/student/Calendar';
import Announcements from './pages/student/Announcements';
import TeacherDashboard from './pages/teacher/Dashboard';
import StudentManagement from './pages/teacher/StudentManagement';
import ModerationPanel from './pages/teacher/ModerationPanel';
import CalendarManagement from './pages/teacher/CalendarManagement';
import CreateAnnouncement from './pages/teacher/CreateAnnouncement';

function AppRoutes() {
  const { isAuthenticated, isStudent, isTeacher } = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={isStudent ? '/student' : '/teacher'} replace /> : <Login />}
      />

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute requireRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/feed"
        element={
          <ProtectedRoute requireRole="student">
            <Feed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/calendar"
        element={
          <ProtectedRoute requireRole="student">
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/announcements"
        element={
          <ProtectedRoute requireRole="student">
            <Announcements />
          </ProtectedRoute>
        }
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute requireRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <ProtectedRoute requireRole="teacher">
            <StudentManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/moderation"
        element={
          <ProtectedRoute requireRole="teacher">
            <ModerationPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/calendar"
        element={
          <ProtectedRoute requireRole="teacher">
            <CalendarManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/announcements/create"
        element={
          <ProtectedRoute requireRole="teacher">
            <CreateAnnouncement />
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={isStudent ? '/student' : '/teacher'} replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
