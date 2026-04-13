import React, { useState } from 'react';
import { X, AlertCircle, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';

const QUICK_REASONS = [
  'Khách đổi ý / Gọi nhầm',
  'Hết nguyên liệu chế biến',
  'Món lên chậm / Khách không đợi được',
  'Nhập sai thông tin (Số lượng/Ghi chú)',
  'Lỗi bếp / Chế biến hỏng',
];

/**
 * CancelReasonModal — Yêu cầu nhân viên nhập lý do trước khi huỷ món.
 */
const CancelReasonModal = ({ isOpen, onClose, onConfirm, itemName, isForce = false }) => {
  const [reason, setReason] = useState('');
  const [selectedQuick, setSelectedQuick] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalReason = selectedQuick || reason || 'Không có lý do cụ thể';
    onConfirm(isForce ? `[FORCE] ${finalReason}` : finalReason);
    setReason('');
    setSelectedQuick('');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-2xl" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isForce ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 leading-none">Huỷ món ăn</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Món: {itemName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><X size={20} /></button>
        </div>

        <div className="space-y-6">
          {/* Quick Reasons */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Lý do nhanh</label>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedQuick(r)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                    selectedQuick === r ? "bg-gray-900 border-gray-900 text-white shadow-lg" : "bg-white border-gray-100 text-gray-600 hover:border-gray-300"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Lý do khác</label>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-4 text-gray-300" size={16} />
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value) setSelectedQuick('');
                }}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-gold-300 transition-all min-h-[100px] resize-none"
                placeholder="Nhập lý do chi tiết..."
              />
            </div>
          </div>

          {isForce && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3">
              <AlertCircle className="text-red-600 shrink-0" size={18} />
              <p className="text-[10px] font-bold text-red-700 leading-relaxed uppercase tracking-tight">
                CẢNH BÁO: Món này đang được chế biến. Việc huỷ cưỡng bức sẽ được ghi vào nhật ký vi phạm.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-white border border-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedQuick && !reason}
              className={cn(
                "flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all",
                isForce ? "bg-red-600 shadow-red-600/20" : "bg-gray-900 shadow-gray-900/20",
                (!selectedQuick && !reason) && "opacity-50 pointer-events-none"
              )}
            >
              Xác nhận huỷ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelReasonModal;
