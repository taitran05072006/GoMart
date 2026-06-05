package com.example.demo.dto.inventory;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class InventoryStoreSummaryDto {
    private Long storeId;
    private String storeName;
    private String address;
    private List<InventoryStoreProductDto> products;
}