package com.example.demo.dto.inventory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryStoreProductDto {
    private Long productId;
    private String productName;
    private String unit;
    private Integer quantity;
    private Integer price;
    private Integer oldBatchQuantity;
    private Integer newBatchQuantity;
    private LocalDate expiryDate;
    private Integer expiryThresholdDays;
}