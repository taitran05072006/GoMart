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

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

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
     * Lấy tất cả order
     */
    @GetMapping
    public ApiResponse<List<OrderResponseDto>> getAll() {
        return ApiResponse.success("Lấy tất cả đơn hàng thành công", orderService.getAllOrders());
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
                orderService.updateStatus(id, newStatus)
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
