import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChefHat, Filter, History, Volume2, VolumeX, RefreshCw, 
  Terminal, Search, ChevronRight, LayoutPanelTop
} from 'lucide-react';
import { useOrderStore } from '../store/useOrderStore';
import { usePosStore } from '../store/usePosStore';
import { transformOrdersToKdsItems, groupKdsItems, filterByKitchenType } from '../utils/kdsTransform';
import KdsColumn from '../components/kds/KdsColumn';
import KdsCard from '../components/kds/KdsCard';

/**
 * Enterprise KDS Board
 * Quản lý điều phối món ăn toàn bộ nhà hàng.
 */
export default function KdsBoard() {
  const orders = useOrderStore(state => state.orders);
  const menuItems = usePosStore(state => state.menuItems);
  const auditLogs = useOrderStore(state => state.auditLogs);
  const resyncAll = useOrderStore(state => state.resyncAll);

  const [kitchenType, setKitchenType] = useState('KITCHEN'); // 'KITCHEN' | 'BAR'
  const [showLogs, setShowLogs] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // ─── 1. Transformation & Filtering ───
  const kdsItems = useMemo(() => transformOrdersToKdsItems(orders, menuItems), [orders, menuItems]);
  const filteredItems = useMemo(() => filterByKitchenType(kdsItems, kitchenType), [kdsItems, kitchenType]);
  
  const waitingItems = useMemo(() => filteredItems.filter(i => i.kdsStatus === 'WAITING'), [filteredItems]);
  const cookingItems = useMemo(() => filteredItems.filter(i => i.kdsStatus === 'COOKING'), [filteredItems]);
  const doneItems    = useMemo(() => filteredItems.filter(i => i.kdsStatus === 'DONE'), [filteredItems]);
  const cancelledItems = useMemo(() => filteredItems.filter(i => i.kdsStatus === 'CANCELLED'), [filteredItems]);

  const groupedWaiting = useMemo(() => groupKdsItems(waitingItems), [waitingItems]);
  const groupedCooking = useMemo(() => groupKdsItems(cookingItems), [cookingItems]);
  const groupedDone    = useMemo(() => groupKdsItems(doneItems), [doneItems]);
  const groupedCancelled = useMemo(() => groupKdsItems(cancelledItems), [cancelledItems]);

  // ─── 2. Sound Logic (Debounced Beep) ───
  const [lastItemCount, setLastItemCount] = useState(waitingItems.length);
  useEffect(() => {
    if (soundEnabled && waitingItems.length > lastItemCount) {
      // Giả lập tiếng bíp (có thể thay bằng URL mp3 thực tế)
      const beep = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
      beep.play().catch(e => console.warn('Autoplay prevented', e));
    }
    setLastItemCount(waitingItems.length);
  }, [waitingItems.length, soundEnabled, lastItemCount]);

  // ─── 3. Resync Logic ───
  useEffect(() => {
    const handleFocus = () => resyncAll();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [resyncAll]);

  // Tự động Polling mỗi 10s nếu không có WebSocket
  useEffect(() => {
    const interval = setInterval(resyncAll, 10000);
    return () => clearInterval(interval);
  }, [resyncAll]);

  return (
    <div className="flex flex-col h-screen bg-[#fafafb] text-gray-900 overflow-hidden font-sans">
      
      {/* ── Header ── */}
      <header className="shrink-0 h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white shadow-xl shadow-gray-900/20">
              <ChefHat size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase">Enterprise KDS</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Real-time Coordination System
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-100 mx-2" />

          {/* Kitchen Type Filter */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button 
              onClick={() => setKitchenType('KITCHEN')}
              className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${kitchenType === 'KITCHEN' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Căn Bếp
            </button>
            <button 
              onClick={() => setKitchenType('BAR')}
              className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${kitchenType === 'BAR' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Quầy Bar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${soundEnabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span className="text-xs font-black uppercase tracking-wider">{soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
          </button>

          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10"
          >
            <History size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Lịch sử</span>
            {auditLogs.length > 0 && (
              <span className="w-5 h-5 bg-gold-600 text-[10px] flex items-center justify-center rounded-full border border-gray-900">
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Kanban Area ── */}
      <main className="flex-1 overflow-x-auto p-8 flex gap-8 custom-scrollbar">
        <KdsColumn title="Chờ nấu" count={waitingItems.length} color="border-orange-500">
          {Object.entries(groupedWaiting).map(([table, orders]) => (
            <KdsCard key={table} tableNumber={table} orders={orders} kdsStatus="WAITING" />
          ))}
        </KdsColumn>

        <KdsColumn title="Đang nấu" count={cookingItems.length} color="border-blue-500">
          {Object.entries(groupedCooking).map(([table, orders]) => (
            <KdsCard key={table} tableNumber={table} orders={orders} kdsStatus="COOKING" />
          ))}
        </KdsColumn>

        <KdsColumn title="Hoàn tất" count={doneItems.length} color="border-green-500">
          {Object.entries(groupedDone).map(([table, orders]) => (
            <KdsCard key={table} tableNumber={table} orders={orders} kdsStatus="DONE" />
          ))}
        </KdsColumn>

        <KdsColumn title="Đã huỷ" count={cancelledItems.length} color="border-red-500">
          {Object.entries(groupedCancelled).map(([table, orders]) => (
            <KdsCard key={table} tableNumber={table} orders={orders} kdsStatus="CANCELLED" />
          ))}
        </KdsColumn>
      </main>

      {/* ── Audit Logs Drawer ── */}
      {showLogs && (
        <div className="absolute top-20 right-0 bottom-0 w-96 bg-white border-l border-gray-100 shadow-2xl z-40 flex flex-col animate-slide-in-right">
          <div className="shrink-0 p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Terminal size={20} className="text-gold-600" />
              Traceability Logs
            </h2>
            <button 
              onClick={() => setShowLogs(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No actions captured yet</p>
              </div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white bg-gray-900 px-2 py-0.5 rounded leading-none">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {new Date(log.at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-700">
                    User <span className="text-gold-600">{log.by}</span> updated Item #{log.itemId.slice(0, 8)}
                  </p>
                  <p className="text-[9px] text-gray-400 font-mono break-all leading-tight">
                    REQ-ID: {log.requestId}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
