import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Heart, Package, Check } from 'lucide-react';
import productService from '../services/productService';
import { CartContext } from '../context/CartContext';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import { PRODUCT_FALLBACK_IMAGE, ensureImageFallback } from '../utils/imageFallback';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState(null);

  useEffect(() => {
    productService.getById(id)
      .then(res => {
        const p = res.data || res;
        setProduct(p);
      })
      .catch(err => {
         toast.error("Không tìm thấy sản phẩm");
         navigate('/products');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleAddToCart = async () => {
    const unitName = selectedUnit ? selectedUnit.name : product.unit;
    const rate = selectedUnit ? selectedUnit.conversionRate : 1.0;
    const res = await addToCart(product.id, quantity, unitName, rate);
    if(res.success) toast.success(`Đã thêm ${quantity} ${unitName} vào giỏ hàng`);
    else toast.error(res.message || "Lỗi khi thêm vào giỏ");
  };

  if (loading) return <div className="py-32"><Spinner size="lg"/></div>;
  if (!product) return null;

  const currentPrice = selectedUnit ? selectedUnit.price : product.price;

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-[#f8fafc] min-h-screen">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-slate-900 hover:text-blue-600 mb-8 font-black transition-all group uppercase tracking-widest text-xs"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Quay lại
      </button>

      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
        {/* Left: Image Container */}
        <div className="w-full lg:w-1/2 bg-white p-12 flex items-center justify-center border-r border-slate-50 relative group">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
           <img
            src={product.imageUrl || PRODUCT_FALLBACK_IMAGE}
            alt={product.name}
            onError={ensureImageFallback}
            className="w-full max-h-[450px] object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        {/* Right: Content Container */}
        <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col">
          <div className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">
             {product.category || 'GIA VỊ & ĐỒ KHÔ'}
          </div>

          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 leading-[1.1]">
            {product.name}
          </h1>

          <div className="text-4xl font-black text-rose-600 mb-8 tracking-tighter">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentPrice)}
          </div>

          <p className="text-slate-500 mb-10 leading-relaxed font-medium text-lg max-w-lg">
             {product.description || "Nước mắm quốc dân cho mọi gia đình. Hương vị đậm đà, thơm ngon tự nhiên."}
          </p>

          {/* Unit Selection Section */}
          {product && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Package className="text-indigo-500" size={18} />
                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">ĐƠN VỊ TÍNH</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedUnit(null)}
                  className={`group relative px-8 py-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-start min-w-[140px] ${!selectedUnit ? 'border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                >
                  <span className={`text-sm font-black uppercase tracking-tight ${!selectedUnit ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {(product.unit || (product.units && product.units[0]?.name) || 'Mặc định')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Gốc</span>
                  {!selectedUnit && <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg ring-4 ring-white"><Check size={12} strokeWidth={4} /></div>}
                </button>

                {product.units && product.units.map((u, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedUnit(u)}
                    className={`group relative px-8 py-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-start min-w-[140px] ${selectedUnit?.id === u.id ? 'border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                  >
                    <span className={`text-sm font-black uppercase tracking-tight ${selectedUnit?.id === u.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {u.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">x{u.conversionRate}</span>
                    {selectedUnit?.id === u.id && <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg ring-4 ring-white"><Check size={12} strokeWidth={4} /></div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Section */}
          <div className="mb-12">
            <span className="block text-sm font-black text-slate-900 uppercase tracking-widest mb-4">SỐ LƯỢNG</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center border-2 border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
                <button
                  className="px-8 py-4 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-20 text-xl font-bold"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >-</button>
                <span className="px-8 py-4 font-black text-slate-900 border-x-2 border-slate-100 min-w-[80px] text-center text-xl">{quantity}</span>
                <button
                  className="px-8 py-4 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors text-xl font-bold"
                  onClick={() => setQuantity(quantity + 1)}
                >+</button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-auto">
             <button
                onClick={handleAddToCart}
                disabled={Number(product.stock || 0) <= 0}
                className={`flex-1 text-white py-5 rounded-[2.5rem] font-black text-xl shadow-[0_15px_40px_rgba(91,81,239,0.3)] transition-all flex items-center justify-center gap-4 ${Number(product.stock || 0) <= 0 ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-[#5b51ef] hover:bg-[#4a40d6] hover:-translate-y-1 active:scale-95'}`}
             >
                <ShoppingCart size={26} /> {Number(product.stock || 0) <= 0 ? 'Hết hàng' : 'Thêm Vào Giỏ Hàng'}
             </button>
             <button className="p-5 rounded-[2.5rem] border-2 border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 transition-all active:scale-90 bg-white shadow-sm">
                <Heart size={30} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
