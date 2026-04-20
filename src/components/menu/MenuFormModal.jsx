import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, UtensilsCrossed, 
  AlertTriangle, Flame, Plus, 
  Trash2, ChevronDown, Loader2,
  DollarSign 
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * RecipesEditor - Section for ingredient management
 */
function RecipesEditor({ recipes, onChange, ingredients = [] }) {
  const add = () => onChange([...recipes, { ingredientId: '', quantity: '' }]);
  const remove = (i) => onChange(recipes.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = recipes.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    onChange(next);
  };

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 shadow-inner">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <label className="text-gray-900 text-xs font-black uppercase tracking-widest">
            Định lượng nguyên liệu
          </label>
        </div>
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-amber-500 hover:text-amber-600 text-gray-500 text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm thành phần
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
          <p className="text-gray-400 text-xs italic">Cần thiết lập công thức để tự động trừ kho khi bán hàng</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {recipes.map((r, i) => (
            <div key={i} className="flex items-center gap-3 animate-fade-in">
              <div className="flex-[3] relative">
                <select
                  value={r.ingredientId}
                  onChange={(e) => update(i, 'ingredientId', e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Chọn nguyên liệu...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unitSymbol || ing.unitName || 'Đơn vị'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              <div className="flex-1 min-w-[80px]">
                <input
                  type="number" min="0" step="0.1" placeholder="SL"
                  value={r.quantity}
                  onChange={(e) => update(i, 'quantity', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-xs text-center outline-none focus:border-amber-500 transition-all font-bold"
                />
              </div>

              <button
                type="button"
                onClick={() => remove(i)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * MenuFormModal - Modal container and main form
 */
export function MenuFormModal({ 
  item, 
  categories = [], 
  branches = [], 
  ingredients = [], 
  onSave, 
  onClose,
  saving 
}) {
  const { user } = useAuthStore();
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    status: 'AVAILABLE',
    branchId: '',
    categoryId: '',
  });
  const [recipes, setRecipes] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        description: item.description || '',
        price: item.price ?? '',
        status: item.status || 'AVAILABLE',
        branchId: item.branchId ?? '',
        categoryId: item.categoryId ?? '',
      });
      setRecipes(item.recipes?.map(r => ({ 
        ingredientId: r.ingredientId, 
        quantity: r.quantity 
      })) || []);
    } else {
      // Auto-select branch if possible
      setForm(prev => ({
        ...prev,
        branchId: user?.branchId || (branches[0]?.id || '')
      }));
    }
  }, [item, user, branches]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tên món không được để trống';
    
    const price = Number(form.price);
    if (!form.price || isNaN(price) || price <= 0) e.price = 'Giá phải lớn hơn 0';
    
    if (!form.branchId) e.branchId = 'Vui lòng chọn chi nhánh';
    if (!form.categoryId) e.categoryId = 'Vui lòng chọn danh mục';

    if (recipes.length === 0 || recipes.some(r => !r.ingredientId || !r.quantity || Number(r.quantity) <= 0)) {
       e.recipes = 'Công thức món ăn không được để trống hoặc thiếu định lượng';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    // Clean recipes
    const cleanRecipes = recipes
      .filter(r => r.ingredientId && r.quantity)
      .map(r => ({ ingredientId: Number(r.ingredientId), quantity: Number(r.quantity) }));

    onSave({
      ...form,
      name: form.name.trim(),
      price: Number(form.price),
      branchId: Number(form.branchId),
      categoryId: Number(form.categoryId),
      recipes: cleanRecipes
    });
  };

  const inputCls = (field) => `
    w-full px-4 py-3 rounded-xl bg-white border text-gray-900 text-sm placeholder-gray-400 outline-none transition-all
    ${errors[field] 
      ? 'border-red-500 focus:ring-4 focus:ring-red-500/5' 
      : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5'}
  `;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-zoom-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <UtensilsCrossed className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">
                {isEdit ? 'Chỉnh sửa món ăn' : 'Tạo món ăn mới'}
              </h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                Thiết lập menu & định lượng kho
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-8 custom-scrollbar">
          <form id="menu-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-gray-800 text-[11px] font-black uppercase tracking-widest pl-1">Tên món ăn *</label>
                    <input 
                        className={inputCls('name')} 
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value, nameErr: null})} 
                        placeholder="Ví dụ: Phở Bò Tái Nạm..." 
                    />
                    {errors.name && <p className="text-red-500 text-[10px] font-bold flex items-center gap-1.5 pl-1"><AlertTriangle size={12}/> {errors.name}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-gray-800 text-[11px] font-black uppercase tracking-widest pl-1">Mô tả tóm tắt</label>
                    <textarea 
                        className={inputCls('description')} 
                        rows={2} 
                        value={form.description}
                        onChange={(e) => setForm({...form, description: e.target.value})} 
                        placeholder="Mô tả ngắn về hương vị món ăn..." 
                    />
                </div>

                {/* Price & Status */}
                <div className="space-y-2">
                    <label className="text-gray-800 text-[11px] font-black uppercase tracking-widest pl-1">Giá bán (₫) *</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            className={`${inputCls('price')} pl-10 font-bold tabular-nums`} 
                            type="number" min="0" step="1000"
                            value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} 
                            placeholder="0" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-gray-800 text-[11px] font-black uppercase tracking-widest pl-1">Trạng thái bán</label>
                    <select className={inputCls('status')} value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                        <option value="AVAILABLE">✨ Đang kinh doanh</option>
                        <option value="UNAVAILABLE">🛑 Tạm ngưng bán</option>
                    </select>
                </div>

                {/* Branch & Category */}
                <div className="space-y-2">
                    <label className="text-gray-800 text-[11px] font-black uppercase tracking-widest pl-1">Chi nhánh *</label>
                    <select className={inputCls('branchId')} value={form.branchId} onChange={(e) => setForm({...form, branchId: e.target.value})}>
                        <option value="">-- Chọn chi nhánh --</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {errors.branchId && <p className="text-red-500 text-[10px] font-bold flex items-center gap-1.5 pl-1"><AlertTriangle size={12}/> {errors.branchId}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-gray-800 text-[11px] font-black uppercase tracking-widest pl-1">Danh mục *</label>
                    <select className={inputCls('categoryId')} value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})}>
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.categoryId && <p className="text-red-500 text-[10px] font-bold flex items-center gap-1.5 pl-1"><AlertTriangle size={12}/> {errors.categoryId}</p>}
                </div>
            </div>

            <RecipesEditor recipes={recipes} onChange={setRecipes} ingredients={ingredients} />
            {errors.recipes && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-slide-up">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold leading-tight uppercase tracking-tight">{errors.recipes}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 flex items-center gap-4">
            <button
                type="submit"
                form="menu-form"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-60 shadow-lg shadow-amber-900/10 active:scale-95 group"
            >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                <span>{saving ? 'Đang lưu dữ liệu...' : isEdit ? 'Lưu thay đổi' : 'Tạo món ăn'}</span>
            </button>
            <button
                type="button"
                onClick={onClose}
                className="px-8 h-14 rounded-2xl bg-gray-50 border border-transparent hover:border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
            >
                Đóng
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
