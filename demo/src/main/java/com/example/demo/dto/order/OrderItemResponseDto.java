package com.example.demo.dto.order;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderItemResponseDto {
    private Long Productid;
    private String productName;
    private Integer quantity;
    private Double price;
    private String unit;
    private Double conversionRate;
}
