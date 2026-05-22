import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, ArrowLeft, ShoppingBag } from 'lucide-react';
import productService from '../services/productService';
import axiosClient from '../api/axiosClient';
import ProductCard from '../components/common/ProductCard';
import { AuthContext } from '../context/AuthContext';

const VoucherProducts = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    
    const [voucher, setVoucher] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch voucher details
                const vRes = await axiosClient.get(`/vouchers/${code}`);
                const vData = vRes.data;
                setVoucher(vData);

                // Fetch all products and filter by applicableProductIds
                const pRes = await productService.getAll();
                const allProducts = pRes?.data?.data || pRes?.data || pRes || [];
                
                if (vData.applicableProductIds && vData.applicableProductIds.length > 0) {
                    const filtered = allProducts.filter(p => vData.applicableProductIds.includes(p.id));
                    setProducts(filtered);
                } else {
                    // If no specific products, this page shouldn't really be reached based on the logic,
                    // but we'll show all products just in case.
                    setProducts(allProducts);
                }
            } catch (err) {
                console.error("Failed to fetch voucher products", err);
            } finally {
                setLoading(false);
            }
        };

        if (code) fetchData();
    }, [code]);

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold animate-pulse">Đang tìm sản phẩm ưu đãi...</p>
            </div>
        );
    }

    if (!voucher) {
        return (
            <div className="text-center py-20 space-y-4">
                <h2 className="text-2xl font-black text-slate-900">Không tìm thấy Voucher</h2>
                <button onClick={() => navigate('/')} className="text-blue-600 font-bold hover:underline">Quay lại trang chủ</button>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[40px] bg-slate-950 p-8 md:p-16 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <button 
                    onClick={handleBack}
                    className="group mb-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-widest">Quay lại</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest">
                            <Tag size={14} /> Voucher Đặc Quyền
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                            Voucher: {voucher.code}
                        </h1>
                        <p className="text-lg md:text-xl text-white/60 max-w-xl font-medium">
                            {voucher.discountType === 'PERCENT' ? `Giảm giá ${voucher.value}%` : `Giảm trực tiếp ${new Intl.NumberFormat('vi-VN').format(voucher.value)} VNĐ`} cho danh sách các sản phẩm dưới đây.
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[32px] p-6 text-center min-w-[200px]">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Đơn tối thiểu</p>
                        <p className="text-2xl font-black text-white italic">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.minOrderAmount)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-black italic uppercase text-slate-900 flex items-center gap-3">
                        <ShoppingBag className="text-blue-600" />
                        Danh sách sản phẩm áp dụng ({products.length})
                    </h2>
                </div>

                {products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                        <p className="text-slate-400 font-black italic uppercase tracking-widest">Hiện không tìm thấy sản phẩm nào áp dụng cho voucher này</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoucherProducts;
