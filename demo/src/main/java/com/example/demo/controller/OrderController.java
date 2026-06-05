package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.OrderStatusUpdateRequestDto;
import com.example.demo.dto.OrderShippingUpdateRequestDto;
import com.example.demo.dto.order.OrderLifecycleRequestDto;
import com.example.demo.dto.order.OrderLifecycleResponseDto;
import com.example.demo.dto.order.OrderRequestDto;
import com.example.demo.dto.order.OrderResponseDto;
import com.example.demo.entity.OrderStatus;
import com.example.demo.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.entity.Role;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final UserRepository userRepository;



    /**
     * Tạo order mới
     */
    @PostMapping
    public ApiResponse<OrderResponseDto> createOrder(
            @RequestBody OrderRequestDto dto,
            @RequestParam(required = false) String voucher
    ) {
        String effectiveVoucher = (voucher != null && !voucher.isBlank())
                ? voucher
                : (dto != null ? dto.getVoucherCode() : null);
        return ApiResponse.success(
                "Đơn hàng đã được tạo",
                orderService.createOrder(dto, effectiveVoucher)
        );
    }

    /**
     * Preview order totals without creating an order.
     */
    @PostMapping("/preview")
    public ApiResponse<OrderResponseDto> previewOrder(
            @RequestBody OrderRequestDto dto,
            @RequestParam(required = false) String voucher
    ) {
        try {
            return ApiResponse.success("Preview calculated", orderService.previewOrder(dto, voucher));
        } catch (Exception ex) {
            return ApiResponse.error(ex.getMessage());
        }
    }

    /**
     * Lấy tất cả order
     */
    @GetMapping
    public ApiResponse<List<OrderResponseDto>> getAll(HttpServletRequest request) {
        String uid = request.getHeader("X-User-Id");
        String impersonateStoreIdStr = request.getHeader("X-Impersonate-Store-Id");
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long id = Long.parseLong(uid);
            User u = userRepository.findById(id).orElse(null);
            if (u == null) return ApiResponse.error("Forbidden");
            if (u.getRole() == Role.SUPER_ADMIN) {
                if (impersonateStoreIdStr != null && !impersonateStoreIdStr.isBlank() && !impersonateStoreIdStr.equals("null") && !impersonateStoreIdStr.equals("undefined")) {
                    try {
                        Long impersonateStoreId = Long.parseLong(impersonateStoreIdStr);
                        return ApiResponse.success("Lấy tất cả đơn hàng cửa hàng thành công", orderService.getOrdersByStoreId(impersonateStoreId));
                    } catch (NumberFormatException ignored) {}
                }
                return ApiResponse.success("Lấy tất cả đơn hàng thành công", orderService.getAllOrders());
            }
            if (u.getRole() == Role.STORE_ADMIN) {
                if (u.getStore() == null) return ApiResponse.success("Lấy đơn hàng thành công", List.of());
                return ApiResponse.success("Lấy đơn hàng store thành công", orderService.getOrdersByStoreId(u.getStore().getId()));
            }
            return ApiResponse.error("Forbidden");
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        }
    }

    /**
     * Lấy orders của user hiện tại (khách hàng)
     */
    @GetMapping("/user/{userId}")
    public ApiResponse<List<OrderResponseDto>> getOrdersByUser(@PathVariable Long userId, HttpServletRequest request) {
        String uid = request.getHeader("X-User-Id");
        if (uid == null) return ApiResponse.error("Forbidden");
        try {
            Long requesterId = Long.parseLong(uid);
            // allow users to fetch their own orders or admins to fetch any
            User requester = userRepository.findById(requesterId).orElse(null);
            if (requester == null) return ApiResponse.error("Forbidden");
            if (!requester.getId().equals(userId) && requester.getRole() != Role.SUPER_ADMIN) {
                return ApiResponse.error("Forbidden");
            }
            return ApiResponse.success("Lấy đơn hàng người dùng thành công", orderService.getOrdersByUserId(userId));
        } catch (NumberFormatException ex) {
            return ApiResponse.error("Forbidden");
        }
    }

    @GetMapping("/shipper/{shipperId}")
    public ApiResponse<List<OrderResponseDto>> getOrdersForShipper(@PathVariable Long shipperId) {
        return ApiResponse.success("Lấy đơn hàng cho shipper thành công", orderService.getAssignedOrdersForShipper(shipperId));
    }

    @GetMapping("/shipper/{shipperId}/{orderId}")
    public ApiResponse<OrderResponseDto> getOrderDetailForShipper(
            @PathVariable Long shipperId,
            @PathVariable Long orderId
    ) {
        return ApiResponse.success("Lấy chi tiết đơn hàng cho shipper thành công", orderService.getAssignedOrderDetailForShipper(shipperId, orderId));
    }

    /**
     * Lấy order theo ID
     */
    @GetMapping("/{id}")
    public ApiResponse<OrderResponseDto> getById(@PathVariable Long id) {
        return ApiResponse.success("Lấy đơn hàng theo ID thành công", orderService.getOrderById(id));
    }

    /**
     * Cập nhật trạng thái order (State Machine)
     */
    @PutMapping("/{id}/status")
    public ApiResponse<OrderResponseDto> updateStatus(
            @PathVariable Long id,
            @RequestBody OrderStatusUpdateRequestDto request) {
        OrderStatus newStatus = OrderStatus.valueOf(request.getStatus());
        return ApiResponse.success(
                "Trạng thái đơn hàng đã được cập nhật",
                orderService.updateStatus(id, newStatus, request.getRating())
        );
    }

            @PatchMapping("/{id}/admin/confirm-cod")
            public ApiResponse<OrderResponseDto> confirmCodOrder(@PathVariable Long id) {
            return ApiResponse.success(
                "Đơn hàng COD đã được xác nhận và chuyển sang trạng thái đóng gói",
                orderService.confirmCodOrderToPacking(id)
            );
            }

            @PatchMapping("/{id}/admin/assign-shipper/{shipperId}")
            public ApiResponse<OrderResponseDto> assignShipper(
                @PathVariable Long id,
                @PathVariable Long shipperId
            ) {
            return ApiResponse.success(
                "Shipper đã được gán cho đơn hàng",
                orderService.assignShipper(id, shipperId)
            );
            }

            @PatchMapping("/{id}/shipper/{shipperId}/accept")
            public ApiResponse<OrderResponseDto> shipperAcceptOrder(
                @PathVariable Long id,
                @PathVariable Long shipperId
            ) {
            return ApiResponse.success(
                "Đơn hàng đã được shipper chấp nhận",
                orderService.shipperAcceptOrder(id, shipperId)
            );
            }

            @PatchMapping("/{id}/shipper/{shipperId}/delivered")
            public ApiResponse<OrderResponseDto> shipperMarkDelivered(
                @PathVariable Long id,
                @PathVariable Long shipperId
            ) {
            return ApiResponse.success(
                "Đơn hàng đã được giao thành công",
                orderService.shipperMarkDelivered(id, shipperId)
            );
            }

            @PatchMapping("/{id}/shipper/{shipperId}/failed")
            public ApiResponse<OrderResponseDto> shipperMarkFailed(
                @PathVariable Long id,
                @PathVariable Long shipperId,
                @RequestParam(required = false) String reason
            ) {
                try {
                    return ApiResponse.success(
                        "Đơn hàng được đánh dấu là giao hàng thất bại",
                        orderService.shipperMarkDeliveryFailed(id, shipperId, reason)
                    );
                } catch (Exception e) {
                    System.err.println(">>>> ERROR IN shipperMarkDeliveryFailed: " + e.getMessage());
                    e.printStackTrace();
                    throw e;
                }
            }

            @PatchMapping("/{id}/shipper/{shipperId}/return-picked")
            public ApiResponse<OrderResponseDto> shipperReturnPicked(
                @PathVariable Long id,
                @PathVariable Long shipperId
            ) {
                try {
                    return ApiResponse.success(
                        "Đã xác nhận lấy hàng hoàn từ khách",
                        orderService.shipperPickUpReturn(id, shipperId)
                    );
                } catch (Exception e) {
                    System.err.println("Controller Error: " + e.getMessage());
                    e.printStackTrace();
                    throw e;
                }
            }

            @PatchMapping("/{id}/shipper/{shipperId}/returned")
            public ApiResponse<OrderResponseDto> shipperReturnCompleted(
                @PathVariable Long id,
                @PathVariable Long shipperId
            ) {
            return ApiResponse.success(
                "Đơn hàng đã được hoàn về kho thành công",
                orderService.shipperConfirmReturnedToWarehouse(id, shipperId)
            );
            }

    /**
     * Hủy order
     */
    @PostMapping("/{id}/cancel")
    public ApiResponse<OrderResponseDto> cancelOrder(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ApiResponse.success(
                "Đơn hàng đã được hủy",
                orderService.cancelOrder(id, reason != null ? reason : "No reason provided")
        );
    }

    /**
     * Yêu cầu hoàn trả
     */
    @PostMapping("/{id}/return")
    public ApiResponse<OrderResponseDto> requestReturn(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ApiResponse.success(
                "Yêu cầu hoàn trả đã được gửi",
                orderService.requestReturn(id, reason != null ? reason : "No reason provided")
        );
    }

    /**
     * Lấy lifecycle của order (trạng thái hiện tại + trạng thái tiếp theo có thể)
     */
    @GetMapping("/{id}/lifecycle")
    public ApiResponse<OrderLifecycleResponseDto> getLifecycle(@PathVariable Long id) {
        return ApiResponse.success("Lấy lifecycle của đơn hàng thành công", orderService.getLifecycle(id));
    }

    /**
     * Chuyển trạng thái order via lifecycle
     */
    @PatchMapping("/{id}/lifecycle")
    public ApiResponse<OrderResponseDto> transitionLifecycle(
            @PathVariable Long id,
            @RequestBody OrderLifecycleRequestDto request) {
        return ApiResponse.success(
                "Lifecycle của đơn hàng đã được cập nhật",
                orderService.transitionStatus(id, request.getStatus())
        );
    }

    /**
     * Cập nhật thông tin giao hàng
     */
    @PutMapping("/{id}/shipping")
    public ApiResponse<?> updateShipping(
            @PathVariable Long id,
            @RequestBody OrderShippingUpdateRequestDto request) {
        orderService.createOrUpdateShipping(id, request.getShippingAddress());
        return ApiResponse.success("Thông tin giao hàng đã được cập nhật", null);
    }

    /**
     * Xóa order
     */
    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return ApiResponse.success("Đơn hàng đã được xóa", null);
    }
    @GetMapping("/shipping-fee")
    public ApiResponse<Double> getShippingFee(
            @RequestParam String province,
            @RequestParam String district,
            @RequestParam String ward,
            @RequestParam(required = false, defaultValue = "0") Double subtotal) {
        String address = String.format("%s, %s, %s", ward, district, province);
        Double fee = orderService.calculateShippingFee(address, subtotal);
        return ApiResponse.success(fee);
    }
}
