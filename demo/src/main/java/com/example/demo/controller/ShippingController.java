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
            @RequestParam(required = false) String address,
            @RequestParam(required = false) Double subtotal,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Long storeId) {
        Double fee;
        if (lat != null && lng != null) {
            fee = shippingService.calculateShippingFeeByCoordinates(lat, lng, subtotal, storeId);
        } else {
            fee = shippingService.calculateShippingFee(address, subtotal);
        }
        return ApiResponse.success("Phí vận chuyển đã được tính toán", fee);
    }
}
