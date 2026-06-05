import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Package, CheckCircle, XCircle } from 'lucide-react';
import stockReceiptService from '../../services/StockReceipt';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import { Navigate } from 'react-router-dom';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const AdminStockReceipts = () => {
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const isGlobalMode = user?.role === 'SUPER_ADMIN' && !impersonatedStoreId;
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState(null);

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'STORE_ADMIN') {
    return <Navigate to="/admin/store-products" replace />;
  }

  const fetchReceipts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await stockReceiptService.getAll();
      const data = response?.data?.data || response?.data || response || [];
      setReceipts(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Không thể tải danh sách phiếu nhập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    if (!window.confirm(`Bạn có chắc muốn ${newStatus === 'APPROVED' ? 'duyệt' : 'từ chối'} phiếu nhập này?`)) return;
    try {
      const response = await axiosClient.put(`/admin/stock-receipts/${id}/status`, { status: newStatus });
      // axiosClient returns response.data by default; assume success if no error thrown
      toast.success(`Đã ${newStatus === 'APPROVED' ? 'duyệt' : 'từ chối'} thành công`);
      await fetchReceipts();
    } catch (err) {
      console.error('Update status failed', err);
      const message = err?.message || err?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái';
      toast.error(message);
    }
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return receipts;
    }

    return receipts.filter((receipt) =>
      [receipt.code, receipt.supplier, receipt.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [receipts, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Phiếu nhập kho</p>
          <h2 className="mt-2 text-2xl font-black">Quản lý phiếu nhập kho</h2>
          <p className="mt-2 text-sm text-white/70">STORE_ADMIN tạo phiếu nhập cho cửa hàng, SUPER_ADMIN duyệt để cập nhật tồn kho.</p>
        </div>
        {!isGlobalMode && (
          <Link
            to="/admin/stock-receipts/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            <Plus size={16} />
            Tạo phiếu mới
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
          placeholder="Tìm kiếm theo mã, nhà cung cấp, ghi chú..."
        />
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500">Đang tải danh sách...</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Mã phiếu</th>
                <th className="px-5 py-4 text-left font-semibold">Nhà cung cấp</th>
                <th className="px-5 py-4 text-left font-semibold">Cửa hàng</th>
                <th className="px-5 py-4 text-center font-semibold">Trạng thái</th>
                <th className="px-5 py-4 text-center font-semibold">Ngày tạo</th>
                <th className="px-5 py-4 text-center font-semibold">Số lượng</th>
                <th className="px-5 py-4 text-center font-semibold">Tổng cộng</th>
                <th className="px-5 py-4 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-semibold text-slate-900">{receipt.code}</td>
                  <td className="px-5 py-4 text-slate-700">{receipt.supplier || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{receipt.storeName || 'Tất cả'}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      receipt.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      receipt.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {receipt.status || 'APPROVED'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-700">
                    {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-5 py-4 text-center text-slate-700">{receipt.totalQuantity || 0}</td>
                  <td className="px-5 py-4 text-center font-semibold text-slate-900">
                    {currency.format(Number(receipt.totalPrice || 0))}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingReceipt(receipt)}
                        className="text-sky-600 hover:text-sky-800 font-semibold"
                      >
                        Chi tiết
                      </button>

                      {user?.role === 'SUPER_ADMIN' && receipt.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleUpdateStatus(receipt.id, 'APPROVED')} className="text-green-600 hover:text-green-800" title="Duyệt">
                            <CheckCircle size={20} />
                          </button>
                          <button onClick={() => handleUpdateStatus(receipt.id, 'REJECTED')} className="text-red-600 hover:text-red-800" title="Từ chối">
                            <XCircle size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                    Không tìm thấy phiếu nhập nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Chi tiết Phiếu nhập */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-3xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Chi tiết phiếu: {viewingReceipt.code}</h3>
                <p className="text-sm text-slate-500">Ngày nhập: {new Date(viewingReceipt.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Sản phẩm</th>
                    <th className="px-4 py-2 text-center">Số lượng</th>
                    <th className="px-4 py-2 text-right">Đơn giá</th>
                    <th className="px-4 py-2 text-right">Thành tiền</th>
                    <th className="px-4 py-2 text-center">NSX</th>
                    <th className="px-4 py-2 text-center">HSD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingReceipt.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <Package size={20} />
                          </div>
                          <span className="font-semibold text-slate-900">{item.productName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700 font-medium whitespace-nowrap">
                        {item.importUnitName && item.importConversionRate ? (
                           <span>{item.quantity} {item.importUnitName} <span className="text-slate-400 text-xs">(x {item.importConversionRate} {item.productUnit || ''})</span></span>
                        ) : (
                           <span>{item.quantity} {item.productUnit || ''}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{currency.format(item.price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{currency.format(item.totalPrice || (item.quantity * item.price))}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{item.manufactureDate || '-'}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{item.expiryDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingReceipt(null)}
                className="bg-slate-900 text-white px-8 py-2 rounded-full font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStockReceipts;
