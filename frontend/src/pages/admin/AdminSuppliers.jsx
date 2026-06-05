import React, { useState, useEffect, useContext } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const AdminSuppliers = () => {
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const [suppliers, setSuppliers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    supplyType: '',
    storeId: ''
  });

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const showStoreSelect = isSuperAdmin && !impersonatedStoreId;

  useEffect(() => {
    fetchSuppliers();
    if (isSuperAdmin) {
      fetchStores();
    }
  }, [user, impersonatedStoreId]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/suppliers');
      setSuppliers(res.data || []);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axiosClient.get('/stores');
      const data = res?.data?.data || res?.data || [];
      setStores(Array.isArray(data) ? data.filter((store) => store?.deleted !== true) : []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách cửa hàng', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      email: '',
      supplyType: '',
      storeId: impersonatedStoreId ? String(impersonatedStoreId) : ''
    });
    setShowModal(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      email: supplier.email || '',
      supplyType: supplier.supplyType || '',
      storeId: supplier.storeId ? String(supplier.storeId) : (impersonatedStoreId ? String(impersonatedStoreId) : '')
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) return;
    try {
      await axiosClient.delete(`/suppliers/${id}`);
      toast.success('Xóa nhà cung cấp thành công');
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      return toast.error('Vui lòng nhập tên nhà cung cấp');
    }

    if (showStoreSelect && !formData.storeId) {
      return toast.error('Vui lòng chọn cửa hàng cho nhà cung cấp');
    }

    const payload = {
      ...formData,
      storeId: formData.storeId ? Number(formData.storeId) : null
    };

    try {
      if (editingSupplier) {
        await axiosClient.put(`/suppliers/${editingSupplier.id}`, payload);
        toast.success('Cập nhật thành công');
      } else {
        await axiosClient.post('/suppliers', payload);
        toast.success('Thêm mới thành công');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản Lý Nhà Cung Cấp</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin
              ? 'Quản lý danh sách nhà cung cấp của toàn hệ thống theo từng cửa hàng.'
              : 'Quản lý danh sách nhà cung cấp của cửa hàng bạn.'}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shrink-0"
          >
            <Plus size={20} /> Thêm Mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-semibold text-sm">Tên Nhà Cung Cấp</th>
                  <th className="px-6 py-4 font-semibold text-sm">Liên Hệ</th>
                  <th className="px-6 py-4 font-semibold text-sm">Địa Chỉ</th>
                  <th className="px-6 py-4 font-semibold text-sm">Loại Cung Cấp</th>
                  {isSuperAdmin && <th className="px-6 py-4 font-semibold text-sm">Cửa Hàng</th>}
                  <th className="px-6 py-4 font-semibold text-sm text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-8 text-center text-gray-500">
                      Không tìm thấy nhà cung cấp nào.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-xs text-gray-500 mt-1">ID: #{supplier.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-[150px] truncate" title={supplier.phone}>{supplier.phone || '-'}</div>
                        <div className="text-xs text-gray-500 max-w-[180px] truncate mt-1" title={supplier.email}>{supplier.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{supplier.address || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          supplier.supplyType === 'Đồ đông lạnh' ? 'bg-blue-100 text-blue-700' :
                          supplier.supplyType === 'Đồ khô' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {supplier.supplyType || 'Chưa phân loại'}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                            {supplier.storeName || 'Chưa gán'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(supplier)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Sửa"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingSupplier ? 'Cập Nhật Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Nhà Cung Cấp *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa Chỉ</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại Cung Cấp</label>
                <input
                  type="text"
                  name="supplyType"
                  value={formData.supplyType}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Đồ khô, Đồ đông lạnh..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {showStoreSelect && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cửa Hàng *</label>
                  <select
                    name="storeId"
                    value={formData.storeId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Chọn cửa hàng --</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name} {store.address ? `(${store.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {user?.role === 'STORE_ADMIN' && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 border border-blue-100">
                  Nhà cung cấp này sẽ được tự động gán vào cửa hàng của bạn.
                </div>
              )}

              {isSuperAdmin && impersonatedStoreId && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 border border-blue-100">
                  Bạn đang ở chế độ cửa hàng. Nhà cung cấp sẽ tự động gắn vào cửa hàng đang chọn.
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  {editingSupplier ? 'Lưu Thay Đổi' : 'Tạo Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliers;
