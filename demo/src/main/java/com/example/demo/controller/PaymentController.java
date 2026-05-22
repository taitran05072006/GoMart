package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.payment.PaymentCreateRequestDto;
import com.example.demo.dto.payment.PaymentFailRequestDto;
import com.example.demo.dto.payment.PaymentResponseDto;
import com.example.demo.exception.BadRequestException;
import com.example.demo.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders/{orderId}/payment")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ApiResponse<PaymentResponseDto> create(
            @PathVariable Long orderId,
            @RequestBody PaymentCreateRequestDto request
    ) {
        if (request == null) {
            throw new BadRequestException("Thông có dữ liệu payment");
        }
        return ApiResponse.success(
                "Tạo payment thành công",
            paymentService.createPayment(orderId, request.getMethod())
        );
    }

    @PostMapping("/confirm")
    public ApiResponse<PaymentResponseDto> confirm(@PathVariable Long orderId) {
        return ApiResponse.success(
                paymentService.confirmPayment(orderId)
        );
    }

    @PostMapping("/fail")
    public ApiResponse<PaymentResponseDto> fail(
            @PathVariable Long orderId,
            @RequestBody(required = false) PaymentFailRequestDto request
    ) {
        String reason = request != null ? request.getReason() : null;
        return ApiResponse.success(
                "Đánh dấu payment failed",
                paymentService.failPayment(orderId, reason)
        );
    }

    @GetMapping
    public ApiResponse<PaymentResponseDto> get(@PathVariable Long orderId) {
        return ApiResponse.success(
                "OK",
                paymentService.getByOrder(orderId)
        );
    }

    @GetMapping("/status")
    public ApiResponse<String> getStatus(@PathVariable Long orderId) {
        return ApiResponse.success(
                "OK",
                paymentService.getPaymentStatus(orderId)
        );
    }

    @GetMapping("/method")
    public ApiResponse<List<String>> getMethods(@PathVariable Long orderId) {
        return ApiResponse.success(
                "OK",
                paymentService.getSupportedMethods()
        );
    }
}