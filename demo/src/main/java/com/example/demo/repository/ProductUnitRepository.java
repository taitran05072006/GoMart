package com.example.demo.repository;

import com.example.demo.entity.ProductUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ProductUnitRepository extends JpaRepository<ProductUnit, Long> {
    List<ProductUnit> findByProductId(Long productId);
    @Modifying
    @Query("DELETE FROM ProductUnit p WHERE p.product.id = :productId")
    void deleteByProductId(Long productId);
}
