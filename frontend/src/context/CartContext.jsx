import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";
import cartService from "../services/cartService";
import { AuthContext } from "./AuthContext";
import { AUTH_REDIRECT_EVENT } from "../api/axiosClient";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, logout } = useContext(AuthContext);

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const normalizeCartItems = useCallback((items = []) => {
    return items.map((i) => ({
      ...i,
      ticked: i.selected === true,
      price: Number(i.price || 0),
      quantity: Number(i.quantity || 0),
      availableUnits: i.availableUnits || [],
    }));
  }, []);

  const isUserNotFoundError = useCallback((err) => {
    const message = String(err?.message || '').toLowerCase();
    return (
      message.includes('user not found') ||
      message.includes('không tìm thấy người dùng') ||
      message.includes('khong tim thay nguoi dung')
    );
  }, []);

  // =========================
  // FETCH CART
  // =========================
  const fetchCart = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await cartService.getCart(user.id);
      setCartItems(normalizeCartItems(res?.data?.items || []));
    } catch (err) {
      if (isUserNotFoundError(err)) {
        // Local user session is stale (DB reset / user deleted).
        logout();
        setCartItems([]);
        return;
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, logout, normalizeCartItems, isUserNotFoundError]);

  useEffect(() => {
    if (user?.id) fetchCart();
    else setCartItems([]);
  }, [user?.id, fetchCart]);

  // =========================
  // ADD TO CART
  // =========================
  const addToCart = useCallback(async (productId, qty = 1, unit = null, conversionRate = 1.0) => {
    if (!user?.id) {
      window.dispatchEvent(new Event(AUTH_REDIRECT_EVENT));
      return { success: false, message: "Vui lòng đăng nhập" };
    }

    try {
      const res = await cartService.addItem(user.id, productId, qty, unit, conversionRate);
      setCartItems(normalizeCartItems(res?.data?.items || []));
      return { success: res?.success !== false };
    } catch (err) {
      if (isUserNotFoundError(err)) {
        logout();
        setCartItems([]);
        return { success: false, message: "User session is invalid" };
      }
      return { success: false, message: err?.message || "Failed to add to cart" };
    }
  }, [user?.id, normalizeCartItems, isUserNotFoundError, logout]);

  // =========================
  // UPDATE QTY
  // =========================
  const updateQuantity = useCallback(async (cartItemId, qty) => {
    if (!user?.id) return;

    try {
      const res = await cartService.updateItemQuantity(user.id, cartItemId, qty);
      setCartItems(normalizeCartItems(res?.data?.items || []));
    } catch (err) {
      if (isUserNotFoundError(err)) {
        logout();
        setCartItems([]);
        return;
      }
      fetchCart();
    }
  }, [user?.id, fetchCart, normalizeCartItems, isUserNotFoundError, logout]);

  // =========================
  // REMOVE
  // =========================
  const removeFromCart = useCallback(async (cartItemId) => {
    if (!user?.id) return;

    try {
      const res = await cartService.removeItem(user.id, cartItemId);
      setCartItems(normalizeCartItems(res?.data?.items || []));
    } catch (err) {
      if (isUserNotFoundError(err)) {
        logout();
        setCartItems([]);
        return;
      }
      fetchCart();
    }
  }, [user?.id, fetchCart, normalizeCartItems, isUserNotFoundError, logout]);

  // =========================
  // SELECT ONE
  // =========================
  const selectItem = useCallback((cartItemId, checked) => {
    if (!user?.id) return;

    setCartItems((items) =>
      items.map((i) =>
        i.id === cartItemId ? { ...i, ticked: checked } : i
      )
    );

    cartService
      .selectItem(user.id, cartItemId, checked)
      .then((res) => setCartItems(normalizeCartItems(res?.data?.items || [])))
      .catch((err) => {
        if (isUserNotFoundError(err)) {
          logout();
          setCartItems([]);
          return;
        }
        fetchCart();
      });
  }, [user?.id, fetchCart, normalizeCartItems, isUserNotFoundError, logout]);

  // =========================
  // TOGGLE ALL (FIX CHẮC CHẮN OK)
  // =========================
  const toggleAllTick = useCallback((checked) => {
    if (!user?.id) return;

    setCartItems((items) =>
      items.map((i) => ({
        ...i,
        ticked: checked,
      }))
    );

    cartService
      .toggleAllTick(user.id, checked)
      .then((res) => setCartItems(normalizeCartItems(res?.data?.items || [])))
      .catch((err) => {
        if (isUserNotFoundError(err)) {
          logout();
          setCartItems([]);
          return;
        }
        fetchCart();
      });
  }, [user?.id, fetchCart, normalizeCartItems, isUserNotFoundError, logout]);

  // =========================
  // UPDATE UNIT
  // =========================
  const updateUnit = useCallback(async (cartItemId, unit, conversionRate) => {
    if (!user?.id) return;

    try {
      const res = await cartService.updateUnit(user.id, cartItemId, unit, conversionRate);
      setCartItems(normalizeCartItems(res?.data?.items || []));
    } catch (err) {
      if (isUserNotFoundError(err)) {
        logout();
        setCartItems([]);
        return;
      }
      fetchCart();
    }
  }, [user?.id, fetchCart, normalizeCartItems, isUserNotFoundError, logout]);

  // =========================
  // TOTALS
  // =========================
  const cartCount = useMemo(
    () => cartItems.length,
    [cartItems]
  );

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (s, i) => s + i.price * i.quantity,
        0
      ),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        cartCount,
        cartTotal,

        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        selectItem,
        toggleAllTick,
        updateUnit,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
