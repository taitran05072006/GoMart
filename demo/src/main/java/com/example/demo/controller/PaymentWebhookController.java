package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.payment.PayoWebhookRequestDto;
import com.example.demo.dto.payment.PaymentResponseDto;
import com.example.demo.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/webhook")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentService paymentService;

    @PostMapping(value = {"", "/", "/payo"})
    public ApiResponse<Object> payoWebhook(@RequestBody java.util.Map<String, Object> request) {
        return ApiResponse.success("Webhook payment đã được xử lý", paymentService.processPayoWebhookRaw(request));
    }
}