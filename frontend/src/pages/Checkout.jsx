import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';
import paymentService from '../services/Payment';
import shippingService from '../services/shippingService';
import geoService from '../services/geoService';
import MapPicker from '../components/MapPicker';
import voucherService from '../services/voucherService';
import { Tag, X } from 'lucide-react';
import { VoucherContext } from '../context/VoucherContext';

const PAYMENT_OPTIONS = [
  {
    id: 'COD',
    method: 'COD',
    label: 'Thanh Toán Khi Nhận Hàng',
    subtitle: 'Thanh toán khi đơn hàng được giao đến bạn',
    type: 'OFFLINE',
  },
  {
    id: 'BANK_TRANSFER',
    method: 'BANK_TRANSFER',
    label: 'Chuyển Khoản Ngân Hàng',
    subtitle: 'Quét QR hoặc chuyển khoản vào tài khoản ngân hàng',
    type: 'TRANSFER',
  },
];

const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

import QRPaymentModal from '../components/checkout/QRPaymentModal';

/* ─────────── Main Checkout ─────────── */
const Checkout = () => {
  const { cartItems, fetchCart } = useContext(CartContext);
  const { user, refreshUser } = useContext(AuthContext);
  const { checkoutVouchers, fetchCheckoutVouchers } = useContext(VoucherContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState('COD');
  const [supportedPaymentMethods, setSupportedPaymentMethods] = useState([]);
  const [paymentSession, setPaymentSession] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingFee, setShippingFee] = useState(0);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [mapAddress, setMapAddress] = useState(null); 
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [shippingVoucherCodeInput, setShippingVoucherCodeInput] = useState('');
  const [autoSelectedStore, setAutoSelectedStore] = useState(false);
  const [resolvedCoords, setResolvedCoords] = useState(null);

  useEffect(() => {
    if (location.state?.appliedVoucher) {
      setVoucherCodeInput(location.state.appliedVoucher);
    }
  }, [location.state]);

  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [appliedShippingVoucher, setAppliedShippingVoucher] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingDiscountAmount, setShippingDiscountAmount] = useState(0);
  const [useStarsInput, setUseStarsInput] = useState(0);
  const [starDiscount, setStarDiscount] = useState(0);
  const [useAllStars, setUseAllStars] = useState(false);
  const [shippingLocations, setShippingLocations] = useState([]);
  const [preview, setPreview] = useState(null);

  const selectedItems = cartItems.filter((item) => item.ticked);
  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)),
    0
  );
  const totalDiscount = discountAmount + starDiscount + shippingDiscountAmount;
  const transferAmount = Math.max(0, selectedSubtotal - (discountAmount + starDiscount) + (shippingFee - shippingDiscountAmount));

  const availablePaymentOptions = supportedPaymentMethods.length > 0
    ? PAYMENT_OPTIONS.filter((item) => supportedPaymentMethods.includes(item.method))
    : PAYMENT_OPTIONS;

  const selectedPayment = availablePaymentOptions.find((item) => item.id === selectedPaymentId)
    || availablePaymentOptions[0]
    || PAYMENT_OPTIONS[0];

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Ràng buộc phải có đủ thông tin địa chỉ
    const hasFullAddress = user.province && user.district && user.ward && user.houseNumber;
    if (!hasFullAddress) {
      toast.error('Vui lòng cập nhật đầy đủ thông tin địa chỉ trong hồ sơ trước khi đặt hàng!');
      navigate('/profile?tab=info&from=checkout', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.id) {
      const productIds = selectedItems.map(item => item.productId || item.product?.id);
      fetchCheckoutVouchers(user.id, selectedSubtotal, productIds);
      if (refreshUser) {
        refreshUser();
      }
    }

    paymentService.getMethods().then((methods) => {
      const arr = Array.isArray(methods) ? methods : [];
      setSupportedPaymentMethods(arr);
    }).catch(console.error);

    shippingService.getLocations().then((res) => {
      setShippingLocations(res?.data || []);
    }).catch(console.error);
  }, [user?.id, selectedSubtotal, selectedItems.length]);

  useEffect(() => {
    if (!user) return;
    const { houseNumber, ward, district, province } = user;
    if (!province || !district || !ward) return;

    const calcFee = async (lat, lng) => {
      try {
        const res = await shippingService.calculateFee({
          lat, lng,
          subtotal: selectedSubtotal,
          storeId: selectedStoreId,
        });
        const fee = Number(res?.data ?? res);
        setShippingFee(Number.isFinite(fee) ? fee : 15000);
        setResolvedCoords(lat != null && lng != null ? [lat, lng] : null);
      } catch {
        setShippingFee(15000);
        setResolvedCoords(null);
      }
    };

    // 1. Người dùng chọn vị trí trên bản đồ → ưu tiên cao nhất
    if (selectedCoords) {
      calcFee(selectedCoords[0], selectedCoords[1]);
      return;
    }

    // 2. Dùng toạ độ đã lưu trong profile (nhanh, chính xác)
    if (user.latitude && user.longitude) {
      calcFee(Number(user.latitude), Number(user.longitude));
      return;
    }

    // 3. Fallback: geocode địa chỉ profile qua Nominatim
    const geocodeAndCalc = async () => {
      try {
        const fullAddress = [houseNumber, ward, district, province].filter(Boolean).join(', ');
        let res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&countrycodes=vn`, { headers: { 'Accept-Language': 'vi' } });
        let data = await res.json();

        if (!data || data.length === 0) {
          const generalAddress = [ward, district, province].filter(Boolean).join(', ');
          res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(generalAddress)}&format=json&limit=1&countrycodes=vn`, { headers: { 'Accept-Language': 'vi' } });
          data = await res.json();
        }

        if (data && data.length > 0) {
          calcFee(parseFloat(data[0].lat), parseFloat(data[0].lon));
        } else {
          calcFee(null, null); // Không tìm thấy toạ độ → để Backend tính theo phí cơ bản
        }
      } catch (err) {
        calcFee(null, null); // Geocode lỗi → để Backend tính
      }
    };

    geocodeAndCalc();
  }, [user, selectedCoords, selectedSubtotal, selectedStoreId]);

  useEffect(() => {
    if (user && selectedItems.length === 0) navigate('/cart', { replace: true });
  }, [user, selectedItems.length, navigate]);

  // Detect region and load stores for user's address
  useEffect(() => {
    if (!user) return;
    const address = `${user.houseNumber || ''} ${user.ward || ''} ${user.district || ''} ${user.province || ''}`.trim();
    if (!address) return;
    geoService.detect(address).then((res) => {
      const data = res?.data || res;
      const payload = data?.data || data;
      if (payload && payload.storesList) {
        setStores(Array.isArray(payload.storesList) ? payload.storesList.filter((store) => store?.deleted !== true) : []);
      }
    }).catch((e) => {
      console.error('Geo detect failed', e);
    });
  }, [user]);

  // Logic tự động chọn cửa hàng theo tỉnh thành và độ gần
  useEffect(() => {
    if (stores.length === 0 || !user) return;

    const cleanProv = (user.province || '').toLowerCase().replace(/thành phố|tỉnh/g, '').trim();
    const matchedStores = stores.filter(s => (s.address || '').toLowerCase().includes(cleanProv));

    if (matchedStores.length > 0) {
       setAutoSelectedStore(true);
       let best = matchedStores[0];

       const lat = selectedCoords ? selectedCoords[0] : (user.latitude ? Number(user.latitude) : null);
       const lng = selectedCoords ? selectedCoords[1] : (user.longitude ? Number(user.longitude) : null);

       if (matchedStores.length > 1 && lat && lng) {
          let minD = Infinity;
          matchedStores.forEach(s => {
             if (s.latitude && s.longitude) {
                const d = haversineKm(lat, lng, Number(s.latitude), Number(s.longitude));
                if (d < minD) { minD = d; best = s; }
             }
          });
       }
       setSelectedStoreId(best.id);
    } else {
       setAutoSelectedStore(false);
       if (!selectedStoreId && stores.length > 0) {
         setSelectedStoreId(stores[0].id);
       }
    }
  }, [stores, user, mapAddress, selectedCoords]);

  const handleApplyVoucher = async (forcedCode) => {
    const codeToApply = (typeof forcedCode === 'string') ? forcedCode : voucherCodeInput;
    if (!codeToApply) return toast.error('Voucher code is required');
    try {
      const productIds = selectedItems.map(item => item.product?.id || item.productId);
      const response = await voucherService.validateVoucher(codeToApply, selectedSubtotal, user?.id, productIds);
      if (response.success && response.data) {
        const v = response.data;
        if (v.voucherType !== 'PRODUCT') {
          return toast.error('Voucher này không phải mã giảm giá đơn hàng');
        }
        setAppliedVoucher(v);
        let d = v.discountType === 'PERCENT' ? selectedSubtotal * (v.value / 100) : v.value;
        if (d > selectedSubtotal) d = selectedSubtotal;
        setDiscountAmount(d);
        setVoucherCodeInput(v.code);
        toast.success('Đã áp dụng Voucher đơn hàng!');
        setShowVoucherModal(false);
      }
    } catch (err) {
      setAppliedVoucher(null);
      setDiscountAmount(0);
      if (!forcedCode) setVoucherCodeInput('');
      toast.error(err.response?.data?.message || err.message || 'Mã không hợp lệ hoặc đã hết hạn');
    }
  };

  const handleApplyShippingVoucher = async (forcedCode) => {
    const codeToApply = (typeof forcedCode === 'string') ? forcedCode : shippingVoucherCodeInput;
    if (!codeToApply) return toast.error('Shipping voucher code is required');
    try {
      const response = await voucherService.validateVoucher(codeToApply, selectedSubtotal, user?.id, []);
      if (response.success && response.data) {
        const v = response.data;
        if (v.voucherType !== 'SHIPPING') {
          return toast.error('Voucher này không phải mã giảm phí vận chuyển');
        }
        setAppliedShippingVoucher(v);
        let d = v.discountType === 'PERCENT' ? shippingFee * (v.value / 100) : v.value;
        if (d > shippingFee) d = shippingFee;
        setShippingDiscountAmount(d);
        setShippingVoucherCodeInput(v.code);
        toast.success('Đã áp dụng Voucher vận chuyển!');
        setShowVoucherModal(false);
      }
    } catch (err) {
      setAppliedShippingVoucher(null);
      setShippingDiscountAmount(0);
      if (!forcedCode) setShippingVoucherCodeInput('');
      toast.error(err.response?.data?.message || err.message || 'Mã không hợp lệ');
    }
  };

  /* ─────────── Voucher Modal Component ─────────── */
  const VoucherModal = ({
    onClose,
    productSelected,
    shippingSelected,
    onApply,
    items,
    subtotal,
    selectedItems
  }) => {
    const [tempProduct, setTempProduct] = useState(productSelected);
    const [tempShipping, setTempShipping] = useState(shippingSelected);

    const productVouchers = items?.filter(v => v.voucherType === 'PRODUCT');
    const shippingVouchers = items?.filter(v => v.voucherType === 'SHIPPING');

    const renderVoucher = (v, selected, onSelect) => {
      const ok = v.isApplicable;
      const msg = v.inapplicableReason;
      const isShipping = v.voucherType === 'SHIPPING';
      const activeColor = isShipping ? 'emerald' : 'blue';

      return (
        <div
          key={v.code}
          onClick={() => ok && onSelect(v)}
          className={`relative border-2 rounded-2xl p-4 transition-all ${
            !ok
              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed grayscale'
              : selected?.code === v.code
                ? `border-${activeColor}-500 bg-${activeColor}-50 shadow-md cursor-pointer`
                : `border-${activeColor}-100 bg-white hover:border-${activeColor}-300 cursor-pointer`
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={`font-black ${!ok ? 'text-slate-400' : 'text-slate-800'}`}>{v.code}</h4>
                {!ok && <span className="text-[8px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded uppercase">Không khả dụng</span>}
                {ok && isShipping && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase">Vận chuyển</span>}
                {ok && !isShipping && <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">Đơn hàng</span>}
              </div>
              <p className={`text-sm font-bold mt-1 ${!ok ? 'text-slate-400' : isShipping ? 'text-emerald-600' : 'text-blue-600'}`}>
                Giảm {v.discountType === 'PERCENT' ? `${v.value}%` : fmt.format(v.value)}
              </p>
              {!ok ? (
                <p className="text-[10px] text-red-400 font-bold mt-2 uppercase tracking-tight italic">⚠️ {msg}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  HSD: {v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : 'Vô hạn'}
                </p>
              )}
            </div>

            {ok && (
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                selected?.code === v.code ? `bg-${activeColor}-500 border-${activeColor}-500` : `border-${activeColor}-200`
              }`}>
                {selected?.code === v.code && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            )}
          </div>
        </div>
      );
    };

    React.useEffect(() => {
      const onKey = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
      <div onClick={(e) => { console.log('VoucherModal overlay clicked', e?.target); onClose(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

          <div className="bg-slate-950 text-white p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Chọn Ưu Đãi</h2>
              <p className="text-[10px] opacity-60 uppercase tracking-widest mt-1">
                Tối đa 1 Voucher Shop & 1 Voucher Ship
              </p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); console.log('VoucherModal close button clicked'); try { onClose(); } catch (err) { console.error('close error', err); } }} aria-label="Đóng" className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-8 bg-slate-50/50">
            {/* PRODUCT */}
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-400 mb-4 px-1">Voucher Đơn Hàng</h3>
              <div className="space-y-3">
                {productVouchers?.map(v =>
                  renderVoucher(v, tempProduct, (item) => setTempProduct(prev => prev?.code === item.code ? null : item), 'blue')
                )}
                {productVouchers?.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Bạn chưa có mã nào</p>}
              </div>
            </div>

            {/* SHIPPING */}
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-400 mb-4 px-1">Voucher Vận Chuyển</h3>
              <div className="space-y-3">
                {shippingVouchers?.map(v =>
                  renderVoucher(v, tempShipping, (item) => setTempShipping(prev => prev?.code === item.code ? null : item), 'emerald')
                )}
                {shippingVouchers?.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Bạn chưa có mã nào</p>}
              </div>
            </div>
          </div>

          {/* Footer with Apply Button */}
          <div className="p-6 border-t bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
             <button
                onClick={() => onApply(tempProduct, tempShipping)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
             >
                Áp Dụng
             </button>
          </div>
        </div>
      </div>
    );
  };
  const handleToggleUseAllStars = (checked) => {
    setUseAllStars(checked);
    if (!checked) {
      setUseStarsInput(0);
      setStarDiscount(0);
    } else {
      toast.success('Đã áp dụng toàn bộ sao tích lũy!');
    }
  };

  // Auto apply/recalculate stars when useAllStars is enabled
  useEffect(() => {
    if (useAllStars) {
      const maxPayable = selectedSubtotal - discountAmount + (shippingFee - shippingDiscountAmount);
      const maxStarsNeeded = Math.ceil(Math.max(0, maxPayable) / 1000);
      const starsToUse = Math.max(0, Math.min(user?.rewardStars || 0, maxStarsNeeded));
      setUseStarsInput(starsToUse);
      setStarDiscount(starsToUse * 1000);
    }
  }, [useAllStars, selectedSubtotal, discountAmount, shippingFee, shippingDiscountAmount, user?.rewardStars]);

  // Auto apply voucher when voucherCodeInput changes and it comes from state
  useEffect(() => {
    if (voucherCodeInput && location.state?.appliedVoucher === voucherCodeInput && selectedSubtotal > 0 && !appliedVoucher) {
      handleApplyVoucher();
    }
  }, [voucherCodeInput, selectedSubtotal, appliedVoucher, handleApplyVoucher, location.state?.appliedVoucher]);

  const handlePaid = useCallback(async (orderId) => {
    setShowQRModal(false);
    await fetchCart();
    navigate(`/order-success?orderId=${orderId}&mode=bank-transfer`, { replace: true });
  }, [fetchCart, navigate]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const parsedStars = Number.isFinite(Number(useStarsInput))
        ? Math.max(0, Math.floor(Number(useStarsInput)))
        : 0;

      const maxPayableBeforeStars = Math.max(0, selectedSubtotal - discountAmount + (shippingFee - shippingDiscountAmount));
      const maxStarsByAmount = Math.floor(maxPayableBeforeStars / 1000);
      const cappedStars = Math.min(parsedStars, user?.rewardStars || 0, maxStarsByAmount);

      const defaultAddress = [user.houseNumber, user.ward, user.district, user.province].filter(Boolean).join(', ');
      const finalAddress = mapAddress || defaultAddress;

      const orderRequest = {
        userId: user.id,
        storeId: selectedStoreId,
        items: selectedItems.map((item) => ({
          productId: item.productId || item.product?.id,
          quantity: item.quantity,
          unit: item.unit,
          conversionRate: item.conversionRate,
        })),
        voucherCode: appliedVoucher ? appliedVoucher.code : null,
        shippingVoucherCode: appliedShippingVoucher ? appliedShippingVoucher.code : null,
        shippingAddress: finalAddress,
        recipientName: user?.name || '',
        recipientPhone: user?.phone || '',
        province: user.province,
        district: user.district,
        ward: user.ward,
        houseNumber: user.houseNumber,
        latitude: resolvedCoords ? resolvedCoords[0] : null,
        longitude: resolvedCoords ? resolvedCoords[1] : null,
        useStars: cappedStars,
      };

      if (orderRequest.items.some((item) => !item.productId)) {
        throw new Error('Có sản phẩm không hợp lệ. Vui lòng tải lại giỏ hàng.');
      }

      const response = await orderService.createOrder(orderRequest);
      if (!response || response.success === false) {
        toast.error(response?.message || 'Đặt hàng thất bại. Vui lòng thử lại.');
        return;
      }

      const orderData = response.data || response;
      const orderId = orderData.id;
      const finalAmount = orderData.finalPrice;

      if (orderId) {
        const payment = await paymentService.createPayment(orderId, {
          method: selectedPayment.method,
          amount: finalAmount,
        });
        const paymentData = payment?.data || payment;

        if (selectedPayment.method === 'BANK_TRANSFER') {
          // Lấy payment đầy đủ nếu cần
          let session = paymentData;
          if (!session?.orderId) {
            const refreshed = await paymentService.getPayment(orderId);
            session = refreshed?.data || refreshed || paymentData;
          }
          setPaymentSession(session);
          setShowQRModal(true);
          toast.success('Đơn hàng đã tạo! Vui lòng quét QR để hoàn tất thanh toán.');
          return;
        }

        // COD
        if (selectedPayment.method === 'COD') {
          toast.success('Đặt hàng COD thành công!');
          await fetchCart();
          navigate('/profile?tab=orders');
          return;
        }
      }

      await fetchCart();
      navigate('/profile?tab=orders');
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Có lỗi xảy ra. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live preview from server to ensure checkout shows the authoritative totals
  // Debounced server preview to avoid spamming preview endpoint when inputs change rapidly
  useEffect(() => {
    if (!user || selectedItems.length === 0) {
      setPreview(null);
      return;
    }

    const parsedStars = Number.isFinite(Number(useStarsInput))
      ? Math.max(0, Math.floor(Number(useStarsInput)))
      : 0;
    const maxPayableBeforeStars = Math.max(0, selectedSubtotal - discountAmount + (shippingFee - shippingDiscountAmount));
    const maxStarsByAmount = Math.floor(maxPayableBeforeStars / 1000);
    const cappedStars = Math.min(parsedStars, user?.rewardStars || 0, maxStarsByAmount);

    const defaultAddress = [user.houseNumber, user.ward, user.district, user.province].filter(Boolean).join(', ');
    const finalAddress = mapAddress || defaultAddress;

    const orderRequest = {
      userId: user.id,
      storeId: selectedStoreId,
      items: selectedItems.map((item) => ({
        productId: item.productId || item.product?.id,
        quantity: item.quantity,
        unit: item.unit,
        conversionRate: item.conversionRate,
      })),
      voucherCode: appliedVoucher ? appliedVoucher.code : null,
      shippingVoucherCode: appliedShippingVoucher ? appliedShippingVoucher.code : null,
      shippingAddress: finalAddress,
      recipientName: user?.name || '',
      recipientPhone: user?.phone || '',
      province: user.province,
      district: user.district,
      ward: user.ward,
      houseNumber: user.houseNumber,
      latitude: resolvedCoords ? resolvedCoords[0] : null,
      longitude: resolvedCoords ? resolvedCoords[1] : null,
      useStars: cappedStars,
    };

    let cancelled = false;
    // debounce
    const timer = setTimeout(() => {
      const thisRequestId = (window.__orderPreviewReqId = (window.__orderPreviewReqId || 0) + 1);
      (async () => {
        try {
          const res = await orderService.previewOrder(orderRequest);
          const p = res?.data || res;
          // ignore if a newer request was scheduled
          if (cancelled) return;
          if (window.__orderPreviewReqId !== thisRequestId) return;
          setPreview(p);
        } catch (err) {
          if (cancelled) return;
          setPreview(null);
        }
      })();
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubtotal, discountAmount, shippingFee, shippingDiscountAmount, appliedVoucher?.code, appliedShippingVoucher?.code, useStarsInput, resolvedCoords?.[0], resolvedCoords?.[1], selectedStoreId, user?.id, selectedItems.length]);

  if (!user || selectedItems.length === 0) {
    return <div className="py-20 text-center text-gray-500">Vui lòng chọn sản phẩm để thanh toán.</div>;
  }

  return (
    <>
      {showQRModal && paymentSession && (
        <QRPaymentModal
          paymentSession={paymentSession}
          onPaid={handlePaid}
          onCancel={async () => {
            setShowQRModal(false);
            await fetchCart();
            toast.success('Đơn hàng đã được lưu. Bạn có thể thanh toán sau trong Lịch sử đơn hàng.');
            navigate('/profile?tab=orders', { replace: true });
          }}
        />
      )}

      {showVoucherModal && (
        <VoucherModal
          onClose={() => { console.log('Parent: close voucher modal requested'); setShowVoucherModal(false); }}
          productSelected={appliedVoucher}
          shippingSelected={appliedShippingVoucher}
          onApply={async (p, s) => {
            // Xử lý voucher đơn hàng
            if (!p) {
              setAppliedVoucher(null);
              setDiscountAmount(0);
              setVoucherCodeInput('');
            } else if (appliedVoucher?.code !== p.code) {
              await handleApplyVoucher(p.code);
            }

            // Xử lý voucher vận chuyển
            if (!s) {
              setAppliedShippingVoucher(null);
              setShippingDiscountAmount(0);
            } else if (appliedShippingVoucher?.code !== s.code) {
              await handleApplyShippingVoucher(s.code);
            }

            setShowVoucherModal(false);
          }}
          items={checkoutVouchers}
          subtotal={selectedSubtotal}
          selectedItems={selectedItems}
        />
      )}

      {showMap && (
        <MapPicker
          initialPosition={selectedCoords || [Number(user?.latitude) || 16.0544, Number(user?.longitude) || 108.2022]}
          storeCoords={selectedStoreId ? (() => {
            const s = stores.find(x => x.id === selectedStoreId);
            return s && s.latitude && s.longitude ? [Number(s.latitude), Number(s.longitude)] : null;
          })() : null}
          onSelect={async (coords) => {
            setSelectedCoords(coords);
            setShowMap(false);
            toast.success('Đã chọn vị trí giao hàng');
            // Reverse geocode with Nominatim
            try {
              const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${coords[0]}&lon=${coords[1]}&format=json&accept-language=vi`,
                { headers: { 'Accept-Language': 'vi' } }
              );
              const geo = await resp.json();
              const addr = geo?.display_name || `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
              setMapAddress(addr);
            } catch {
              setMapAddress(`${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
            }
          }}
          onCancel={() => setShowMap(false)}
        />
      )}

      <div className="max-w-5xl mx-auto py-8">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-8 tracking-tight">Thanh Toán</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Form */}
          <div className="lg:w-2/3">
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">

              {/* Address */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📍</span> Địa Chỉ Giao Hàng
                </h2>
                {/* Address card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
                  <div className="bg-brand-500 text-white p-2 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    {mapAddress ? (
                      /* ── Map-selected address ── */
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wide">📍 Vị trí bản đồ</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{mapAddress}</p>
                        {/* Distance to selected store */}
                        {selectedStoreId && (() => {
                          const s = stores.find(x => x.id === selectedStoreId);
                          if (s?.latitude && s?.longitude) {
                            const d = haversineKm(selectedCoords[0], selectedCoords[1], Number(s.latitude), Number(s.longitude));
                            return <p className="text-xs text-slate-500 mt-1">Cách cửa hàng <span className="font-bold text-blue-600">{d.toFixed(1)} km</span></p>;
                          }
                          return null;
                        })()}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
                          <p className="text-sm text-gray-500 font-medium">Người nhận: <span className="text-gray-900">{user.name}</span></p>
                          <p className="text-sm text-gray-500 font-medium">SĐT: <span className="text-gray-900">{user.phone}</span></p>
                        </div>
                      </>
                    ) : (
                      /* ── Default profile address ── */
                      <>
                        <p className="font-bold text-gray-900 text-lg">{user.houseNumber}</p>
                        <p className="text-gray-600 mt-1">{user.ward}, {user.district}, {user.province}</p>
                        {/* Distance to selected store from profile address */}
                        {selectedStoreId && user.latitude && user.longitude && (() => {
                          const s = stores.find(x => x.id === selectedStoreId);
                          if (s?.latitude && s?.longitude) {
                            const d = haversineKm(Number(user.latitude), Number(user.longitude), Number(s.latitude), Number(s.longitude));
                            return <p className="text-xs text-slate-500 mt-1">Cách cửa hàng <span className="font-bold text-blue-600">{d.toFixed(1)} km</span></p>;
                          }
                          return null;
                        })()}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
                          <p className="text-sm text-gray-500 font-medium">Người nhận: <span className="text-gray-900">{user.name}</span></p>
                          <p className="text-sm text-gray-500 font-medium">SĐT: <span className="text-gray-900">{user.phone}</span></p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {mapAddress ? (
                      <button
                        type="button"
                        onClick={() => { setMapAddress(null); setSelectedCoords(null); }}
                        className="text-sm text-red-500 font-bold hover:underline"
                      >
                        ✕ Bỏ chọn
                      </button>
                    ) : (
                      <Link to="/profile?tab=info" className="text-brand-600 font-bold text-sm hover:underline">Thay đổi</Link>
                    )}
                    <button type="button" onClick={() => setShowMap(true)} className="text-sm text-slate-600 underline text-left">
                      {mapAddress ? '🗺 Chọn lại' : 'Chọn vị trí trên bản đồ'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Store selector (if stores detected) */}
              {stores.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">Cửa hàng lấy hàng</h3>
                  {autoSelectedStore ? (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-start gap-3">
                      <span className="text-xl">🏪</span>
                      <div>
                        {(() => {
                          const s = stores.find(x => x.id === selectedStoreId);
                          return (
                            <>
                              <p className="font-bold text-sm">Được tự động chọn: {s?.name}</p>
                              <p className="text-xs mt-1 text-blue-600/80">{s?.address}</p>
                              {selectedCoords && selectedStoreId && s?.latitude && s?.longitude && (
                                <p className="text-xs text-blue-600 font-semibold mt-1">
                                  Cách vị trí giao hàng {haversineKm(selectedCoords[0], selectedCoords[1], Number(s.latitude), Number(s.longitude)).toFixed(2)} km
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <>
                      <select value={selectedStoreId || ''} onChange={e => setSelectedStoreId(Number(e.target.value))} className="w-full p-3 border border-gray-200 rounded-xl bg-white shadow-sm font-medium">
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name}{s.address ? ` - ${s.address}` : ''}</option>
                        ))}
                      </select>
                      {selectedCoords && selectedStoreId && (() => {
                        const s = stores.find(x => x.id === selectedStoreId);
                        if (s && s.latitude && s.longitude) {
                          const d = haversineKm(selectedCoords[0], selectedCoords[1], Number(s.latitude), Number(s.longitude));
                          return <p className="text-sm text-slate-500 mt-2">Cách cửa hàng khoảng <span className="font-bold">{d.toFixed(2)} km</span></p>;
                        }
                        return null;
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* Payment Method */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Phương Thức Thanh Toán</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {availablePaymentOptions.map((option) => {
                    const active = selectedPaymentId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedPaymentId(option.id)}
                        className={`text-left rounded-xl border p-4 transition-all ${active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800">{option.label}</span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${option.type === 'OFFLINE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                            {option.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{option.subtitle}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  {selectedPayment.method === 'COD' && (
                    <p className="text-sm text-gray-700">Thanh toán khi nhận hàng.</p>
                  )}
                  {selectedPayment.method === 'BANK_TRANSFER' && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📱</span>
                      <div>
                        <p className="font-semibold text-amber-800 text-sm">Thanh toán qua QR Code</p>
                        <p className="text-xs text-amber-700 mt-1">Sau khi đặt hàng, hệ thống sẽ hiển thị mã QR để bạn quét và thanh toán. Trạng thái sẽ tự động cập nhật.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reward Stars */}
              {(user?.rewardStars || 0) > 0 && (
                      <div className="border-t pt-6 mt-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <span>⭐</span> Tích Lũy Sao
                        </h2>
                        <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Sao tích lũy khả dụng: <span className="font-extrabold text-amber-600 text-lg">{user?.rewardStars || 0} sao</span>
                      </p>
                      <p className="text-xs text-amber-700 font-medium mt-0.5">Quy đổi: 1 sao = 1.000 VND</p>
                    </div>
                    {/* Switch Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useAllStars}
                        onChange={(e) => handleToggleUseAllStars(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      <span className="ml-3 text-sm font-bold text-amber-900">Áp dụng</span>
                    </label>
                  </div>

                  {useAllStars && (
                    <div className="mt-4 bg-amber-100/50 border border-amber-200/80 rounded-xl p-4 flex items-center justify-between text-amber-900 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Đã áp dụng tự động</p>
                          <p className="text-sm font-bold mt-0.5">Sử dụng: <span className="text-base font-extrabold">{useStarsInput} sao</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Giảm giá</p>
                        <p className="text-base font-extrabold text-amber-600">-{fmt.format(starDiscount)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
      )}
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">Tóm Tắt Đơn Hàng</h2>

              <div className="space-y-4 max-h-60 overflow-y-auto mb-6 pr-2">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{item.productName || item.product?.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                          {item.unit || 'Mặc định'}
                        </span>
                        <span className="text-xs text-gray-500">x {item.quantity}</span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-800 text-right">
                      {fmt.format((item.price || item.product?.price || 0) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-4 mb-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider">
                        🎫 Voucher của tôi
                    </h3>
                </div>

                <button
                    type="button"
                    onClick={() => setShowVoucherModal(true)}
                    className="w-full flex items-center justify-between p-4 border-2 border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 transition-all group"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Chọn voucher</span>
                        <span className="text-xs font-bold text-blue-600">Áp dụng cho đơn hàng & vận chuyển</span>
                    </div>
                    <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                        <Tag size={16} />
                    </div>
                </button>

                {(appliedVoucher || appliedShippingVoucher) && (
                    <div className="space-y-2">
                        {appliedVoucher && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Tag size={14} className="text-blue-600" />
                                    <div>
                                        <p className="text-[9px] font-black text-blue-500 uppercase">Shop Voucher</p>
                                        <p className="text-xs font-bold text-slate-800">{appliedVoucher.code}</p>
                                    </div>
                                </div>
                                <X size={14} className="text-slate-400 hover:text-red-500 cursor-pointer" onClick={() => { setAppliedVoucher(null); setDiscountAmount(0); setVoucherCodeInput(''); }} />
                            </div>
                        )}
                        {appliedShippingVoucher && (
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-emerald-600"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18H3c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M16 8h5l3 3v5h-2"/></svg></div>
                                    <div>
                                        <p className="text-[9px] font-black text-emerald-500 uppercase">Shipping Voucher</p>
                                        <p className="text-xs font-bold text-slate-800">{appliedShippingVoucher.code}</p>
                                    </div>
                                </div>
                                <X size={14} className="text-slate-400 hover:text-red-500 cursor-pointer" onClick={() => { setAppliedShippingVoucher(null); setShippingDiscountAmount(0); }} />
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-between text-gray-600 mt-4">
                  <span>Tạm tính</span>
                  <span className="font-medium">{fmt.format(selectedSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Giảm giá Voucher Shop</span>
                    <span className="font-medium">- {fmt.format(discountAmount)}</span>
                  </div>
                )}
                {shippingDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá Vận chuyển</span>
                    <span className="font-medium">- {fmt.format(shippingDiscountAmount)}</span>
                  </div>
                )}
                {starDiscount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Giảm giá từ Sao</span>
                    <span className="font-medium">- {fmt.format(starDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-medium">{shippingFee === 0 ? <span className="text-emerald-600">Miễn phí</span> : fmt.format(shippingFee)}</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">Tổng cộng</span>
                  <span className="text-2xl font-bold text-red-500">{fmt.format(preview?.finalPrice ?? transferAmount)}</span>
                </div>
                {preview && Math.abs((preview.finalPrice || 0) - transferAmount) > 0.001 && (
                  <div className="text-xs text-slate-500 mt-2">
                    Lưu ý: Giá hiển thị do server xác nhận là <strong>{fmt.format(preview.finalPrice)}</strong>.
                  </div>
                )}
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-lg"
              >
                {isSubmitting
                  ? 'Đang xử lý...'
                  : selectedPayment.method === 'BANK_TRANSFER'
                    ? '💳 Đặt hàng & Thanh toán QR'
                    : '🛒 Đặt hàng ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default Checkout;
