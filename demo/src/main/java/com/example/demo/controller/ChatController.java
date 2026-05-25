package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.chat.ChatMessageRequestDto;
import com.example.demo.entity.ChatMessage;
import com.example.demo.entity.Order;
import com.example.demo.entity.OrderStatus;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.ChatMessageRepository;
import com.example.demo.repository.OrderRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/orders/{orderId}/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final OrderRepository orderRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatMessageRepository chatMessageRepository,
                          OrderRepository orderRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.orderRepository = orderRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping
    public ApiResponse<List<ChatMessage>> getChatHistory(@PathVariable Long orderId,
                                                         @RequestParam String channel,
                                                         @RequestParam(required = false) Long readerId) {
        // Validate channel parameter
        if (!"CUSTOMER_ADMIN".equals(channel) && !"CUSTOMER_SHIPPER".equals(channel)) {
            throw new BadRequestException("Kênh chat không hợp lệ: " + channel);
        }
        
        List<ChatMessage> history = chatMessageRepository.findByOrderIdAndChannelOrderByCreatedAtAsc(orderId, channel);
        
        if (readerId != null) {
            boolean updated = false;
            for (ChatMessage msg : history) {
                if ((msg.getIsRead() == null || !msg.getIsRead()) && !msg.getSenderId().equals(readerId)) {
                    msg.setIsRead(true);
                    updated = true;
                }
            }
            if (updated) {
                chatMessageRepository.saveAll(history);
            }
        }
        
        return ApiResponse.success(history);
    }

    @GetMapping("/unread")
    public ApiResponse<Long> getUnreadCount(@PathVariable Long orderId,
                                            @RequestParam Long userId,
                                            @RequestParam(required = false) String channel) {
        long count;
        if (channel != null && !channel.isBlank()) {
            if (!"CUSTOMER_ADMIN".equals(channel) && !"CUSTOMER_SHIPPER".equals(channel)) {
                throw new BadRequestException("Kênh chat không hợp lệ: " + channel);
            }
            count = chatMessageRepository.countByOrderIdAndChannelAndIsReadFalseAndSenderIdNot(orderId, channel, userId);
        } else {
            count = chatMessageRepository.countByOrderIdAndIsReadFalseAndSenderIdNot(orderId, userId);
        }
        return ApiResponse.success(count);
    }

    @PostMapping
    public ApiResponse<ChatMessage> sendMessage(@PathVariable Long orderId,
                                                @RequestBody ChatMessageRequestDto dto) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không tồn tại"));

        if (!"CUSTOMER_ADMIN".equals(dto.getChannel()) && !"CUSTOMER_SHIPPER".equals(dto.getChannel())) {
            throw new BadRequestException("Kênh chat không hợp lệ");
        }

        // Rule for CUSTOMER_SHIPPER channel: Only allowed if Shipper has been assigned AND order has been picked up
        if ("CUSTOMER_SHIPPER".equals(dto.getChannel())) {
            if (order.getAssignedShipper() == null) {
                throw new BadRequestException("Đơn hàng chưa được gán Shipper");
            }
            
            OrderStatus status = order.getStatus();
            boolean isAllowed = status == OrderStatus.SHIPPING || 
                               status == OrderStatus.DELIVERED || 
                               status == OrderStatus.COMPLETED ||
                               status == OrderStatus.RETURN_REQUESTED ||
                               status == OrderStatus.RETURN_PICKING ||
                               status == OrderStatus.RETURN_AWAITING_ADMIN_CONFIRM ||
                               status == OrderStatus.RETURNED;
                               
            if (!isAllowed) {
                throw new BadRequestException("Kênh chat với Shipper chưa được mở. Kênh sẽ mở sau khi Shipper xác nhận đã lấy hàng.");
            }
        }

        ChatMessage message = ChatMessage.builder()
                .orderId(orderId)
                .senderId(dto.getSenderId())
                .senderName(dto.getSenderName())
                .senderRole(dto.getSenderRole())
                .channel(dto.getChannel())
                .content(dto.getContent().trim())
                .createdAt(LocalDateTime.now())
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        // Broadcast to WebSocket subscribers in real-time
        try {
            String destination = "/topic/orders/" + orderId + "/chat/" + dto.getChannel();
            messagingTemplate.convertAndSend(destination, saved);
        } catch (Exception e) {
            // Log error but don't fail the REST save response
            System.err.println("WS Broadcast failed: " + e.getMessage());
        }

        return ApiResponse.success("Gửi tin nhắn thành công", saved);
    }
}
