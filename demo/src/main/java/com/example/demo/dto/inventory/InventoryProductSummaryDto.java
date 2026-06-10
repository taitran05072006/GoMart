package com.example.demo.dto.inventory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryProductSummaryDto {
    private Long productId;
    private String productName;
    private String unit;
    private Integer totalQuantity;
    private LocalDate expiryDate;
    private Integer expiryThresholdDays;
    private List<InventoryStoreQuantityDto> stores;
}