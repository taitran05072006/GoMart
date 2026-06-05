package com.example.demo.dto.user;

import lombok.Data;

@Data
public class UpdateUserRoleRequestDto {
    private String role;
    private Long storeId;
}
