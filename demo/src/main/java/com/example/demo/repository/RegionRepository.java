package com.example.demo.repository;

import com.example.demo.entity.Region;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RegionRepository extends JpaRepository<Region, Long> {
    Optional<Region> findByNameIgnoreCase(String name);

    @Query(value = "SELECT * FROM regions", nativeQuery = true)
    List<Region> findAllIncludingDeleted();

    @Query(value = "SELECT * FROM regions WHERE id = :id", nativeQuery = true)
    Optional<Region> findByIdIncludingDeleted(@Param("id") Long id);
}
