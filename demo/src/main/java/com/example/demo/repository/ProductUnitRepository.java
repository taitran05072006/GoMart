package com.example.demo.repository;

import com.example.demo.entity.ProductUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductUnitRepository extends JpaRepository<ProductUnit, Long> {
    List<ProductUnit> findByProductId(Long productId);
    void deleteByProductId(Long productId);
}
