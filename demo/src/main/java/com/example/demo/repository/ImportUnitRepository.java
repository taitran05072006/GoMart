package com.example.demo.repository;

import com.example.demo.entity.ImportUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImportUnitRepository extends JpaRepository<ImportUnit, Long> {
    List<ImportUnit> findByProductId(Long productId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ImportUnit i WHERE i.product.id = :productId")
    void deleteByProductId(Long productId);
}
