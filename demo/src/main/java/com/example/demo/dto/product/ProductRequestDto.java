package com.example.demo.dto.product;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class ProductRequestDto {
    private String name;
    private String imageUrl;
    private String bg;
    private Integer price;
    private Integer oldPrice;
    private Integer discount;
    private Double rating;
    private Integer reviews;
    private String tag;
    private String unit;
    private Integer stock;
    private String description;
    private Long categoryId;// quan hệ
    private Integer oldBatchQuantity;
    private Integer newBatchQuantity;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private Long importUnitTypeId;
    private String importUnitName;
    private Double importConversionRate;
    private List<ProductUnitDto> units;
    private List<ImportUnitDto> importUnits;
    private Boolean isSelling;
}
