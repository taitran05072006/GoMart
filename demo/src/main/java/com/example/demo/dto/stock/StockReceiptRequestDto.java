package com.example.demo.dto.stock;

import lombok.Builder;
import lombok.Data;

import java.util.List;
@Data
@Builder
public class StockReceiptRequestDto {
    private String code;
    private String note;
    private Long supplierId;
    private Long storeId;
    private List<StockReceiptItemRequestDto> items;
}