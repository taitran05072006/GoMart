import React, { useEffect, useState } from 'react';
import shippingConfigService from '../../services/shippingConfigService';
import toast from 'react-hot-toast';

export default function AdminShippingConfig() {
  const [config, setConfig] = useState({ perKmRate: 3000, baseFee: 15000, freeThreshold: 500000 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    shippingConfigService.getConfig()
      .then(res => {
        const data = res?.data?.data ?? res?.data ?? res;
        if (data) setConfig((current) => ({
          ...current,
          ...data,
        }));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        perKmRate: Number(config.perKmRate),
        baseFee: Number(config.baseFee),
        freeThreshold: Number(config.freeThreshold),
        freeKm: Number(config.freeKm),
      };
      const res = await shippingConfigService.updateConfig(payload);
      const saved = res?.data?.data ?? res?.data ?? res;
      setConfig((current) => ({
        ...current,
        ...saved,
      }));
      toast.success('Đã cập nhật cấu hình vận chuyển');
    } catch (err) {
      console.error(err);
      toast.error('Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Cấu hình vận chuyển</h2>
      <div className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-semibold">Hệ số (VND / km)</label>
          <input type="number" value={config.perKmRate} onChange={e => setConfig(prev => ({ ...prev, perKmRate: e.target.value }))} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-semibold">Phí cơ bản (VND) - fallback</label>
          <input type="number" value={config.baseFee} onChange={e => setConfig(prev => ({ ...prev, baseFee: e.target.value }))} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-semibold">Miễn phí (km) - khoảng cách miễn phí đầu tiên</label>
          <input type="number" step="0.1" value={config.freeKm} onChange={e => setConfig(prev => ({ ...prev, freeKm: e.target.value }))} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-semibold">Miễn phí nếu tổng tiền &gt= (VND)</label>
          <input type="number" value={config.freeThreshold} onChange={e => setConfig(prev => ({ ...prev, freeThreshold: e.target.value }))} className="w-full p-2 border rounded" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">Lưu</button>
        </div>
      </div>
    </div>
  );
}
