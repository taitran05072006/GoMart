import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, X, Package, Zap, Clock, Minus, Plus, Star, Gift, ChevronRight, Share2, Heart } from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { PRODUCT_FALLBACK_IMAGE, ensureImageFallback } from '../../utils/imageFallback';

const ProductCard = ({ product }) => {
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  const handleAddToCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/products/${product.id}`);
  };

  const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(product.price || 0));
  const inStock = Number.isFinite(Number(product.stock)) ? Number(product.stock) > 0 : true;

  return (
    <>
      
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
               <ShoppingCart size={14} className="text-rose-500" /> Mua hàng
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
