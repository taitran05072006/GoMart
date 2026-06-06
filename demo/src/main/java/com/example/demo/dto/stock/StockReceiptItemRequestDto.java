package com.example.demo.dto.stock;

import lombok.Data;

@Data
public class StockReceiptItemRequestDto {

    private Long productId;

    private Integer quantity;

    private Double price;
    private java.time.LocalDate manufactureDate;
    private java.time.LocalDate expiryDate;
    private Long importUnitTypeId;
    private Double importConversionRate;
}