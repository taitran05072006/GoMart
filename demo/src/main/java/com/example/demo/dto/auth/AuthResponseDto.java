package com.example.demo.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponseDto {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String province;
    private String district;
    private String ward;
    private String houseNumber;
    private String avatar;
    private Integer rewardStars;
    private String tier;
    private String role;
    private Long storeId;
    private String storeName;
}
