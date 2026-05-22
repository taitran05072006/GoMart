package com.example.demo.dto.notification;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponseDto {
    private Long id;
    private Long userId;
    private String title;
    private String message;
    private String navigateTo;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
