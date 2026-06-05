import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

/* ─── Haversine ─── */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── FlyTo helper (imperative map control) ─── */
function FlyToPosition({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 1 });
  }, [target, map]);
  return null;
}

/* ─── Click marker ─── */
function ClickMarker({ position, setPosition }) {
  useMapEvents({
    click(e) { setPosition([e.latlng.lat, e.latlng.lng]); },
  });
  return position ? <Marker position={position} /> : null;
}

/* ═══════════════════════════════════════════ */
export default function MapPicker({
  initialPosition = [16.0544, 108.2022],
  onSelect,
  onCancel,
  storeCoords = null,
  title = 'Chọn vị trí',
}) {
  const [position, setPosition] = useState(initialPosition);
  const [flyTarget, setFlyTarget] = useState(null);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { setPosition(initialPosition); }, [JSON.stringify(initialPosition)]);

  /* ─── Nominatim search (debounced 500ms) ─── */
  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setResults([]); setShowResults(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&accept-language=vi&countrycodes=vn`,
          { headers: { 'Accept-Language': 'vi' } }
        );
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 500);
  };

  const selectResult = (item) => {
    const pos = [parseFloat(item.lat), parseFloat(item.lon)];
    setPosition(pos);
    setFlyTarget(pos);
    setQuery(item.display_name);
    setShowResults(false);
  };

  const distance = storeCoords && position
    ? haversineKm(position[0], position[1], storeCoords[0], storeCoords[1])
    : null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-slate-50">
          <h3 className="font-black text-slate-800 text-base">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Sidebar ── */}
          <aside className="w-72 flex-shrink-0 border-r flex flex-col bg-white">

            {/* Search box */}
            <div className="p-4 border-b relative">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">🔍 Tìm kiếm địa chỉ</p>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  placeholder="Nhập tên đường, địa điểm..."
                  className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {searching && (
                  <div className="absolute right-2.5 top-2.5 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                {query && !searching && (
                  <button
                    onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs leading-none"
                  >✕</button>
                )}
              </div>

              {/* Dropdown results */}
              {showResults && results.length > 0 && (
                <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 max-h-56 overflow-y-auto">
                  {results.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => selectResult(item)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 transition border-b border-slate-50 last:border-0"
                    >
                      <p className="font-semibold text-slate-800 text-xs line-clamp-1">{item.display_name.split(',')[0]}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-2">{item.display_name}</p>
                    </button>
                  ))}
                </div>
              )}
              {showResults && results.length === 0 && !searching && query && (
                <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 px-3 py-3 text-sm text-slate-400 text-center">
                  Không tìm thấy địa điểm
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                💡 Tìm kiếm địa chỉ hoặc <strong>nhấn trực tiếp lên bản đồ</strong> để đặt điểm giao hàng.
              </p>

              {position && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">📍 Vị trí đã chọn</p>
                  <p className="text-xs font-mono text-slate-700">
                    {position[0].toFixed(6)}, {position[1].toFixed(6)}
                  </p>
                </div>
              )}

              {distance !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Khoảng cách tới cửa hàng</p>
                  <p className="text-xl font-black text-blue-600 mt-1">{distance.toFixed(2)} km</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={() => onSelect(position)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                ✓ Xác nhận
              </button>
            </div>
          </aside>

          {/* ── Map ── */}
          <div className="flex-1 relative">
            <MapContainer center={initialPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyToPosition target={flyTarget} />
              <ClickMarker position={position} setPosition={setPosition} />
              {storeCoords && <Marker position={storeCoords} />}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
