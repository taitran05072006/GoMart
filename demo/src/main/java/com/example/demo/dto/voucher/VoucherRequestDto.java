package com.example.demo.dto.voucher;

import com.example.demo.entity.DiscountType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class VoucherRequestDto {
    private String code;
    private DiscountType discountType;
    private String voucherType;
    private Double value;
    private Double minOrderAmount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer usageLimit;
    private Integer usedCount;
    private Boolean isActive;
    private String requiredTier;
    private java.util.List<Long> applicableProductIds;
}
