package com.example.demo.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageRequestDto {
    private Long senderId;
    private String senderName;
    private String senderRole; // ADMIN, CUSTORMER, SHIPPER
    private String channel; // CUSTOMER_ADMIN, CUSTOMER_SHIPPER
    private String content;
}
