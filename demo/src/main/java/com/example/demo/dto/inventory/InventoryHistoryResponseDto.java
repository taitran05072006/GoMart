package com.example.demo.dto.inventory;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InventoryHistoryResponseDto {
    private Long id;
    private String type;
    private LocalDateTime createdAt;
    private Long productId;
    private String productName;
    private Integer quantity;
    private Long storeId;
    private String storeName;
    private Long fromStoreId;
    private String fromStoreName;
    private Long toStoreId;
    private String toStoreName;
    private String referenceCode;
    private String note;
}