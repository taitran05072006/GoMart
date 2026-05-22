package com.example.demo.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductUnitDto {
    private Long id;
    private String name;
    private Double conversionRate;
    private Double price;
    private Double oldPrice;
}
