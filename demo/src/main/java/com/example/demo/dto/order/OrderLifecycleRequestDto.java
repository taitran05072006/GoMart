package com.example.demo.dto.order;

import com.example.demo.entity.OrderStatus;
import lombok.Data;

@Data
public class OrderLifecycleRequestDto {
    private OrderStatus status;
}

