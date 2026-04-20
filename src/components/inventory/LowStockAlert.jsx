import { AlertTriangle } from 'lucide-react';

export default function LowStockAlert({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 shadow-lg shadow-red-900/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
        </div>
        <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wide">
          Cảnh Báo Tồn Kho Thấp ({alerts.length})
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {alerts.map((alert) => (
          <div key={alert.inventoryId} className="bg-[#12090a] border border-red-900/30 rounded-lg p-3">
            <p className="text-amber-100/90 font-medium text-sm truncate" title={alert.itemName}>
              {alert.itemName}
            </p>
            <div className="mt-2 flex items-baseline justify-between text-xs">
              <span className="text-red-400 font-bold">
                {alert.currentQuantity} {alert.unitName}
              </span>
              <span className="text-amber-900/60">
                Min: {alert.minStockLevel}
              </span>
            </div>
            <p className="mt-1 text-red-500/80 text-[10px] leading-tight">
              {alert.alertMessage}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
