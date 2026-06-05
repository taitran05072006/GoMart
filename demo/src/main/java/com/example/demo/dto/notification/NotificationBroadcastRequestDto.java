package com.example.demo.dto.notification;

import lombok.Data;

@Data
public class NotificationBroadcastRequestDto {
    private String title;
    private String message;
    private String navigateTo;
    private Long senderId;
}
