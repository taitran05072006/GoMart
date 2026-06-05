package com.example.demo.repository;

import com.example.demo.entity.ShippingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShippingConfigRepository extends JpaRepository<ShippingConfig, Long> {
    Optional<ShippingConfig> findFirstByOrderByIdAsc();
}
