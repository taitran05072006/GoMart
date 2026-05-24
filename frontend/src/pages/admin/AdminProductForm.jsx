import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';

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
  units: [],
};

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showBatchDetails, setShowBatchDetails] = useState(true);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [categoriesResponse, productResponse] = await Promise.all([
          categoryService.getAll(),
          isEdit ? productService.getById(id) : Promise.resolve(null),
        ]);

        const categoryData = categoriesResponse?.data?.data || categoriesResponse?.data || categoriesResponse || [];
        setCategories(Array.isArray(categoryData) ? categoryData : []);

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
            manufactureDate: productData?.manufactureDate || '',
            expiryDate: productData?.expiryDate || '',
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    // RÀNG BUỘC TỒN KHO: stock = old + new
    const currentStock = Number(form.stock);
    const oldQty = Number(form.oldBatchQuantity);
    const newQty = Number(form.newBatchQuantity);

    if (currentStock !== (oldQty + newQty)) {
      toast.error(`Lỗi tồn kho: Tổng tồn kho (${currentStock}) phải bằng Lô cũ (${oldQty}) + Lô mới (${newQty})`);
      return;
    }

    setSaving(true);
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
      units: form.units,
    };

    try {
      if (isEdit) {
        await productService.update(id, payload);
        toast.success('Sản phẩm đã được cập nhật thành công');
      } else {
        await productService.create(payload);
        toast.success('Sản phẩm đã được tạo thành công');
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
      <div className="rounded-3xl bg-slate-950 p-6 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Quản lý sản phẩm</p>
        <h2 className="mt-2 text-2xl font-black">{isEdit ? 'Chỉnh sửa sản phẩm' : 'Tạo mới sản phẩm'}</h2>
        <p className="mt-2 text-sm text-white/70">Cập nhật thông tin chi tiết và quản lý tồn kho theo lô.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 grid gap-4 lg:grid-cols-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="lg:col-span-2 text-sm font-bold uppercase tracking-widest text-slate-900 border-b border-slate-50 pb-2">Thông tin cơ bản</h3>
          <Field label="Tên sản phẩm" name="name" value={form.name} onChange={handleChange} required />
          <Field label="Danh mục" name="categoryId" value={form.categoryId} onChange={handleChange} as="select" required>
            {!isEdit && <option value="">-- Chọn danh mục --</option>}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Field>
          <Field label="Giá (VNĐ) *" name="oldPrice" type="number" min="0" value={form.oldPrice} onChange={handleChange} required />

          <Field label="Đơn vị tính" name="unit" value={form.unit} onChange={handleChange} placeholder="vd: kg, hộp, cái..." />

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
            />
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <Field label="Số lượng lô cũ" name="oldBatchQuantity" type="number" min="0" value={form.oldBatchQuantity} onChange={handleChange} />
            <Field label="Số lượng lô mới" name="newBatchQuantity" type="number" min="0" value={form.newBatchQuantity} onChange={handleChange} />
          </div>

          <div className="invisible h-0 overflow-hidden">
            <Field label="Giá gốc (VNĐ)" name="oldPrice" type="number" min="0" value={form.oldPrice} onChange={handleChange} />
          </div>
          <Field label="Giảm giá (%)" name="discount" type="number" min="0" max="100" value={form.discount} onChange={handleChange} />
          <Field label="Ngày sản xuất" name="manufactureDate" type="date" value={form.manufactureDate} onChange={handleChange} />
          <Field label="Ngày hết hạn" name="expiryDate" type="date" value={form.expiryDate} onChange={handleChange} />
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Quy đổi đơn vị & Giá</h3>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, units: [...f.units, { name: '', conversionRate: 1, price: 0 }] }))}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              + THÊM ĐƠN VỊ
            </button>
          </div>
          <div className="space-y-3">
            {form.units.map((u, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Tên đơn vị</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="vd: Thùng"
                    value={u.name}
                    onChange={(e) => {
                      const newUnits = [...form.units];
                      newUnits[idx].name = e.target.value;
                      setForm(f => ({ ...f, units: newUnits }));
                    }}
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Quy đổi</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="vd: 24"
                    value={u.conversionRate}
                    onChange={(e) => {
                      const newUnits = [...form.units];
                      newUnits[idx].conversionRate = Number(e.target.value);
                      setForm(f => ({ ...f, units: newUnits }));
                    }}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Giá bán</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-red-600"
                    value={u.price}
                    onChange={(e) => {
                      const newUnits = [...form.units];
                      newUnits[idx].price = Number(e.target.value);
                      setForm(f => ({ ...f, units: newUnits }));
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, units: f.units.filter((_, i) => i !== idx) }))}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  &times;
                </button>
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
            rows="4"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
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