import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, Clock, User, CreditCard, RefreshCw, 
  Loader2, ChevronRight, CheckCircle2, Wallet, Banknote, Hash
} from 'lucide-react';
import { reportApi } from '../../api/reportApi';
import { useBranchContext } from '../../context/BranchContext';
import BillDetailModal from '../pos/BillDetailModal';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v) || 0);

const getPaymentIcon = (methods) => {
  if (!methods || methods.length === 0) return <Banknote size={16} />;
  const m = methods[0].toLowerCase();
  if (m.includes('cash') || m.includes('tiền mặt')) return <Banknote size={16} />;
  if (m.includes('bank') || m.includes('chuyển khoản')) return <CreditCard size={16} />;
  return <Wallet size={16} />;
};

export default function BillHistorySection() {
  const { selectedBranchId } = useBranchContext();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await reportApi.getBillHistory({
        branchId: selectedBranchId,
        size: 10,
        page: 0,
        status: 'PAID'
      });
      const data = res.data?.data?.content || res.data?.content || [];
      setBills(data);
    } catch (err) {
      console.error('Failed to fetch bill history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(() => fetchHistory(true), 30000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const handleBillClick = (billId) => {
    setSelectedBillId(billId);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gold-600 transition-transform hover:rotate-12">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Lịch sử hóa đơn</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Giao dịch mới nhất tại chi nhánh</p>
          </div>
        </div>
        <button 
          onClick={() => fetchHistory()}
          disabled={refreshing}
          className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gold-600 disabled:opacity-50 shadow-sm active:scale-90"
        >
          <RefreshCw className={clsx("w-5 h-5", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-gray-100">
            <Loader2 className="w-10 h-10 animate-spin text-gold-600" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đang đồng bộ giao dịch...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-gray-100">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-gray-50">
               <Receipt className="w-8 h-8 opacity-20" />
            </div>
            <p className="font-black uppercase text-[10px] tracking-widest">Chưa có giao dịch nào được ghi nhận</p>
          </div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {bills.map((bill, index) => (
                <motion.div 
                  key={bill.billId}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ 
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    mass: 1,
                    delay: index * 0.05 
                  }}
                  onClick={() => handleBillClick(bill.billId)}
                  className="group relative bg-white/70 backdrop-blur-md border border-white hover:bg-white/90 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] transition-all cursor-pointer p-4 md:p-5 rounded-[2rem] flex items-center justify-between gap-4 overflow-hidden"
                >
                  {/* Subtle gradient background for hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-gold-50/0 via-gold-50/0 to-gold-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-center gap-4 relative z-10 min-w-0">
                    {/* Leading Icon Area */}
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gold-50 group-hover:text-gold-600 transition-all shrink-0">
                      {getPaymentIcon(bill.paymentMethods)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                          <CheckCircle2 size={10} /> Đã thanh toán
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <Hash size={10} /> {bill.billId}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <Clock size={10} /> {bill.lastPaidAt ? new Date(bill.lastPaidAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <User size={12} />
                        </div>
                        <p className="text-sm font-black text-gray-900 truncate">
                          {bill.customerName || 'Khách lẻ'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Total Amount */}
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tổng tiền</p>
                      <p className="text-lg md:text-xl font-black text-emerald-600 tabular-nums tracking-tighter">
                        {fmt(bill.total)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:bg-gold-600 group-hover:text-white group-hover:border-gold-600 transition-all shadow-sm">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BillDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        billId={selectedBillId}
      />
    </div>
  );
}
