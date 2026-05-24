import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import stockReceiptService from '../../services/StockReceipt';

const emptyItem = { productId: '', productName: '', quantity: 1, price: 0, unit: '', manufactureDate: '', expiryDate: '' };

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
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [productSuggestionsIndex, setProductSuggestionsIndex] = useState(-1);
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
      axios.get('/products').then(res => {
        const data = res?.data?.data || res?.data || res;
        setAllProducts(Array.isArray(data) ? data : []);
      });
    });
  }, []);

  const totalPrice = useMemo(() => {
    return form.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );
  }, [form.items]);

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

    const payload = {
      code: form.code.trim(),
      supplierId: Number(form.supplierId),
      supplier: form.supplierName.trim(),
      note: form.note.trim(),
      items: form.items.map((item) => {
        const product = allProducts.find(p => p.id === item.productId);
        let finalQuantity = Number(item.quantity);
        let finalPrice = Number(item.price);
        
        if (product) {
          const selectedUnit = product.units?.find(u => u.name === item.unit);
          if (selectedUnit && selectedUnit.conversionRate > 0) {
            finalQuantity = Number(item.quantity) * selectedUnit.conversionRate;
            finalPrice = Number(item.price) / selectedUnit.conversionRate;
          }
        }
        
        return {
          productId: Number(item.productId),
          quantity: finalQuantity,
          price: finalPrice,
          unit: product ? (product.unit || 'chai') : item.unit,
          manufactureDate: item.manufactureDate,
          expiryDate: item.expiryDate,
        };
      }),
    };

    try {
      await stockReceiptService.create(payload);
      toast.success('Stock receipt created successfully');
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
      <div className="rounded-3xl bg-slate-950 p-6 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Nhập kho</p>
        <h2 className="mt-2 text-2xl font-black">Tạo phiếu nhập kho</h2>
        <p className="mt-2 text-sm text-white/70">Nhập supplierId và thông tin item để cập nhật tồn kho.</p>
      </div>

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
              <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1fr_1.1fr_1.1fr_1.1fr_auto] items-start">
                <div className="relative">
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
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
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
                            setProductSuggestionsIndex(-1);
                          }}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Đơn vị */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Đơn vị *</label>
                  {(() => {
                    const product = allProducts.find(p => p.id === item.productId);
                    if (product) {
                      const baseUnit = product.unit || 'chai';
                      const extraUnits = product.units || [];
                      return (
                        <select
                          value={item.unit || baseUnit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 bg-white"
                        >
                          <option value={baseUnit}>{baseUnit} (Gốc)</option>
                          {extraUnits.map(u => (
                            <option key={u.name} value={u.name}>{u.name} (x{u.conversionRate})</option>
                          ))}
                        </select>
                      );
                    } else {
                      return (
                        <select
                          disabled
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400 outline-none"
                        >
                          <option>Chọn sản phẩm...</option>
                        </select>
                      );
                    }
                  })()}
                </div>

                {/* Số lượng */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Số lượng {item.unit ? `(${item.unit})` : ''} *</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                    required
                  />
                  {(() => {
                    const product = allProducts.find(p => p.id === item.productId);
                    if (product) {
                      const selectedUnit = product.units?.find(u => u.name === item.unit);
                      if (selectedUnit && selectedUnit.conversionRate > 1) {
                        const baseQuantity = Number(item.quantity || 0) * selectedUnit.conversionRate;
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
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Giá nhập {item.unit ? `(${item.unit})` : ''} *</label>
                  <input
                    type="number"
                    min="0"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                    required
                  />
                  {(() => {
                    const product = allProducts.find(p => p.id === item.productId);
                    if (product) {
                      const selectedUnit = product.units?.find(u => u.name === item.unit);
                      if (selectedUnit && selectedUnit.conversionRate > 1) {
                        const basePrice = Number(item.price || 0) / selectedUnit.conversionRate;
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
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Thành tiền {item.unit ? `(${item.unit})` : ''}</label>
                  <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 h-[46px] flex items-center justify-start truncate">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.quantity || 0) * Number(item.price || 0))}
                  </div>
                </div>

                <Field
                  label="NSX"
                  type="date"
                  value={item.manufactureDate}
                  onChange={(event) => handleItemChange(index, 'manufactureDate', event.target.value)}
                  required
                />
                <Field
                  label="HSD"
                  type="date"
                  value={item.expiryDate}
                  onChange={(event) => handleItemChange(index, 'expiryDate', event.target.value)}
                  required
                />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-transparent select-none">Hành động</label>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="h-[46px] w-full flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition whitespace-nowrap"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-700">Tổng cộng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
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

export default AdminStockReceiptForm;
