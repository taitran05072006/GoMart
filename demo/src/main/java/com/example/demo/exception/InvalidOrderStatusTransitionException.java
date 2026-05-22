package com.example.demo.exception;

/**
 * Exception khi cố gắng chuyển trạng thái đơn hàng không hợp lệ
 */
public class InvalidOrderStatusTransitionException extends RuntimeException {

    public InvalidOrderStatusTransitionException(String message) {
        super(message);
    }

    public InvalidOrderStatusTransitionException(String message, Throwable cause) {
        super(message, cause);
    }

    public static InvalidOrderStatusTransitionException of(
            String currentStatus,
            String targetStatus) {
        return new InvalidOrderStatusTransitionException(
            String.format("Không thể chuyển từ trạng thái '%s' sang '%s'",
                         currentStatus, targetStatus)
        );
    }
}
