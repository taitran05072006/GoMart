package com.example.demo.dto.cart;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemRequestDto {
    private Long productId;
    private Integer quantity;
    private String unit;
    private Double conversionRate;
}
