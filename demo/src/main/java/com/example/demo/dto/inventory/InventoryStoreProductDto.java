package com.example.demo.dto.inventory;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InventoryStoreProductDto {
    private Long productId;
    private String productName;
    private String unit;
    private Integer quantity;
    private Integer price;
    private Integer oldBatchQuantity;
    private Integer newBatchQuantity;
}