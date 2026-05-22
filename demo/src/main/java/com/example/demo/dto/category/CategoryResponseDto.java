package com.example.demo.dto.category;

import com.example.demo.dto.product.ProductResponseDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CategoryResponseDto {
    private Long id;
    private String name;
    private String icon;
    private Integer productCount;
    private Integer expiryThresholdDays;
    private List<ProductResponseDto> products;
}
