package com.example.demo.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UpdateProfileRequestDto {
    private Long userId;
    private String name;
    private String phone;
    private String address;
    private String province;
    private String district;
    private String ward;
    private String houseNumber;
    private String avatar;
    private Double latitude;
    private Double longitude;
    private Long storeId;
}
