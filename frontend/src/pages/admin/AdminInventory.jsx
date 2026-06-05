import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRightLeft, CalendarDays, RefreshCw, Store, Warehouse } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import inventoryService from '../../services/inventoryService';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const AdminInventory = () => {
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const storeFilterId = impersonatedStoreId || '';
  const isStoreMode = isSuperAdmin && Boolean(storeFilterId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ products: [], stores: [] });
  const [stores, setStores] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('summary');
  const [search, setSearch] = useState('');
  const [historyMode, setHistoryMode] = useState('all');
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [expandedProductId, setExpandedProductId] = useState('');
  const [form, setForm] = useState({
    productId: '',
    fromStoreId: '',
    toStoreId: '',
    quantity: 1,
    note: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, storesRes, historyRes] = await Promise.all([
        inventoryService.getSummary(storeFilterId || undefined),
        inventoryService.getStores(),
        inventoryService.getHistory(storeFilterId || undefined),
      ]);

      const summaryData = summaryRes?.data?.data || summaryRes?.data || summaryRes || { products: [], stores: [] };
      const storesData = storesRes?.data?.data || storesRes?.data || storesRes || [];
      const historyData = historyRes?.data?.data || historyRes?.data || historyRes || [];

      setSummary({
        products: Array.isArray(summaryData?.products) ? summaryData.products : [],
        stores: Array.isArray(summaryData?.stores) ? summaryData.stores.filter((store) => store?.deleted !== true) : [],
      });
      setStores(Array.isArray(storesData) ? storesData.filter((store) => store?.deleted !== true) : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu tồn kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeFilterId, user?.role, isSuperAdmin]);

  useEffect(() => {
    if (summary.products.length > 0 && !form.productId) {
      setForm((current) => ({ ...current, productId: String(summary.products[0].productId) }));
    }
    if (summary.products.length > 0 && !selectedProductId) {
      setSelectedProductId(String(summary.products[0].productId));
    }
  }, [summary.products, form.productId, selectedProductId]);

  useEffect(() => {
    if (stores.length > 1 && !form.fromStoreId) {
      setForm((current) => ({
        ...current,
        fromStoreId: String(stores[0].id),
        toStoreId: String(stores[1].id),
      }));
    } else if (stores.length === 1 && !form.fromStoreId) {
      setForm((current) => ({
        ...current,
        fromStoreId: String(stores[0].id),
        toStoreId: String(stores[0].id),
      }));
    }
  }, [stores, form.fromStoreId]);

  useEffect(() => {
    if (!summary.stores.length) {
      setSelectedStoreId('');
      setExpandedProductId('');
      return;
    }

    if (!selectedStoreId || !summary.stores.some((store) => String(store.storeId) === String(selectedStoreId))) {
      setSelectedStoreId(String(summary.stores[0].storeId));
      setExpandedProductId('');
    }
  }, [summary.stores, selectedStoreId]);

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  // Transfer feature removed from UI — handled centrally if needed.

  const storeColumns = useMemo(() => stores.map((store) => ({ id: store.id, name: store.name })), [stores]);

  const metrics = useMemo(() => {
    const totalProducts = Array.isArray(summary.products) ? summary.products.length : 0;
    const totalItems = (Array.isArray(summary.products) ? summary.products : []).reduce(
      (s, p) => s + Number(p.totalQuantity || 0),
      0
    );
    const storesWithStock = (Array.isArray(summary.stores) ? summary.stores : []).filter((st) =>
      Array.isArray(st.products) ? st.products.some((pr) => Number(pr.quantity || 0) > 0) : false
    ).length;
    return { totalProducts, totalItems, storesWithStock };
  }, [summary]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return summary.products;
    return summary.products.filter((item) =>
      [item.productName, item.unit]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [search, summary.products]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return filteredProducts.find((item) => String(item.productId) === String(selectedProductId)) || null;
  }, [filteredProducts, selectedProductId]);

  useEffect(() => {
    if (!filteredProducts.length) {
      setSelectedProductId('');
      return;
    }
    if (!filteredProducts.some((item) => String(item.productId) === String(selectedProductId))) {
      setSelectedProductId(String(filteredProducts[0].productId));
    }
  }, [filteredProducts, selectedProductId]);

  const selectedProductStores = useMemo(() => {
    if (!selectedProduct) return [];
    return storeColumns.map((store) => {
      const matched = selectedProduct.stores?.find((item) => String(item.storeId) === String(store.id));
      return {
        storeId: store.id,
        storeName: store.name,
        quantity: Number(matched?.quantity || 0),
      };
    });
  }, [selectedProduct, storeColumns]);

  const filteredHistory = useMemo(() => {
    const normalizedMonth = historyMonth ? `${historyMonth}-01` : '';
    return history.filter((entry) => {
      const created = entry.createdAt ? new Date(entry.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return false;

      if (historyMode === 'day' && historyDate) {
        const day = historyDate;
        const entryDay = created.toISOString().slice(0, 10);
        return entryDay === day;
      }

      if (historyMode === 'month' && normalizedMonth) {
        const entryMonth = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-01`;
        return entryMonth === normalizedMonth;
      }

      return true;
    });
  }, [history, historyMode, historyDate, historyMonth]);

  const historyLabel = (entry) => {
    if (entry.type === 'IMPORT') return 'Nhập kho';
    if (entry.type === 'EXPORT') return 'Xuất kho';
    if (entry.type === 'TRANSFER') return 'Chuyển kho';
    return entry.type;
  };

  const historyBadgeClass = (type) => {
    if (type === 'IMPORT') return 'bg-emerald-100 text-emerald-700';
    if (type === 'EXPORT') return 'bg-rose-100 text-rose-700';
    if (type === 'TRANSFER') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Tồn kho toàn hệ thống</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">SUPER_ADMIN quản lý toàn bộ kho</h2>
        <p className="mt-2 text-sm text-slate-500">Xem tồn kho toàn hệ thống, xem từng kho và theo dõi lịch sử nhập xuất.</p>
      </div>

      {isStoreMode && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Bạn đang chọn một cửa hàng. Trang hiện tại vẫn giữ nguyên, nhưng dữ liệu sẽ đi theo cửa hàng đang giả lập.
        </div>
      )}



      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Warehouse size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
          placeholder="Tìm sản phẩm trong tồn kho..."
        />
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Tải lại
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'summary', label: 'Xem tồn kho toàn hệ thống' },
          { key: 'stores', label: 'Xem tồn kho theo từng cửa hàng' },
          { key: 'history', label: 'Lịch sử nhập xuất' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === item.key ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Đang tải dữ liệu tồn kho...</div>
      ) : (
        <>
          {tab === 'summary' && (
            <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Sản phẩm</h3>
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.productId}
                      type="button"
                      onClick={() => setSelectedProductId(String(product.productId))}
                      className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${String(selectedProductId) === String(product.productId) ? 'bg-blue-50/70' : 'bg-white'}`}
                    >
                      <p className="font-semibold text-slate-900">{product.productName}</p>
                      <p className="text-xs text-slate-500">Tổng tồn: {product.totalQuantity || 0}</p>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="px-5 py-10 text-sm text-slate-500">Chưa có dữ liệu tồn kho phù hợp.</div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {!selectedProduct ? (
                  <div className="px-6 py-12 text-center text-slate-500">Chọn một sản phẩm để xem chi tiết tồn kho theo từng cửa hàng.</div>
                ) : (
                  <>
                    <div className="border-b border-slate-100 px-6 py-5">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Chi tiết tồn kho</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-900">Tên: {selectedProduct.productName}</h3>
                    </div>
                    <div className="px-6 py-5">
                      <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                        {selectedProductStores.map((row) => (
                          <div key={row.storeId} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm">
                            <span className="font-semibold text-slate-700">{row.storeName || `Store ${row.storeId}`}</span>
                            <span className="font-black text-slate-900">{row.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-lg font-black text-slate-900">Tổng tồn kho: {selectedProduct.totalQuantity || 0}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'stores' && (
            <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Danh sách cửa hàng</h3>
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {summary.stores.map((store) => (
                    <button
                      key={store.storeId}
                      type="button"
                      onClick={() => {
                        setSelectedStoreId(String(store.storeId));
                        setExpandedProductId('');
                      }}
                      className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${String(selectedStoreId) === String(store.storeId) ? 'bg-blue-50/70' : 'bg-white'}`}
                    >
                      <p className="font-semibold text-slate-900">{store.storeName}</p>
                      <p className="text-xs text-slate-500">{store.address || 'Không có địa chỉ'}</p>
                    </button>
                  ))}
                  {summary.stores.length === 0 && (
                    <div className="px-5 py-10 text-sm text-slate-500">Chưa có dữ liệu cửa hàng.</div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {!summary.stores.length ? (
                  <div className="px-6 py-12 text-center text-slate-500">Chọn một cửa hàng để xem chi tiết.</div>
                ) : (
                  (() => {
                    const selectedStore = summary.stores.find((s) => String(s.storeId) === String(selectedStoreId)) || summary.stores[0];

                    return (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Chi tiết kho</p>
                            <h3 className="mt-2 text-2xl font-black text-slate-900">{selectedStore.storeName}</h3>
                          </div>
                          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            {selectedStore.products?.length || 0} sản phẩm
                          </div>
                        </div>
                        <div className="max-h-[520px] overflow-y-auto px-6 py-5">
                          <div className="space-y-3">
                            {(selectedStore.products || []).map((product) => (
                              <div key={product.productId} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden transition-all duration-200">
                                <button
                                  type="button"
                                  onClick={() => setExpandedProductId(expandedProductId === String(product.productId) ? '' : String(product.productId))}
                                  className="flex w-full items-center justify-between bg-white px-5 py-4 text-left hover:bg-slate-50"
                                >
                                  <div>
                                    <p className="font-semibold text-slate-900">{product.productName}</p>
                                    <p className="text-xs text-slate-500">Tồn kho: <span className="font-bold text-blue-600">{product.quantity || 0}</span> {product.unit || 'đv'}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-slate-700">{currency.format(Number(product.price || 0))}</p>
                                    <p className="text-[10px] uppercase text-slate-400">Xem chi tiết lô</p>
                                  </div>
                                </button>

                                {expandedProductId === String(product.productId) && (
                                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số lượng lô cũ</p>
                                        <p className="mt-1 text-lg font-black text-slate-700">{product.oldBatchQuantity || 0}</p>
                                      </div>
                                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Số lượng lô mới (đợi hàng)</p>
                                        <p className="mt-1 text-lg font-black text-amber-600">{product.newBatchQuantity || 0}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {(selectedStore.products || []).length === 0 && (
                              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                                Cửa hàng này chưa có sản phẩm nào.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* Transfer UI removed */}

          {tab === 'history' && (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Lịch sử nhập xuất</h3>
                  <p className="text-xs text-slate-500">Dữ liệu nhập kho, bán hàng và chuyển kho</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={historyMode}
                    onChange={(e) => setHistoryMode(e.target.value)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">Tất cả</option>
                    <option value="day">Theo ngày</option>
                    <option value="month">Theo tháng</option>
                  </select>

                  {historyMode === 'day' && (
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                      <CalendarDays size={14} className="text-slate-400" />
                      <input
                        type="date"
                        value={historyDate}
                        onChange={(e) => setHistoryDate(e.target.value)}
                        className="text-xs font-semibold text-slate-700 outline-none"
                      />
                    </div>
                  )}

                  {historyMode === 'month' && (
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                      <CalendarDays size={14} className="text-slate-400" />
                      <input
                        type="month"
                        value={historyMonth}
                        onChange={(e) => setHistoryMonth(e.target.value)}
                        className="text-xs font-semibold text-slate-700 outline-none"
                      />
                    </div>
                  )}

                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{filteredHistory.length} bản ghi</div>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredHistory.map((entry) => (
                  <div key={`${entry.type}-${entry.id}-${entry.createdAt}`} className="p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full px-3 py-1 text-xs font-bold ${historyBadgeClass(entry.type)}`}>
                        {historyLabel(entry)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {entry.type === 'TRANSFER'
                            ? `${entry.fromStoreName || '-'} → ${entry.toStoreName || '-'}`
                            : `${entry.storeName || '-'} ${entry.type === 'IMPORT' ? 'nhập' : 'xuất'}`}
                        </p>
                        <p className="text-sm text-slate-600">{entry.productName} : {entry.quantity}</p>
                        {entry.note && <p className="text-xs text-slate-400 mt-1">{entry.note}</p>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 md:text-right">
                      <p>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('vi-VN') : ''}</p>
                      {entry.referenceCode && <p className="font-semibold text-slate-700">#{entry.referenceCode}</p>}
                    </div>
                  </div>
                ))}
                {filteredHistory.length === 0 && (
                  <div className="p-10 text-center text-slate-500">Chưa có lịch sử nhập xuất nào phù hợp bộ lọc.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Field = ({ label, ...props }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
    />
  </div>
);

const SelectField = ({ label, children, ...props }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    <select
      {...props}
      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
    >
      {children}
    </select>
  </div>
);

export default AdminInventory;