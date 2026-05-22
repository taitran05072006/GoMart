# 🔗 Integration Guide - Frontend + Backend Order System

## 📋 Khái Quát

Hệ thống Order đã được thiết kế hoàn chỉnh ở backend. Tài liệu này hướng dẫn cách tích hợp với frontend React.

---

## 🎯 Frontend Pages Cần Integration

1. **Cart.jsx** - Xem giỏ hàng → Checkout
2. **Checkout.jsx** - Tạo order, chọn địa chỉ, chọn phương thức thanh toán ✅ (đã có)
3. **Profile.jsx** - Xem lịch sử order (Order list + lifecycle)
4. **OrderDetail.jsx** (NEW) - Chi tiết order, cập nhật status *(Optional)*
5. **Admin/OrderManagement.jsx** (NEW) - Quản lý order (xác nhận, gán shipper, v.v.) *(For admin)*

---

## 🛠️ Backend API Endpoints

### Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "userId": 1,
  "items": [
    { "productId": 5, "quantity": 2 },
    { "productId": 8, "quantity": 1 }
  ]
}

Response 200:
{
  "success": true,
  "data": {
    "id": 55,
    "orderCode": "ORD-20260417-XYZ123",
    "status": "PENDING",
    "paymentStatus": "UNPAID",
    "totalPrice": 350000,
    "shippingFee": 0,
    "finalPrice": 350000,
    "items": [...]
  }
}
```

### Get Orders by User
```http
GET /api/orders  (returns all user's orders via filter)

Response 200:
[
  {
    "id": 55,
    "orderCode": "ORD-...",
    "status": "PENDING",
    "totalPrice": 350000,
    "finalPrice": 350000,
    ...
  }
]
```

### Get Order Detail
```http
GET /api/orders/{id}

Response 200:
{
  "id": 55,
  "orderCode": "ORD-...",
  "status": "PENDING",
  "paymentStatus": "UNPAID",
  "totalPrice": 350000,
  "shippingFee": 30000,
  "discount": 0,
  "finalPrice": 380000,
  "items": [...],
  "createdAt": "2026-04-17T10:30:00",
  "updatedAt": "2026-04-17T10:30:00"
}
```

### Update Shipping Info
```http
PUT /api/orders/{id}/shipping
Content-Type: application/json

{
  "shippingAddress": "123 Nguyen Hue, District 1, HCMC",
  "estimatedDistance": 5.5
}

Response 200:
{
  "success": true,
  "message": "Shipping info updated"
}
```

### Update Order Status
```http
PUT /api/orders/{id}/status
Content-Type: application/json

{
  "status": "PAID"
}

Response 200:
{
  "success": true,
  "data": {
    "id": 55,
    "status": "PAID",
    "paymentStatus": "PAID",
    ...
  }
}
```

### Cancel Order
```http
POST /api/orders/{id}/cancel?reason=Changed+mind

Response 200:
{
  "success": true,
  "data": {
    "id": 55,
    "status": "CANCELLED",
    "paymentStatus": "REFUNDED",
    ...
  }
}
```

### Request Return
```http
POST /api/orders/{id}/return?reason=Item+damaged

Response 200:
{
  "success": true,
  "data": {
    "id": 55,
    "status": "RETURN_REQUESTED",
    ...
  }
}
```

### Get Order Lifecycle
```http
GET /api/orders/{id}/lifecycle

Response 200:
{
  "orderId": 55,
  "currentStatus": "PAID",
  "allowedNextStatuses": ["CONFIRMED", "CANCELLED"]
}
```

---

## 💻 Frontend Service Layer

### Create `src/services/orderService.js`

```javascript
import axiosClient from "../api/axiosClient";

const API_URL = "/api/orders";

const orderService = {
  // Create new order
  createOrder: async (orderData) => {
    try {
      const response = await axiosClient.post(API_URL, orderData);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to create order");
    }
  },

  // Get all orders for user
  getAllOrders: async () => {
    try {
      const response = await axiosClient.get(API_URL);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch orders");
    }
  },

  // Get order by ID
  getOrderById: async (orderId) => {
    try {
      const response = await axiosClient.get(`${API_URL}/${orderId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch order");
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await axiosClient.put(`${API_URL}/${orderId}/status`, {
        status,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update status");
    }
  },

  // Update shipping info
  updateShipping: async (orderId, shippingAddress, estimatedDistance) => {
    try {
      const response = await axiosClient.put(`${API_URL}/${orderId}/shipping`, {
        shippingAddress,
        estimatedDistance,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update shipping");
    }
  },

  // Cancel order
  cancelOrder: async (orderId, reason) => {
    try {
      const response = await axiosClient.post(
        `${API_URL}/${orderId}/cancel?reason=${encodeURIComponent(reason)}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to cancel order");
    }
  },

  // Request return
  requestReturn: async (orderId, reason) => {
    try {
      const response = await axiosClient.post(
        `${API_URL}/${orderId}/return?reason=${encodeURIComponent(reason)}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to request return");
    }
  },

  // Get order lifecycle
  getLifecycle: async (orderId) => {
    try {
      const response = await axiosClient.get(`${API_URL}/${orderId}/lifecycle`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch lifecycle");
    }
  },
};

export default orderService;
```

---

## 🛒 Checkout.jsx Integration

```jsx
// src/pages/Checkout.jsx - UPDATED

import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import orderService from "../services/orderService";
import shippingService from "../services/shippingService";
import paymentService from "../services/paymentService";
import toast from "react-hot-toast";

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [shippingAddress, setShippingAddress] = useState("");
  const [estimatedDistance, setEstimatedDistance] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [isLoading, setIsLoading] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [orderId, setOrderId] = useState(null);

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Fetch shipping fee when distance changes
  useEffect(() => {
    if (cartItems.length === 0) return;

    const calculateFee = async () => {
      try {
        const fee = await shippingService.calculateFee(estimatedDistance, subtotal);
        setShippingFee(fee || 0);
      } catch (error) {
        console.error("Failed to calculate shipping fee:", error);
        setShippingFee(0);
      }
    };

    calculateFee();
  }, [estimatedDistance, subtotal]);

  const finalPrice = subtotal + shippingFee;

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      if (!user) {
        toast.error("Bạn phải đăng nhập");
        navigate("/login");
        return;
      }

      if (!shippingAddress.trim()) {
        toast.error("Vui lòng nhập địa chỉ giao hàng");
        return;
      }

      // 1️⃣ Create order
      const orderData = {
        userId: user.id,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      };

      const order = await orderService.createOrder(orderData);
      setOrderId(order.id);
      toast.success("Tạo đơn hàng thành công");

      // 2️⃣ Update shipping info
      await orderService.updateShipping(
        order.id,
        shippingAddress,
        estimatedDistance
      );

      // 3️⃣ Process payment
      const paymentResponse = await paymentService.createPayment(order.id, {
        method: paymentMethod,
      });

      // 4️⃣ Handle payment result
      if (paymentMethod === "COD" || paymentResponse.status === "SUCCESS") {
        // COD: Direct to confirmation
        // Other methods: Check response
        toast.success("Thanh toán thành công");

        // 5️⃣ Update order status to PAID
        await orderService.updateOrderStatus(order.id, "PAID");

        // 6️⃣ Clear cart and redirect
        clearCart();
        setTimeout(() => {
          navigate(`/orders/${order.id}`);
        }, 1000);
      } else {
        toast.error("Thanh toán thất bại");
      }
    } catch (error) {
      toast.error(error.message);
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Giỏ hàng trống</p>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-500 text-white px-6 py-2 rounded"
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Thanh Toán</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Shipping Address */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Địa Chỉ Giao Hàng</h2>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Nhập địa chỉ giao hàng..."
              className="w-full border rounded px-4 py-2 h-24"
            />
          </div>

          {/* Distance */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Khoảng Cách Ước Tính</h2>
            <input
              type="number"
              value={estimatedDistance}
              onChange={(e) => setEstimatedDistance(parseFloat(e.target.value))}
              min="1"
              step="0.1"
              placeholder="KM"
              className="w-full border rounded px-4 py-2"
            />
            <p className="text-sm text-gray-500 mt-2">Để tính phí giao hàng chính xác</p>
          </div>

          {/* Payment Method */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Phương Thức Thanh Toán</h2>
            <div className="space-y-2">
              {["COD", "BANK_TRANSFER", "E_WALLET", "CREDIT_CARD"].map(
                (method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    {method === "COD" && "Thanh toán khi nhận hàng"}
                    {method === "BANK_TRANSFER" && "Chuyển khoản ngân hàng"}
                    {method === "E_WALLET" && "Ví điện tử"}
                    {method === "CREDIT_CARD" && "Thẻ tín dụng"}
                  </label>
                )
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Chi Tiết Đơn Hàng</h2>
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between pb-3 border-b">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">x{item.quantity}</p>
                  </div>
                  <p className="font-semibold">
                    {(item.price * item.quantity).toLocaleString()}₫
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? "Đang xử lý..." : "Đặt Hàng"}
          </button>
        </div>

        {/* Order Summary */}
        <div className="col-span-1">
          <div className="border rounded-lg p-6 sticky top-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Tóm Tắt Đơn Hàng</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span className="font-semibold">{subtotal.toLocaleString()}₫</span>
              </div>
              <div className="flex justify-between">
                <span>Phí giao hàng:</span>
                <span className="font-semibold">{shippingFee.toLocaleString()}₫</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Tổng cộng:</span>
                <span>{finalPrice.toLocaleString()}₫</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 Order List / Profile Page Integration

```jsx
// src/pages/Profile.jsx - Add order history section

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import orderService from "../services/orderService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Profile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderService.getAllOrders();
        setOrders(data || []);
      } catch (error) {
        toast.error("Không thể tải lịch sử đơn hàng");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn chắc chắn muốn hủy đơn?")) return;

    try {
      await orderService.cancelOrder(orderId, "Customer cancelled");
      toast.success("Đơn hàng đã bị hủy");
      setOrders(orders.map(
        (o) => o.id === orderId ? { ...o, status: "CANCELLED", paymentStatus: "REFUNDED" } : o
      ));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      PAID: "bg-blue-100 text-blue-800",
      CONFIRMED: "bg-purple-100 text-purple-800",
      PACKING: "bg-indigo-100 text-indigo-800",
      SHIPPING: "bg-cyan-100 text-cyan-800",
      DELIVERED: "bg-green-100 text-green-800",
      COMPLETED: "bg-emerald-100 text-emerald-800",
      CANCELLED: "bg-red-100 text-red-800",
      RETURN_REQUESTED: "bg-orange-100 text-orange-800",
      RETURNED: "bg-orange-100 text-orange-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Hồ Sơ Cá Nhân</h1>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Thông Tin Tài Khoản</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Tên:</p>
            <p className="font-semibold">{user?.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Email:</p>
            <p className="font-semibold">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-600">Số điện thoại:</p>
            <p className="font-semibold">{user?.phone || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-600">Địa chỉ:</p>
            <p className="font-semibold">{user?.address || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Lịch Sử Đơn Hàng</h2>

        {isLoading ? (
          <p className="text-gray-500">Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">Bạn chưa có đơn hàng nào</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{order.orderCode}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                    <p className="font-bold">{order.finalPrice?.toLocaleString()}₫</p>
                  </div>
                </div>

                {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                  <div className="mt-3 flex gap-2">
                    {order.status !== "RETURN_REQUESTED" && order.status !== "RETURNED" && (
                      <>
                        {order.status === "DELIVERED" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Show return form
                            }}
                            className="text-orange-500 text-sm hover:underline"
                          >
                            Yêu cầu hoàn trả
                          </button>
                        )}
                        {(order.status === "PENDING" || order.status === "PAID") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(order.id);
                            }}
                            className="text-red-500 text-sm hover:underline"
                          >
                            Hủy đơn
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🔗 Integration Checklist

- [ ] Create `orderService.js` với các API calls
- [ ] Update `Checkout.jsx` để tích hợp order creation
- [ ] Update `Profile.jsx` để show order history
- [ ] Handle payment success → update order status to PAID
- [ ] Show order status badge
- [ ] Allow cancel order (PENDING/PAID)
- [ ] Allow request return (DELIVERED)
- [ ] Show lifecycle (current status + allowed next statuses)
- [ ] Add OrderDetail page (optional)
- [ ] Add admin order management (admin panel)

---

## 🚨 Important Notes

1. **Payment Integration**
   - After payment success, call `orderService.updateOrderStatus(orderId, "PAID")`
   - For COD, can skip payment processing and go directly to PAID

2. **Shipping Fee Calculation**
   - Call `shippingService.calculateFee()` when distance or order total changes
   - Show fee before confirmation

3. **Error Handling**
   - Always catch errors and show user-friendly messages
   - Log errors to console for debugging

4. **State Management**
   - Use React Context or localStorage to persist cart during checkout
   - Clear cart after successful order creation

5. **Real-time Updates** (Future)
   - WebSocket for order status updates
   - Notification when order shipped/delivered

---

## 📝 Example API Calls (cURL)

```bash
# Create order
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "items": [
      {"productId": 5, "quantity": 2},
      {"productId": 8, "quantity": 1}
    ]
  }'

# Update shipping
curl -X PUT http://localhost:8080/api/orders/55/shipping \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": "123 Nguyen Hue, HCMC",
    "estimatedDistance": 5.5
  }'

# Update status to PAID
curl -X PUT http://localhost:8080/api/orders/55/status \
  -H "Content-Type: application/json" \
  -d '{"status": "PAID"}'

# Cancel order
curl -X POST "http://localhost:8080/api/orders/55/cancel?reason=Changed+mind"

# Get lifecycle
curl -X GET http://localhost:8080/api/orders/55/lifecycle
```

---
