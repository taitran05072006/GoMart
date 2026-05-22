package com.example.demo.validator;

import com.example.demo.entity.*;
import com.example.demo.exception.InvalidOrderStatusTransitionException;
import org.aspectj.weaver.ast.Or;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class OrderStatusTransitionValidator {

    @Value("${order.return-request-days:7}")
    private long returnRequestDays;

    // ================= MAIN VALIDATE =================
    public void validate(Order order, OrderStatus newStatus) {

        OrderStatus currentStatus = order.getStatus();

        if (!currentStatus.canTransitionTo(newStatus)) {
            throw InvalidOrderStatusTransitionException.of(
                    currentStatus.name(),
                    newStatus.name()
            );
        }

        validatePrerequisites(order, newStatus);
        validateBusinessRules(order, newStatus);
    }

    // ================= PREREQUISITES =================
    private void validatePrerequisites(Order order, OrderStatus newStatus) {

        switch (newStatus) {

            case PAID -> {
                if (order.getPayment() == null) {
                    throw new InvalidOrderStatusTransitionException(
                            "Không thể thanh toán: đơn hàng không có payment"
                    );
                }
            }

            case CONFIRMED -> {
                boolean isCod = isCod(order);

                if (!isCod && order.getPaymentStatus() != PaymentStatus.PAID) {
                    throw new InvalidOrderStatusTransitionException(
                            "Không thể xác nhận: đơn chưa thanh toán"
                    );
                }
            }

            case PACKING -> {
                if (order.getShipping() == null) {
                    throw new InvalidOrderStatusTransitionException(
                            "Không thể đóng gói: chưa có thông tin giao hàng"
                    );
                }
            }

            case SHIPPING -> {
                if (order.getAssignedShipper() == null) {
                    throw new InvalidOrderStatusTransitionException(
                            "Không thể giao: chưa gán shipper"
                    );
                }
            }

            case DELIVERED -> {
                if (order.getStatus() != OrderStatus.SHIPPING) {
                    throw new InvalidOrderStatusTransitionException(
                            "Không thể đánh dấu đã giao"
                    );
                }
            }

            case COMPLETED -> {
                if (order.getStatus() != OrderStatus.DELIVERED) {
                    throw new InvalidOrderStatusTransitionException(
                            "Chỉ hoàn thành khi đơn đã giao"
                    );
                }
            }

            case RETURN_PICKING -> {
                if (order.getStatus() != OrderStatus.RETURN_REQUESTED) {
                    throw new InvalidOrderStatusTransitionException(
                            "Phải ở trạng thái yêu cầu hoàn mới có thể lấy hàng"
                    );
                }
            }

            case CANCELLED -> {
                if (order.getStatus().isFinalStatus()) {
                    throw new InvalidOrderStatusTransitionException(
                            "Không thể hủy đơn ở trạng thái cuối"
                    );
                }
            }

            default -> {
                // no-op
            }
        }
    }

    // ================= BUSINESS RULES =================
    private void validateBusinessRules(Order order, OrderStatus newStatus) {
User user = order.getUser();
        switch (newStatus) {
            case CANCELLED -> validateCancel(order, user.isAdmin());
            case RETURN_REQUESTED -> validateReturnRequest(order);
            default -> {
                // no-op
            }
        }
    }

    // ================= CANCEL VALIDATION =================
    public void validateCancel(Order order, boolean isAdmin) {

        if (!order.getStatus().canBeCancelled()) {
            throw new InvalidOrderStatusTransitionException(
                    "Không thể hủy đơn ở trạng thái: " + order.getStatus()
            );
        }

        if (order.isCompleted()) {
            throw new InvalidOrderStatusTransitionException("Đơn đã hoàn thành");
        }

        if (order.getActualDeliveryTime() != null) {
            throw new InvalidOrderStatusTransitionException("Đơn đã giao");
        }

        // payment rule: allow cancellation if it's already in shipping process (failed delivery)
        if (order.isPaid() && !isAdmin && order.getStatus() != OrderStatus.SHIPPING) {
            throw new InvalidOrderStatusTransitionException(
                    "Đơn đã thanh toán, cần hoàn tiền thay vì hủy"
            );
        }

        // shipper rule: allow if it's already in shipping process (failed delivery)
        if (!isAdmin && order.getAssignedShipper() != null && order.getStatus() != OrderStatus.SHIPPING) {
            throw new InvalidOrderStatusTransitionException(
                    "Đơn đã có shipper nhận"
            );
        }

        // time rule (safe null)
        if (!isAdmin && order.getCreatedAt() != null) {
            long minutes = Duration
                    .between(order.getCreatedAt(), LocalDateTime.now())
                    .toMinutes();

            if (minutes > 30) {
                throw new InvalidOrderStatusTransitionException(
                        "Quá thời gian hủy (30 phút)"
                );
            }
        }

    }

    // ================= RETURN VALIDATION =================
    public void validateReturnRequest(Order order) {

        if (order.getStatus() != OrderStatus.DELIVERED && order.getStatus() != OrderStatus.COMPLETED) {
            throw new InvalidOrderStatusTransitionException(
                    "Chỉ hoàn khi đơn đã giao hoặc đã hoàn thành"
            );
        }

        if (order.getActualDeliveryTime() == null) {
            throw new InvalidOrderStatusTransitionException(
                    "Thiếu thời gian giao hàng"
            );
        }

        if (!order.isPaid()) {
            throw new InvalidOrderStatusTransitionException(
                    "Chưa thanh toán, không thể hoàn"
            );
        }

        if (order.getStatus() == OrderStatus.RETURN_REQUESTED
                || order.getStatus() == OrderStatus.RETURNED) {
            throw new InvalidOrderStatusTransitionException(
                    "Đã có yêu cầu hoàn trước đó"
            );
        }

        // time rule
        long days = Duration
                .between(order.getActualDeliveryTime(), LocalDateTime.now())
                .toDays();

        if (days > 3) {
            throw new InvalidOrderStatusTransitionException(
                    "Quá hạn hoàn trả 3 ngày"
            );
        }
    }

    // ================= HELPER =================
    private boolean isCod(Order order) {
        return order.getPayment() != null
                && order.getPayment().getMethod() == PaymentMethod.COD;
    }
}