import React, { useState } from 'react';
import { usePosStore } from '../store/usePosStore';
import { Lock, User, Key, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

const LoginOverlay = () => {
  const { login, loading, accessToken } = usePosStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username || !password) {
      setErrorLocal('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }
    const success = await login(username, password);
    if (!success) {
      setErrorLocal('Tài khoản hoặc mật khẩu không chính xác');
    }
  };

  const handleQuickLogin = () => {
    setUsername('admin');
    setPassword('Admin123');
    // We'll call login directly for convenience
    login('admin', 'Admin123');
  };

  if (accessToken) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 transform animate-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Hệ thống GoldenHeart</h2>
          <p className="text-slate-500 text-sm mt-1">Vui lòng đăng nhập để truy cập POS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Tài khoản</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Mật khẩu</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
              />
            </div>
          </div>

          {errorLocal && <p className="text-xs text-red-500 px-1 font-medium italic">*{errorLocal}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-200 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Đăng nhập hệ thống <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex flex-col gap-3">
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Chế độ thử nghiệm (Developer Only)</p>
            <button
              onClick={handleQuickLogin}
              disabled={loading}
              className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
            >
              🚀 Quick Login (Admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginOverlay;
