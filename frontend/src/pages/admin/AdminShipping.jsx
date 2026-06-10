import React, { useState, useEffect } from 'react';
import shippingConfigService from '../../services/shippingConfigService';
import toast from 'react-hot-toast';
import { Truck, Save } from 'lucide-react';

const AdminShipping = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    baseFee: 15000,
    perKmRate: 3000,
    freeKm: 1,
    freeThreshold: 500000,
  });

  const fetchConfig = async () => {
    try {
      const res = await shippingConfigService.getConfig();
      const data = res?.data?.data ?? res?.data ?? res;
      if (data) {
        setConfig({
          baseFee: data.baseFee ?? 15000,
          perKmRate: data.perKmRate ?? 3000,
          freeKm: data.freeKm ?? 1,
          freeThreshold: data.freeThreshold ?? 500000,
        });
      }
    } catch (err) {
      toast.error('Không thể tải cấu hình phí vận chuyển');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await shippingConfigService.updateConfig({
        baseFee: Number(config.baseFee),
        perKmRate: Number(config.perKmRate),
        freeKm: Number(config.freeKm),
        freeThreshold: Number(config.freeThreshold),
      });
      const saved = res?.data?.data ?? res?.data ?? res;
      if (saved) {
        setConfig((prev) => ({
          ...prev,
          ...saved,
        }));
      }
      await fetchConfig();
    } catch (err) {
      toast.error('Lỗi khi cập nhật cấu hình phí vận chuyển');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto text-gray-500">Đang tải cấu hình...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="text-blue-600" /> Quản Lý Phí Vận Chuyển
          </h1>
          <p className="text-gray-500 text-sm">Thiết lập phí ship tự động dựa trên khoảng cách (km)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8">
        <form onSubmit={handleSave} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Base Fee */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Phí cơ bản (VND)
              </label>
              <p className="text-xs text-gray-500 mb-2">Mức phí tối thiểu cho mỗi đơn hàng (áp dụng trong giới hạn KM miễn phí).</p>
              <input
                type="number"
                name="baseFee"
                value={config.baseFee}
                onChange={handleChange}
                required
                min="0"
                className="w-full border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none border bg-gray-50 focus:bg-white transition-colors font-medium text-gray-800"
              />
            </div>

            {/* Free KM */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Số KM miễn phí phụ thu (KM)
              </label>
              <p className="text-xs text-gray-500 mb-2">Khoảng cách ban đầu không tính thêm phí ngoài phí cơ bản.</p>
              <input
                type="number"
                name="freeKm"
                value={config.freeKm}
                onChange={handleChange}
                required
                min="0"
                step="any"
                className="w-full border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none border bg-gray-50 focus:bg-white transition-colors font-medium text-gray-800"
              />
            </div>

            {/* Per KM Rate */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Phí phụ thu mỗi KM (VND/KM)
              </label>
              <p className="text-xs text-gray-500 mb-2">Số tiền cộng thêm cho mỗi KM vượt qua giới hạn miễn phí phụ thu.</p>
              <input
                type="number"
                name="perKmRate"
                value={config.perKmRate}
                onChange={handleChange}
                required
                min="0"
                className="w-full border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none border bg-gray-50 focus:bg-white transition-colors font-medium text-gray-800"
              />
            </div>

            {/* Free Threshold */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Đơn hàng tối thiểu để miễn phí ship (VND)
              </label>
              <p className="text-xs text-gray-500 mb-2">Nếu giá trị đơn hàng lớn hơn hoặc bằng mức này, phí ship sẽ là 0.</p>
              <input
                type="number"
                name="freeThreshold"
                value={config.freeThreshold}
                onChange={handleChange}
                required
                min="0"
                className="w-full border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none border bg-gray-50 focus:bg-white transition-colors font-medium text-gray-800"
              />
            </div>
          </div>

          <div className="pt-6 border-t mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400"
            >
              <Save size={20} />
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h4 className="font-semibold text-blue-800 mb-2 text-sm">Công thức tính phí vận chuyển:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Nếu <strong>Tổng tiền hàng</strong> ≥ <strong>Đơn hàng tối thiểu</strong>: Phí ship = 0 đ</p>
          <p>• Ngược lại: Phí ship = <strong>Phí cơ bản</strong> + <strong>Phí phụ thu mỗi KM</strong> × <i>(Khoảng cách thực tế - Số KM miễn phí phụ thu)</i></p>
        </div>
      </div>
    </div>
  );
};

export default AdminShipping;
