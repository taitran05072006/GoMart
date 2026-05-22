package com.example.demo.service;

import org.springframework.stereotype.Service;

@Service
public class ShippingService {

    public Double calculateShippingFee(String address, Double subtotal) {
        if (address == null || address.trim().isEmpty()) {
            return 0.0;
        }

        if (subtotal != null && subtotal >= 500000) {
            return 0.0;
        }

        String normalizedAddress = address.trim().toLowerCase();
        if (normalizedAddress.contains("đà nẵng") || normalizedAddress.contains("da nang")) {
            return 15000.0;
        }
        
        return 30000.0;
    }
}
