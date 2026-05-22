import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import voucherService from '../../services/voucherService';
import productService from '../../services/productService';
import axiosClient from '../../api/axiosClient';

const toInputDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const nowInputDate = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
};

const emptyForm = {
  code: '',
  discountType: 'PERCENT',
  voucherType: 'PRODUCT',
  value: '',
  minOrderAmount: 0,
  startDate: nowInputDate(),
  endDate: '',
  usageLimit: 1,
  usedCount: 0,
  isActive: true,
  applicableProductIds: [],
  requiredTier: 'MEMBER',
};

const AdminVoucherForm = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(code);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('EXPIRY_ASC'); // EXPIRY_ASC, EXPIRY_DESC, NAME_ASC

  useEffect(() => {
    productService.getAll().then(res => {
      const data = res?.data?.data || res?.data || res;
      setAllProducts(Array.isArray(data) ? data : []);
    });

    axiosClient.get('/categories').then(res => {
      const data = res?.data?.data || res?.data || res;
      setCategories(Array.isArray(data) ? data : []);
    }).catch(err => console.error('Failed to load categories', err));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const decodedCode = decodeURIComponent(code);
        const response = await voucherService.getByCode(decodedCode);
        const data = response?.data?.data || response?.data || response;

        setForm({
          code: data?.code || '',
          discountType: data?.discountType || 'PERCENT',
          voucherType: data?.voucherType || 'PRODUCT',
          value: data?.value ?? '',
          minOrderAmount: data?.minOrderAmount ?? 0,
          startDate: toInputDateTime(data?.startDate),
          endDate: toInputDateTime(data?.endDate),
          usageLimit: data?.usageLimit ?? 1,
          usedCount: data?.usedCount ?? 0,
          isActive: data?.isActive !== false,
          applicableProductIds: data?.applicableProductIds || [],
          requiredTier: data?.requiredTier || 'MEMBER',
        });
      } catch (error) {
        console.error(error);
        toast.error('Failed to load voucher form');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [code, isEdit]);

  const submitLabel = useMemo(() => (saving ? 'Lưu...' : 'Lưu Voucher'), [saving]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error('Mã Voucher không được để trống');
      return;
    }

    if (form.discountType === 'PERCENT' && Number(form.value) > 100) {
      toast.error('Giảm giá theo % không được vượt quá 100%');
      return;
    }

    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      voucherType: form.voucherType,
      value: Number(form.value),
      minOrderAmount: Number(form.minOrderAmount),
      startDate: form.startDate ? form.startDate : null,
      endDate: form.endDate ? form.endDate : null,
      usageLimit: Number(form.usageLimit),
      usedCount: Number(form.usedCount || 0),
      isActive: form.isActive,
      applicableProductIds: form.applicableProductIds,
      requiredTier: form.requiredTier,
    };

    try {
      if (isEdit) {
        await voucherService.update(decodeURIComponent(code), payload);
        toast.success('Voucher updated successfully');
      } else {
        await voucherService.create(payload);
        toast.success('Voucher created successfully');
      }
      navigate('/admin/vouchers');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save voucher');
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
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">VOUCHER</p>
        <h2 className="mt-2 text-2xl font-black">{isEdit ? 'Chỉnh sửa voucher' : 'Tạo voucher'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <Field label="Voucher" name="code" value={form.code} onChange={handleChange} disabled={isEdit} required />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Loại Voucher" as="select" name="voucherType" value={form.voucherType} onChange={handleChange}>
            <option value="PRODUCT">Giảm giá đơn hàng</option>
            <option value="SHIPPING">Giảm vận chuyển</option>
          </Field>
          <Field label="Loại hình giảm" as="select" name="discountType" value={form.discountType} onChange={handleChange}>
            <option value="PERCENT">Theo %</option>
            <option value="FIXED">Cố định</option>
          </Field>
        </div>
        <Field label="Giá trị" name="value" type="number" min="0" value={form.value} onChange={handleChange} required />
        <Field label="Số tiền tối thiểu" name="minOrderAmount" type="number" min="0" value={form.minOrderAmount} onChange={handleChange} required />
        <Field label="Ngày bắt đầu" name="startDate" type="datetime-local" value={form.startDate} onChange={handleChange} />
        <Field label="Ngày kết thúc" name="endDate" type="datetime-local" value={form.endDate} onChange={handleChange} />
        <Field label="Giới hạn sử dụng" name="usageLimit" type="number" min="1" value={form.usageLimit} onChange={handleChange} required />
        
        <Field label="Hạng yêu cầu" as="select" name="requiredTier" value={form.requiredTier} onChange={handleChange}>
          <option value="MEMBER">Thành viên (Đồng)</option>
          <option value="SILVER">Bạc</option>
          <option value="GOLD">Vàng</option>
          <option value="DIAMOND">Kim cương</option>
        </Field>

        <div className="lg:col-span-2">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Áp dụng cho sản phẩm (Để trống nếu áp dụng cho tất cả)</label>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-slate-400 bg-white"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-slate-400 bg-white"
              >
                <option value="EXPIRY_ASC">HSD: Gần → Xa</option>
                <option value="EXPIRY_DESC">HSD: Xa → Gần</option>
                <option value="NAME_ASC">Tên: A → Z</option>
              </select>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Tìm sản phẩm..." 
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 min-w-[150px]"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const filtered = allProducts.filter(p => {
                    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchCat = !filterCategory || String(p.categoryId) === String(filterCategory);
                    return matchSearch && matchCat;
                  });
                  const filteredIds = filtered.map(p => p.id);
                  const newIds = Array.from(new Set([...form.applicableProductIds, ...filteredIds]));
                  setForm(f => ({ ...f, applicableProductIds: newIds }));
                  toast.success(`Đã chọn ${filteredIds.length} sản phẩm`);
                }}
                className="rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-colors uppercase"
              >
                Chọn tất cả hiển thị
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 p-4 space-y-2 bg-white shadow-inner">
            {allProducts
              .filter(p => {
                const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchCat = !filterCategory || String(p.categoryId) === String(filterCategory);
                return matchSearch && matchCat;
              })
              .sort((a, b) => {
                if (sortOrder === 'NAME_ASC') return a.name.localeCompare(b.name);
                
                const dateA = a.expiryDate ? new Date(a.expiryDate) : null;
                const dateB = b.expiryDate ? new Date(b.expiryDate) : null;

                if (sortOrder === 'EXPIRY_ASC') {
                  if (dateA && dateB) return dateA - dateB;
                  if (dateA) return -1;
                  if (dateB) return 1;
                } else {
                  if (dateA && dateB) return dateB - dateA;
                  if (dateA) return 1;
                  if (dateB) return -1;
                }
                return 0;
              })
              .map(product => (
                <label key={product.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                <input 
                  type="checkbox" 
                  checked={form.applicableProductIds.includes(product.id)}
                  onChange={(e) => {
                    const ids = e.target.checked 
                      ? [...form.applicableProductIds, product.id]
                      : form.applicableProductIds.filter(id => id !== product.id);
                    setForm(f => ({ ...f, applicableProductIds: ids }));
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border shadow-sm" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">{product.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">ID: {product.id}</span>
                    <span className="text-[10px] text-slate-400 font-medium">·</span>
                    <span className="text-[10px] text-amber-600 font-bold">HSD: {product.expiryDate || 'N/A'}</span>
                    <span className="text-[10px] text-slate-400 font-medium">·</span>
                    <span className="text-[10px] text-blue-600 font-bold">{product.category || 'N/A'}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
          <label className="inline-flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
            <input 
              type="checkbox" 
              name="isActive" 
              checked={form.isActive} 
              onChange={handleChange}
              className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            Kích hoạt Voucher này
          </label>
        </div>

        <div className="lg:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/vouchers')}
            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hủy bỏ
          </button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, as = 'input', children, ...props }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    {as === 'select' ? (
      <select
        {...props}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
      >
        {children}
      </select>
    ) : (
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
      />
    )}
  </div>
);

export default AdminVoucherForm;
