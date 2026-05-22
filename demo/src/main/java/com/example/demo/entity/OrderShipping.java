package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity để quản lý thông tin giao hàng của từng order
 *
 * - Lưu địa chỉ giao hàng
 * - Phí giao hàng
 * - Thời gian dự kiến giao
 * - Lịch sử trạng thái giao hàng
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "order_shipping")
public class OrderShipping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String shippingAddress;// địa chỉ giao hàng chi tiết (có thể lưu JSON nếu cần)

    private String recipientName;
    private String recipientPhone;

    @Column(nullable = false)
    private Double shippingFee;// phí giao hàng

    @Builder.Default
    private Double shippingDiscount = 0.0;

    private String  address;// khoảng cách dự kiến (km)

    private LocalDateTime estimatedDeliveryTime;// thời gian dự kiến giao hàng

    private LocalDateTime actualDeliveryTime;// thời gian giao hàng thực tế (cập nhật khi giao thành công)

    @Column(columnDefinition = "TEXT")
    private String deliveryNotes;//

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Kiểm tra xem đã giao thành công chưa
     */
    public boolean isDelivered() {
        return actualDeliveryTime != null;
    }
}
