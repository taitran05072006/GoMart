package com.example.demo.repository;

import com.example.demo.entity.Category;
import com.example.demo.entity.Product;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByCategory(Category category);
    @Query("""
SELECT p FROM Product p
WHERE (:keyword IS NULL OR
       LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
       LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
AND (:categoryId IS NULL OR p.category.id = :categoryId)
AND (:minPrice IS NULL OR p.price >= :minPrice)
AND (:maxPrice IS NULL OR p.price <= :maxPrice)
""")
    List<Product> searchAll(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice
    );
    //lấy tấty cả snar phẩm chưa xóa
    List<Product> findByIsDeletedFalse();
    //lâys danh mục sản phẩm chưa xóa
    List<Product> findByCategoryIdAndIsDeletedFalse(Long categoryId);
    long countByCategoryIdAndIsDeletedFalse(Long categoryId);
    //lấy giá giữa hai khoang
    List<Product> findByPriceBetweenAndIsDeletedFalse(Double min, Double max);
    List<Product> findByCategoryIdAndPriceBetweenAndIsDeletedFalse(
            Long categoryId, Double min, Double max);

    List<Product> findByStockLessThanAndIsDeletedFalse(Integer threshold);

    @Query("SELECT p FROM Product p WHERE p.expiryDate < CURRENT_DATE AND p.isDeleted = false")
    List<Product> findByExpiryDateBeforeAndIsDeletedFalse();

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE products SET version = 0 WHERE version IS NULL", nativeQuery = true)
    int normalizeNullVersions();

}
