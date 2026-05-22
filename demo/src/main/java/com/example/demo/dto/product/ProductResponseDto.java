package com.example.demo.dto.product;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class ProductResponseDto {
    private Long id;
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
    private Integer sold;
    private String description;
    private String category;
    private Long categoryId;
    private Integer oldBatchQuantity;
    private Integer newBatchQuantity;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private List<ProductUnitDto> units;
}
