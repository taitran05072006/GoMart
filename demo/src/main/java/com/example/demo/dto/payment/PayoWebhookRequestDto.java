package com.example.demo.dto.payment;

import lombok.Data;

@Data
public class PayoWebhookRequestDto {
    private String code;
    private String desc;
    private PayOSWebhookData data;
    private String signature;
}