import React from 'react';
import { Image as ImageIcon, Utensils, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * MenuItemCard.jsx — Thẻ hiển thị món ăn trong POS
 * 
 * Props:
 * - product: Object chứa thông tin món ăn (id, name, price, thumbnail, ...)
 * - onAdd: Hàm gọi khi bấm thêm vào giỏ
 * - onEdit: Hàm gọi khi Admin bấm Sửa (optional)
 * - onDelete: Hàm gọi khi Admin bấm Xóa (optional)
 * - isAdmin: Boolean xác định quyền hạn để hiện các nút công cụ
 */
const MenuItemCard = ({ 
  product, 
  onAdd, 
  onEdit, 
  onDelete, 
  isAdmin = false,
  isPOSView = false
}) => {
  const formatVND = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

  return (
    <div
      onClick={() => onAdd(product)}
      className={cn(
        'group flex flex-col bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl cursor-pointer select-none min-h-[220px]'
      )}
    >
      {/* Khu vực Hình ảnh (Top half) */}
      <div className="h-44 bg-slate-50 relative overflow-hidden shrink-0">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-200">
            <Utensils size={48} className="opacity-50" />
          </div>
        )}

        {/* Nút công cụ Admin (Edit/Delete) */}
        {isAdmin && !isPOSView && (
          <div className="absolute top-3 left-3 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(product);
              }}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-blue-600 shadow-md hover:bg-white hover:scale-110 transition-all"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Bạn có chắc chắn muốn xóa món này khỏi thực đơn?')) {
                  onDelete?.(product);
                }
              }}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-red-600 shadow-md hover:bg-white hover:scale-110 transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Khu vực Thông tin (Bottom half) */}
      <div className="p-5 flex-1 flex flex-col relative">
        <h4 className="font-black text-gray-900 text-lg line-clamp-2 pr-8 leading-snug mb-2 uppercase tracking-tight">
          {product.name}
        </h4>
        
        <p className="mt-auto font-black text-gold-600 text-xl">
          {formatVND(product.price)}
        </p>

        {/* Nút Thêm vào giỏ (Plus) */}
        <div className="absolute bottom-5 right-5 w-10 h-10 rounded-2xl bg-gold-50 flex items-center justify-center text-gold-600 group-hover:bg-gold-600 group-hover:text-white transition-all shadow-md active:scale-95">
          <Plus size={24} />
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
