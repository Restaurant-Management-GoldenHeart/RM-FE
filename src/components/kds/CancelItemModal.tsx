import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  AlertCircle, 
  ChevronRight, 
  MessageSquare, 
  CheckCircle2 
} from 'lucide-react';

interface CancelItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string | number;
    name: string;
    quantity: number;
    [key: string]: any;
  } | null;
  onSubmit: (itemId: string | number, reason: string) => void;
}

const CANCEL_REASONS = [
  "Hết nguyên liệu",
  "Lỗi chế biến",
  "Khách đổi ý",
  "Khác"
];

export default function CancelItemModal({ isOpen, onClose, item, onSubmit }: CancelItemModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea khi chọn "Khác"
  useEffect(() => {
    if (selectedReason === 'Khác' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedReason]);

  // Reset form khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedReason('');
      setCustomReason('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Khác' ? customReason : selectedReason;
    if (!finalReason.trim()) return;
    
    onSubmit(item.id, finalReason);
    onClose();
  };

  const isFormValid = selectedReason && (selectedReason !== 'Khác' || customReason.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl shadow-black/20 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-50 p-6 flex items-start justify-between border-b border-red-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">Hủy món?</h2>
              <p className="text-sm font-bold text-red-600 uppercase tracking-widest mt-0.5">
                {item.quantity}x {item.name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400 hover:text-red-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Vui lòng chọn lý do hủy:</p>
          
          <div className="grid grid-cols-2 gap-3">
            {CANCEL_REASONS.map((reason) => {
              const isActive = selectedReason === reason;
              return (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`
                    flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95
                    ${isActive 
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-md shadow-red-500/10' 
                      : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'}
                  `}
                >
                  <span className="font-bold text-sm tracking-tight">{reason}</span>
                  {isActive && <CheckCircle2 className="w-5 h-5 text-red-500" />}
                </button>
              );
            })}
          </div>

          {/* Textarea for Details or "Khác" option */}
          <div className={`transition-all duration-300 overflow-hidden ${selectedReason ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="relative group">
              <div className="absolute top-4 left-4 text-gray-400 group-focus-within:text-red-500 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <textarea
                ref={textareaRef}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={selectedReason === 'Khác' ? "Nhập chi tiết lý do..." : "Ghi chú thêm (không bắt buộc)..."}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 pl-12 text-sm font-medium focus:border-red-500 focus:bg-white outline-none transition-all min-h-[120px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-sm font-black text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors"
          >
            Quay lại
          </button>
          <button
            disabled={!isFormValid}
            onClick={handleConfirm}
            className={`
              flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95
              ${isFormValid 
                ? 'bg-red-600 text-white font-black shadow-lg shadow-red-600/30 hover:bg-red-700' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed font-black'}
            `}
          >
            <span>XÁC NHẬN HỦY</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
