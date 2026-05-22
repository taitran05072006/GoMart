package com.example.demo.dto.category;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CategoryRequestDto {
    private String name;
    private String icon;
    private Integer expiryThresholdDays;
}
