package com.example.demo.repository;


import com.example.demo.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByNameContainingIgnoreCaseAndIsDeletedFalse(String name);

    @Query("SELECT DISTINCT c FROM Category c JOIN Product p ON c.id = p.category.id JOIN Inventory i ON p.id = i.product.id WHERE i.store.id = :storeId AND i.isSelling = true AND i.quantity > 0 AND c.isDeleted = false AND p.isDeleted = false")
    List<Category> findByStoreId(@Param("storeId") Long storeId);

    List<Category> findByIsDeletedFalse();
}