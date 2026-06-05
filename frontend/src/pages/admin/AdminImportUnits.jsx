import React, { useEffect, useState } from 'react';
import importUnitService from '../../services/importUnitService';
import productService from '../../services/productService';
import importUnitTypeService from '../../services/importUnitTypeService';
import toast from 'react-hot-toast';

const AdminImportUnits = () => {
  const [units, setUnits] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ productId: '', unitTypeId: '', conversionRate: 1, costPrice: 0 });
  const [unitTypes, setUnitTypes] = useState([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([importUnitService.getAll(), productService.getAll()]);
      const typesRes = await importUnitTypeService.getAll();
      setUnits(uRes?.data || uRes || []);
      setProducts(pRes?.data || pRes || []);
      setUnitTypes(typesRes?.data || typesRes || []);
    } catch (err) {
      console.error(err);
      toast.error('Không thể lấy danh sách');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ productId: '', unitTypeId: '', conversionRate: 1, costPrice: 0 });
  };

  const openEdit = (u) => {
    setEditing(u.id);
    setForm({ productId: u.product?.id || '', unitTypeId: u.unitType?.id || '', conversionRate: u.conversionRate || 1, costPrice: u.costPrice || 0 });
  };

  const save = async () => {
    try {
      const payload = {
        product: { id: Number(form.productId) },
        unitType: { id: Number(form.unitTypeId) },
        conversionRate: Number(form.conversionRate),
        costPrice: Number(form.costPrice),
      };
      if (editing) {
        await importUnitService.update(editing, payload);
        toast.success('Đã cập nhật');
      } else {
        await importUnitService.create(payload);
        toast.success('Đã tạo');
      }
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi lưu');
    }
  };

  const remove = async (id) => {
    if (!confirm('Xóa mục này?')) return;
    try {
      await importUnitService.remove(id);
      toast.success('Đã xóa');
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi xóa');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý đơn vị nhập</h1>
        <div className="flex gap-2">
          <button onClick={openCreate} className="btn">Tạo mới</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border">
        {loading ? <p>Loading...</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th>Product</th>
                <th>Unit type</th>
                <th>Conversion</th>
                <th>Cost price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {units.map(u => (
                <tr key={u.id} className="border-t">
                  <td>{u.product?.name}</td>
                  <td>{u.unitType?.name}</td>
                  <td>{u.conversionRate}</td>
                  <td>{u.costPrice}</td>
                  <td className="text-right">
                    <button onClick={() => openEdit(u)} className="mr-2 text-blue-600">Sửa</button>
                    <button onClick={() => remove(u.id)} className="text-rose-600">Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">{editing ? 'Sửa' : 'Tạo mới'}</h3>
          <div className="grid grid-cols-2 gap-3">
          <select value={form.productId} onChange={e => setForm(f => ({...f, productId: e.target.value}))}>
            <option value="">Chọn sản phẩm</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={form.unitTypeId} onChange={e => setForm(f => ({...f, unitTypeId: e.target.value}))}>
            <option value="">Chọn unit type</option>
            {unitTypes?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="number" value={form.conversionRate} onChange={e => setForm(f => ({...f, conversionRate: e.target.value}))} />
          <input type="number" value={form.costPrice} onChange={e => setForm(f => ({...f, costPrice: e.target.value}))} />
        </div>
        <div className="mt-3">
          <button onClick={save} className="btn">Lưu</button>
        </div>
      </div>
    </div>
  );
};

export default AdminImportUnits;
