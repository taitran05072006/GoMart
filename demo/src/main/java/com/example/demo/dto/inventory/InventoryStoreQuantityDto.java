package com.example.demo.dto.inventory;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InventoryStoreQuantityDto {
    private Long storeId;
    private String storeName;
    private Integer quantity;
}