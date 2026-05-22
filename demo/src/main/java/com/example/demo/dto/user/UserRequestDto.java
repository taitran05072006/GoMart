package com.example.demo.dto.user;

import lombok.Data;

@Data
public class UserRequestDto {
    private String name;
    private String email;
    private String password;
    private String phone;
    private String address;
    private String role;
}
