package com.example.demo.entity;

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
@Table(name = "inventory")
public class Inventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    private Integer quantity;

    @Column(name = "selling_price")
    private Integer sellingPrice;

    @Column(name = "old_price")
    private Integer oldPrice;

    @Column(name = "discount")
    private Integer discount;

    @Column(name = "old_batch_quantity")
    private Integer oldBatchQuantity;

    @Column(name = "new_batch_quantity")
    private Integer newBatchQuantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_unit_type_id")
    private ImportUnitType importUnitType;

    @Column(name = "import_conversion_rate")
    private Double importConversionRate;

    @Column(name = "is_selling", nullable = false)
    @Builder.Default
    private Boolean isSelling = true;
}
