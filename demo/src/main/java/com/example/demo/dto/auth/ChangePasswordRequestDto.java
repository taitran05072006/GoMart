package com.example.demo.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChangePasswordRequestDto {
    private Long userId;
    private String oldPassword;
    private String newPassword;
}
