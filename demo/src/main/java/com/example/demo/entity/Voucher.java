package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "vouchers")
public class Voucher {

    @Id
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code; // mã voucher, ví dụ: "DISCOUNT10"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DiscountType discountType;

    private String voucherType;

    @Column(nullable = false)
    private Double value; // giá trị giảm
    @Column(nullable = false)
    private Double minOrderAmount; //điều kiện phải mua
    private LocalDateTime startDate;//thời gian áp dụng

    private LocalDateTime endDate;

    @Column(nullable = false)
    private Integer usageLimit; //số lượt vourcher

    @Builder.Default
    @Column(nullable = false)
    private Integer usedCount = 0; //đã dùng mấy lượt
    private Boolean isActive;//bật tắt vourcher
    @Builder.Default
    private Boolean isDeleted = false;

    private String requiredTier; // e.g. MEMBER, SILVER, GOLD, DIAMOND

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "voucher_applicable_products", joinColumns = @JoinColumn(name = "voucher_code"))
    @Column(name = "product_id")
    private java.util.List<Long> applicableProductIds;
}
