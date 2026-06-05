package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_code", nullable = false, unique = true)
    private String orderCode;

    @Column(name = "created_at", nullable = false, updatable = true)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(50)")
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, columnDefinition = "VARCHAR(50)")
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonBackReference
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipper_id")
    @JsonIgnore
    private User assignedShipper;

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Payment payment;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<OrderItem> items;

    // LƯU Ý: Bỏ @JoinColumn(name = "shipping_id") vì DB của bạn không có cột này
    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private OrderShipping shipping;

    @Column(name = "total_price", nullable = false)
    @Builder.Default
    private Double totalPrice = 0.0;

    @Column(name = "discount", nullable = false)
    @Builder.Default
    private Double discount = 0.0;

    @Column(name = "final_price", nullable = false)
    @Builder.Default
    private Double finalPrice = 0.0;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "estimated_delivery_time")
    private LocalDateTime estimatedDeliveryTime;

    @Column(name = "actual_delivery_time")
    private LocalDateTime actualDeliveryTime;

    @Column(name = "stars_used")
    private Integer starsUsed;

    @Column(name = "stars_awarded")
    private Integer starsAwarded;

    @Column(name = "rating")
    private Integer rating;

    @Column(name = "shipping_discount", nullable = false)
    @Builder.Default
    private Double shippingDiscount = 0.0;

    @ManyToOne
    @JoinColumn(name = "shipping_voucher_id", referencedColumnName = "code")
    private Voucher shippingVoucher;

    @ManyToOne
    @JoinColumn(name = "voucher_id", referencedColumnName = "code")
    private Voucher voucher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = OrderStatus.PENDING;
        if (paymentStatus == null) paymentStatus = PaymentStatus.UNPAID;
        calculateFinalPrice();
    }

    @PreUpdate
    protected void onUpdate() {
        calculateFinalPrice();
    }

    public void calculateFinalPrice() {
        // Tránh lỗi NullPointerException nếu chưa có thông tin shipping
        double shippingFee = (this.shipping != null) ? this.shipping.getShippingFee() : 0.0;
        // Include any shipping-specific discount when computing final price
        double shippingDiscount = 0.0;
        if (this.shipping != null) {
            // OrderShipping may contain a shipping discount value
            try {
                shippingDiscount = this.shipping.getShippingDiscount();
            } catch (Exception ignored) {
                shippingDiscount = 0.0;
            }
        }
        // Also consider order-level shippingDiscount field as a fallback
        if (this.shippingDiscount != null) {
            shippingDiscount = Math.max(shippingDiscount, this.shippingDiscount);
        }

        this.finalPrice = (this.totalPrice + shippingFee) - (this.discount + shippingDiscount);
        if (this.finalPrice < 0) {
            this.finalPrice = 0.0;
        }
    }

    public boolean canTransitionTo(OrderStatus newStatus) {
        return status.canTransitionTo(newStatus);
    }

    public boolean isCompleted() {
        return status == OrderStatus.COMPLETED;
    }

    public boolean isCancelled() {
        return status == OrderStatus.CANCELLED;
    }

    public boolean isPaid() {
        return paymentStatus == PaymentStatus.PAID;
    }

    public Double getTotalAmount() {
        return finalPrice;
    }
}
