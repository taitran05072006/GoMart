package com.example.demo.dto.stock;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class StockReceiptResponseDto {
    private Long id;
    private String code;
    private String supplier;
    private LocalDateTime createdAt;
    private Double totalPrice;
    private Integer totalQuantity;
    private String note;
    private String status;
    private Long storeId;
    private String storeName;
    private List<StockReceiptItemResponseDto> items;
}

