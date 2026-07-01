import React, { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export default function PremiumConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Xác nhận xóa',
    message = 'Bạn có chắc chắn muốn xóa?',
    highlightText = '',
    note = '',
    confirmText = 'Xác nhận xóa',
    cancelText = 'Hủy',
    isLoading = false
}) {
    // Dùng state để render animation mượt mà
    const [show, setShow] = useState(false);
    const [render, setRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRender(true);
            requestAnimationFrame(() => setShow(true));
        } else {
            setShow(false);
            const timer = setTimeout(() => setRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!render) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            {/* Overlay: Nền đen mờ bg-black/40 backdrop-blur-sm với animation fade-in */}
            <div
                onClick={!isLoading ? onClose : undefined}
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            {/* Card Design: Khối Modal màu trắng, bo góc cực sâu, shadow lớn, hiệu ứng zoom-in */}
            <div
                className={`relative bg-white w-full max-w-[420px] rounded-[2.5rem] shadow-2xl pointer-events-auto p-8 flex flex-col items-center text-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                    }`}
            >
                <button
                    onClick={!isLoading ? onClose : undefined}
                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Icon cảnh báo */}
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6 shrink-0 ring-8 ring-red-50/50">
                    <Trash2 size={28} strokeWidth={2.5} />
                </div>

                {/* Typography */}
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">
                    {title}
                </h3>

                <p className="text-[15px] font-medium text-gray-500 leading-relaxed max-w-[280px]">
                    {message}{' '}
                    {highlightText && (
                        <span className="font-bold text-red-500">"{highlightText}"</span>
                    )}
                    ?
                </p>

                {note && (
                    <div className="mt-4 p-3 bg-orange-50/50 border border-orange-100/50 rounded-2xl">
                        <p className="text-xs font-semibold text-orange-600 leading-relaxed">
                            <AlertTriangle size={12} className="inline mr-1" />
                            {note}
                        </p>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex items-center gap-3 w-full mt-8">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 h-12 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm tracking-wide hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 h-12 bg-red-500 text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
