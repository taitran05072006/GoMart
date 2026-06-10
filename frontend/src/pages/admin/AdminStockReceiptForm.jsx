import React, { useMemo, useState, useEffect, useContext } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import stockReceiptService from '../../services/StockReceipt';
import { AuthContext } from '../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const emptyItem = { productId: '', productName: '', quantity: 1, price: 0, unit: '', manufactureDate: '', expiryDate: '', importUnitTypeId: '', importConversionRate: 1 };

const AdminStockReceiptForm = () => {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    supplierId: '',
    supplierName: '',
    note: '',
    items: [{ ...emptyItem }],
  });
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allImportUnitTypes, setAllImportUnitTypes] = useState([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [productSuggestionsIndex, setProductSuggestionsIndex] = useState(-1);
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const isGlobalMode = user?.role === 'SUPER_ADMIN' && !impersonatedStoreId;

  const selectedStoreId = user?.role === 'SUPER_ADMIN' ? impersonatedStoreId : user?.storeId;
  const canCreateReceipt = Boolean(selectedStoreId);
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSupplierSuggestions(false);
      setProductSuggestionsIndex(-1);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    // Load suppliers
    import('../../api/axiosClient').then(({ default: axios }) => {
      axios.get('/suppliers').then(res => {
        const data = res?.data?.data || res?.data || res;
        setAllSuppliers(Array.isArray(data) ? data : []);
      });
    });
  }, []);

  useEffect(() => {
    if (!selectedStoreId) {
      setAllProducts([]);
      return;
    }
    import('../../api/axiosClient').then(({ default: axios }) => {
      axios.get(`/stores/${selectedStoreId}/products?includeOutOfStock=true`).then(res => {
        const data = res?.data?.data || res?.data || res;
        setAllProducts(Array.isArray(data) ? data : []);
      }).catch(err => {
        console.error(err);
        setAllProducts([]);
      });
    });
  }, [selectedStoreId]);

  // Load import unit types for datalist suggestions
  useEffect(() => {
    import('../../services/importUnitTypeService').then(({ default: s }) => {
      s.getAll().then(res => {
        const data = res?.data?.data || res?.data || res;
        setAllImportUnitTypes(Array.isArray(data) ? data : []);
      }).catch(() => setAllImportUnitTypes([]));
    }).catch(() => setAllImportUnitTypes([]));
  }, []);

  const totalPrice = useMemo(() => {
    return form.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );
  }, [form.items]);

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'STORE_ADMIN') {
    return <Navigate to="/admin/store-products" replace />;
  }

  if (isGlobalMode) {
    return <Navigate to="/admin/stock-receipts" replace />;
  }

  const handleRootChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleItemChange = (index, key, value) => {
    setForm((current) => {
      const nextItems = [...current.items];
      nextItems[index] = { ...nextItems[index], [key]: value };
      return { ...current, items: nextItems };
    });
  };

  const addItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }));
  };

  const removeItem = (index) => {
    setForm((current) => {
      if (current.items.length === 1) {
        return current;
      }
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, items: nextItems };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error('Mã phiếu nhập là bắt buộc');
      return;
    }
    if (!form.supplierId) {
      toast.error('Vui lòng chọn nhà cung cấp');
      return;
    }

    const invalidItem = form.items.find(
      (item) => !item.productId || Number(item.quantity) <= 0 || Number(item.price) <= 0
    );

    if (invalidItem) {
      toast.error('Mỗi item cần có productId, số lượng > 0, giá > 0');
      return;
    }

    setSaving(true);

    if (!selectedStoreId) {
      toast.error('Vui lòng chọn một cửa hàng trước khi tạo phiếu nhập');
      return;
    }

    const payload = {
      code: form.code.trim(),
      supplierId: Number(form.supplierId),
      supplier: form.supplierName.trim(),
      note: form.note.trim(),
      storeId: Number(selectedStoreId),
      items: form.items.map((item) => {
        const product = allProducts.find(p => p.id === item.productId);
        const conv = Number(item.importConversionRate) || 1;

        // Map typed import unit name to existing importUnitType id if available
        const matched = allImportUnitTypes.find(u => u.name === (item.importUnitName || ''));

        return {
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          price: Number(item.price),
          unit: item.unit || (product ? (product.unit || 'chai') : 'chai'),
          manufactureDate: item.manufactureDate || null,
          expiryDate: item.expiryDate || null,
          importUnitTypeId: matched ? Number(matched.id) : (item.importUnitTypeId ? Number(item.importUnitTypeId) : null),
          importConversionRate: conv,
        };
      }),
    };

    try {
      const resp = await stockReceiptService.create(payload);
      const created = resp?.data?.data || resp?.data || resp;
      toast.success(created?.status === 'PENDING' ? 'Phiếu nhập đã tạo, chờ SUPER_ADMIN duyệt' : 'Đã tạo phiếu nhập');

      navigate('/admin/stock-receipts');
    } catch (error) {
      console.error(error);
      toast.error('Unable to create stock receipt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 hover:shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
      </div>

      {!canCreateReceipt && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Hãy chọn một cửa hàng trước. Phiếu nhập được tạo theo cửa hàng và <strong>SUPER_ADMIN</strong> sẽ duyệt để cập nhật tồn kho.
        </div>
      )}
      <div className="rounded-3xl bg-slate-950 p-6 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Nhập kho</p>
        <h2 className="mt-2 text-2xl font-black">Tạo phiếu nhập kho</h2>
        <p className="mt-2 text-sm text-white/70">Nhập supplierId và thông tin item để cập nhật tồn kho.</p>
      </div>

      <fieldset disabled={!canCreateReceipt}>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Mã phiếu" name="code" value={form.code} onChange={handleRootChange} required />
          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Nhà cung cấp *</label>
            <input
              type="text"
              placeholder="Nhập tên nhà cung cấp..."
              value={form.supplierName}
              onChange={(e) => {
                const val = e.target.value;
                setForm(f => ({ ...f, supplierName: val, supplierId: '' }));
                setShowSupplierSuggestions(true);
              }}
              onFocus={() => setShowSupplierSuggestions(true)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
            />
            {showSupplierSuggestions && form.supplierName && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {allSuppliers.filter(s => s.name.toLowerCase().includes(form.supplierName.toLowerCase())).map(s => (
                  <div
                    key={s.id}
                    className="p-2 hover:bg-slate-50 cursor-pointer text-sm"
                    onClick={() => {
                      setForm(f => ({ ...f, supplierId: s.id, supplierName: s.name }));
                      setShowSupplierSuggestions(false);
                    }}
                  >
                    {s.name} ({s.phone})
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Ghi chú</label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleRootChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Chi tiết phiếu nhập</h3>
            <button
              type="button"
              onClick={addItem}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Thêm item
            </button>
          </div>

          <div className="space-y-3">
            {form.items.map((item, index) => (
              <div key={index} className="grid gap-x-4 gap-y-5 rounded-2xl border border-slate-200 p-5 lg:grid-cols-12 items-start bg-slate-50/50">
                <div className="relative lg:col-span-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Sản phẩm *</label>
                  <input
                    type="text"
                    placeholder="Tên sản phẩm..."
                    value={item.productName}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleItemChange(index, 'productName', val);
                      handleItemChange(index, 'productId', '');
                      setProductSuggestionsIndex(index);
                    }}
                    onFocus={() => setProductSuggestionsIndex(index)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 bg-white"
                  />
                  {productSuggestionsIndex === index && item.productName && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {allProducts.filter(p => p.name.toLowerCase().includes(item.productName.toLowerCase())).map(p => (
                        <div
                          key={p.id}
                          className="p-2 hover:bg-slate-50 cursor-pointer text-xs"
                          onClick={() => {
                            handleItemChange(index, 'productId', p.id);
                            handleItemChange(index, 'productName', p.name);
                            handleItemChange(index, 'unit', p.unit || '');
                            if (p.importUnits && p.importUnits.length > 0) {
                              const firstUnit = p.importUnits[0];
                              handleItemChange(index, 'importUnitTypeId', firstUnit.importUnitTypeId || '');
                              handleItemChange(index, 'importUnitName', firstUnit.name || '');
                              handleItemChange(index, 'importConversionRate', firstUnit.conversionRate || 1);
                              // Auto populate costPrice if available
                              if (firstUnit.costPrice) {
                                handleItemChange(index, 'price', firstUnit.costPrice);
                              }
                            } else {
                              handleItemChange(index, 'importUnitTypeId', p.importUnitTypeId || '');
                              handleItemChange(index, 'importUnitName', p.importUnitName || '');
                              handleItemChange(index, 'importConversionRate', p.importConversionRate || 1);
                            }
                            setProductSuggestionsIndex(-1);
                          }}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Đơn vị (hiển thị/nhập) */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Đơn vị</label>
                  <input
                    type="text"
                    value={item.unit || ''}
                    readOnly
                    placeholder="e.g. chai"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                {/* Đơn vị nhập (gõ hoặc chọn) */}
                <div className="lg:col-span-3">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Đơn vị nhập</label>
                  <div>
                    {(() => {
                      const product = allProducts.find(p => p.id === item.productId);
                      if (product && product.importUnits && product.importUnits.length > 0) {
                        return (
                          <select
                            value={item.importUnitName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemChange(index, 'importUnitName', val);
                              const matchedUnit = product.importUnits.find(u => u.name === val);
                              if (matchedUnit) {
                                handleItemChange(index, 'importConversionRate', matchedUnit.conversionRate || 1);
                                handleItemChange(index, 'importUnitTypeId', matchedUnit.importUnitTypeId || '');
                                if (matchedUnit.costPrice) {
                                  handleItemChange(index, 'price', matchedUnit.costPrice);
                                }
                              }
                            }}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 bg-white"
                          >
                            <option value="">-- Chọn đơn vị --</option>
                            {product.importUnits.map((u, i) => (
                              <option key={i} value={u.name}>{u.name} (x{u.conversionRate})</option>
                            ))}
                          </select>
                        );
                      }
                      return (
                        <>
                          <input
                            type="text"
                            list={`importUnitList-${index}`}
                            placeholder="Nhập đơn vị..."
                            value={item.importUnitName || ''}
                            onChange={(e) => handleItemChange(index, 'importUnitName', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 bg-white"
                          />
                          <datalist id={`importUnitList-${index}`}>
                            {Array.from(new Set(allImportUnitTypes.map(u => u.name))).filter(Boolean).map((name, i) => (
                              <option key={i} value={name} />
                            ))}
                          </datalist>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Số lượng */}
                <div className="lg:col-span-3">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Số lượng *</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 bg-white"
                    required
                  />
                  {(() => {
                    const product = allProducts.find(p => p.id === item.productId);
                    if (product) {
                      const conv = Number(item.importConversionRate) || 1;
                      if (conv && conv > 0) {
                        const baseQuantity = Math.round(Number(item.quantity || 0) * conv);
                        return (
                          <p className="mt-1 text-[11px] font-bold text-amber-600">
                            (= {baseQuantity} {product.unit || 'chai'})
                          </p>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>

                {/* Giá nhập */}
                <div className="lg:col-span-3">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Giá nhập *</label>
                  <input
                    type="number"
                    min="0"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 bg-white"
                    required
                  />
                  {(() => {
                    const product = allProducts.find(p => p.id === item.productId);
                    if (product) {
                      const conv = Number(item.importConversionRate) || 1;
                      if (conv && conv > 0) {
                        const basePrice = Number(item.price || 0) / conv;
                        return (
                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            (= {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(basePrice)} / {product.unit || 'chai'})
                          </p>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>

                {/* Thành tiền */}
                <div className="lg:col-span-3">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Thành tiền</label>
                  <div className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 h-[46px] flex items-center justify-start truncate">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.quantity || 0) * Number(item.price || 0))}
                  </div>
                </div>

                <Field
                  label="NSX"
                  type="date"
                  value={item.manufactureDate}
                  onChange={(event) => handleItemChange(index, 'manufactureDate', event.target.value)}
                  wrapperClassName="lg:col-span-2"
                  required
                />
                <Field
                  label="HSD"
                  type="date"
                  value={item.expiryDate}
                  onChange={(event) => handleItemChange(index, 'expiryDate', event.target.value)}
                  wrapperClassName="lg:col-span-2"
                  required
                />
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-transparent select-none">Hành động</label>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="h-[46px] w-full flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition whitespace-nowrap"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-bold text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
          >
            + Thêm item mới
          </button>

          <p className="mt-4 text-sm font-semibold text-slate-700">Tổng cộng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !canCreateReceipt}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Đang lưu...' : 'Tạo phiếu nhập'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/stock-receipts')}
            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hủy bỏ
          </button>
        </div>
        </form>
      </fieldset>
    </div>
  );
};

const Field = ({ label, wrapperClassName, ...props }) => (
  <div className={wrapperClassName}>
    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    <input
      {...props}
      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 bg-white"
    />
  </div>
);

export default AdminStockReceiptForm;
