import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Chrome } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 取得原本想訪問的頁面，如果沒有則導向 dashboard
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || '登入失敗，請重試');
      console.error('登入錯誤:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white-smoke to-accent/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo 和標題 */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gunmetal mb-2">CareerSim</h1>
          <p className="text-gunmetal/70">AI 模擬面試平台</p>
        </div>

        {/* 登入卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-scale-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gunmetal mb-2">歡迎回來</h2>
            <p className="text-gunmetal/70">登入以開始您的面試練習之旅</p>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-slide-up">
              {error}
            </div>
          )}

          {/* Google 登入按鈕 */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gunmetal px-6 py-4 rounded-xl font-medium hover:border-primary hover:bg-primary/5 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-gunmetal border-t-transparent rounded-full animate-spin"></div>
                <span>登入中...</span>
              </>
            ) : (
              <>
                <Chrome className="w-5 h-5" />
                <span>使用 Google 帳號登入</span>
              </>
            )}
          </button>

          {/* 說明文字 */}
          <p className="mt-6 text-center text-sm text-gunmetal/60">
            登入即表示您同意我們的服務條款和隱私政策
          </p>
        </div>

        {/* 特色說明 */}
        <div className="mt-8 grid grid-cols-1 gap-4 text-center animate-fade-in">
          <div className="text-sm text-gunmetal/70">
            <span className="font-medium">✨</span> 真實面試場景模擬
          </div>
          <div className="text-sm text-gunmetal/70">
            <span className="font-medium">📊</span> 即時表現分析與回饋
          </div>
          <div className="text-sm text-gunmetal/70">
            <span className="font-medium">🎯</span> 個人化練習建議
          </div>
        </div>
      </div>
    </div>
  );
}

