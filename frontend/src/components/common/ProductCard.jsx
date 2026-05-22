import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, X, Package, Zap, Clock, Minus, Plus, Star, Gift, ChevronRight, Share2, Heart } from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { PRODUCT_FALLBACK_IMAGE, ensureImageFallback } from '../../utils/imageFallback';

const UnitSelectionModal = ({ product, isOpen, onClose, onSelect }) => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) setIsAnimating(true);
  }, [isOpen]);

  if (!isOpen) return null;

  const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
  const currentPrice = selectedUnit && selectedUnit !== 'DEFAULT' ? selectedUnit.price : product.price;
  const oldPrice = selectedUnit && selectedUnit !== 'DEFAULT' ? (selectedUnit.oldPrice || selectedUnit.price * 1.2) : (product.oldPrice || product.price * 1.2);

  const handleConfirm = (isBuyNow = false) => {
    onSelect(selectedUnit === 'DEFAULT' || selectedUnit === null ? null : selectedUnit, quantity, isBuyNow);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[12px] animate-in fade-in duration-500">
      <div className={`bg-white w-full max-w-2xl rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-700 ${isAnimating ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95'}`}>
        <div className="flex flex-col md:flex-row relative">
          <button 
            onClick={() => { setIsAnimating(false); setTimeout(onClose, 300); }} 
            className="absolute top-8 right-8 z-20 p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all duration-300 active:scale-90"
          >
            <X size={24} />
          </button>

          {/* Left: Product Image Area */}
          <div className="md:w-[42%] bg-gradient-to-b from-slate-50 to-white p-10 flex flex-col items-center justify-center border-r border-slate-100/50">
            <div className="relative w-full aspect-square bg-white rounded-[40px] shadow-[0_25px_60px_rgba(0,0,0,0.1)] group/img overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-700" />
              <img 
                src={product.imageUrl || PRODUCT_FALLBACK_IMAGE} 
                alt={product.name}
                onError={ensureImageFallback}
                className="w-full h-full object-contain p-8 transition-transform duration-1000 group-hover/img:scale-110"
              />
              {Number(product.discount) > 0 && (
                <div className="absolute top-5 left-5 bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[10px] font-black px-3 py-1.5 rounded-2xl shadow-xl shadow-rose-200 uppercase tracking-widest">
                  -{product.discount}%
                </div>
              )}
            </div>
            
            <div className="mt-8 flex gap-3 w-full">
                {[1,2].map(i => (
                    <div key={i} className="flex-1 aspect-square bg-white rounded-2xl border border-slate-100 p-2 hover:border-rose-200 cursor-pointer transition-all hover:shadow-lg hover:shadow-rose-100/20">
                        <img src={product.imageUrl || PRODUCT_FALLBACK_IMAGE} className="w-full h-full object-contain opacity-60" alt="" />
                    </div>
                ))}
            </div>
          </div>

          {/* Right: Product Details Area */}
          <div className="md:w-[58%] p-12 flex flex-col">
            <div className="mb-8 space-y-4">
               <div className="flex items-center gap-3">
                 <div className="bg-rose-500 text-white text-[9px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-[0.2em] shadow-lg shadow-rose-200">Mall</div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Official Store</span>
               </div>
               <h3 className="text-3xl font-black text-slate-900 leading-[1.2] tracking-tighter">{product.name}</h3>
            </div>

            {/* Price Section - Premium Dark Card */}
            <div className="bg-slate-900 rounded-[32px] p-8 mb-8 relative overflow-hidden group/price">
               <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2 transition-transform duration-1000 group-hover/price:scale-125" />
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-10 translate-y-1/2 -translate-x-1/2" />
               
               <div className="flex items-center justify-between mb-5 relative z-10">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                    <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-1">
                        <Zap size={12} fill="currentColor" /> Flash Sale
                    </span>
                 </div>
                 <div className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                    <Clock size={12} className="text-rose-500" />
                    <span className="text-[9px] font-black text-white/60 tracking-widest uppercase">Ends: <span className="text-white">00:26:16</span></span>
                 </div>
               </div>
               
               <div className="flex flex-col relative z-10">
                 <span className="text-white/20 text-sm line-through font-bold mb-1 tracking-wider">{fmt.format(oldPrice)}</span>
                 <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-white italic tracking-tighter drop-shadow-lg">
                        {fmt.format(currentPrice)}
                    </span>
                    <span className="text-rose-500 font-black text-xl italic opacity-80">/ {selectedUnit && selectedUnit !== 'DEFAULT' ? selectedUnit.name : product.unit}</span>
                 </div>
               </div>
            </div>

            {/* Interactive Selectors */}
            <div className="space-y-8 flex-1">
                {/* Unit Selection */}
                {product.units && product.units.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Unit</span>
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Guide <ChevronRight size={10} className="inline" /></span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setSelectedUnit('DEFAULT')}
                        className={`px-8 py-4 rounded-[20px] text-xs font-black transition-all duration-500 border-2 relative overflow-hidden group/btn ${
                        selectedUnit === 'DEFAULT' || selectedUnit === null 
                        ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-xl shadow-rose-100' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                        }`}
                    >
                        {product.unit || 'Mặc định'}
                        {(!selectedUnit || selectedUnit === 'DEFAULT') && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-rose-600 rounded-full" />}
                    </button>
                    {product.units.map((u) => (
                        <button
                        key={u.id}
                        onClick={() => setSelectedUnit(u)}
                        className={`px-8 py-4 rounded-[20px] text-xs font-black transition-all duration-500 border-2 relative overflow-hidden group/btn ${
                            selectedUnit?.id === u.id 
                            ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-xl shadow-rose-100' 
                            : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                        }`}
                        >
                        {u.name}
                        {selectedUnit?.id === u.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-rose-600 rounded-full" />}
                        </button>
                    ))}
                    </div>
                </div>
                )}

                {/* Quantity */}
                <div className="space-y-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
                    <div className="flex items-center gap-8">
                        <div className="flex items-center bg-slate-50 rounded-[24px] p-2 border border-slate-100/50 shadow-inner">
                            <button 
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all active:scale-75"
                            >
                            <Minus size={20} strokeWidth={4} />
                            </button>
                            <input 
                            type="number" 
                            value={quantity}
                            readOnly
                            className="w-16 bg-transparent text-center text-2xl focus:outline-none font-black text-slate-900 italic"
                            />
                            <button 
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all active:scale-75"
                            >
                            <Plus size={20} strokeWidth={4} />
                            </button>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-slate-900 tracking-tighter">{product.stock || 999}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock Ready</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Final Action Buttons - Extreme Premium */}
            <div className="flex gap-4 mt-12">
              <button 
                onClick={() => handleConfirm(false)}
                className="flex-1 flex items-center justify-center gap-3 py-6 bg-slate-50 text-slate-900 rounded-[30px] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 border border-slate-100"
              >
                <ShoppingCart size={20} className="text-rose-500" /> Cart
              </button>
              <button 
                onClick={() => handleConfirm(true)}
                className="flex-[2] py-6 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-[30px] font-black text-xs uppercase tracking-widest shadow-[0_20px_40px_rgba(225,29,72,0.3)] hover:shadow-[0_25px_50px_rgba(225,29,72,0.4)] hover:-translate-y-1 transition-all active:scale-95 relative overflow-hidden group/buy"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/buy:translate-x-[100%] transition-transform duration-1000 italic" />
                Buy Now — {fmt.format(currentPrice * quantity)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ product }) => {
  const { addToCart } = useContext(CartContext);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const handleAddToCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Vui lòng đăng nhập");
      window.location.href = "/login";
      return;
    }

    if (product.units && product.units.length > 0) {
      setShowUnitModal(true);
    } else {
      performAddToCart(null);
    }
  };

  const performAddToCart = async (selectedUnit, quantity = 1) => {
    const unitName = selectedUnit ? selectedUnit.name : product.unit;
    const rate = selectedUnit ? selectedUnit.conversionRate : 1.0;

    const res = await addToCart(product.id, quantity, unitName, rate);

    if (res.success) {
      toast.success(`Added ${quantity} ${unitName} to cart!`);
      setShowUnitModal(false);
    } else {
      toast.error(res.message || "Action failed");
    }
  };

  const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(product.price || 0));
  const inStock = Number.isFinite(Number(product.stock)) ? Number(product.stock) > 0 : true;

  return (
    <>
      <UnitSelectionModal 
        product={product} 
        isOpen={showUnitModal} 
        onClose={() => setShowUnitModal(false)}
        onSelect={performAddToCart}
      />
      
      <div className="group relative flex flex-col bg-white rounded-[32px] border border-slate-100/50 overflow-hidden transition-all duration-700 hover:-translate-y-3 hover:shadow-[0_40px_70px_rgba(0,0,0,0.1)]">
        {/* Visual Top: Image + Overlays */}
        <Link
          to={`/products/${product.id}`}
          className="relative block aspect-square overflow-hidden bg-[#F9FAFB]"
        >
          <img
            src={product.imageUrl || PRODUCT_FALLBACK_IMAGE}
            alt={product.name}
            onError={ensureImageFallback}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-115 grayscale-[20%] group-hover:grayscale-0"
          />

          {/* Luxury Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          {/* Floating Badges */}
          <div className="absolute top-6 left-6 flex flex-col gap-2.5">
            <div className="bg-rose-500 text-white text-[8px] font-black px-2.5 py-1.5 rounded-xl shadow-2xl shadow-rose-500/30 uppercase tracking-[0.2em] backdrop-blur-md">Mall</div>
            {Number(product.discount) > 0 && (
              <div className="bg-white/90 backdrop-blur-md text-rose-500 text-[8px] font-black px-2.5 py-1.5 rounded-xl shadow-xl uppercase tracking-widest">-{product.discount}%</div>
            )}
          </div>

          <div className="absolute top-6 right-6">
             <button className="bg-white/20 backdrop-blur-md p-2.5 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition-all duration-300">
                <Heart size={16} />
             </button>
          </div>

          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[3px] z-10">
              <span className="bg-white text-slate-900 text-[10px] font-black px-6 py-3 rounded-full uppercase tracking-[0.3em] shadow-2xl animate-pulse">Out of stock</span>
            </div>
          )}

          {/* Hover Floating Action */}
          <div className="absolute bottom-6 left-6 right-6 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 z-20">
             <button
               onClick={handleAddToCartClick}
               disabled={!inStock}
               className="w-full bg-white text-slate-900 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-900 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               <ShoppingCart size={14} className="text-rose-500" /> Purchase
             </button>
          </div>
        </Link>

        {/* Info Section: Premium Layout */}
        <div className="p-5 flex flex-col flex-1 relative bg-white">
          <div className="mb-3">
             <div className="flex items-center gap-2 mb-1">
                <span className="h-px w-3 bg-rose-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Premium</span>
             </div>
             <Link to={`/products/${product.id}`}>
               <h3 className="font-bold text-slate-900 text-base line-clamp-2 leading-tight tracking-tight group-hover:text-rose-600 transition-colors duration-500">
                 {product.name}
               </h3>
             </Link>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-0.5 opacity-60">Price</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 italic tracking-tighter">
                            {formattedPrice}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 italic">/ {product.unit || 'unit'}</span>
                    </div>
                </div>
                
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-1.5 text-slate-900 mb-0.5">
                      <Gift size={10} className="text-rose-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Sold {product.sold || 0}</span>
                   </div>
                </div>
            </div>

            {/* Bottom Accent */}
            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden flex">
                <div className="h-full bg-rose-500 w-1/3 rounded-full opacity-60" />
                <div className="h-full bg-rose-200 w-1/6 rounded-full ml-1" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductCard;
