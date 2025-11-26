import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

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

  if (!currentUser) {
    // 重定向到登入頁面，並保存原本想訪問的頁面
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

