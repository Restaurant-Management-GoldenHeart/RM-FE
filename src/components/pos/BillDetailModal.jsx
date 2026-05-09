import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Receipt, User, MapPin, Calendar, CreditCard, 
  ShoppingBag, Download, Loader2, AlertCircle, Printer
} from 'lucide-react';
import { reportApi } from '../../api/reportApi';
import { orderApi } from '../../api/posApi';
import { clsx } from 'clsx';

const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v) || 0);

export default function BillDetailModal({ isOpen, onClose, billId }) {
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && billId) {
      fetchData();
    }
  }, [isOpen, billId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const billRes = await reportApi.getBillDetail(billId);
      const billData = billRes.data || billRes; 
      setBill(billData);

      if (billData?.orderId) {
        const orderRes = await orderApi.getOrder(billData.orderId);
        const oData = orderRes.data || orderRes;
        setOrder(oData);
      }
    } catch (err) {
      console.error('Failed to fetch bill detail:', err);
      setError('Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const displayTime = order?.closedAt || bill?.lastPaidAt;
  const itemsList = order?.orderItems || order?.items || [];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white/90 backdrop-blur-xl w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-white/20"
        >
          {/* Header */}
          <div className="shrink-0 p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gold-50/50 to-white/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gold-600 flex items-center justify-center shadow-lg shadow-gold-600/20">
                <Receipt className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Chi tiết Hóa đơn</h3>
                <p className="text-xs text-gold-600 font-bold uppercase tracking-widest mt-1">
                  Mã số: #{billId}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-gray-100 rounded-2xl transition-all border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-900"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin text-gold-600" />
                <p className="text-[10px] font-black uppercase tracking-widest">Đang tải dữ liệu hóa đơn...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center text-red-500">
                <AlertCircle className="w-12 h-12" />
                <p className="font-bold">{error}</p>
                <button onClick={fetchData} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase hover:bg-red-100">Thử lại</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <InfoItem icon={User} label="Khách hàng" value={bill.customerName || 'Khách lẻ'} />
                    <InfoItem icon={MapPin} label="Bàn / Khu vực" value={bill.tableName || 'Đơn mang về'} />
                  </div>
                  <div className="space-y-4">
                    <InfoItem icon={Calendar} label="Thời gian" value={displayTime ? new Date(displayTime).toLocaleString('vi-VN') : '--:--'} />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Trạng thái</p>
                        <span className={clsx(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                          bill.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {bill.status === 'PAID' ? 'Đã thanh toán' : 'Chưa hoàn tất'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Danh sách món ăn</p>
                  <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white/50">
                      <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                          <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="py-4 px-6 border-b border-gray-100">Món ăn</th>
                            <th className="py-4 px-4 text-center border-b border-gray-100">Số lượng</th>
                            <th className="py-4 px-6 text-right border-b border-gray-100">Đơn giá</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {itemsList.length > 0 ? (
                            itemsList.map((item, idx) => (
                              <tr key={idx} className="group hover:bg-white transition-all">
                                <td className="py-4 px-6">
                                  <p className="text-sm font-bold text-gray-900">{item.menuItemName || item.itemName}</p>
                                  {item.note && <p className="text-[10px] text-amber-600 font-medium italic mt-0.5">Note: {item.note}</p>}
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className="text-sm font-black text-gray-500 tabular-nums">x{item.quantity}</span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <span className="text-sm font-black text-gray-900 tabular-nums">{fmt(item.price)}</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-16 text-center">
                                <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Không tìm thấy món ăn</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed border-gray-200">
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-3">
                      <SummaryLine label="Tạm tính" value={fmt(bill.subtotal)} />
                      <SummaryLine label="Thuế (VAT)" value={fmt(bill.tax)} />
                      <SummaryLine label="Giảm giá" value={`-${fmt(bill.discount)}`} isDiscount />
                      <div className="h-px bg-gray-100 my-4" />
                      <div className="flex justify-between items-center bg-gold-50/30 p-4 rounded-2xl border border-gold-100/50">
                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Tổng thanh toán</span>
                        <span className="text-2xl font-black text-gold-600 tabular-nums">{fmt(bill.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Phương thức thanh toán</p>
                   <div className="flex flex-wrap gap-2">
                     {bill.payments?.map((p, i) => (
                       <div key={i} className="px-4 py-2 bg-white border border-gray-100 rounded-xl flex items-center gap-3 shadow-sm">
                         <div className="w-2 h-2 rounded-full bg-emerald-500" />
                         <span className="text-xs font-bold text-gray-700">{p.method}</span>
                         <span className="text-xs font-black text-gray-900">{fmt(p.amount)}</span>
                       </div>
                     ))}
                   </div>
                </div>
              </>
            )}
          </div>

          <div className="shrink-0 p-8 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm">
              <Download className="w-4 h-4" /> Xuất PDF
            </button>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm">
                <Printer className="w-4 h-4" /> In hóa đơn
              </button>
              <button 
                onClick={onClose}
                className="px-10 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center text-gold-600">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, isDiscount }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
      <span className={clsx("text-sm font-black tabular-nums", isDiscount ? "text-red-500" : "text-gray-900")}>
        {value}
      </span>
    </div>
  );
}
