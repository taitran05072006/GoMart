import React, { useState, useEffect } from 'react';
import shippingService from '../../services/shippingService';
import toast from 'react-hot-toast';
import { Truck, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

const AdminShipping = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ province: '', district: '', ward: '', fee: 0 });
  const [newForm, setNewForm] = useState({ province: '', district: '', ward: '', fee: 0 });
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await shippingService.getLocations();
      setLocations(res?.data || []);
    } catch (err) {
      toast.error('Không thể tải danh sách khu vực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Backend expects ShippingLocation object. We can use axios directly or add method to service
      // For simplicity, I'll use a generic request if not in service
      await shippingService.createLocation(newForm);
      toast.success('Thêm phí vận chuyển thành công');
      setNewForm({ province: '', district: '', ward: '', fee: 0 });
      setShowNewForm(false);
      fetchLocations();
    } catch (err) {
      toast.error('Lỗi khi thêm phí vận chuyển');
    }
  };

  const handleUpdate = async (id) => {
    try {
      await shippingService.updateLocation(id, editForm);
      toast.success('Cập nhật thành công');
      setEditingId(null);
      fetchLocations();
    } catch (err) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa khu vực này?')) return;
    try {
      await shippingService.deleteLocation(id);
      toast.success('Đã xóa khu vực');
      fetchLocations();
    } catch (err) {
      toast.error('Lỗi khi xóa');
    }
  };

  const startEdit = (loc) => {
    setEditingId(loc.id);
    setEditForm({ 
      province: loc.province || '', 
      district: loc.district || '', 
      ward: loc.ward || '', 
      fee: loc.fee 
    });
  };

  const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="text-blue-600" /> Quản Lý Phí Vận Chuyển
          </h1>
          <p className="text-gray-500 text-sm">Thiết lập phí ship cho từng khu vực/thành phố</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Thêm khu vực
        </button>
      </div>

      {showNewForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-blue-700 mb-1">Tỉnh / Thành phố</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đà Nẵng"
                  className="w-full border-blue-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  value={newForm.province}
                  onChange={e => setNewForm({...newForm, province: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-blue-700 mb-1">Quận / Huyện</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Liên Chiểu"
                  className="w-full border-blue-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  value={newForm.district}
                  onChange={e => setNewForm({...newForm, district: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-blue-700 mb-1">Phường / Xã</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Hòa Khánh Bắc"
                  className="w-full border-blue-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  value={newForm.ward}
                  onChange={e => setNewForm({...newForm, ward: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-blue-700 mb-1">Phí vận chuyển (VND)</label>
                <input
                  type="number"
                  required
                  className="w-full border-blue-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  value={newForm.fee}
                  onChange={e => setNewForm({...newForm, fee: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-md">Thêm mới</button>
                <button type="button" onClick={() => setShowNewForm(false)} className="px-4 py-2.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-100">Hủy</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase text-gray-500">
              <th className="px-6 py-4">Khu vực (Tỉnh - Huyện - Xã)</th>
              <th className="px-6 py-4">Phí vận chuyển</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : locations.length === 0 ? (
              <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400">Chưa có khu vực nào được cấu hình.</td></tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    {editingId === loc.id ? (
                      <div className="space-y-2">
                        <input
                          className="border border-blue-300 rounded px-2 py-1 w-full text-sm"
                          value={editForm.province}
                          onChange={e => setEditForm({...editForm, province: e.target.value})}
                          placeholder="Tỉnh"
                        />
                        <input
                          className="border border-blue-300 rounded px-2 py-1 w-full text-sm"
                          value={editForm.district}
                          onChange={e => setEditForm({...editForm, district: e.target.value})}
                          placeholder="Huyện"
                        />
                        <input
                          className="border border-blue-300 rounded px-2 py-1 w-full text-sm"
                          value={editForm.ward}
                          onChange={e => setEditForm({...editForm, ward: e.target.value})}
                          placeholder="Xã"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-gray-800">{loc.province}</p>
                        <p className="text-sm text-gray-500">{loc.district} - {loc.ward}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === loc.id ? (
                      <input
                        type="number"
                        className="border border-blue-300 rounded px-2 py-1 w-full"
                        value={editForm.fee}
                        onChange={e => setEditForm({...editForm, fee: e.target.value})}
                      />
                    ) : (
                      <span className="text-blue-600 font-extrabold text-lg">{fmt.format(loc.fee)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingId === loc.id ? (
                        <>
                          <button onClick={() => handleUpdate(loc.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(loc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                          <button onClick={() => handleDelete(loc.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p className="text-xs text-gray-500 italic">
          * Các tỉnh thành không có trong danh sách trên sẽ được tính phí mặc định là 30.000 VND.
          <br />
          * Miễn phí vận chuyển cho đơn hàng từ 500.000 VND trở lên.
        </p>
      </div>
    </div>
  );
};

export default AdminShipping;
