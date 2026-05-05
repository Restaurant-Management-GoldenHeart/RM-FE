import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, UserPlus, Star, Phone, Loader2 } from 'lucide-react';
import { customerApi } from '../../api/customerApi';
import { useOrderStore } from '../../store/useOrderStore';
import { cn } from '../../utils/cn';
import QuickCustomerModal from './QuickCustomerModal';

/**
 * CustomerSelector — Component tìm kiếm và gán khách hàng vào đơn hàng.
 * Tích hợp tìm kiếm real-time và tạo nhanh khách hàng.
 *
 * @param {number} orderId - ID đơn hàng hiện tại
 * @param {object} selectedCustomer - Khách hàng đã được gán (nếu có)
 */
const CustomerSelector = ({ orderId, selectedCustomer }) => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const assignCustomer = useOrderStore(s => s.assignCustomerToOrder);
  const dropdownRef = useRef(null);

  // Xử lý tìm kiếm khi keyword thay đổi (Debounce nhẹ)
  useEffect(() => {
    if (!keyword.trim() || keyword.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await customerApi.lookupCustomers(keyword);
        setResults(response.data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('[CustomerSelector] Lookup error:', err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [keyword]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (customer) => {
    await assignCustomer(orderId, customer.id);
    setKeyword('');
    setShowDropdown(false);
  };

  const handleRemove = async () => {
    await assignCustomer(orderId, null);
  };

  // Nếu đã chọn khách hàng -> Hiển thị thẻ thông tin khách hàng
  if (selectedCustomer) {
    return (
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
            <User size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm text-gray-900 leading-tight">{selectedCustomer.name}</h4>
              {selectedCustomer.tierName && (
                <span className="px-1.5 py-0.5 bg-gold-100 text-gold-700 text-[8px] font-black rounded uppercase flex items-center gap-0.5">
                  <Star size={8} fill="currentColor" /> {selectedCustomer.tierName}
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{selectedCustomer.phone}</p>
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all"
          title="Gỡ khách hàng"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Ô tìm kiếm */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => keyword.length >= 2 && setShowDropdown(true)}
          placeholder="Tìm khách hàng (Tên/SĐT)..."
          className="w-full bg-gray-50 border border-gray-100 py-3 pl-11 pr-12 rounded-2xl text-[11px] font-bold text-gray-900 outline-none focus:border-gold-300 transition-all placeholder:text-gray-300"
        />
        {loading ? (
          <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 animate-spin" />
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all"
            title="Thêm khách hàng mới"
          >
            <UserPlus size={14} />
          </button>
        )}
      </div>

      {/* Kết quả tìm kiếm (Dropdown) */}
      {showDropdown && (results.length > 0 || keyword.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[240px] overflow-y-auto no-scrollbar">
            {results.length > 0 ? (
              results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-all border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                      <User size={14} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-900">{c.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                        <Phone size={8} /> {c.phone}
                      </p>
                    </div>
                  </div>
                  {c.tierName && (
                    <span className="px-1.5 py-0.5 bg-gold-50 text-gold-600 text-[8px] font-black rounded uppercase">
                      {c.tierName}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Không tìm thấy khách hàng</p>
                <button
                  onClick={() => {
                    setIsModalOpen(true);
                    setShowDropdown(false);
                  }}
                  className="mt-2 text-[10px] font-black text-emerald-600 hover:underline"
                >
                  Tạo mới ngay?
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal tạo nhanh */}
      <QuickCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(customer) => handleSelect(customer)}
      />
    </div>
  );
};

export default CustomerSelector;
