import React, { useContext, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { VoucherContext } from "../context/VoucherContext";
import { AuthContext } from "../context/AuthContext";
import { Trash2, ArrowRight, Ticket, Minus, Plus, ArrowLeft } from "lucide-react";
import {
  PRODUCT_FALLBACK_IMAGE,
  ensureImageFallback,
} from "../utils/imageFallback";

const formatVND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

const Cart = () => {
  const {
    cartItems,
    loading,
    updateQuantity,
    removeFromCart,
    selectItem,
    toggleAllTick,
    updateUnit,
  } = useContext(CartContext);

  const [editingUnitItem, setEditingUnitItem] = React.useState(null);

  const { availableVouchers, fetchAvailableVouchers } = useContext(VoucherContext);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user?.id) {
      const ids = cartItems.map(item => item.productId);
      fetchAvailableVouchers(user.id, ids);
    }
  }, [user?.id, cartItems]);

  const navigate = useNavigate();

  const normalizedCart = useMemo(() => {
    return cartItems.map((item) => ({
      ...item,
      ticked: item.ticked === true,
    }));
  }, [cartItems]);

  const allSelected =
    normalizedCart.length > 0 &&
    normalizedCart.every((item) => item.ticked);

  const someSelected =
    normalizedCart.some((item) => item.ticked) && !allSelected;

  const selectedTotal = useMemo(() => {
    return normalizedCart
      .filter((item) => item.ticked)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [normalizedCart]);

  const handleChangeQty = useCallback(
    (productId, qty) => {
      if (qty < 1) return;
      updateQuantity(productId, qty);
    },
    [updateQuantity]
  );

  const handleRemove = useCallback(
    (productId) => {
      if (!window.confirm("Bạn chắc chắn muốn xóa sản phẩm này?")) return;
      removeFromCart(productId);
    },
    [removeFromCart]
  );

  const handleToggleAll = (e) => {
    toggleAllTick(e.target.checked);
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500">
        Đang tải giỏ hàng...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-slate-500 hover:text-black mb-6 font-bold transition-all group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Quay lại
      </button>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">🛒 Giỏ hàng</h1>

        {normalizedCart.length > 0 && (
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={handleToggleAll}
            />
            Chọn tất cả
          </label>
        )}
      </div>


      {normalizedCart.length === 0 ? (
        <div className="text-center py-24 bg-white border rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-semibold mb-2">
            Giỏ hàng trống
          </h2>
          <Link
            to="/products"
            className="bg-black text-white px-6 py-3 rounded-xl inline-flex items-center gap-2"
          >
            Đi mua sắm <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-4">

            {normalizedCart.map((item) => (
              <div
                key={item.id}
                className="bg-white border rounded-2xl p-4 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <input
                    type="checkbox"
                    checked={item.ticked}
                    onChange={(e) =>
                      selectItem(item.id, e.target.checked)
                    }
                    className="w-5 h-5"
                  />
                  <div className="flex items-center gap-4 flex-1">
                    <Link to={`/products/${item.productId}`}>
                      <img
                        src={item.imageUrl || PRODUCT_FALLBACK_IMAGE}
                        onError={ensureImageFallback}
                        className="w-20 h-20 object-cover rounded-xl border shrink-0"
                        alt=""
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.productId}`} className="block">
                        <p className="font-semibold hover:text-blue-600 truncate">
                          {item.productName}
                        </p>
                      </Link>

                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center gap-2 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingUnitItem(item);
                            }}
                            className="flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase hover:bg-slate-200 transition-colors group border border-slate-200"
                          >
                            {item.unit || item.availableUnits?.[0]?.name}
                            <span className="text-slate-400 group-hover:text-slate-600">▼</span>
                          </button>
                          <p className="text-sm text-gray-500">
                            {formatVND.format(item.price)}
                          </p>

                          {/* Unit Selector Popover */}
                          {editingUnitItem?.id === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setEditingUnitItem(null)}
                              />
                              <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn đơn vị</span>
                                  <button onClick={() => setEditingUnitItem(null)} className="text-slate-300 hover:text-slate-500">✕</button>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {item.availableUnits?.map((u, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        updateUnit(item.id, u.name, u.conversionRate);
                                        setEditingUnitItem(null);
                                      }}
                                      className={`flex flex-col p-3 rounded-xl border-2 transition-all text-left ${
                                        item.unit === u.name
                                        ? 'border-blue-500 bg-blue-50/50'
                                        : 'border-slate-50 hover:border-slate-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className={`font-bold ${item.unit === u.name ? 'text-blue-600' : 'text-slate-700'}`}>
                                          {u.name}
                                        </span>
                                        {item.unit === u.name && <span className="text-blue-500">✓</span>}
                                      </div>
                                      <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-slate-500">Tỷ lệ quy đổi: x{u.conversionRate}</span>
                                        <span className="text-xs font-bold text-slate-900">{formatVND.format(u.price)}</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QUANTITY */}
                  <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button
                      onClick={() =>
                        handleChangeQty(item.id, Number(item.quantity) - 1)
                      }
                      disabled={item.quantity <= 1}
                      className="px-3 py-2 hover:bg-slate-100 disabled:opacity-30 transition-colors text-slate-600 border-r border-slate-100"
                    >
                      <Minus size={16} strokeWidth={3} />
                    </button>

                    <span className="w-12 text-center font-bold text-slate-800">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() =>
                        handleChangeQty(item.id, Number(item.quantity) + 1)
                      }
                      className="px-3 py-2 hover:bg-slate-100 transition-colors text-slate-600 border-l border-slate-100"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>

                  {/* TOTAL + DELETE */}
                  <div className="flex items-center gap-4">

                    <div className="font-bold text-red-500 min-w-[120px] text-right">
                      {formatVND.format(item.price * item.quantity)}
                    </div>

                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>

                  </div>

                </div>
              </div>
            ))}

          </div>

          {/* RIGHT */}
          <div className="bg-white border rounded-2xl p-6 h-fit sticky top-24">

            <h2 className="text-xl font-bold mb-6">
              Đơn hàng
            </h2>

            <div className="flex justify-between mb-2">
              <span>Tạm tính</span>
              <span>{formatVND.format(selectedTotal)}</span>
            </div>
            <div className="border-t pt-4 flex justify-between font-bold text-lg mb-6">
              <span>Tổng</span>
              <span className="text-red-500">
                {formatVND.format(selectedTotal)}
              </span>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full bg-black text-white py-3 rounded-xl flex items-center justify-center gap-2"
            >
              Thanh toán <ArrowRight size={18} />
            </button>

          </div>

        </div>
      )}
    </div>
  );
};

export default Cart;