import React, { useState, useEffect } from 'react';
import { X, Mail, Smartphone, ShieldCheck, Key, Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authApi } from '../../api/authApi';

const STEPS = {
    IDENTIFY: 'IDENTIFY',
    VERIFY: 'VERIFY',
    RESET: 'RESET',
    SUCCESS: 'SUCCESS',
};

const CHANNELS = {
    EMAIL: 'EMAIL',
    SMS: 'SMS',
};

export default function ForgotPasswordModal({ isOpen, onClose }) {
    const [step, setStep] = useState(STEPS.IDENTIFY);
    const [channel, setChannel] = useState(CHANNELS.EMAIL);
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Animation states
    const [show, setShow] = useState(false);
    const [render, setRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRender(true);
            requestAnimationFrame(() => setShow(true));
            // Reset state when opening
            setStep(STEPS.IDENTIFY);
            setIdentifier('');
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
            setResetToken('');
        } else {
            setShow(false);
            const timer = setTimeout(() => setRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!render) return null;

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!identifier.trim()) {
            toast.error('Vui lòng nhập email hoặc số điện thoại');
            return;
        }

        setIsLoading(true);
        try {
            await authApi.requestPasswordRecoveryOtp({ channel, identifier: identifier.trim() });
            toast.success(`Mã OTP đã được gửi qua ${channel === CHANNELS.EMAIL ? 'Email' : 'SMS'}`);
            setStep(STEPS.VERIFY);
        } catch (error) {
            console.error('Request OTP Error:', error);
            toast.error(error.message || 'Không thể gửi OTP. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp.trim()) {
            toast.error('Vui lòng nhập mã OTP');
            return;
        }

        setIsLoading(true);
        try {
            const res = await authApi.verifyPasswordRecoveryOtp({
                channel,
                identifier: identifier.trim(),
                otp: otp.trim()
            });

            // Corrected: res is the ApiResponse object, the actual data is in res.data
            if (res && res.data && res.data.resetToken) {
                setResetToken(res.data.resetToken);
                setStep(STEPS.RESET);
                toast.success('Xác thực OTP thành công');
            } else {
                throw new Error('Không nhận được mã xác nhận từ hệ thống');
            }
        } catch (error) {
            console.error('Verify OTP Error:', error);
            toast.error(error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            toast.error('Mật khẩu phải có ít nhất 8 ký tự');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        setIsLoading(true);
        try {
            await authApi.resetPassword({ resetToken, newPassword });
            setStep(STEPS.SUCCESS);
            toast.success('Đổi mật khẩu thành công');
        } catch (error) {
            console.error('Reset Password Error:', error);
            toast.error(error.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderStepIdentify = () => (
        <form onSubmit={handleRequestOtp} className="space-y-6 w-full">
            <div className="flex bg-white/[0.03] p-1 rounded-2xl border border-amber-900/20">
                <button
                    type="button"
                    onClick={() => setChannel(CHANNELS.EMAIL)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${channel === CHANNELS.EMAIL ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-amber-100/50 hover:text-amber-100'
                        }`}
                >
                    <Mail size={16} /> Email
                </button>
                <button
                    type="button"
                    onClick={() => setChannel(CHANNELS.SMS)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${channel === CHANNELS.SMS ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-amber-100/50 hover:text-amber-100'
                        }`}
                >
                    <Smartphone size={16} /> SMS
                </button>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest ml-1">
                    {channel === CHANNELS.EMAIL ? 'Địa chỉ Email' : 'Số điện thoại'}
                </label>
                <div className="relative">
                    <input
                        type={channel === CHANNELS.EMAIL ? 'email' : 'text'}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={channel === CHANNELS.EMAIL ? 'example@gmail.com' : '0901xxxxxx'}
                        className="w-full bg-white/[0.03] border border-amber-900/30 focus:border-amber-500/50 outline-none rounded-2xl px-5 py-3.5 text-amber-100 placeholder-amber-900/40 transition-all focus:ring-1 focus:ring-amber-500/20"
                        required
                    />
                    {channel === CHANNELS.EMAIL ? (
                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-900/40" size={18} />
                    ) : (
                        <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-900/40" size={18} />
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Gửi mã OTP <ArrowRight size={18} /></>}
            </button>
        </form>
    );

    const renderStepVerify = () => (
        <form onSubmit={handleVerifyOtp} className="space-y-6 w-full text-center">
            <div className="space-y-2">
                <p className="text-amber-100/70 text-sm">
                    Mã xác thực đã được gửi tới <br />
                    <span className="text-amber-400 font-semibold">{identifier}</span>
                </p>
                <div className="pt-4">
                    <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Mã OTP"
                        className="w-full bg-white/[0.03] border border-amber-900/30 focus:border-amber-500/50 outline-none rounded-2xl px-5 py-4 text-center text-2xl font-bold tracking-[1em] text-amber-400 placeholder-amber-900/20 transition-all"
                        maxLength={8}
                        required
                    />
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(STEPS.IDENTIFY)}
                    className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] text-amber-100/60 font-semibold py-4 rounded-2xl border border-amber-900/20 transition-all"
                >
                    Quay lại
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Xác thực OTP'}
                </button>
            </div>

            <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isLoading}
                className="text-amber-500/60 hover:text-amber-500 text-xs font-medium underline underline-offset-4"
            >
                Gửi lại mã OTP
            </button>
        </form>
    );

    const renderStepReset = () => (
        <form onSubmit={handleResetPassword} className="space-y-5 w-full">
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                    <div className="relative">
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-white/[0.03] border border-amber-900/30 focus:border-amber-500/50 outline-none rounded-2xl px-5 py-3.5 text-amber-100 placeholder-amber-900/40 transition-all"
                            required
                        />
                        <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-900/40" size={18} />
                    </div>
                    <p className="text-[10px] text-amber-500/60 mt-1.5 ml-1 leading-relaxed">
                        * Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và chữ số.
                    </p>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                    <div className="relative">
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-white/[0.03] border border-amber-900/30 focus:border-amber-500/50 outline-none rounded-2xl px-5 py-3.5 text-amber-100 placeholder-amber-900/40 transition-all"
                            required
                        />
                        <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-900/40" size={18} />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Cập nhật mật khẩu'}
            </button>
        </form>
    );

    const renderStepSuccess = () => (
        <div className="text-center space-y-6 w-full">
            <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                    <CheckCircle2 size={48} />
                </div>
            </div>
            <div className="space-y-2">
                <h4 className="text-xl font-bold text-white">Thành công!</h4>
                <p className="text-amber-100/60 text-sm leading-relaxed">
                    Mật khẩu của bạn đã được thay đổi. <br />
                    Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.
                </p>
            </div>
            <button
                onClick={onClose}
                className="w-full bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold py-4 rounded-2xl border border-white/10 transition-all"
            >
                Quay lại Đăng nhập
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={!isLoading ? onClose : undefined}
            />

            <div
                className={`relative bg-[#0F0A05] w-full max-w-[440px] rounded-[2.5rem] border border-amber-900/30 shadow-2xl p-8 md:p-10 flex flex-col items-center transition-all duration-300 ease-out ${show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                    }`}
            >
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 text-amber-900/40 hover:text-amber-400 transition-colors"
                    disabled={isLoading}
                >
                    <X size={24} />
                </button>

                {/* Header Icon */}
                {step !== STEPS.SUCCESS && (
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-700 shadow-xl shadow-amber-900/40 flex items-center justify-center text-white mb-8">
                        <ShieldCheck size={36} strokeWidth={1.5} />
                    </div>
                )}

                <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-amber-100 tracking-tight">
                        {step === STEPS.IDENTIFY && 'Quên mật khẩu?'}
                        {step === STEPS.VERIFY && 'Xác thực OTP'}
                        {step === STEPS.RESET && 'Đặt lại mật khẩu'}
                    </h3>
                    {step === STEPS.IDENTIFY && (
                        <p className="text-amber-900/60 text-sm mt-2">Đừng lo lắng, hãy nhập thông tin của bạn</p>
                    )}
                </div>

                {step === STEPS.IDENTIFY && renderStepIdentify()}
                {step === STEPS.VERIFY && renderStepVerify()}
                {step === STEPS.RESET && renderStepReset()}
                {step === STEPS.SUCCESS && renderStepSuccess()}
            </div>
        </div>
    );
}
