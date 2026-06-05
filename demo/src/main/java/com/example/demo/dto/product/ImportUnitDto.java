package com.example.demo.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportUnitDto {
    private Long id;
    private Long importUnitTypeId;
    private String name;
    private Double conversionRate;
    private Integer costPrice;
    private Integer oldCostPrice;
}
