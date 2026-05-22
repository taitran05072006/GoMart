package com.example.demo.service;

import com.example.demo.dto.notification.NotificationBroadcastRequestDto;
import com.example.demo.dto.notification.NotificationResponseDto;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public List<NotificationResponseDto> getUserNotifications(Long userId) {
        return notificationRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo"));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    public List<NotificationResponseDto> broadcastToAllCustomers(NotificationBroadcastRequestDto request) {
        validateRequest(request);

        List<User> users = userRepository.findAll().stream()
                .filter(user -> user.getRole() != Role.ADMIN)
                .toList();

        List<NotificationResponseDto> created = new ArrayList<>();
        for (User user : users) {
            NotificationResponseDto dto = sendToUser(user, request.getTitle(), request.getMessage(), request.getNavigateTo());
            created.add(dto);
        }
        return created;
    }

    public NotificationResponseDto sendOrderSuccessNotification(User user, Long orderId, String orderCode) {
        String title = "ĐAT HANG THANH CONG";
        String message = "Đơn hàng " + (orderCode != null ? orderCode : ("#" + orderId)) + " đã được tạo thành công.";
        return sendToUser(user, title, message, "/profile?tab=orders");
    }

    public void sendNewOrderNotificationToAdmins(Order order) {
        if (order == null || order.getId() == null) {
            return;
        }

        List<User> admins = userRepository.findByRoleOrderByNameAsc(Role.ADMIN);
        if (admins.isEmpty()) {
            return;
        }

        String orderRef = order.getOrderCode() != null ? order.getOrderCode() : ("#" + order.getId());
        String customerName = order.getUser() != null && order.getUser().getName() != null
                ? order.getUser().getName()
                : "Khach hang";
        String title = "Đơn hàng mới";
        String message = "Có đơn hàng mới " + orderRef + " từ " + customerName + ".";

        for (User admin : admins) {
            sendToUser(admin, title, message, "/admin/orders");
        }
    }

    public void sendOrderStatusUpdateToCustomer(Order order, OrderStatus fromStatus, OrderStatus toStatus) {
        if (order == null || order.getUser() == null || toStatus == null) {
            return;
        }

        String orderRef = order.getOrderCode() != null ? order.getOrderCode() : ("#" + order.getId());
        String fromLabel = fromStatus != null ? fromStatus.name() : "UNKNOWN";
        String toLabel = toStatus.name();
        String title = "ập nhật đơn hàng";
        String message = "Đơn hàng " + orderRef + " đã chuyển từ " + fromLabel + " sang " + toLabel + ".";
        sendToUser(order.getUser(), title, message, "/profile?tab=orders");
    }

    public void sendOrderAssignedShipperToCustomer(Order order) {
        if (order == null || order.getUser() == null || order.getAssignedShipper() == null) {
            return;
        }

        String orderRef = order.getOrderCode() != null ? order.getOrderCode() : ("#" + order.getId());
        String shipperName = order.getAssignedShipper().getName() != null
                ? order.getAssignedShipper().getName()
                : "Shipper";
        String title = "Đơn hàng đã được gán cho shipper";
        String message = "Đơn hàng " + orderRef + " đã được phân cho " + shipperName + ".";
        sendToUser(order.getUser(), title, message, "/profile?tab=orders");
    }

    public void sendOrderAssignedToShipper(Order order) {
        if (order == null || order.getAssignedShipper() == null) {
            return;
        }

        String orderRef = order.getOrderCode() != null ? order.getOrderCode() : ("#" + order.getId());
        String customerName = order.getUser() != null && order.getUser().getName() != null
                ? order.getUser().getName()
                : "Khach hang";

        String title = "ạn được giao đơn mới";
        String message = "Đơn " + orderRef + " của " + customerName + " vừa được giao cho bạn.";
        sendToUser(order.getAssignedShipper(), title, message, "/shipper/orders");
    }

    public void sendExpiryWarningNotification(Product product, long daysUntilExpiry) {
        if (product == null) return;

        List<User> admins = userRepository.findByRoleOrderByNameAsc(Role.ADMIN);
        String title = "Cảnh báo hết hạn sản phẩm";
        String message = String.format("Sản phẩm '%s' (ID: %d) còn %d ngày là hết hạn.", 
                product.getName(), product.getId(), daysUntilExpiry);
        
        for (User admin : admins) {
            sendToUser(admin, title, message, "/admin/products");
        }
    }

    public NotificationResponseDto sendToUser(User user, String title, String message, String navigateTo) {
        if (user == null || user.getId() == null) {
            throw new BadRequestException("Người dùng không hợp lệ");
        }
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Tiêu đề thông báo là bắt buộc");
        }
        if (message == null || message.isBlank()) {
            throw new BadRequestException("Nội dung thông báo là bắt buộc");
        }

        Notification notification = Notification.builder()
                .user(user)
                .title(title.trim())
                .message(message.trim())
                .navigateTo(navigateTo)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        NotificationResponseDto dto = mapToDto(saved);
        messagingTemplate.convertAndSend("/topic/notifications/" + user.getId(), dto);
        return dto;
    }

    private void validateRequest(NotificationBroadcastRequestDto request) {
        if (request == null) {
            throw new BadRequestException("Dữ liệu gửi đi không hợp lệ");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BadRequestException("Tiêu đề thông báo là bắt buộc");
        }
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new BadRequestException("Nội dung thông báo là bắt buộc");
        }
    }

    private NotificationResponseDto mapToDto(Notification notification) {
        return NotificationResponseDto.builder()
                .id(notification.getId())
                .userId(notification.getUser() != null ? notification.getUser().getId() : null)
                .title(notification.getTitle())
                .message(notification.getMessage())
                .navigateTo(notification.getNavigateTo())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
