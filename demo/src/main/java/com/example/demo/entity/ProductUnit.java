package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "product_units")
public class ProductUnit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // ví dụ: "Gói", "Thùng", "Hộp"
    
    private Double conversionRate; // Tỷ lệ quy đổi so với đơn vị gốc (ví dụ: Thùng = 24 Lon)
    
    private Integer price; // Giá bán cho đơn vị này
    
    private Integer oldPrice; // Giá cũ cho đơn vị này

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @JsonBackReference
    private Product product;
}
