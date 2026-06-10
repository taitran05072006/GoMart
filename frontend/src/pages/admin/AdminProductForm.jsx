import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';
import importUnitTypeService from '../../services/importUnitTypeService';
import { ArrowLeft } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const emptyForm = {
  name: '',
  imageUrl: '',
  price: '',
  oldPrice: '',
  discount: '',
  tag: '',
  unit: '',
  stock: '',
  description: '',
  categoryId: '',
  oldBatchQuantity: 0,
  newBatchQuantity: 0,
  manufactureDate: '',
  expiryDate: '',
  importUnitTypeId: '',
  importConversionRate: 1,
  importUnits: [],
  units: [],
};

const formatDateForInput = (dateVal) => {
  if (!dateVal) return '';
  if (Array.isArray(dateVal)) {
    const [y, m, d] = dateVal;
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  if (typeof dateVal === 'string') {
    return dateVal.slice(0, 10);
  }
  return '';
};

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [importUnitTypes, setImportUnitTypes] = useState([]);
  const [showBatchDetails, setShowBatchDetails] = useState(true);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const targetStoreId = user?.role === 'STORE_ADMIN' && user?.storeId ? user.storeId : (user?.role === 'SUPER_ADMIN' && impersonatedStoreId ? impersonatedStoreId : null);

        const [categoriesResponse, unitTypesResponse, productResponse] = await Promise.all([
          categoryService.getAll(),
          importUnitTypeService.getAll(),
          isEdit ? productService.getById(id, targetStoreId) : Promise.resolve(null),
        ]);

        const categoryData = categoriesResponse?.data?.data || categoriesResponse?.data || categoriesResponse || [];
        setCategories(Array.isArray(categoryData) ? categoryData : []);

        const unitTypesData = unitTypesResponse?.data?.data || unitTypesResponse?.data || unitTypesResponse || [];
        setImportUnitTypes(Array.isArray(unitTypesData) ? unitTypesData : []);

        if (productResponse) {
          const productData = productResponse?.data?.data || productResponse?.data || productResponse;
          setForm({
            name: productData?.name || '',
            imageUrl: productData?.imageUrl || '',
            price: productData?.price ?? '',
            oldPrice: productData?.oldPrice ?? '',
            discount: productData?.discount ?? '',
            reviews: productData?.reviews ?? '',
            tag: productData?.tag || '',
            unit: productData?.unit || '',
            stock: productData?.stock ?? '',
            description: productData?.description || '',
            categoryId: productData?.categoryId ?? productData?.category?.id ?? '',
            oldBatchQuantity: productData?.oldBatchQuantity ?? 0,
            newBatchQuantity: productData?.newBatchQuantity ?? 0,
            manufactureDate: formatDateForInput(productData?.manufactureDate),
            expiryDate: formatDateForInput(productData?.expiryDate),
            importUnitTypeId: productData?.importUnitTypeId || '',
            importConversionRate: productData?.importConversionRate ?? 1,
            importUnits: (Array.isArray(productData?.importUnits) && productData.importUnits.length > 0) ? productData.importUnits : (productData?.importUnitTypeId || productData?.importUnitName ? [{ importUnitTypeId: productData.importUnitTypeId, conversionRate: productData.importConversionRate ?? 1, name: productData.importUnitName || '' }] : []),
            units: productData?.units || [],
          });
        }
      } catch (error) {
        console.error(error);
        toast.error('Lấy dữ liệu thất bại');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit]);

  // Logic tự động tính toán stock khi thay đổi batch hoặc ngược lại
  const handleStockLogic = (name, value) => {
    const numValue = Number(value) || 0;

    if (name === 'oldBatchQuantity') {
      const newStock = numValue + (Number(form.newBatchQuantity) || 0);
      setForm(prev => ({ ...prev, oldBatchQuantity: numValue, stock: newStock }));
    } else if (name === 'newBatchQuantity') {
      const newStock = (Number(form.oldBatchQuantity) || 0) + numValue;
      setForm(prev => ({ ...prev, newBatchQuantity: numValue, stock: newStock }));
    } else if (name === 'stock') {
      // Khi chỉnh stock trực tiếp, ưu tiên giữ nguyên lô cũ và cập nhật lô mới
      const oldQty = Number(form.oldBatchQuantity) || 0;
      const newQty = numValue - oldQty;
      setForm(prev => ({
        ...prev,
        stock: numValue,
        newBatchQuantity: newQty >= 0 ? newQty : 0
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (['stock', 'oldBatchQuantity', 'newBatchQuantity'].includes(name)) {
      handleStockLogic(name, value);
    } else if (['oldPrice', 'discount'].includes(name)) {
      const numValue = Number(value) || 0;
      const currentOldPrice = name === 'oldPrice' ? numValue : (Number(form.oldPrice) || 0);
      const currentDiscount = name === 'discount' ? numValue : (Number(form.discount) || 0);

      // price = oldPrice * (1 - discount/100)
      const calculatedPrice = Math.round(currentOldPrice * (1 - currentDiscount / 100));

      setForm(prev => ({
        ...prev,
        [name]: value,
        price: calculatedPrice
      }));
    } else {
      setForm((current) => ({ ...current, [name]: value }));
    }
  };

  const isGlobalModeForSuper = user?.role === 'SUPER_ADMIN' && !impersonatedStoreId;
  const isStoreMode = user?.role === 'STORE_ADMIN' || (user?.role === 'SUPER_ADMIN' && Boolean(impersonatedStoreId));

  const handleSubmit = async (event) => {
    event.preventDefault();

    // RÀNG BUỘC TỒN KHO: stock = old + new
    const currentStock = Number(form.stock);
    const oldQty = Number(form.oldBatchQuantity);
    const newQty = Number(form.newBatchQuantity);

    if (!isGlobalModeForSuper && currentStock !== (oldQty + newQty)) {
      toast.error(`Lỗi tồn kho: Tổng tồn kho (${currentStock}) phải bằng Lô cũ (${oldQty}) + Lô mới (${newQty})`);
      return;
    }

    setSaving(true);
    // Build importUnits payload: map typed names to existing importUnitType ids when possible
    const importUnitsPayload = (form.importUnits || []).map(iu => {
      const matched = importUnitTypes.find(u => u.name === (iu.name || ''));
      return {
        importUnitTypeId: matched ? Number(matched.id) : null,
        name: iu.name || null,
        conversionRate: iu.conversionRate ? Number(iu.conversionRate) : 1,
      };
    });

    // Backward-compatible single importUnitTypeId/importConversionRate: use first entry if present
    const firstImport = importUnitsPayload[0];
    const payload = {
      name: form.name.trim(),
      imageUrl: form.imageUrl.trim(),
      price: Number(form.price),
      oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice),
      discount: form.discount === '' ? null : Number(form.discount),
      tag: form.tag.trim(),
      unit: form.unit.trim(),
      stock: currentStock,
      description: form.description.trim(),
      categoryId: Number(form.categoryId),
      oldBatchQuantity: oldQty,
      newBatchQuantity: newQty,
      manufactureDate: form.manufactureDate || null,
      expiryDate: form.expiryDate || null,
      importUnitTypeId: firstImport ? firstImport.importUnitTypeId : null,
      importUnitName: firstImport ? firstImport.name : null,
      importConversionRate: firstImport ? firstImport.conversionRate : (form.importConversionRate ? Number(form.importConversionRate) : 1),
      importUnits: importUnitsPayload,
      units: form.units.map(u => ({
        ...u,
        price: u.oldPrice !== undefined ? u.oldPrice : u.price
      })),
    };

      // If SUPER_ADMIN is editing in "Toàn hệ thống" (no impersonated store), prevent inventory fields from being sent.
      if (isEdit && isGlobalModeForSuper) {
        delete payload.stock;
        delete payload.oldBatchQuantity;
        delete payload.newBatchQuantity;
      }

    try {
      if (isEdit) {
        // If editing within a specific store (store admin or super admin impersonating a store), update for store
        const targetStoreId = user?.role === 'STORE_ADMIN' && user?.storeId ? user.storeId : (user?.role === 'SUPER_ADMIN' && impersonatedStoreId ? impersonatedStoreId : null);
        if (targetStoreId) {
          await productService.updateForStore(id, payload, targetStoreId);
        } else {
          await productService.update(id, payload);
        }
      } else {
        const targetStoreId = user?.role === 'STORE_ADMIN' && user?.storeId ? user.storeId : (user?.role === 'SUPER_ADMIN' && impersonatedStoreId ? impersonatedStoreId : null);
        await productService.create(payload, targetStoreId);

      }
      navigate('/admin/products');
    } catch (error) {
      console.error(error);
      toast.error('Không thể lưu sản phẩm vào lúc này');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-slate-500">Đang tải biểu mẫu...</div>;
  }

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

      <div className="rounded-3xl bg-slate-950 p-6 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Quản lý sản phẩm</p>
        <h2 className="mt-2 text-2xl font-black">{isEdit ? 'Chỉnh sửa sản phẩm' : 'Tạo mới sản phẩm'}</h2>
        <p className="mt-2 text-sm text-white/70">Cập nhật thông tin chi tiết và quản lý tồn kho theo lô.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 grid gap-4 lg:grid-cols-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="lg:col-span-2 text-sm font-bold uppercase tracking-widest text-slate-900 border-b border-slate-50 pb-2">Thông tin cơ bản</h3>
          <Field label="Tên sản phẩm" name="name" value={form.name} onChange={handleChange} required disabled={isStoreMode} />
          <Field label="Danh mục" name="categoryId" value={form.categoryId} onChange={handleChange} as="select" required disabled={isStoreMode}>
            {!isEdit && <option value="">-- Chọn danh mục --</option>}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Field>
          <Field label="Giá (VNĐ) *" name="oldPrice" type="number" min="0" value={form.oldPrice} onChange={handleChange} required />
          <Field label="Đơn vị tính" name="unit" value={form.unit} onChange={handleChange} placeholder="vd: kg, hộp, cái..." disabled={isStoreMode} />
          <Field label="URL Hình ảnh" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="Nhập link ảnh sản phẩm..." disabled={isStoreMode} />

        </div>

        <div className="lg:col-span-2 grid gap-4 lg:grid-cols-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="lg:col-span-2 text-sm font-bold uppercase tracking-widest text-slate-900 border-b border-slate-50 pb-2">Quản lý tồn kho & Date</h3>

          <div className="space-y-2">
            <Field
              label="TỔNG TỒN KHO"
              name="stock"
              type="number"
              value={form.stock}
              onChange={handleChange}
              required
              className="font-bold text-blue-600 text-lg bg-blue-50/30"
              disabled={isGlobalModeForSuper}
            />
            {isGlobalModeForSuper && (
              <p className="text-xs text-amber-600 mt-2">Bạn đang ở chế độ Toàn hệ thống — không thể chỉnh tồn kho ở đây. Chỉnh giá sẽ áp dụng cho toàn hệ thống.</p>
            )}
          </div>

          {!isGlobalModeForSuper && (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <Field label="Số lượng lô cũ" name="oldBatchQuantity" type="number" min="0" value={form.oldBatchQuantity} onChange={handleChange} />
              <Field label="Số lượng lô mới" name="newBatchQuantity" type="number" min="0" value={form.newBatchQuantity} onChange={handleChange} />
            </div>
          )}

          <div className="invisible h-0 overflow-hidden">
            <Field label="Giá gốc (VNĐ)" name="oldPrice" type="number" min="0" value={form.oldPrice} onChange={handleChange} />
          </div>
          <Field label="Giảm giá (%)" name="discount" type="number" min="0" max="100" value={form.discount} onChange={handleChange} />
          <Field label="Ngày sản xuất" name="manufactureDate" type="date" value={form.manufactureDate} onChange={handleChange} disabled={isStoreMode} />
          <Field label="Ngày hết hạn" name="expiryDate" type="date" value={form.expiryDate} onChange={handleChange} disabled={isStoreMode} />

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Đơn vị nhập (các tùy chọn)</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, importUnits: [...(Array.isArray(f.importUnits) ? f.importUnits : []), { name: '', importUnitTypeId: '', conversionRate: 1 }] }))}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + THÊM ĐƠN VỊ NHẬP
              </button>
            </div>
            <div className="space-y-3">
              {(Array.isArray(form.importUnits) ? form.importUnits : []).map((iu, idx) => (
                <div key={idx} className="flex gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Tên đơn vị nhập</label>
                    <input
                      list={`importUnitTypeList-${idx}`}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="vd: Thùng"
                      value={iu.name}
                      onChange={(e) => {
                        const newImportUnits = form.importUnits.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        );
                        setForm(f => ({ ...f, importUnits: newImportUnits }));
                      }}
                    />
                    <datalist id={`importUnitTypeList-${idx}`}>
                      {Array.from(new Set(importUnitTypes.map(u => u.name))).filter(Boolean).map((name, i) => (
                        <option key={i} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="w-32">
                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Quy đổi</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={iu.conversionRate}
                      onChange={(e) => {
                        const newImportUnits = form.importUnits.map((item, i) =>
                          i === idx ? { ...item, conversionRate: Number(e.target.value) } : item
                        );
                        setForm(f => ({ ...f, importUnits: newImportUnits }));
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, importUnits: (Array.isArray(f.importUnits) ? f.importUnits : []).filter((_, i) => i !== idx) }))}
                    className="p-2 text-slate-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Quy đổi đơn vị & Giá</h3>
            {(user?.role === 'SUPER_ADMIN') && (
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, units: [...(Array.isArray(f.units) ? f.units : []), { name: '', conversionRate: 1, price: 0 }] }))}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + THÊM ĐƠN VỊ
              </button>
            )}
          </div>
          <div className="space-y-3">
            {(Array.isArray(form.units) ? form.units : []).map((u, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Tên đơn vị</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="vd: Thùng"
                    value={u.name}
                    disabled={isStoreMode && user?.role !== 'SUPER_ADMIN'}
                    onChange={(e) => {
                      const newUnits = form.units.map((u2, i) =>
                        i === idx ? { ...u2, name: e.target.value } : u2
                      );
                      setForm(f => ({ ...f, units: newUnits }));
                    }}
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Quy đổi</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="vd: 24"
                    value={u.conversionRate}
                    disabled={isStoreMode && user?.role !== 'SUPER_ADMIN'}
                    onChange={(e) => {
                      const newUnits = form.units.map((u2, i) =>
                        i === idx ? { ...u2, conversionRate: Number(e.target.value) } : u2
                      );
                      setForm(f => ({ ...f, units: newUnits }));
                    }}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Giá gốc</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-red-600"
                    value={u.oldPrice !== undefined ? u.oldPrice : u.price}
                    disabled={isStoreMode && user?.role !== 'SUPER_ADMIN'}
                    onChange={(e) => {
                      const newUnits = form.units.map((u2, i) =>
                        i === idx ? { ...u2, oldPrice: Number(e.target.value) } : u2
                      );
                      setForm(f => ({ ...f, units: newUnits }));
                    }}
                  />
                  {(() => {
                    const conv = Number(u.conversionRate) || 1;
                    if (conv && conv > 0) {
                      const basePrice = Number((u.oldPrice !== undefined ? u.oldPrice : u.price) || 0) / conv;
                      return (
                        <p className="mt-1 text-[11px] font-bold text-amber-600">
                          (= {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(basePrice)} / {form.unit || 'đv'})
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                {(user?.role === 'SUPER_ADMIN' || !isStoreMode) && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, units: f.units.filter((_, i) => i !== idx) }))}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả sản phẩm</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            disabled={isStoreMode}
            rows="4"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        <div className="lg:col-span-2 flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 shadow-lg"
          >
            {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="rounded-full border border-slate-200 px-8 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hủy bỏ
          </button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, as = 'input', children, className = "", ...props }) => {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</label>
      {as === 'select' ? (
        <select
          {...props}
          className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 ${className}`}
        >
          {children}
        </select>
      ) : (
        <input
          {...props}
          className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100 ${className}`}
        />
      )}
    </div>
  );
};

export default AdminProductForm;