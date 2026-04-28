import { useState, useEffect } from 'react';
import { Store, MapPin, CheckCircle2 } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';
import { employeeApi } from '../api/employeeApi';
import { useAuthStore } from '../store/useAuthStore';

export default function BranchSelectionModal() {
  const { role } = useAuthStore();
  const { selectedBranchId, changeBranch, isInitialized } = useBranchContext();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    // Only fetch if not ADMIN and no branch is selected yet
    if (role !== 'ADMIN' && !selectedBranchId) {
      const fetchBranches = async () => {
        try {
          const res = await employeeApi.getBranches();
          setBranches(res.data || []);
        } catch (error) {
          console.error('Failed to fetch branches:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchBranches();
    }
  }, [role, selectedBranchId]);

  if (role === 'ADMIN' || selectedBranchId || !isInitialized) {
    return null; // Don't show for Admin or if already selected
  }

  const handleConfirm = () => {
    if (!selectedId) return;
    const branch = branches.find(b => b.id === selectedId);
    if (branch) {
      changeBranch(branch.id, branch.name);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-8 pb-6 border-b border-gray-100 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-500">
            <Store size={32} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bạn đang làm việc tại chi nhánh nào hôm nay?
          </h2>
          <p className="text-gray-500 mt-2">
            Vui lòng chọn chi nhánh làm việc hiện tại để đồng bộ dữ liệu
          </p>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((branch) => {
                const isSelected = selectedId === branch.id;
                return (
                  <button
                    key={branch.id}
                    onClick={() => setSelectedId(branch.id)}
                    className={`
                      relative flex flex-col items-start p-5 rounded-2xl text-left transition-all duration-200 border-2 outline-none
                      ${isSelected 
                        ? 'bg-amber-50/50 border-amber-500 shadow-md shadow-amber-500/10' 
                        : 'bg-white border-transparent shadow-sm hover:border-amber-200 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between w-full mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${isSelected ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-400'}
                        `}>
                          <Store size={20} />
                        </div>
                        <h3 className={`font-bold text-base ${isSelected ? 'text-amber-900' : 'text-gray-900'}`}>
                          {branch.name}
                        </h3>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="text-amber-500" size={24} />
                      )}
                    </div>
                    
                    <div className="flex items-start gap-2 text-sm text-gray-500 mt-auto">
                      <MapPin size={16} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2 leading-relaxed">
                        {branch.address || 'Chưa cập nhật địa chỉ'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-white">
          <button
            onClick={handleConfirm}
            disabled={!selectedId || loading}
            className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base transition-all disabled:opacity-50 disabled:hover:bg-amber-500 shadow-lg shadow-amber-500/25 active:scale-[0.98]"
          >
            Bắt đầu làm việc
          </button>
        </div>
      </div>
    </div>
  );
}
