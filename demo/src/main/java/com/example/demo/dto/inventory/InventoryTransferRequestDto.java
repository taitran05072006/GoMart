package com.example.demo.dto.inventory;

import lombok.Data;

@Data
public class InventoryTransferRequestDto {
    private Long productId;
    private Long fromStoreId;
    private Long toStoreId;
    private Integer quantity;
    private String note;
}