package com.example.demo.dto.order;

import lombok.Data;

@Data
public class OrderItemRequestDto {
    private Long productId;
    private Integer quantity;
    private String unit;
    private Double conversionRate;
}
