/**
 * useTableStore.js — Quản lý trạng thái danh sách Bàn
 *
 * TÍNH NĂNG (PRODUCTION GRADE):
 * 1. Không tự call create order nếu items rỗng (tránh 400 BE).
 * 2. Phân biệt chọn bàn (local state) vs gửi Order (backend effect).
 * 3. Race condition protection: Dùng `requestId` + `AbortController` khi load Active Order.
 * 4. VIRTUAL TABLE MERGE (FRONTEND-ONLY): Gom bàn ảo, xử lý self-healing và mapping state.
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import tableApi from '../services/api/tableApi';
import { mapTables } from '../services/mapper/tableMapper';
import { useAuthStore } from './useAuthStore';

let _activeOrderAbortController = null;
let _activeOrderRequestId = 0;

// Helper: Quản lý Virtual Tables trong LocalStorage
const getVirtualTables = () => {
  try {
    const stored = localStorage.getItem('goldenheart_virtual_tables');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

// Helper: Quản lý Lazy Opened Tables (Bàn đã mở nhưng chưa có đơn)
const getLazyOpenedTables = () => {
  try {
    const stored = localStorage.getItem('goldenheart_lazy_tables');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const setVirtualTables = (data) => {
  localStorage.setItem('goldenheart_virtual_tables', JSON.stringify(data));
};

const setLazyOpenedTables = (data) => {
  localStorage.setItem('goldenheart_lazy_tables', JSON.stringify(data));
};

export const useTableStore = create((set, get) => ({

  // ─── State ────────────────────────────────────────────────────────────────

  tables: [],
  virtualTables: getVirtualTables(),
  lazyOpenedTableIds: getLazyOpenedTables(),
  loading: false,
  error: null,
  selectedTableId: null,

  // ─── Transaction State (Hardened Split) ───────────────────────────────────
  splitTransactions: {}, // { txId: { status, fromTableId, toTableId, bridgeTableId, steps } }
  lockedTableIds: [],    // Mảng ID các bàn đang bị khoá bởi transaction

  // ─── Takeaway & Area State ────────────────────────────────────────────────
  areas: [{ id: 'ALL', name: 'Tất cả' }],
  takeawayOrders: [
    { id: 'MV1', order_number: 'MV-01', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
    { id: 'MV2', order_number: 'MV-02', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
    { id: 'MV3', order_number: 'MV-03', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
    { id: 'MV4', order_number: 'MV-04', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
    { id: 'MV5', order_number: 'MV-05', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
    { id: 'MV6', order_number: 'MV-06', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
  ],
  currentOrderTarget: { type: null, id: null, name: null },

  // ─── Actions ──────────────────────────────────────────────────────────────

  setCurrentOrderTarget: (target) => set({ currentOrderTarget: target }),

  /** Simple setter — dùng cho TAKEAWAY, không trigger getActiveOrder */
  setSelectedTableId: (id) => set({ selectedTableId: id }),

  fetchAreas: async (branchId) => {
    try {
      const { areaApi } = await import('../api/posApi');
      const authUser = useAuthStore.getState()?.user;
      const rawBranchId = branchId || authUser?.branchId || authUser?.profile?.branchId;
      const resolvedBranchId = rawBranchId ? parseInt(rawBranchId, 10) : null;
      
      const res = await areaApi.getAreas(resolvedBranchId);
      const fetchedAreas = Array.isArray(res) ? res : (res?.data || []);
      set({ areas: [{ id: 'ALL', name: 'Tất cả' }, ...fetchedAreas] });
    } catch (err) {
      console.error('Fetch Areas Error:', err);
    }
  },

  /**
   * fetchTables — Tải danh sách bàn + Map Virtual Tables & Proxy Logic.
   */
  fetchTables: async (branchId) => {
    if (get().loading) return;

    const authUser = useAuthStore.getState()?.user;
    const rawBranchId = branchId || authUser?.branchId || authUser?.profile?.branchId;
    const resolvedBranchId = rawBranchId ? parseInt(rawBranchId, 10) : null;

    set({ loading: true, error: null });

    try {
      // 1. Tải danh sách bàn
      const response = await tableApi.getTables(resolvedBranchId);
      let rawTables = response?.data ?? [];
      let mappedTables = mapTables(rawTables);

      // 2. Tải danh sách món từ bếp để "Self-healing" đơn mang về
      let takeawayFromBE = [];
      try {
        const { kitchenServiceApi } = await import('../services/api/kitchenServiceApi');
        const kitchenRes = await kitchenServiceApi.getPendingItems(resolvedBranchId);
        const kitchenItems = kitchenRes?.data || [];
        
        // Tìm các orderId của đơn mang về (tableName null hoặc chứa "Mang về")
        const takeawayOrderIds = [...new Set(kitchenItems
          .filter(item => !item.tableName || item.tableName.includes('Mang về'))
          .map(item => item.orderId)
        )];
        
        takeawayFromBE = takeawayOrderIds.map(id => ({
          orderId: id,
          status: 'OCCUPIED', // Nếu có món ở bếp thì chắc chắn là OCCUPIED
          customerName: 'Khách mang về'
        }));
      } catch (kErr) {
        console.warn('[Self-Healing] Không thể lấy dữ liệu bếp:', kErr);
      }

      // 3. Đồng bộ Takeaway theo chi nhánh + Self-healing
      if (false && resolvedBranchId) {
        const takeawayKey = `goldenheart_takeaway_data_br${resolvedBranchId}`;
        const storedTakeaway = localStorage.getItem(takeawayKey);
        let currentTakeaway = storedTakeaway 
          ? JSON.parse(storedTakeaway) 
          : [
              { id: 'MV1', order_number: 'MV-01', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
              { id: 'MV2', order_number: 'MV-02', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
              { id: 'MV3', order_number: 'MV-03', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
              { id: 'MV4', order_number: 'MV-04', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
              { id: 'MV5', order_number: 'MV-05', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
              { id: 'MV6', order_number: 'MV-06', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null },
            ];

        // LOGIC SELF-HEALING: 
        // Duyệt qua các đơn từ BE, nếu chưa có trong currentTakeaway thì đắp vào ô trống
        takeawayFromBE.forEach(beOrder => {
          const exists = currentTakeaway.some(slot => slot.orderId === beOrder.orderId);
          if (!exists) {
            const emptySlotIndex = currentTakeaway.findIndex(slot => !slot.orderId || slot.status === 'AVAILABLE');
            if (emptySlotIndex !== -1) {
              currentTakeaway[emptySlotIndex] = {
                ...currentTakeaway[emptySlotIndex],
                orderId: beOrder.orderId,
                status: 'OCCUPIED',
                customerName: beOrder.customerName
              };
            }
          }
        });

        set({ takeawayOrders: currentTakeaway });
        localStorage.setItem(takeawayKey, JSON.stringify(currentTakeaway));
      }

      // ========== SELF-HEALING MECHANISM ==========
      let vTables = getVirtualTables();
      let needsRefetch = false;

      // Kiểm tra nếu mainTable không còn OCCUPIED hoặc RESERVED (VD: Đã thanh toán -> CLEANING/AVAILABLE)
      for (const vt of vTables) {
        const mainTable = mappedTables.find(t => t.id === vt.mainTableId);
        // Nếu mainTable không tồn tại hoặc trạng thái là DIRTY / AVAILABLE -> Tách tự động
        if (mainTable && !['OCCUPIED', 'RESERVED'].includes(mainTable.status)) {
          console.log(`[Self-Healing] Tách bàn ${mainTable.tableNumber} tự động do trạng thái: ${mainTable.status}`);

          // Đồng bộ trạng thái bàn con với bàn chính:
          // - Bàn chính CLEANING → bàn con cũng CLEANING (khách vừa rời, cần dọn)
          // - Bàn chính AVAILABLE → bàn con về AVAILABLE
          //
          // ✅ BE đã hỗ trợ RESERVED → CLEANING trực tiếp (sau khi cập nhật validateStatusTransition).
          // Không cần bước trung gian RESERVED → AVAILABLE → CLEANING nữa.
          // Note: mainTable.status đã qua mapper nên là 'DIRTY', khi gửi BE dùng 'CLEANING'
          const targetStatus = mainTable.status === 'DIRTY' ? 'CLEANING' : 'AVAILABLE';

          for (const childId of vt.childTableIds) {
            try {
              await tableApi.updateTableStatus(childId, targetStatus);
            } catch (e) {
              console.warn(`[Self-Healing] Lỗi khi cập nhật bàn con ${childId} → ${targetStatus}:`, e);
            }
          }


          // Xoá Virtual Table khỏi LocalStorage sau khi tách xong
          vTables = vTables.filter(v => v.id !== vt.id);
          setVirtualTables(vTables);
          needsRefetch = true;
        }
      }



      set({ virtualTables: vTables });

      // Nếu có sự thay đổi do auto-unmerge, cần tải lại mảng bàn mới nhất từ BE
      if (needsRefetch) {
        const freshResponse = await tableApi.getTables(resolvedBranchId);
        rawTables = freshResponse?.data ?? [];
        mappedTables = mapTables(rawTables);
      }

      // ========== MAPPING & TRANSFORM DATA ==========
      const transformedTables = mappedTables.map(table => {
        // Tìm xem bàn có phải là Main Table (Bàn Chính) của một nhóm gộp không
        const isMain = vTables.find(vt => vt.mainTableId === table.id);
        if (isMain) {
          return {
            ...table,
            tableNumber: isMain.virtualName,    // VD: "Bàn 1 & 2 & 3"
            capacity: isMain.totalCapacity,     // Tổng capacity
            originalTableNumber: table.tableNumber,
            isVirtual: true,
            virtualTableObj: isMain
          };
        }

        // Tìm xem bàn có phải là Child Table (Bàn Phụ) bị chìm không
        const isChildOf = vTables.find(vt => vt.childTableIds.includes(table.id));
        if (isChildOf) {
          return {
            ...table,
            status: 'MERGED', // Ép trạng thái về Đã Gộp trên UI
            isMerged: true,
            mainTableId: isChildOf.mainTableId
          };
        }

        return table;
      });

      // ⚠️ Preserve currentOrderId từ store cũ cho các bàn vẫn còn OCCUPIED.
      // BE không trả về currentOrderId trong GET /tables → nếu ghi đè thẳng sẽ mất tham chiếu đơn.
      // Giải pháp: merge lại từ state hiện tại trước khi ghi vào store.
      const existingTables = get().tables;
      const lazyIds = get().lazyOpenedTableIds;
      
      const finalTables = transformedTables.map(newTable => {
        // Nếu bàn nằm trong danh sách Lazy Open -> Ép trạng thái OCCUPIED
        if (lazyIds.includes(newTable.id) && newTable.status === 'AVAILABLE') {
          return { ...newTable, status: 'OCCUPIED', currentOrderId: null };
        }

        if (newTable.status === 'OCCUPIED' && !newTable.currentOrderId) {
          const existing = existingTables.find(t => t.id === newTable.id);
          if (existing?.currentOrderId) {
            // Nếu bàn đã có đơn thật -> Xoá khỏi danh sách Lazy
            const newLazy = get().lazyOpenedTableIds.filter(id => id !== newTable.id);
            set({ lazyOpenedTableIds: newLazy });
            setLazyOpenedTables(newLazy);
            return { ...newTable, currentOrderId: existing.currentOrderId };
          }
        }

        // Nếu bàn không còn AVAILABLE (ví dụ BE báo đã dọn xong hoặc có người khác vào) 
        // -> Xoá khỏi danh sách Lazy
        if (newTable.status !== 'AVAILABLE' && lazyIds.includes(newTable.id)) {
           const newLazy = get().lazyOpenedTableIds.filter(id => id !== newTable.id);
           set({ lazyOpenedTableIds: newLazy });
           setLazyOpenedTables(newLazy);
        }

        return newTable;
      });

      set({ tables: finalTables, loading: false });
    } catch (err) {
      console.error('[API_ERROR][TABLES]', err);
      set({ loading: false, error: err?.message || 'Không tải được danh sách bàn' });
      toast.error('Không tải được danh sách bàn.');
    }
  },

  /**
   * selectTable — Hành động chọn 1 bàn trên giao diện.
   * Cập nhật thêm: Auto Redirect nếu bấm vào bàn phụ đã Merged.
   */
  selectTable: async (tableId) => {
    let targetId = tableId;
    
    // REDIRECT LOGIC FOR VIRTUAL TABLES
    const currentTable = get().tables.find(t => t.id === targetId);
    if (currentTable?.isMerged) {
      // Find the main table it belongs to
      const vt = get().virtualTables.find(v => v.childTableIds.includes(targetId));
      if (vt) {
         console.log(`[Virtual Proxy] Redirect từ bàn phụ ${targetId} sang bàn chính ${vt.mainTableId}`);
         targetId = vt.mainTableId;
      }
    }

    set({ selectedTableId: targetId });
    const table = get().tables.find(t => t.id === targetId);
    
    // Lazy load stores to avoid circular dependencies
    const { useOrderStore } = await import('./useOrderStore');
    
    if (table?.status === 'OCCUPIED') {
      if (!table.currentOrderId) {
        // CASE: LAZY OPENED TABLE (Ghost Order)
        useOrderStore.setState({ 
          order: { 
            id: null, 
            tableId: targetId, 
            tableNumber: table.tableNumber,
            status: 'PENDING',
            orderItems: [] 
          },
          loadingOrder: false 
        });
        return;
      }

      // CASE: REAL ORDER ON BE
      const currentReqId = ++_activeOrderRequestId;
      if (_activeOrderAbortController) _activeOrderAbortController.abort();
      _activeOrderAbortController = new AbortController();

      useOrderStore.setState({ loadingOrder: true });

      try {
        const { tableApi } = await import('../services/api/tableApi');
        const response = await tableApi.getActiveOrder(targetId, { 
          signal: _activeOrderAbortController.signal 
        });

        if (currentReqId !== _activeOrderRequestId) return;

        const { mapOrder } = await import('../services/mapper/orderMapper');
        const order = mapOrder(response?.data);

        if (!order) {
          console.warn("[MAPPER_WARNING] OCCUPIED table but BE returned null active order!");
          useOrderStore.setState({ loadingOrder: false });
        } else {
          useOrderStore.getState().setOrder(order);
          get().updateTableLocal(targetId, { currentOrderId: order.id });
          useOrderStore.setState({ loadingOrder: false });
        }
      } catch (err) {
        if (err.isCancelled || err.name === 'AbortError') return;
        if (currentReqId !== _activeOrderRequestId) return;
        
        console.error("[API_ERROR][ACTIVE_ORDER]", err);
        toast.error("Không tải được đơn của bàn này.");
        useOrderStore.setState({ loadingOrder: false });
      }
    } else {
      useOrderStore.setState({ order: null });
    }
  },

  /**
   * createVirtualMerge — FE Implementation cho gộp nhiều bàn
   *
   * Xử lý 409 Conflict:
   * - Chỉ gọi API BE merge khi Bàn Phụ đang OCCUPIED (có order).
   * - Nếu Bàn Phụ AVAILABLE (không có order), chỉ lock bằng RESERVED — bỏ qua BE merge.
   * - Bàn Chính có thể là AVAILABLE hoặc OCCUPIED — không cần điều kiện.
   */
  /**
   * createVirtualMerge — Xử lý gộp bàn thông minh (Smart Proxy - FE Only Refactor)
   * 
   * 🎯 MỤC TIÊU:
   * - "Lách" luật Backend: BE chỉ cho gộp khi cả 2 bàn đều có Order.
   * - Orchestration: Tự động dùng splitTable hoặc mergeTables tùy trạng thái.
   * - Data Consistency: Gộp cả món đã gửi bếp (API) và món trong giỏ (Local).
   *
   * @param {number} mainTableId - ID của bàn chính (bàn nhận đơn)
   * @param {Array<number>} childTableIds - Danh sách ID các bàn con (bàn bị gộp)
   */
  createVirtualMerge: async (mainTableId, childTableIds) => {
    if (get().loading) return false;
    
    const allTables = get().tables;
    const mainTable = allTables.find(t => t.id === mainTableId);
    const childTables = allTables.filter(t => childTableIds.includes(t.id));

    if (!mainTable || childTables.length !== childTableIds.length) {
      toast.error('Dữ liệu bàn không hợp lệ để gộp.');
      return false;
    }

    set({ loading: true });

    try {
      // Lazy load useCartStore để gộp giỏ hàng
      const { useCartStore } = await import('./useCartStore');
      
      // Theo dõi trạng thái "thực tế" của bàn chính trong quá trình gộp (vì store chưa cập nhật ngay)
      let currentMainStatus = mainTable.status;

      // 🔄 Duyệt qua danh sách bàn con để xử lý order
      for (const childId of childTableIds) {
        const childTable = allTables.find(t => t.id === childId);
        
        // 1️⃣ LUÔN LUÔN gộp giỏ hàng local (Draft Items) trước
        useCartStore.getState().mergeDraftItems(childId, mainTableId);

        // 2️⃣ Xử lý đơn hàng đã gửi bếp (Active Order) trên Backend
        if (childTable?.status === 'OCCUPIED') {
          try {
            if (currentMainStatus === 'OCCUPIED') {
              // ❗ CASE 1: Cả 2 đều có order -> Dùng mergeTables chuẩn của BE
              await tableApi.mergeTables(childId, mainTableId);
              console.log(`[SmartMerge] Đã gộp đơn từ bàn ${childId} -> ${mainTableId} (mergeTables)`);
            } else {
              // ❗ CASE 2: Bàn chính trống, Bàn con có order
              // -> Backend không cho merge -> Phải dùng splitTable để chuyển 100% món sang
              console.log(`[SmartMerge] Bàn chính ${mainTableId} trống -> Chuyển sang dùng splitTable`);
              
              const childOrderRes = await tableApi.getActiveOrder(childId);
              const childItems = childOrderRes?.data?.orderItems || childOrderRes?.data?.items || [];
              
              if (childItems.length > 0) {
                const itemsToMove = childItems.map(item => ({
                  orderItemId: item.id,
                  quantity: item.quantity
                }));
                // Gọi API tách bàn (chuyển món) -> BE sẽ tự khởi tạo đơn cho bàn chính
                await tableApi.splitTable(childId, mainTableId, itemsToMove);
                // Sau cú split này, bàn chính đã chính thức OCCUPIED trên BE
                currentMainStatus = 'OCCUPIED'; 
                console.log(`[SmartMerge] Đã chuyển đơn từ bàn ${childId} -> ${mainTableId} (splitTable)`);
              }
            }
          } catch (apiErr) {
            // Log lỗi nhưng không chặn quy trình gộp ảo để tránh làm đứng vận hành
            console.warn(`[SmartMerge] Cảnh báo API cho bàn ${childId}:`, apiErr?.message);
          }
        }
        // CASE 3: Bàn con trống (AVAILABLE) -> Không gọi API chuyển món, đi thẳng xuống bước khóa bàn
      }

      // 3️⃣ Khóa (Lock) tất cả bàn con bằng trạng thái RESERVED
      // Việc này giúp bàn con hiển thị "Đã gộp" trên UI và không thể chọn lẻ
      for (const childId of childTableIds) {
        try {
          await tableApi.updateTableStatus(childId, 'RESERVED');
        } catch (lockErr) {
          console.warn(`[SmartMerge] Không thể khóa bàn con ${childId}:`, lockErr?.message);
        }
      }

      // 4️⃣ Lưu metadata bàn ảo vào LocalStorage (Virtual Table Proxy)
      const numbers = [mainTable.tableNumber, ...childTables.map(t => t.tableNumber)];
      const virtualTable = {
        id: `vt_${Date.now()}`,
        mainTableId,
        childTableIds,
        virtualName: numbers.join(' & '), // VD: "T01 & T02"
        totalCapacity: childTables.reduce((sum, t) => sum + (t.capacity || 4), mainTable.capacity || 4),
        originalCapacities: [mainTable.capacity, ...childTables.map(t => t.capacity)],
        createdAt: new Date().toISOString()
      };

      const currentVt = getVirtualTables();
      const updatedVt = [...currentVt, virtualTable];
      setVirtualTables(updatedVt);
      set({ virtualTables: updatedVt });

      // 5️⃣ Đồng bộ lại UI từ Backend
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      
      // Auto select bàn chính để nhân viên thấy ngay kết quả gộp
      get().selectTable(mainTableId);
      
      return virtualTable;
    } catch (err) {
      console.error('[SmartMerge_FATAL]', err);
      toast.error(err?.message || 'Lỗi nghiêm trọng khi gộp bàn.');
      set({ loading: false });
      return false;
    }
  },


  /**
   * unmergeVirtualTable — Trả lại trạng thái cho các bàn phụ
   */
  unmergeVirtualTable: async (mainTableId) => {
    if (get().loading) return false;

    const currentVt = getVirtualTables();
    const targetVt = currentVt.find(vt => vt.mainTableId === mainTableId);

    if (!targetVt) {
      toast.error('Không tìm thấy dữ liệu bàn ảo này.');
      return false;
    }

    set({ loading: true });

    try {
      // 1. Phóng thích (Free up) child tables bằng cách gán về AVAILABLE
      for (const childId of targetVt.childTableIds) {
        await tableApi.updateTableStatus(childId, 'AVAILABLE');
      }

      // 2. Remove Local
      const updatedVt = currentVt.filter(vt => vt.id !== targetVt.id);
      setVirtualTables(updatedVt);
      set({ virtualTables: updatedVt });

      // 3. Refetch
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);

      return true;
    } catch (err) {
      console.error('[API_ERROR][UNMERGE]', err);
      toast.error(err?.message || 'Lỗi khi huỷ gộp bàn.');
      set({ loading: false });
      return false;
    }
  },

  /**
   * openTable — Mở bàn ngay, tạo Order rỗng (PENDING) trên BE.
   * Bàn sẽ là OCCUPIED ngay sau khi gọi API → persist qua reload.
   */
  openTable: async (tableId) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return false;

    if (!['AVAILABLE', 'RESERVED'].includes(table.status)) {
      toast.error(`Bàn ${table.tableNumber} không khả dụng!`);
      return false;
    }

    // LOCAL ONLY - Lazy open.
    // BE will create the order when the first item is sent to kitchen.
    const newLazy = [...get().lazyOpenedTableIds, tableId];
    set(state => ({
      lazyOpenedTableIds: newLazy,
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, status: 'OCCUPIED', currentOrderId: null } : t
      )
    }));
    setLazyOpenedTables(newLazy);

    get().selectTable(tableId);
    toast.success('Bàn đã được mở. Vui lòng chọn món.');
    return { orderId: null, order: { id: null, tableNumber: table.tableNumber } };
  },

  /**
   * cancelOrder — Hủy đơn hàng và giải phóng bàn về AVAILABLE.
   * Dùng cho nút “Đóng bàn / Hủy nhầm” trong TableActionModal.
   */
  cancelOrder: async (orderId) => {
    if (!orderId) {
      toast.error('Không tìm thấy mã đơn hàng cần đóng');
      return false;
    }
    try {
      const { default: apiClient } = await import('../api/apiClient');
      await apiClient.post(`/orders/${orderId}/cancel`);

      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể đóng bàn';
      throw new Error(msg);
    }
  },

  /**
   * cancelReservation — Hủy đặt bàn trước, trả về AVAILABLE.
   * Dùng khi khách không đến hoặc nhập sai bàn.
   */
  cancelReservation: async (tableId) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return false;

    if (table.status !== 'RESERVED') {
      toast.error('Bàn này chưa được đặt trước.');
      return false;
    }

    try {
      await tableApi.updateTableStatus(tableId, 'AVAILABLE');
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      toast.success(`Đã hủy đặt bàn ${table.tableNumber}.`);
      return true;
    } catch (err) {
      console.error('[API_ERROR][CANCEL_RESERVATION]', err);
      toast.error(err?.message || 'Không thể hủy đặt bàn.');
      return false;
    }
  },

  /**
   * reserveTable — Đặt bàn trước cho khách.
   */
  reserveTable: async ({ tableId, customerName, phone, time, deposit = 0 }) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return;

    try {
      await tableApi.updateTableStatus(tableId, 'RESERVED');
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      
      toast.success(`Đã đặt bàn ${table.tableNumber} cho ${customerName}`);
    } catch (err) {
      console.error('[API_ERROR][RESERVE_TABLE]', err);
      toast.error(err?.message || 'Không thể đặt bàn.');
    }
  },

  /**
   * cleanTable — Dọn bàn sau khi khách rời đi.
   */
  cleanTable: async (tableId) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return false;

    try {
      await tableApi.updateTableStatus(tableId, 'AVAILABLE');
      
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId); 
      // fetchTables có chứa self-healing nên sẽ tự động tách bàn ảo nếu đang là bàn chính
      
      toast.success(`Đã dọn xong bàn ${table.tableNumber}`);
      return true;
    } catch (err) {
      console.error('[API_ERROR][CLEAN_TABLE]', err);
      toast.error(err?.message || 'Không thể dọn bàn này.');
      return false;
    }
  },

  /**
   * mergeTables — Legacy / Single Merge
   * Nếu có bàn ảo thì action mới là createVirtualMerge đc khuyến nghị dùng hơn.
   */
  mergeTables: async (sourceTableId, targetTableId) => {
    if (get().loading) return false;
    if (sourceTableId === targetTableId) {
      toast.error("Không thể gộp bàn vào chính nó.");
      return false;
    }

    try {
      await tableApi.mergeTables(sourceTableId, targetTableId);
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      get().selectTable(targetTableId);
      
      toast.success('Đã gộp bàn thành công!');
      return true;
    } catch (err) {
      console.error('[API_ERROR][MERGE_TABLES]', err);
      toast.error(err?.message || 'Gộp bàn thất bại.');
      return false;
    }
  },

  /**
   * splitTable — (Legacy) Tách món từ bàn này sang bàn khác.
   */
  splitTable: async (sourceTableId, targetTableId, itemsToTransfer) => {
    if (get().loading) return false;
    try {
      const beItems = itemsToTransfer.map(item => ({
        orderItemId: Number(item.orderItemId || item.itemId || item.id),
        quantity: item.quantity,
      }));

      await tableApi.splitTable(sourceTableId, targetTableId, beItems);
      
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      get().selectTable(sourceTableId);

      toast.success('Đã tách bàn thành công!');
      return true;
    } catch (err) {
      console.error('[API_ERROR][SPLIT_TABLE]', err);
      toast.error(err?.message || 'Tách bàn thất bại.');
      return false;
    }
  },

  // ─── TRANSACTION LOGIC (SMART BRIDGE SPLIT) ───────────────────────────────
  
  /**
   * lockTable — Khoá bàn để chặn double-click / concurrent modification
   */
  lockTable: (tableId) => {
    set((state) => {
      if (state.lockedTableIds.includes(tableId)) return state;
      return { lockedTableIds: [...state.lockedTableIds, tableId] };
    });
  },

  /**
   * unlockTable — Giải phóng bàn khỏi trạng thái khoá
   */
  unlockTable: (tableId) => {
    set((state) => ({
      lockedTableIds: state.lockedTableIds.filter((id) => id !== tableId)
    }));
  },

  /**
   * retryMerge — Thử lại API merge nếu gặp lỗi (Retry Strategy)
   */
  retryMerge: async (fromId, toId, maxRetries = 2, delay = 500) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await tableApi.mergeTables(fromId, toId);
        return true; // Thành công
      } catch (err) {
        if (i === maxRetries - 1) throw err; // Lần cuối cùng vẫn lỗi thì quăng ra
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  },

  /**
   * markTransactionStatus — Cập nhật trạng thái transaction
   */
  markTransactionStatus: (txId, patch) => {
    set((state) => ({
      splitTransactions: {
        ...state.splitTransactions,
        [txId]: { ...(state.splitTransactions[txId] || {}), ...patch }
      }
    }));
  },

  /**
   * smartSplitTable — Entry point cho UI, xử lý tách món thông minh
   * (Fake Distributed Transaction)
   */
  smartSplitTable: async (fromTableId, toTableId, itemsToTransfer) => {
    const state = get();
    
    // STEP 0: Validate
    if (fromTableId === toTableId) {
      toast.error('Bàn đích không thể trùng với bàn nguồn!');
      return false;
    }
    if (!itemsToTransfer || itemsToTransfer.length === 0) {
      toast.error('Cần chọn ít nhất 1 món để tách!');
      return false;
    }
    if (state.lockedTableIds.includes(fromTableId) || state.lockedTableIds.includes(toTableId)) {
      toast.warn('Bàn này đang được hệ thống xử lý, vui lòng chờ trong giây lát!');
      return false;
    }

    const toTable = state.tables.find(t => t.id === toTableId);
    if (!toTable) {
      toast.error('Không tìm thấy bàn đích hợp lệ!');
      return false;
    }

    // Nếu bàn đích đang AVAILABLE -> Gọi thẳng API splitTable của BE như cũ
    if (toTable.status !== 'OCCUPIED') {
      return get().splitTable(fromTableId, toTableId, itemsToTransfer);
    }

    // ❗ BE chặn splitTable qua bàn OCCUPIED. 
    // Nếu bàn đích OCCUPIED -> Chạy flow Bridge Table
    return get().handleBridgeSplit(fromTableId, toTableId, itemsToTransfer);
  },

  /**
   * handleBridgeSplit — Orchestration để giả lập "Split vào bàn có Order"
   * Flow: A -> (split) -> Bridge(Trống) -> (merge) -> B
   */
  handleBridgeSplit: async (fromTableId, toTableId, itemsToTransfer) => {
    const txId = `split_tx_${Date.now()}`;
    const state = get();
    
    // STEP 1: Tìm Bridge Table
    const bridgeTable = state.tables.find(t => 
      t.status === 'AVAILABLE' && 
      !state.lockedTableIds.includes(t.id) &&
      !t.isVirtual && !t.isMerged
    );

    if (!bridgeTable) {
      toast.error('Hệ thống cần ít nhất 1 bàn TRỐNG để làm trung gian chuyển món. Vui lòng thử lại sau!');
      return false;
    }

    // Khởi tạo Transaction State
    get().markTransactionStatus(txId, {
      status: 'pending',
      fromTableId,
      toTableId,
      bridgeTableId: bridgeTable.id,
      step: 'init'
    });

    // STEP 2: Lock bàn
    get().lockTable(fromTableId);
    get().lockTable(toTableId);
    get().lockTable(bridgeTable.id);

    // Chuyển đổi định dạng item cho BE
    const beItems = itemsToTransfer.map(item => ({
      orderItemId: Number(item.orderItemId || item.itemId || item.id),
      quantity: item.quantity,
    }));

    try {
      // -----------------------------------------------------
      // PHASE 1: SPLIT -> BRIDGE
      // -----------------------------------------------------
      get().markTransactionStatus(txId, { step: 'split_to_bridge' });
      await tableApi.splitTable(fromTableId, bridgeTable.id, beItems);
      
      // -----------------------------------------------------
      // PHASE 2: MERGE -> TARGET
      // -----------------------------------------------------
      get().markTransactionStatus(txId, { step: 'merge_to_target' });
      // Thử merge có cơ chế Retry (2 lần, cách nhau 500ms)
      await get().retryMerge(bridgeTable.id, toTableId, 2, 500);

      // -----------------------------------------------------
      // PHASE 3: SUCCESS CLEANUP
      // -----------------------------------------------------
      get().markTransactionStatus(txId, { status: 'success', step: 'done' });
      toast.success('Đã chuyển món thành công sang bàn đang phục vụ!');
      
    } catch (error) {
      console.error(`[TX_FAIL:${txId}]`, error);
      const tx = get().splitTransactions[txId];

      // -----------------------------------------------------
      // ROLLBACK PHASE
      // Nếu đã chuyển vào Bridge, nhưng thất bại khi Merge sang Target -> Gộp ngược về Source
      // -----------------------------------------------------
      if (tx.step === 'merge_to_target' || tx.step === 'split_to_bridge') {
        try {
          console.log(`[TX_ROLLBACK:${txId}] Đang rollback toàn bộ món về bàn gốc (${fromTableId})`);
          get().markTransactionStatus(txId, { status: 'rollback', step: 'rollback_merge' });
          await get().retryMerge(bridgeTable.id, fromTableId, 2, 500);
          toast.error('Lỗi khi chuyển món. Dữ liệu đã được hoàn tác an toàn.');
        } catch (rollbackErr) {
          console.error(`[TX_CRITICAL:${txId}] LỖI KHI HOÀN TÁC! Cần kiểm tra bàn ${bridgeTable.tableNumber}.`, rollbackErr);
          toast.error(`Lỗi nghiêm trọng: Các món hiện đang nằm tại bàn trung gian ${bridgeTable.tableNumber}.`);
          get().markTransactionStatus(txId, { status: 'failed_to_rollback' });
        }
      } else {
        toast.error('Tách món thất bại. Dữ liệu bàn nguồn chưa bị ảnh hưởng.');
        get().markTransactionStatus(txId, { status: 'failed' });
      }
    } finally {
      // -----------------------------------------------------
      // UNLOCK & REFRESH UI
      // Không cần quan tâm thành công/thất bại, luôn unlock cuối cùng
      // -----------------------------------------------------
      get().unlockTable(fromTableId);
      get().unlockTable(toTableId);
      get().unlockTable(bridgeTable.id);

      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      await get().fetchTables(branchId);
      
      // Auto focus lại bàn đang thao tác thay vì bàn đích
      get().selectTable(fromTableId);
    }
    
    return get().splitTransactions[txId]?.status === 'success';
  },

  updateTableLocal: (tableId, patch) => {
    // Nếu update sang AVAILABLE hoặc khác OCCUPIED -> Xoá khỏi Lazy
    if (patch.status && patch.status !== 'OCCUPIED') {
      const newLazy = get().lazyOpenedTableIds.filter(id => id !== tableId);
      set({ lazyOpenedTableIds: newLazy });
      setLazyOpenedTables(newLazy);
    }

    set(state => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, ...patch } : t
      ),
    }));
  },

  updateTakeawayLocal: (slotId, patch) => {
    const branchId = useAuthStore.getState()?.user?.branchId || 1;
    set(state => {
      const newOrders = state.takeawayOrders.map(o =>
        o.id === slotId ? { ...o, ...patch } : o
      );
      localStorage.setItem(`goldenheart_takeaway_data_br${branchId}`, JSON.stringify(newOrders));
      return { takeawayOrders: newOrders };
    });
  },

  /**
   * createTakeawayOrder — Mở ô mang về cục bộ.
   * Backend order được tạo LAZY khi nhân viên "Gửi bếp" lần đầu (POST /orders với tableId=null).
   */
  createTakeawayOrder: async (slotId, customerName) => {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    set(state => ({
      takeawayOrders: state.takeawayOrders.map(o =>
        o.id === slotId
          ? { ...o, status: 'OCCUPIED', customerName: customerName || 'Khách lẻ', time: timeStr, orderId: null }
          : o
      ),
    }));

    toast.success(`Đã mở ô ${slotId} — ${customerName || 'Khách lẻ'}`);
    return {
      orderId: null, // tạo thật khi gửi bếp
      order: { id: null, tableNumber: 'Mang về', customerName: customerName || 'Khách lẻ' },
    };
  },

  /**
   * completeTakeawayOrder — Đóng ô mang về, reset về trạng thái AVAILABLE.
   * Gọi sau khi thanh toán thành công.
   */
  completeTakeawayOrder: (slotId) => {
    const branchId = useAuthStore.getState()?.user?.branchId || 1;
    const newOrders = get().takeawayOrders.map(o =>
      o.id === slotId
        ? { id: o.id, order_number: o.order_number, customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--', orderId: null }
        : o
    );
    set({ takeawayOrders: newOrders });
    localStorage.setItem(`goldenheart_takeaway_data_br${branchId}`, JSON.stringify(newOrders));
    toast.success('Đã đóng ô mang về');
  },

  /** Alias cho completeTakeawayOrder */
  closeTakeawayOrder: (slotId) => get().completeTakeawayOrder(slotId),

  /**
   * updateTakeawayStatus — Cập nhật trạng thái bếp của ô mang về (OCCUPIED → COOKING → READY).
   */
  updateTakeawayStatus: (slotId, newStatus) => {
    set(state => ({
      takeawayOrders: state.takeawayOrders.map(o =>
        o.id === slotId ? { ...o, status: newStatus } : o
      ),
    }));
  },

  /**
   * deleteTable — Xóa bàn qua API rồi refresh danh sách.
   */
  deleteTable: async (tableId) => {
    try {
      await tableApi.deleteTable(tableId);
      const branchId = useAuthStore.getState()?.user?.branchId ?? null;
      await get().fetchTables(branchId);
      toast.success('Đã xóa bàn');
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể xóa bàn';
      toast.error(msg);
      throw new Error(msg);
    }
  },

}))
;

export const selectAvailableTables = state => state.tables.filter(t => t.status === 'AVAILABLE');
export const selectOccupiedTables = state => state.tables.filter(t => t.status === 'OCCUPIED');
export const selectTableById = (id) => (state) => state.tables.find(t => t.id === id);
