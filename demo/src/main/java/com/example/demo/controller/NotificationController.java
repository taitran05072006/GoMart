package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.notification.NotificationBroadcastRequestDto;
import com.example.demo.dto.notification.NotificationResponseDto;
import com.example.demo.service.NotificationService;

import org.aspectj.weaver.ast.Not;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/{userId}")
    public ApiResponse<List<NotificationResponseDto>> getUserNotifications(@PathVariable Long userId) {
        List<NotificationResponseDto> notifyList = notificationService.getUserNotifications(userId);
        return ApiResponse.success("Lấy thông báo thành công", notifyList);
    }

    @PostMapping("/{notificationId}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId);
        return ApiResponse.success("Đánh dấu là đã đọc", null);
    }

    @PostMapping("/admin/broadcast")
    public ApiResponse<List<NotificationResponseDto>> broadcastToAllCustomers(
            @RequestBody NotificationBroadcastRequestDto request
    ) {
        return ApiResponse.success(
                "Gửi thông báo thành công",
                notificationService.broadcastToAllCustomers(request)
        );
    }
}
