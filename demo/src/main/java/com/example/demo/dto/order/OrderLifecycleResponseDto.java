package com.example.demo.dto.order;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class OrderLifecycleResponseDto {
    private Long orderId;
    private String currentStatus;
    private List<String> allowedNextStatuses;//danh sach trang thai duoc phep chuyen tiep;
}

