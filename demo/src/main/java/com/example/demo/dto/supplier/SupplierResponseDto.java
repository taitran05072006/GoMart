package com.example.demo.dto.supplier;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SupplierResponseDto {
    private Long id;
    private String name;
    private String phone;
    private String address;
    private String email;
    private String supplyType;
}
