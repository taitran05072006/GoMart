import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import categoryService from '../../services/categoryService';

const emptyForm = {
  name: '',
  expiryThresholdDays: 30,
};

const AdminCategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const response = await categoryService.getById(id);
        const data = response?.data?.data || response?.data || response;

        setForm({
          name: data?.name || '',
          expiryThresholdDays: data?.expiryThresholdDays ?? 30,
        });
      } catch (error) {
        console.error(error);
        toast.error('Failed to load category form');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      expiryThresholdDays: Number(form.expiryThresholdDays),
    };

    try {
      if (isEdit) {
        await categoryService.update(id, payload);
        toast.success('Cập nhật danh mục thành công');
      } else {
        await categoryService.create(payload);
        toast.success('Tạo danh mục thành công');
      }

      navigate('/admin/categories');
    } catch (error) {
      console.error(error);
      toast.error('Không thể lưu danh mục');
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
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Quản lý danh mục</p>
        <h2 className="mt-2 text-2xl font-black">{isEdit ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h2>
        <p className="mt-2 text-sm text-white/70">Cấu hình thông tin danh mục và ngưỡng cảnh báo hết hạn.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <Field label="Tên danh mục" name="name" value={form.name} onChange={handleChange} required />
        <Field label="Ngưỡng ngày cảnh báo hết hạn" name="expiryThresholdDays" type="number" value={form.expiryThresholdDays} onChange={handleChange} required />

        <div className="lg:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Đang lưu...' : 'Lưu danh mục'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/categories')}
            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hủy bỏ
          </button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, ...props }) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
      />
    </div>
  );
};

export default AdminCategoryForm;
