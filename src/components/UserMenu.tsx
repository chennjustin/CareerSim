import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, ChevronDown } from 'lucide-react';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  if (!currentUser) return null;

  // 取得用戶頭像或初始字母
  const getAvatar = () => {
    if (currentUser.photoURL) {
      return (
        <img
          src={currentUser.photoURL}
          alt={currentUser.displayName || 'User'}
          className="w-8 h-8 rounded-full"
        />
      );
    }
    const initial = (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase();
    return (
      <div className="w-8 h-8 rounded-full bg-gunmetal text-white flex items-center justify-center font-semibold text-sm">
        {initial}
      </div>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white-smoke transition-smooth"
      >
        {getAvatar()}
        <span className="hidden md:block text-sm font-medium text-gunmetal">
          {currentUser.displayName || currentUser.email}
        </span>
        <ChevronDown className={`w-4 h-4 text-gunmetal transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-md p-2 w-56 z-50 animate-scale-in border border-white-smoke">
          {/* 用戶資訊 */}
          <div className="px-4 py-3 border-b border-white-smoke">
            <div className="flex items-center gap-3">
              {getAvatar()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gunmetal truncate">
                  {currentUser.displayName || 'User'}
                </p>
                <p className="text-xs text-gunmetal/60 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
          </div>

          {/* 選單項目 */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gunmetal hover:bg-white-smoke rounded-lg transition-smooth text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>登出</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

