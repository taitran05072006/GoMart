package com.example.demo.dto.stock;

import lombok.Builder;
import lombok.Data;
@Data
@Builder
public class StockReceiptItemResponseDto {
    private Long id;
    private Long productId;
    private String productName;
    private String productUnit;
    private Integer quantity;
    private Double price;
    private Double totalPrice;
    private java.time.LocalDate manufactureDate;
    private java.time.LocalDate expiryDate;
    private Long importUnitTypeId;
    private String importUnitName;
    private Double importConversionRate;
}