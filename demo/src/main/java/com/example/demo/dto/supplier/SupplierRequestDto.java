package com.example.demo.dto.supplier;

import lombok.Data;

@Data
public class SupplierRequestDto {
    private String name;
    private String phone;
    private String address;
    private String email;
    private String supplyType;
}
