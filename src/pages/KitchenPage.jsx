import React, { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getKitchenOrders, completeOrderItem } from '../api/kitchenApi';
import toast from 'react-hot-toast';
import KitchenItemCard from '../components/Kitchen/KitchenItemCard';
import { ChefHat, RefreshCw, Flame, LayoutGrid, Clock } from 'lucide-react';

/**
 * Group mảng items theo tableName.
 */
function groupByTable(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.tableName ?? `Đơn #${item.orderId || item.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

const SkeletonCard = () => (
  <div className="animate-pulse flex flex-col gap-4 p-5 rounded-2xl border border-gray-100 bg-white">
    <div className="flex justify-between">
      <div className="h-6 w-2/3 bg-gray-100 rounded-lg" />
      <div className="h-10 w-10 bg-gray-100 rounded-xl" />
    </div>
    <div className="h-16 bg-gray-50 rounded-xl" />
    <div className="h-4 w-1/3 bg-gray-50 rounded" />
    <div className="h-12 bg-gray-50 rounded-xl mt-1" />
  </div>
);

export default function KitchenPage() {
  const queryClient = useQueryClient();

  const { 
    data: rawItems = [], 
    isLoading, 
    isFetching,
    refetch 
  } = useQuery({
    queryKey: ['kitchenOrders'],
    queryFn: getKitchenOrders,
    refetchInterval: 5000,
  });

  const pendingItems = useMemo(() => {
    return rawItems.map(item => ({
      id: item.id,
      orderId: item.id, // we don't have orderId in DTO right now, use it as fallback
      menuItemName: item.menuItemName || 'Unknown',
      quantity: item.quantity,
      note: item.note,
      createdAt: item.createdAt,
      tableName: item.tableName || `Đơn #${item.id}`,
    }));
  }, [rawItems]);

  const groupedByTable = useMemo(() => groupByTable(pendingItems), [pendingItems]);

  const completeMutation = useMutation({
    mutationFn: completeOrderItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('✅ Đã hoàn tất món ăn!');
    },
    onError: (err) => {
      if (err?.status === 409) {
        toast.error("Món này đã được hoàn thành");
      } else {
        toast.error("Lỗi kho: Không đủ nguyên liệu");
      }
    }
  });

  const handleComplete = useCallback(async (orderItemId) => {
    try {
      await completeMutation.mutateAsync(orderItemId);
      return true;
    } catch {
      return false; 
    }
  }, [completeMutation]);

  const isShowSkeleton = isLoading && pendingItems.length === 0;
  const isShowEmpty = !isLoading && pendingItems.length === 0;

  return (
    <div className="flex flex-col h-full bg-[#fafafb] animate-fade-in">
      {/* ── Header ── */}
      <header className="shrink-0 px-8 py-6 bg-white border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gold-600 shadow-lg shadow-gold-600/20 flex items-center justify-center">
              <ChefHat size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Điều Phối Bếp
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  <Clock size={10} /> Real-time
                </span>
                <span className="text-[10px] font-bold text-gold-600 uppercase tracking-widest">
                  KDS Dashboard v1.2
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <Flame size={18} className="text-orange-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-none">Cần nấu</span>
                <span className="text-xl font-black text-gray-900 tabular-nums">
                  {pendingItems.length}
                </span>
              </div>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gold-600 text-white hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
              <span className="text-sm font-bold">Làm mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto p-8">
        {isShowSkeleton && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {isShowEmpty && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center bg-white p-12 rounded-3xl border border-dashed border-gray-200">
            <div className="w-24 h-24 rounded-3xl bg-gray-50 flex items-center justify-center mb-6">
              <ChefHat size={48} className="text-gray-200" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Mọi thứ đã sẵn sàng!</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-sm">
              Hiện tại không có món ăn nào đang chờ xử lý. 
              Các món mới từ quầy POS sẽ tự động xuất hiện ở đây.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-8 flex items-center gap-2 px-8 py-3 rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all font-bold text-sm"
            >
              <RefreshCw size={16} /> Kiểm tra ngay
            </button>
          </div>
        )}

        {pendingItems.length > 0 && (
          <div className="space-y-12">
            {[...groupedByTable.entries()].map(([tableName, items]) => (
              <section key={tableName} className="animate-fade-in">
                <div className="flex items-center gap-4 mb-6">
                  <div className="px-4 py-2 rounded-xl bg-gold-50 border border-gold-100">
                    <span className="text-sm font-black text-gold-700 uppercase tracking-wider">
                      {tableName}
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {items.length} món
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((item) => (
                    <KitchenItemCard
                      key={item.id}
                      item={item}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
