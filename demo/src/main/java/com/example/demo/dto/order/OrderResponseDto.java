package com.example.demo.dto.order;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponseDto {
    private Long id;
    private String orderCode;
    private LocalDateTime orderDate;
    private String status;
    private double totalPrice;
    private Double subtotal;
    private Double shippingFee;
    private Double discount;
    private Double finalPrice;
    private String paymentMethod;
    private String paymentStatus;
    private List<OrderItemResponseDto> items;
    private Long userId;
    private String customerName;
    private String customerPhone;
    private String shippingAddress;
    private Long shipperId;
    private String shipperName;
    private String voucherCode;
    private Integer starsUsed;
    private Integer starsAwarded;
    private Double shippingDiscount;
    private String shippingVoucherCode;
    private LocalDateTime actualDeliveryTime;
    private Integer rating;
}
