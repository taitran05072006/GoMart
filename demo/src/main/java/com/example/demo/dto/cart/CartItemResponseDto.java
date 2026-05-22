package com.example.demo.dto.cart;

import com.example.demo.dto.product.ProductUnitDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponseDto {
    private Long id;
    private Long productId;
    private String productName;
    private Integer quantity;
    private Double price;
    private String imageUrl;
    private boolean selected;
    private String unit;
    private Double conversionRate;
    private List<ProductUnitDto> availableUnits;
}
