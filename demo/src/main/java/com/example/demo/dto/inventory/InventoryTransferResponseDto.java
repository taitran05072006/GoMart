package com.example.demo.dto.inventory;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InventoryTransferResponseDto {
    private Long id;
    private LocalDateTime createdAt;
    private Long productId;
    private String productName;
    private Integer quantity;
    private Long fromStoreId;
    private String fromStoreName;
    private Long toStoreId;
    private String toStoreName;
    private Long createdByUserId;
    private String createdByUserName;
    private String note;
}