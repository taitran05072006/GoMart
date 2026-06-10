import React, { useState, useEffect, useContext } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, MapPin, Building2, Globe, ChevronDown, X, Map, Navigation } from 'lucide-react';
import MapPicker from '../../components/MapPicker';
import { AuthContext } from '../../context/AuthContext';

/* ─── Helpers ─── */
const getUserId = (user) => user?.id ?? user?.userId ?? null;

/* ─── Region Badge ─── */
const RegionBadge = ({ name }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
    <Globe size={11} />
    {name || 'Chưa phân khu vực'}
  </span>
);

/* ─── Modal ─── */
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* ─── Main Component ─── */
const AdminStores = () => {
  const { user } = useContext(AuthContext);

  // ── Data ──
  const [stores, setStores] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ──
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegionId, setFilterRegionId] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showDeletedRegions, setShowDeletedRegions] = useState(false);

  // ── Store modal ──
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeForm, setStoreForm] = useState({ name: '', address: '', latitude: '', longitude: '', regionId: '' });

  // ── Region modal ──
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [regionForm, setRegionForm] = useState({ name: '' });

  // ── Active tab ──
  const [tab, setTab] = useState('stores'); // 'stores' | 'regions'

  /* ─ Fetch ─ */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [storesRes, regionsRes] = await Promise.all([
        axiosClient.get('/stores', { params: { includeDeleted: showDeleted } }),
        axiosClient.get('/regions', { params: { includeDeleted: showDeletedRegions } }),
      ]);
      setStores(storesRes.data?.data ?? storesRes.data ?? []);
      setRegions(regionsRes.data?.data ?? regionsRes.data ?? []);
    } catch {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [showDeleted, showDeletedRegions]);

  const activeRegions = regions.filter(r => !r.deleted);

  /* ─ Store CRUD ─ */
  const openAddStore = () => {
    setEditingStore(null);
    setStoreForm({ name: '', address: '', latitude: '', longitude: '', regionId: '' });
    setShowStoreModal(true);
  };

  const openEditStore = (store) => {
    setEditingStore(store);
    setStoreForm({
      name: store.name || '',
      address: store.address || '',
      latitude: store.latitude ?? '',
      longitude: store.longitude ?? '',
      regionId: store.region?.id ?? '',
    });
    setShowStoreModal(true);
  };

  // Reverse-geocode coords → fill address field
  const handleMapPickForStore = async (coords) => {
    setShowMapPicker(false);
    setStoreForm(p => ({ ...p, latitude: coords[0].toFixed(7), longitude: coords[1].toFixed(7) }));
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords[0]}&lon=${coords[1]}&format=json&accept-language=vi`
      );
      const geo = await resp.json();
      const addr = geo?.display_name || '';
      if (addr) setStoreForm(p => ({ ...p, address: addr }));

    } catch {

    }
  };

  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    if (!storeForm.name.trim()) return toast.error('Vui lòng nhập tên cửa hàng');

    const payload = {
      name: storeForm.name.trim(),
      address: storeForm.address.trim() || null,
      latitude: storeForm.latitude !== '' ? parseFloat(storeForm.latitude) : null,
      longitude: storeForm.longitude !== '' ? parseFloat(storeForm.longitude) : null,
      region: storeForm.regionId ? { id: parseInt(storeForm.regionId) } : null,
    };

    const uid = getUserId(user);
    const headers = uid ? { 'X-User-Id': String(uid) } : {};

    try {
      if (editingStore) {
        await axiosClient.put(`/stores/${editingStore.id}`, payload, { headers });

      } else {
        await axiosClient.post('/stores', payload, { headers });

      }
      setShowStoreModal(false);
      fetchAll();
      window.dispatchEvent(new Event('refreshStores'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const handleDeleteStore = async (store) => {
    if (!window.confirm(`Xóa cửa hàng "${store.name}"?`)) return;
    const uid = getUserId(user);
    try {
      await axiosClient.delete(`/stores/${store.id}`, {
        headers: uid ? { 'X-User-Id': String(uid) } : {},
      });

      fetchAll();
      window.dispatchEvent(new Event('refreshStores'));
    } catch (err) {
      toast.error(err?.message || err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleRestoreStore = async (store) => {
    if (!window.confirm(`Khôi phục cửa hàng "${store.name}"?`)) return;
    const uid = getUserId(user);
    try {
      await axiosClient.patch(`/stores/${store.id}/restore`, null, {
        headers: uid ? { 'X-User-Id': String(uid) } : {},
      });
      fetchAll();
      window.dispatchEvent(new Event('refreshStores'));
    } catch (err) {
      toast.error(err?.message || err.response?.data?.message || 'Khôi phục thất bại');
    }
  };

  /* ─ Region CRUD ─ */
  const openAddRegion = () => {
    setEditingRegion(null);
    setRegionForm({ name: '' });
    setShowRegionModal(true);
  };

  const openEditRegion = (region) => {
    setEditingRegion(region);
    setRegionForm({ name: region.name || '' });
    setShowRegionModal(true);
  };

  const handleRegionSubmit = async (e) => {
    e.preventDefault();
    if (!regionForm.name.trim()) return toast.error('Vui lòng nhập tên khu vực');
    const uid = getUserId(user);
    const headers = uid ? { 'X-User-Id': String(uid) } : {};
    try {
      if (editingRegion) {
        await axiosClient.put(`/regions/${editingRegion.id}`, { name: regionForm.name.trim() }, { headers });

      } else {
        await axiosClient.post('/regions', { name: regionForm.name.trim() }, { headers });

      }
      setShowRegionModal(false);
      fetchAll();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Tên khu vực đã tồn tại, vui lòng nhập tên khác!');
      } else {
        toast.error(err.response?.data?.message || 'Thao tác thất bại');
      }
    }
  };

  const handleDeleteRegion = async (region) => {
    try {
      const allStoresRes = await axiosClient.get('/stores', { params: { includeDeleted: true } });
      const allStores = allStoresRes.data?.data ?? allStoresRes.data ?? [];
      const storeCount = allStores.filter(s => s.region?.id === region.id).length;

      const confirmMsg = storeCount > 0
        ? `Khu vực "${region.name}" đang có ${storeCount} cửa hàng.\nViệc xóa khu vực sẽ NGƯNG HOẠT ĐỘNG toàn bộ cửa hàng và nhân viên bên trong.\n\nBạn có chắc chắn muốn xóa?`
        : `Xóa khu vực "${region.name}"?`;

      if (!window.confirm(confirmMsg)) return;
      const uid = getUserId(user);
      try {
        await axiosClient.delete(`/regions/${region.id}`, {
          headers: uid ? { 'X-User-Id': String(uid) } : {},
        });

        fetchAll();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa thất bại');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể kiểm tra dữ liệu khu vực');
    }
  };

  const handleRestoreRegion = async (region) => {
    const uid = getUserId(user);
    try {
      await axiosClient.patch(`/regions/${region.id}/restore`, null, {
        headers: uid ? { 'X-User-Id': String(uid) } : {},
      });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Khôi phục thất bại');
    }
  };

  /* ─ Filtered data ─ */
  const filteredStores = stores.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRegion = filterRegionId === '' || String(s.region?.id) === filterRegionId;
    return matchSearch && matchRegion;
  });

  const filteredRegions = regions.filter(r =>
    r.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ─ Stats ─ */
  const stats = [
    { label: 'Tổng cửa hàng', value: stores.length, icon: <Building2 size={20} className="text-blue-600" />, bg: 'bg-blue-50' },
    { label: 'Khu vực', value: regions.length, icon: <Globe size={20} className="text-emerald-600" />, bg: 'bg-emerald-50' },
    { label: 'Có toạ độ GPS', value: stores.filter(s => s.latitude && s.longitude).length, icon: <Map size={20} className="text-violet-600" />, bg: 'bg-violet-50' },
    { label: 'Chưa có khu vực', value: stores.filter(s => !s.region).length, icon: <MapPin size={20} className="text-orange-500" />, bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Quản Lý Cửa Hàng</h1>
        <p className="text-sm text-slate-400 mt-0.5">Trang chủ / Cửa hàng & Khu vực</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab switch */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {['stores', 'regions'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearchTerm(''); setFilterRegionId(''); }}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === t
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'stores' ? (
              <span className="flex items-center gap-2"><Building2 size={15} /> Cửa hàng</span>
            ) : (
              <span className="flex items-center gap-2"><Globe size={15} /> Khu vực</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-600">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Hiển thị cửa hàng đã xóa
        </label>
      </div>

      {/* ══ STORES TAB ══ */}
      {tab === 'stores' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm tên, địa chỉ..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-56"
                />
              </div>
              {/* Filter by region */}
              <div className="relative">
                <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={15} />
                <select
                  value={filterRegionId}
                  onChange={e => setFilterRegionId(e.target.value)}
                  className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                >
                  <option value="">Tất cả khu vực</option>
                  {regions.map(r => (
                    <option key={r.id} value={String(r.id)}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={openAddStore}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
            >
              <Plus size={16} /> Thêm cửa hàng
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Tên cửa hàng</th>
                    <th className="px-6 py-3">Khu vực</th>
                    <th className="px-6 py-3">Địa chỉ</th>
                    <th className="px-6 py-3">Toạ độ</th>
                    <th className="px-6 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                        <MapPin size={32} className="mx-auto mb-2 text-slate-200" />
                        Không tìm thấy cửa hàng nào
                      </td>
                    </tr>
                  ) : filteredStores.map(store => (
                    <tr key={store.id} className={`transition-colors ${store.deleted ? 'bg-rose-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4 text-sm text-slate-400 font-mono">#{store.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {store.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">{store.name}</span>
                          {store.deleted && (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                              Đã xóa
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RegionBadge name={store.region?.name} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px]">
                        {store.address ? (
                          <span className="flex items-start gap-1">
                            <MapPin size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{store.address}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">Chưa có địa chỉ</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {store.latitude && store.longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${store.latitude},${store.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {store.latitude.toFixed(5)}, {store.longitude.toFixed(5)}
                          </a>
                        ) : (
                          <span className="text-slate-300">–</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditStore(store)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition"
                            title="Sửa"
                          >
                            <Edit2 size={16} />
                          </button>
                          {store.deleted ? (
                            <button
                              onClick={() => handleRestoreStore(store)}
                              className="px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition text-xs font-semibold"
                              title="Khôi phục"
                            >
                              Khôi phục
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteStore(store)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count */}
            {!loading && filteredStores.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-50 text-xs text-slate-400">
                Hiển thị {filteredStores.length} / {stores.length} cửa hàng{showDeleted ? ' (bao gồm đã xóa)' : ''}
            </div>
          )}
        </div>
      )}

      {/* ══ REGIONS TAB ══ */}
      {tab === 'regions' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm khu vực..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-56"
              />
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showDeletedRegions}
                onChange={(e) => setShowDeletedRegions(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Hiển thị khu vực đã ngưng hoạt động
            </label>
            <button
              onClick={openAddRegion}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus size={16} /> Thêm khu vực
            </button>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : (
            <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRegions.length === 0 ? (
                <div className="col-span-full text-center py-10 text-slate-400 text-sm">
                  <Globe size={32} className="mx-auto mb-2 text-slate-200" />
                  Chưa có khu vực nào
                </div>
              ) : filteredRegions.map(region => {
                const count = stores.filter(s => s.region?.id === region.id).length;
                return (
                  <div
                    key={region.id}
                    onClick={() => {
                      setFilterRegionId(String(region.id));
                      setTab('stores');
                    }}
                    className="group relative bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-sm">
                        {region.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditRegion(region); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={14} />
                        </button>
                        {region.deleted ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestoreRegion(region); }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Navigation size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRegion(region); }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight flex items-center gap-2">
                      {region.name}
                      {region.deleted && (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                          Đã ngưng hoạt động
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <Building2 size={11} />
                      {count} cửa hàng
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MAP PICKER ══ */}
      {showMapPicker && (
        <MapPicker
          initialPosition={
            storeForm.latitude && storeForm.longitude
              ? [parseFloat(storeForm.latitude), parseFloat(storeForm.longitude)]
              : [16.0544, 108.2022]
          }
          onSelect={handleMapPickForStore}
          onCancel={() => setShowMapPicker(false)}
        />
      )}

      {/* ══ STORE MODAL ══ */}
      {showStoreModal && (
        <Modal
          title={editingStore ? 'Sửa cửa hàng' : 'Thêm cửa hàng mới'}
          onClose={() => setShowStoreModal(false)}
        >
          <form onSubmit={handleStoreSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Tên cửa hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={storeForm.name}
                onChange={e => setStoreForm(p => ({ ...p, name: e.target.value }))}
                placeholder="VD: GoMart Đà Nẵng"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Khu vực</label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={15} />
                <select
                  value={storeForm.regionId}
                  onChange={e => setStoreForm(p => ({ ...p, regionId: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                >
                  <option value="">-- Chọn khu vực --</option>
                  {activeRegions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Địa chỉ</label>
              <textarea
                value={storeForm.address}
                onChange={e => setStoreForm(p => ({ ...p, address: e.target.value }))}
                rows={2}
                placeholder="Số nhà, đường, quận, thành phố..."
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            {/* Map picker for coordinates */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <MapPin size={13} className="inline mr-1 text-slate-400" />
                Vị trí trên bản đồ
              </label>

              {storeForm.latitude && storeForm.longitude ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-700">Đã chọn toạ độ</p>
                    <p className="text-xs font-mono text-blue-600 truncate">
                      {parseFloat(storeForm.latitude).toFixed(5)}, {parseFloat(storeForm.longitude).toFixed(5)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                    >
                      <Navigation size={12} /> Chọn lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoreForm(p => ({ ...p, latitude: '', longitude: '' }))}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition text-sm font-medium"
                >
                  <Map size={16} />
                  Chọn vị trí trên bản đồ
                </button>
              )}
              <p className="text-xs text-slate-400 mt-1.5">💡 Toạ độ dùng để tính phí ship theo khoảng cách thực tế.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStoreModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition text-sm"
              >
                {editingStore ? 'Lưu thay đổi' : 'Tạo cửa hàng'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ REGION MODAL ══ */}
      {showRegionModal && (
        <Modal
          title={editingRegion ? 'Sửa khu vực' : 'Thêm khu vực mới'}
          onClose={() => setShowRegionModal(false)}
        >
          <form onSubmit={handleRegionSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Tên khu vực <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={regionForm.name}
                onChange={e => setRegionForm({ name: e.target.value })}
                placeholder="VD: Đà Nẵng, Hà Nội, TP.HCM..."
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegionModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition text-sm"
              >
                {editingRegion ? 'Lưu thay đổi' : 'Tạo khu vực'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminStores;
