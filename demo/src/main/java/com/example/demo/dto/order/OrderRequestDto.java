package com.example.demo.dto.order;


import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class OrderRequestDto {
    private Long userId;
    private Long storeId;
    private List<OrderItemRequestDto> items;
    private String shippingAddress;// địa chỉ giao hàng
    private String recipientName;// tên người nhận hàng
    private String recipientPhone;// số điện thoại người nhận hàng
    private String voucherCode;// mã giảm giá (nếu có)
    private String shippingVoucherCode;// mã giảm giá vận chuyển (nếu có)
    private String province;
    private String district;
    private String ward;
    private String houseNumber;
    private Double latitude;
    private Double longitude;
    private Integer useStars;
    private Double totalPrice;
}
