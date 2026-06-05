package com.example.demo.repository;

import com.example.demo.entity.Store;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {
    List<Store> findByRegionId(Long regionId);

    long countByRegionId(Long regionId);

    @Query(value = "SELECT COUNT(*) FROM stores WHERE region_id = :regionId", nativeQuery = true)
    long countByRegionIdIncludingDeleted(@Param("regionId") Long regionId);

    @Query(value = "SELECT * FROM stores", nativeQuery = true)
    List<Store> findAllIncludingDeleted();

    @Query(value = "SELECT * FROM stores WHERE id = :id", nativeQuery = true)
    Optional<Store> findByIdIncludingDeleted(@Param("id") Long id);

    @Query(value = "SELECT * FROM stores WHERE region_id = :regionId", nativeQuery = true)
    List<Store> findByRegionIdIncludingDeleted(@Param("regionId") Long regionId);
}
