package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "stock_receipt_items")
public class StockReceiptItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "receipt_id")
    @JsonBackReference
    private StockReceipt receipt;

    private Integer quantity;
    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    private Double price;
    private java.time.LocalDate manufactureDate;
    private java.time.LocalDate expiryDate;
}
