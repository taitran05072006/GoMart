package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "shipping_fees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingFee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String province; // Tỉnh/Thành phố
    private String district; // Quận/Huyện
    private String ward;     // Phường/Xã
    
    @Column(nullable = false)
    private Double fee;      // Phí giao hàng
}
