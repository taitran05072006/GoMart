package com.example.demo.dto.user;

import lombok.Data;

@Data
public class CreateAdminAccountRequestDto {
    private String name;
    private String email;
    private String phone;
    private String password;
    private String role;
    private Long storeId;
}