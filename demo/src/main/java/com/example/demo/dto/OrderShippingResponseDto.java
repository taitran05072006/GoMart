package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho response thông tin giao hàng
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderShippingResponseDto {
    private Long id;
    private Long orderId;
    private Long shipperId;
    private String shipperName;
    private String shippingAddress;
    private Double shippingFee;
    private String estimatedDeliveryTime;
    private String actualDeliveryTime;
    private String deliveryNotes;
}
