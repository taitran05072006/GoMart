package com.example.demo.repository;


import com.example.demo.entity.Category;

import com.example.demo.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByNameContainingIgnoreCaseAndIsDeletedFalse(String name);
    List<Category> findByIsDeletedFalse();

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE categories SET is_deleted = false WHERE is_deleted IS NULL", nativeQuery = true)
    int normalizeNullDeleted();

    @Query(value = "SELECT COUNT(*) FROM categories WHERE is_deleted IS NULL", nativeQuery = true)
    long countNullDeleted();

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE categories SET is_active = true WHERE is_active IS NULL", nativeQuery = true)
    int normalizeNullActive();

    @Query(value = "SELECT COUNT(*) FROM categories WHERE is_active IS NULL", nativeQuery = true)
    long countNullActive();
}