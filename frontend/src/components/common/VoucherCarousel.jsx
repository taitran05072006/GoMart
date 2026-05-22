import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Ticket, Zap, Truck, Clock } from 'lucide-react';
import { VoucherContext } from '../../context/VoucherContext';
import { AuthContext } from '../../context/AuthContext';

const formatVND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

const VoucherCarousel = ({ filterByProducts = [] }) => {
  const { availableVouchers, fetchAvailableVouchers } = useContext(VoucherContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchAvailableVouchers(user.id, filterByProducts);
    }
  }, [user?.id, JSON.stringify(filterByProducts)]);

  if (!availableVouchers || availableVouchers.length === 0) return null;

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % availableVouchers.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + availableVouchers.length) % availableVouchers.length);
  };

  const currentVoucher = availableVouchers[activeIndex];

  return (
    <div className="relative w-full max-w-6xl mx-auto group mb-12">
      {/* Main Carousel Container */}
      <div className="relative h-[240px] md:h-[300px] w-full overflow-hidden rounded-[2.5rem] shadow-2xl shadow-orange-100 border border-white/40">
        
        {/* Background Layer with Animation */}
        <div className={`absolute inset-0 transition-colors duration-700 bg-gradient-to-r ${
            currentVoucher.requiredTier === 'DIAMOND' ? 'from-cyan-500 via-blue-600 to-indigo-700' :
            currentVoucher.requiredTier === 'GOLD' ? 'from-orange-500 via-red-500 to-rose-600' :
            'from-orange-400 via-orange-500 to-red-500'
        }`}>
            {/* Animated Patterns */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent_70%)] animate-pulse" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Content Layer */}
        <div className="relative h-full flex items-center px-8 md:px-16">
            <div className="flex-1 text-white space-y-4">
                <div className="flex items-center gap-3">
                    <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border border-white/30 shadow-sm">
                        {currentVoucher.requiredTier || 'QUYỀN LỢI THÀNH VIÊN'}
                    </span>
                    <div className="flex items-center gap-1.5 text-orange-200">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">
                            Hết hạn: {currentVoucher.endDate ? new Date(currentVoucher.endDate).toLocaleDateString('vi-VN') : 'Vô hạn'}
                        </span>
                    </div>
                </div>

                <div className="space-y-0">
                    <h2 className="text-xl md:text-2xl font-bold opacity-90 tracking-tight leading-none italic uppercase">Bạn mới tặng</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl md:text-8xl font-black tracking-tighter drop-shadow-lg">
                            {currentVoucher.discountType === 'PERCENT' ? `${currentVoucher.value}%` : 
                                formatVND.format(currentVoucher.value).replace('₫', '').trim()
                            }
                        </span>
                        <span className="text-2xl md:text-4xl font-black opacity-80 uppercase">
                            {currentVoucher.discountType === 'PERCENT' ? 'Giảm' : 'Đ'}
                        </span>
                    </div>
                </div>

                <p className="text-[10px] md:text-xs font-bold opacity-70 italic max-w-sm">
                    (*) Chi tiết chương trình (bao gồm các trường hợp loại trừ) xem tại trang Miễn Phí Vận Chuyển trên Ứng dụng GoMart.
                </p>
            </div>

            {/* Right Side Info Cards (Shopee Style) */}
            <div className="hidden lg:flex flex-col gap-3">
                <div className="bg-blue-600/90 backdrop-blur border border-white/20 rounded-2xl p-4 flex items-center gap-4 shadow-xl transform rotate-1 hover:rotate-0 transition-transform">
                    <div className="bg-white p-2 rounded-full shadow-inner">
                        <Truck className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-1 font-black text-white italic">
                            <span className="text-xs">FREE</span>
                            <span className="text-xl leading-none">SHIP</span>
                            <span className="text-3xl leading-none ml-1">0Đ</span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-500/90 backdrop-blur border border-white/20 rounded-2xl p-4 flex items-center gap-4 shadow-xl transform -rotate-1 hover:rotate-0 transition-transform">
                    <div className="bg-orange-500 p-2 rounded-full shadow-inner">
                        <Zap className="text-white" size={24} />
                    </div>
                    <div>
                        <div className="font-black text-white italic leading-tight uppercase">
                            <div className="text-[10px] opacity-80">Giao trễ tặng</div>
                            <div className="text-lg">Voucher 15.000Đ</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Banner Badge */}
            <div className="absolute top-8 right-12 hidden md:block">
                 <div className="relative bg-red-600 text-white w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 border-yellow-400 shadow-2xl rotate-12 scale-110">
                    <span className="text-[10px] font-black uppercase opacity-80 leading-none">FREESHIP</span>
                    <span className="text-4xl font-black leading-none">0Đ</span>
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">(*)</div>
                 </div>
            </div>
        </div>

        {/* Use Now Button Container */}
        <div className="absolute bottom-8 left-8 md:left-16 z-20">
             <button 
                onClick={() => navigate("/checkout", { state: { appliedVoucher: currentVoucher.code } })}
                className="bg-white text-orange-600 px-10 py-3 rounded-2xl text-sm font-black shadow-2xl hover:bg-orange-50 hover:scale-105 transition-all duration-300 uppercase tracking-widest"
             >
                Nhận ngay mã {currentVoucher.code}
             </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-black/40 text-white rounded-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30"
      >
        <ChevronLeft size={24} />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-black/40 text-white rounded-2xl backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30"
      >
        <ChevronRight size={24} />
      </button>

      {/* Indicators */}
      <div className="flex justify-center gap-3 mt-6">
        {availableVouchers.map((_, i) => (
          <button 
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-2 rounded-full transition-all duration-500 ${
              activeIndex === i ? 'w-12 bg-orange-500 shadow-lg shadow-orange-200' : 'w-2 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default VoucherCarousel;
