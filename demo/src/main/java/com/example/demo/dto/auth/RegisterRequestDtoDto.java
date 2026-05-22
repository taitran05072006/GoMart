package com.example.demo.dto.auth;

import lombok.Data;

@Data
public class RegisterRequestDtoDto {
    private String name;
    private String email;
    private String phone;
    private String password;
}
