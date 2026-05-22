package com.example.demo.dto.payment;

import com.example.demo.entity.PaymentMethod;
import lombok.Data;

@Data
public class PaymentCreateRequestDto {
    private PaymentMethod method;
}

