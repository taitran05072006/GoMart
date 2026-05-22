package com.example.demo.dto.user;

import com.example.demo.dto.order.OrderResponseDto;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class UserResponseDto {
    private Long id;
    private String name;
    private String email;
    private String avatar;
    private String phone;
    private String address;
    private LocalDateTime createAt;
    private List<OrderResponseDto> orders;
    private String role;
}
