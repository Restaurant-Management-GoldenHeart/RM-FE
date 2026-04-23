import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, X, ChevronDown, ChevronUp, Package, 
  ArrowRight, Plus, Eye, ShoppingCart, Info, 
  TrendingDown, Beef, Carrot, Wheat, Droplets, Fish
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- Helpers ---
const fmtNumber = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const getIngredientIcon = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('thịt') || n.includes('bò') || n.includes('heo') || n.includes('gà')) return Beef;
  if (n.includes('rau') || n.includes('cà rốt') || n.includes('hành') || n.includes('tỏi')) return Carrot;
  if (n.includes('bột') || n.includes('gạo') || n.includes('mì')) return Wheat;
  if (n.includes('nước') || n.includes('dầu') || n.includes('sốt')) return Droplets;
  if (n.includes('cá') || n.includes('tôm') || n.includes('hải sản')) return Fish;
  return Package;
};

const getSeverity = (alert) => {
  const qty = Number(alert.currentQuantity ?? alert.quantity ?? 0);
  const min = Number(alert.minStockLevel ?? 0);
  const reorder = Number(alert.reorderLevel ?? 0);

  if (qty === 0) return { 
    type: 'critical', 
    label: 'Hết hàng', 
    color: 'red', 
    bg: 'bg-red-50/50', 
    border: 'border-red-100',
    text: 'text-red-600',
    iconBg: 'bg-red-100 text-red-600'
  };
  if (qty <= min) return { 
    type: 'warning', 
    label: 'Sắp hết', 
    color: 'orange', 
    bg: 'bg-orange-50/50', 
    border: 'border-orange-100',
    text: 'text-orange-600',
    iconBg: 'bg-orange-100 text-orange-600'
  };
  if (qty <= reorder) return { 
    type: 'info', 
    label: 'Cần nhập', 
    color: 'yellow', 
    bg: 'bg-amber-50/50', 
    border: 'border-amber-100',
    text: 'text-amber-600',
    iconBg: 'bg-amber-100 text-amber-600'
  };
  return null;
};

// --- Sub-components ---

function AlertItem({ alert, onAction }) {
  const severity = getSeverity(alert);
  if (!severity) return null;

  const Icon = getIngredientIcon(alert.ingredientName);
  const unit = alert.unitSymbol || '';

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-2xl border ${severity.bg} ${severity.border} transition-all hover:bg-white/80 group`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${severity.iconBg}`}>
        <Icon size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-black text-gray-900 truncate">{alert.ingredientName}</h4>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${severity.border} ${severity.text}`}>
            {severity.label}
          </span>
          {/* Trend Indicator (Mock) */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-red-400" title="Đang giảm nhanh">
            <TrendingDown size={12} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-[11px] font-bold text-gray-500 tabular-nums">
            Tồn hiện tại: <span className={`font-black ${severity.text}`}>{fmtNumber(alert.currentQuantity ?? alert.quantity)} {unit}</span>
          </p>
          <div className="w-1 h-1 rounded-full bg-gray-200" />
          <p className="text-[11px] font-bold text-gray-400 tabular-nums">
            Ngưỡng tối thiểu: <span className="text-gray-600">{fmtNumber(alert.minStockLevel)} {unit}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onAction('details', alert)}
          className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
          title="Xem chi tiết"
        >
          <Eye size={14} />
        </button>
        <button 
          onClick={() => onAction('restock', alert)}
          className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-orange-600 hover:border-orange-100 transition-all shadow-sm"
          title="Nhập thêm hàng"
        >
          <Plus size={14} />
        </button>
        <button 
          onClick={() => onAction('po', alert)}
          className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
          title="Tạo phiếu nhập"
        >
          <ShoppingCart size={14} />
        </button>
      </div>
    </div>
  );
}

export default function LowStockAlert({ alerts = [], onAction }) {
  const [dismissed, setDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [handledIds, setHandledIds] = useState(new Set());

  const activeAlerts = useMemo(() => 
    alerts.filter(a => !handledIds.has(a.inventoryId)),
    [alerts, handledIds]
  );

  if (dismissed || activeAlerts.length === 0) return null;

  const outCount = activeAlerts.filter(a => Number(a.currentQuantity ?? a.quantity) === 0).length;
  const criticalCount = activeAlerts.filter(a => Number(a.currentQuantity ?? a.quantity) <= Number(a.minStockLevel)).length;

  const handleAlertAction = (type, alert) => {
    if (type === 'handled') {
      setHandledIds(prev => new Set([...prev, alert.inventoryId]));
      toast.success('Đã đánh dấu xử lý');
    } else if (onAction) {
      onAction(type, alert);
    } else {
      if (type === 'po') toast.info('Chức năng tạo phiếu nhập đang phát triển');
      if (type === 'restock') toast.info('Sử dụng nút Sửa trong bảng để nhập hàng');
      if (type === 'details') toast.info('Tính năng đang xem chi tiết đang phát triển');
    }
  };

  return (
    <section className="bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden transition-all duration-500">
      {/* Summary Banner */}
      <div 
        className={`px-6 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-orange-50/30' : 'hover:bg-gray-50/50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shadow-sm">
            <AlertTriangle size={18} className="text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Cảnh báo tồn kho</span>
              <span className="px-2 h-5 rounded-lg bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                {activeAlerts.length}
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
              {outCount > 0 ? `${outCount} nguyên liệu đã hết hàng · ` : ''} 
              {criticalCount} mục dưới ngưỡng tối thiểu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="w-8 h-8 rounded-xl bg-white border border-gray-100 text-gray-400 flex items-center justify-center hover:text-orange-500 hover:border-orange-100 transition-all shadow-sm"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
              className="w-8 h-8 rounded-xl bg-white border border-gray-100 text-gray-400 flex items-center justify-center hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible List */}
      <div 
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-6 pb-6 pt-2 space-y-2 border-t border-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Info size={12} /> Dựa trên ngưỡng tối thiểu đã thiết lập
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); setHandledIds(new Set(activeAlerts.map(a => a.inventoryId))); }}
              className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline"
            >
              Đánh dấu tất cả đã xử lý
            </button>
          </div>

          <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
            {activeAlerts.map(alert => (
              <AlertItem 
                key={alert.inventoryId} 
                alert={alert} 
                onAction={handleAlertAction} 
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}