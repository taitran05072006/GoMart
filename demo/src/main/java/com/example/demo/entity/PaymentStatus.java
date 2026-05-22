package com.example.demo.entity;

/**
 * Payment Status enum để quản lý trạng thái thanh toán
 *
 * UNPAID → PENDING → PAID (success path)
 * PENDING → FAILED (error path)
 * PAID → REFUNDED (refund path)
 */
public enum PaymentStatus {
    UNPAID("Chưa thanh toán"),
    PENDING("Đang xử lý"),
    PAID("Đã thanh toán"),
    FAILED("Thất bại"),
    REFUNDED("Đã hoàn tiền");

    private final String displayName;

    PaymentStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isSuccessful() {
        return this == PAID;
    }

    public boolean isFailed() {
        return this == FAILED;
    }

    public boolean canBeRefunded() {
        return this == PAID;
    }
}
