package com.example.demo.repository;

import com.example.demo.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    List<Inventory> findByStoreIdAndQuantityGreaterThan(Long storeId, Integer qty);

    @Query("SELECT i.product.id FROM Inventory i WHERE i.store.id = :storeId AND i.quantity > 0")
    List<Long> findProductIdsByStoreWithStock(@Param("storeId") Long storeId);

    Inventory findByStoreIdAndProductId(Long storeId, Long productId);

    List<Inventory> findByProductId(Long productId);
}
