package com.example.demo.repository;

import com.example.demo.entity.ImportUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImportUnitRepository extends JpaRepository<ImportUnit, Long> {
    List<ImportUnit> findByProductId(Long productId);
    void deleteByProductId(Long productId);
}
