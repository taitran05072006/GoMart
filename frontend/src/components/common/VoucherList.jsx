import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { VoucherContext } from '../../context/VoucherContext';
import { AuthContext } from '../../context/AuthContext';

const formatVND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

const VoucherList = ({ showHeader = true, filterByProducts = [] }) => {
  const { availableVouchers, fetchAvailableVouchers } = useContext(VoucherContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      fetchAvailableVouchers(user.id, filterByProducts);
    }
  }, [user?.id, JSON.stringify(filterByProducts)]);

  if (!availableVouchers || availableVouchers.length === 0) return null;

  return (
    <div className="mb-10 group">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-2.5 rounded-2xl shadow-lg shadow-red-200">
              <Ticket size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-none">Ưu đãi dành riêng cho bạn</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Sử dụng ngay để tiết kiệm hơn</p>
            </div>
          </div>
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Lướt xem thêm &rarr;</div>
        </div>
      )}
      
      <div className="flex overflow-x-auto pb-6 gap-6 no-scrollbar snap-x cursor-grab active:cursor-grabbing">
        {availableVouchers.map((v) => (
          <div 
            key={v.code} 
            className="snap-start min-w-[280px] md:min-w-[340px] bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 flex flex-col relative overflow-hidden group/card"
          >
            {/* Top Banner Gradient */}
            <div className={`h-24 bg-gradient-to-br ${
              v.requiredTier === 'DIAMOND' ? 'from-cyan-500 to-blue-600' :
              v.requiredTier === 'GOLD' ? 'from-amber-400 to-orange-500' :
              'from-indigo-600 to-violet-700'
            } relative p-6 flex flex-col justify-between overflow-hidden`}>
              {/* Decorative elements */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover/card:scale-150 transition-transform duration-1000"></div>
              
              <div className="flex justify-between items-center relative z-10">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-white uppercase border border-white/30">
                  {v.requiredTier || 'MEMBER'}
                </span>
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-tighter">
                  Hạn: {v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : 'Vô hạn'}
                </span>
              </div>
              <div className="text-white relative z-10">
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest leading-none">Mã ưu đãi</p>
                <h3 className="text-2xl font-black tracking-tight">{v.code}</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col justify-between relative">
               {/* Ticket cutouts */}
               <div className="absolute -left-3 top-0 -translate-y-1/2 w-6 h-6 bg-white border-r border-slate-100 rounded-full z-20"></div>
               <div className="absolute -right-3 top-0 -translate-y-1/2 w-6 h-6 bg-white border-l border-slate-100 rounded-full z-20"></div>
               
               <div className="space-y-1">
                  <div className="text-2xl font-black text-slate-900">
                    {v.discountType === 'PERCENT' ? `Giảm ${v.value}%` : `Giảm ${formatVND.format(v.value)}`}
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Cho đơn hàng từ <span className="text-indigo-600">{formatVND.format(v.minOrderAmount)}</span>
                  </p>
               </div>

               <button 
                onClick={() => navigate("/checkout", { state: { appliedVoucher: v.code } })}
                className="mt-6 w-full bg-slate-950 text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-200 transition-all duration-300 uppercase tracking-[0.2em] group-hover/card:scale-[1.02] active:scale-95"
              >
                Dùng ngay
              </button>
            </div>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default VoucherList;
