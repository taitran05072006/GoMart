package com.example.demo.controller;

import com.example.demo.dto.ApiResponse;
import com.example.demo.service.ShippingService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shipping")
@CrossOrigin(origins = "*")
public class ShippingController {

    private final ShippingService shippingService;

    public ShippingController(ShippingService shippingService) {
        this.shippingService = shippingService;
    }

    @GetMapping("/calculate")
    public ApiResponse<Double> calculateFee(
            @RequestParam String address,
            @RequestParam Double subtotal) {
        Double fee = shippingService.calculateShippingFee(address, subtotal);
        return ApiResponse.success("Phí vận chuyển đã được tính toán", fee);
    }
}
