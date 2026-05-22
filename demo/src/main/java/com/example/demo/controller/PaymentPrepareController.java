package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.order.OrderRequestDto;
import com.example.demo.dto.payment.PaymentResponseDto;
import com.example.demo.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PaymentPrepareController {

    private final PaymentService paymentService;

    @PostMapping("/prepare")
    public ApiResponse<PaymentResponseDto> prepare(@RequestBody OrderRequestDto request) {
        return ApiResponse.success("Chuẩn bị thanh toán thành công", paymentService.prepareTransfer(request));
    }
    
    @GetMapping("/session/{transactionCode}")
    public ApiResponse<PaymentResponseDto> getSession(@PathVariable String transactionCode) {
        return ApiResponse.success("OK", paymentService.getPaymentByTransactionCode(transactionCode));
    }

    @GetMapping("/methods")
    public ApiResponse<Object> getMethods() {
        return ApiResponse.success("OK", paymentService.getSupportedMethods());
    }
}
