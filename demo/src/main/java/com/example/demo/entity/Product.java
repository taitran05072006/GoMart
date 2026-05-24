package com.example.demo.entity;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String imageUrl;
    private String bg;
    private Integer price;
    private Integer oldPrice;
    private Integer discount;// phần trăm giảm giá, ví dụ: 20 cho giảm 20%

    private Double rating;// số sao
    private Integer reviews;// số lượng đánh giá
    private String tag;// ví dụ: "new", "sale", "hot", v.v.
    private String unit;// ví dụ: "kg", "pcs", "box", v.v.
    private Integer stock;// số lượng tồn kho
    private Integer sold;// số lượng đã bán
    private Integer oldBatchQuantity;// số lượng lô cũ
    private Integer newBatchQuantity;// số lượng lô mới
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    @Column(columnDefinition = "TEXT")
    private String description;

    // quan hệ category
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonBackReference
    private Category category;
    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Builder.Default
    private Boolean isDeleted = false;// đánh dấu sản phẩm đã bị xóa (soft delete)

    @PrePersist
    @PreUpdate
    public void ensureVersionInitialized() {
        // Legacy rows may have null version; initialize to keep optimistic locking stable.
        if (version == null) {
            version = 0L;
        }
    }

    @PostLoad
    public void ensureVersionAfterLoad() {
        if (version == null) {
            version = 0L;
        }
    }
}
