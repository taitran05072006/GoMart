package com.example.demo.dto.user;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminUserResponseDto {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String role;
}
