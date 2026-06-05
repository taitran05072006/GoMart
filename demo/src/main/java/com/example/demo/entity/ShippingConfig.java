package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "shipping_config")
@Data
public class ShippingConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "per_km_rate", nullable = false)
    private Double perKmRate = 3000.0;

    @Column(name = "base_fee", nullable = false)
    private Double baseFee = 15000.0;

    @Column(name = "free_km", nullable = false)
    private Double freeKm = 1.0;

    @Column(name = "free_threshold", nullable = false)
    private Double freeThreshold = 500000.0;
}
