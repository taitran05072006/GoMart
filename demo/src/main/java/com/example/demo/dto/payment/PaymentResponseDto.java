package com.example.demo.dto.payment;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponseDto {
    private Long id;
    private Long orderId;
    private String method;
    private String status;
    private Double amount;
    private String transactionCode;
    private String failureReason;
    private String qrCodeUrl;
    private String bankName;
    private String accountNumber;
    private String accountName;
    private LocalDateTime createdAt;// lúc tạp payment
    private LocalDateTime updatedAt;//lần câp nhật gần nhất
    private LocalDateTime paidAt;//luc thanh toán thành công
}

