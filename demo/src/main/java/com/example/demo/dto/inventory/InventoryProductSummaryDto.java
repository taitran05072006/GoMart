package com.example.demo.dto.inventory;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class InventoryProductSummaryDto {
    private Long productId;
    private String productName;
    private String unit;
    private Integer totalQuantity;
    private List<InventoryStoreQuantityDto> stores;
}