import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import InterviewRoom from './pages/InterviewRoom';
import InterviewChats from './pages/InterviewChats';
import InterviewReport from './pages/InterviewReport';
import InterviewList from './pages/InterviewList';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white-smoke">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gunmetal">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* 登入頁面 - 已登入用戶重定向到 dashboard */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      
      {/* 受保護的路由 */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id/chats"
        element={
          <ProtectedRoute>
            <InterviewChats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id/new-chat"
        element={
          <ProtectedRoute>
            <InterviewRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id/chat/:chatId"
        element={
          <ProtectedRoute>
            <InterviewRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:id"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/:interviewId"
        element={
          <ProtectedRoute>
            <InterviewReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/list"
        element={
          <ProtectedRoute>
            <InterviewList />
          </ProtectedRoute>
        }
      />
      
      {/* 404 重定向 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;

