import React, { useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Star, Truck, Shield, Zap, Gift, Tag, ArrowRight, ChevronLeft } from 'lucide-react';
import productService from '../services/productService';
import { VoucherContext } from '../context/VoucherContext';
import { AuthContext } from '../context/AuthContext';
import ProductCard from '../components/common/ProductCard';
import toast from 'react-hot-toast';

// Fetch function
const fetchProducts = async () => {
    const res = await productService.getAll();
    return res?.data ?? res;
};

const formatVND = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
});

const Home = () => {
    const { data = [], isLoading, isError } = useQuery({
        queryKey: ['products'],
        queryFn: fetchProducts,
        staleTime: 1000 * 60 * 5, // cache 5 minutes
    });

    const { availableVouchers, fetchAvailableVouchers, myVouchers, collectVoucher, fetchMyVouchers } = useContext(VoucherContext);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [activeSlide, setActiveSlide] = useState(0);
    const [activeVoucherTab, setActiveVoucherTab] = useState('PRODUCT'); // 'PRODUCT' or 'SHIPPING'

    useEffect(() => {
        if (user?.id) {
            fetchAvailableVouchers(user.id);
            fetchMyVouchers(user.id);
        }
    }, [user?.id]);

    const featured = Array.isArray(data) ? data : (data?.data || []);

    const slides = [
        {
            title: 'Thực Phẩm Tươi Sạch',
            subtitle: 'Từ nông trại đến bàn ăn của bạn mỗi ngày',
            emoji: '🥬',
            color: 'from-emerald-500 to-teal-600',
            cta: 'Mua ngay'
        },
        {
            title: 'Fresh Everyday',
            subtitle: 'Thực phẩm sạch tuyển chọn từ nhà cung cấp uy tín.',
            emoji: '🥑',
            color: 'from-lime-500 to-emerald-600',
            cta: 'Mua sắm'
        },
        {
            title: 'Giao Nhanh Nội Thành',
            subtitle: 'Đặt hàng dễ dàng và nhận trong ngày.',
            emoji: '⚡',
            color: 'from-sky-500 to-indigo-600',
            cta: 'Đặt ngay'
        }
    ];

    const nextSlide = () => setActiveSlide(prev => (prev + 1) % slides.length);
    const prevSlide = () => setActiveSlide(prev => (prev - 1 + slides.length) % slides.length);

    useEffect(() => {
        const timer = setInterval(nextSlide, 10000);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className="space-y-16 pb-20">
            {/* Hero Section */}
            <section className="relative group overflow-hidden rounded-[40px] bg-slate-950 h-[400px] md:h-[500px]">
                {slides.map((slide, i) => (
                    <div
                        key={i}
                        className={`absolute inset-0 transition-all duration-1000 flex items-center px-8 md:px-20 ${activeSlide === i ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
                            }`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-90`} />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />

                        <div className="relative z-10 max-w-2xl text-white space-y-6">
                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30 text-xs font-bold tracking-widest uppercase">
                                <Zap size={14} className="text-yellow-300" /> Flash Sale Đang Diễn Ra
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black italic uppercase leading-none tracking-tighter drop-shadow-2xl">
                                {slide.title}
                            </h1>
                            <p className="text-lg md:text-xl font-medium text-white/80 max-w-md">
                                {slide.subtitle}
                            </p>
                            <button onClick={() => navigate('/products')} className="btn-primary bg-white text-slate-900 border-none px-10 py-4 rounded-2xl text-lg font-black uppercase tracking-wider hover:bg-slate-100">
                                {slide.cta}
                            </button>
                        </div>

                        <div className="hidden lg:flex flex-1 justify-end relative z-10">
                            <div className="text-[180px] drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] animate-bounce-slow">
                                {slide.emoji}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Hero Nav */}
                <div className="absolute bottom-10 left-8 md:left-20 flex gap-4 z-20">
                    <button onClick={prevSlide} className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={nextSlide} className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <ChevronRight size={24} />
                    </button>
                </div>
            </section>

            {/* VOUCHER HUB - CATEGORIZED */}
            <section className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-4">Trung Tâm Voucher</h2>
                    <p className="text-slate-500 font-medium">Lưu mã ngay để nhận ưu đãi cực khủng từ cửa hàng</p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mb-12">
                    {/* PRODUCT VOUCHER TAB CARD */}
                    <div
                        onClick={() => setActiveVoucherTab('PRODUCT')}
                        className={`flex-1 group cursor-pointer relative overflow-hidden rounded-[38px] p-8 transition-all duration-500 border-2 ${activeVoucherTab === 'PRODUCT'
                            ? 'border-blue-600 bg-blue-50 shadow-2xl shadow-blue-200 -translate-y-2'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                    >
                        <div className="flex items-center gap-6 relative z-10">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${activeVoucherTab === 'PRODUCT' ? 'bg-blue-600 text-white rotate-6' : 'bg-slate-100 text-slate-400'
                                }`}>
                                <Tag size={40} />
                            </div>
                            <div>
                                <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${activeVoucherTab === 'PRODUCT' ? 'text-blue-900' : 'text-slate-400'}`}>
                                    Voucher Đơn Hàng
                                </h3>
                                <p className={`text-sm font-bold uppercase ${activeVoucherTab === 'PRODUCT' ? 'text-blue-600/70' : 'text-slate-300'}`}>
                                    Giảm giá trực tiếp
                                </p>
                            </div>
                        </div>
                        {activeVoucherTab === 'PRODUCT' && (
                            <div className="absolute top-6 right-8 text-blue-600 font-black text-4xl opacity-10 italic">SHOP</div>
                        )}
                    </div>

                    {/* SHIPPING VOUCHER TAB CARD */}
                    <div
                        onClick={() => setActiveVoucherTab('SHIPPING')}
                        className={`flex-1 group cursor-pointer relative overflow-hidden rounded-[38px] p-8 transition-all duration-500 border-2 ${activeVoucherTab === 'SHIPPING'
                            ? 'border-emerald-600 bg-emerald-50 shadow-2xl shadow-emerald-200 -translate-y-2'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                    >
                        <div className="flex items-center gap-6 relative z-10">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${activeVoucherTab === 'SHIPPING' ? 'bg-emerald-600 text-white rotate-6' : 'bg-slate-100 text-slate-400'
                                }`}>
                                <Truck size={40} />
                            </div>
                            <div>
                                <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${activeVoucherTab === 'SHIPPING' ? 'text-emerald-900' : 'text-slate-400'}`}>
                                    Voucher Phí Ship
                                </h3>
                                <p className={`text-sm font-bold uppercase ${activeVoucherTab === 'SHIPPING' ? 'text-emerald-600/70' : 'text-slate-300'}`}>
                                    Miễn phí vận chuyển
                                </p>
                            </div>
                        </div>
                        {activeVoucherTab === 'SHIPPING' && (
                            <div className="absolute top-6 right-8 text-emerald-600 font-black text-4xl opacity-10 italic">SHIP</div>
                        )}
                    </div>
                </div>

                {/* ACTIVE VOUCHER LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {availableVouchers?.filter(v => v.voucherType === activeVoucherTab).length > 0 ? (
                        availableVouchers.filter(v => v.voucherType === activeVoucherTab).map((v) => {
                            const isCollected = v.isCollected;
                            const isUsed = v.isUsed;

                            return (
                                <div 
                                    key={v.code} 
                                    className={`group relative flex items-stretch bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 cursor-pointer ${isUsed ? 'opacity-70 grayscale-[0.5]' : ''}`}
                                    onClick={() => {
                                        if (isUsed) return;
                                        if (isCollected) {
                                            if (v.applicableProductIds && v.applicableProductIds.length > 0) {
                                                navigate(`/voucher/${v.code}`);
                                            } else {
                                                navigate("/cart");
                                            }
                                        }
                                    }}
                                >
                                    {/* Left Side (Color Bar) */}
                                    <div className={`w-4 ${isUsed ? 'bg-slate-300' : activeVoucherTab === 'SHIPPING' ? 'bg-emerald-500' : 'bg-blue-600'}`} />

                                    <div className="flex-1 p-6 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Code: {v.code}</span>
                                                <h4 className={`text-3xl font-black leading-none tracking-tighter ${isUsed ? 'text-slate-400' : 'text-slate-900'}`}>
                                                    {v.discountType === 'PERCENT' ? `${v.value}%` : (v.value / 1000).toFixed(0) + 'K'}
                                                </h4>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl text-slate-400"><Gift size={20} /></div>
                                        </div>

                                        <p className="text-xs font-bold text-slate-500 uppercase italic mb-4">
                                            {isUsed ? 'Bạn đã sử dụng mã này' : (v.discountType === 'PERCENT' ? 'Giảm tối đa' : 'Giảm trực tiếp') + (activeVoucherTab === 'SHIPPING' ? ' phí vận chuyển' : ' đơn hàng')}
                                        </p>

                                        {/* Usage Progress Bar */}
                                        <div className="mb-6 space-y-1.5">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                <span>Đã dùng {Math.round(((v.usedCount || 0) / (v.usageLimit || 1)) * 100)}%</span>
                                                <span>Còn lại {Math.max(0, (v.usageLimit || 0) - (v.usedCount || 0))} lượt</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${isUsed ? 'bg-slate-300' : activeVoucherTab === 'SHIPPING' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                                    style={{ width: `${Math.min(100, ((v.usedCount || 0) / (v.usageLimit || 1)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Đơn tối thiểu</span>
                                                <span className="text-xs font-black text-slate-700">{formatVND.format(v.minOrderAmount)}</span>
                                            </div>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (isUsed) return;
                                                    if (isCollected) {
                                                        if (v.applicableProductIds && v.applicableProductIds.length > 0) {
                                                            navigate(`/voucher/${v.code}`);
                                                        } else {
                                                            navigate("/cart");
                                                        }
                                                        return;
                                                    }
                                                    const res = await collectVoucher(user?.id, v.code);
                                                    if (res.success) {
                                                        toast.success('Đã lưu mã thành công!');
                                                        // Refresh available vouchers to update flags
                                                        fetchAvailableVouchers(user.id);
                                                    }
                                                }}
                                                className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isUsed
                                                    ? 'bg-slate-100 text-slate-400 cursor-default'
                                                    : isCollected
                                                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        : (activeVoucherTab === 'SHIPPING' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200')
                                                    }`}
                                            >
                                                {isUsed ? 'Đã dùng' : isCollected ? 'Sử dụng' : 'Lưu mã'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                            <div className="text-6xl mb-4 opacity-20">🎫</div>
                            <p className="text-slate-400 font-black italic uppercase tracking-[0.2em]">Hiện chưa có voucher loại này</p>
                        </div>
                    )}
                </div>
            </section>

            {/* FEATURED PRODUCTS */}
            <section className="max-w-7xl mx-auto px-4">
                <div className="flex items-end justify-between mb-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600">
                            <Star size={16} fill="currentColor" />
                            <span className="text-xs font-black uppercase tracking-widest">Recommended</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900">Sản phẩm nổi bật</h2>
                    </div>
                    <Link to="/products" className="group flex items-center gap-2 bg-slate-100 px-6 py-3 rounded-2xl text-sm font-black text-slate-900 hover:bg-slate-200 transition-all">
                        Xem tất cả <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-slate-100 rounded-[32px] aspect-[4/5]" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {featured.slice(0, 8).map(prod => (
                            <div key={prod.id} className="transition-all duration-300 hover:z-10">
                                <ProductCard product={prod} />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* TRUST BANNER */}
            <section className="max-w-7xl mx-auto px-4">
                <div className="bg-slate-950 rounded-[50px] p-12 md:p-20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[40%] h-full bg-blue-600 rotate-12 translate-x-20 translate-y-10 opacity-20" />

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center text-white mx-auto md:mx-0">
                                <Truck size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase">Giao Hàng Nhanh</h3>
                            <p className="text-white/60 text-sm">Nhận hàng chỉ trong vòng 2 giờ làm việc tại các khu vực nội thành.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center text-white mx-auto md:mx-0">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase">Bảo Hành Tươi Ngon</h3>
                            <p className="text-white/60 text-sm">Hoàn tiền 100% nếu sản phẩm không đạt tiêu chuẩn chất lượng tươi sạch.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center text-white mx-auto md:mx-0">
                                <Zap size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase">Thanh Toán Tiện Lợi</h3>
                            <p className="text-white/60 text-sm">Hỗ trợ đa dạng các hình thức thanh toán từ COD đến chuyển khoản.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
