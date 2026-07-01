import { useState, useEffect, useRef } from 'react';
import { Store, ChevronDown, Check } from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import { employeeApi } from '../../api/employeeApi';
import { useAuthStore } from '../../store/useAuthStore';

export default function BranchSelector() {
  const { role } = useAuthStore();
  const { selectedBranchId, selectedBranchName, changeBranch, loading } = useBranchContext();
  const [branches, setBranches] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (role === 'ADMIN') {
      employeeApi.getBranches().then(res => {
        setBranches(res.data || []);
      }).catch(console.error);
    }
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (role !== 'ADMIN') return null;

  const handleSelect = (id, name) => {
    changeBranch(id, name);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        className={`w-full flex items-center justify-between gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-[0.85rem] md:rounded-xl transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {loading ? (
            <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <Store className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span className="text-xs font-bold text-gray-700 truncate" title={selectedBranchName}>
            {loading ? 'Đang chuyển...' : selectedBranchName}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => handleSelect(b.id, b.name)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-50 transition-colors ${selectedBranchId === b.id ? 'bg-amber-50/50' : ''}`}
              title={b.name}
            >
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                {selectedBranchId === b.id && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </div>
              <span className={`text-xs truncate ${selectedBranchId === b.id ? 'font-bold text-amber-700' : 'text-gray-600'}`}>
                {b.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
