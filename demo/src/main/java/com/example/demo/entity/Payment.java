package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDateTime;


@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // liên kết với order (optional vì có thể thanh toán trước khi tạo order)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", unique = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Order order;

    // phương thức thanh toán
    @Enumerated(EnumType.STRING)
    private PaymentMethod method;

    // trạng thái thanh toán
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.UNPAID;

    private BigDecimal amount;

    private String transactionCode; // Mã giao dịch (vd: mã đơn hàng hoặc mã riêng)
    private String qrCodeUrl;       // Link ảnh QR
    private String provider;        // vd: "PAYO"
    private String providerReference; // Mã tham chiếu từ phía đối tác

    @Column(columnDefinition = "TEXT")
    private String orderData;       // Lưu JSON order data nếu thanh toán trước khi tạo order

    private String failureReason;

    private LocalDateTime paidAt;

    private LocalDateTime createdAt;


    @PrePersist
    public void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = PaymentStatus.UNPAID;
    }

}
