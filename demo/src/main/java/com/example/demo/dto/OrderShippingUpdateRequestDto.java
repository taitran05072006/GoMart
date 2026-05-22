package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho request cập nhật thông tin giao hàng
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderShippingUpdateRequestDto {
    private String shippingAddress;// địa chỉ giao hàng mới
}
