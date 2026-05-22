package com.example.demo.repository;

import com.example.demo.entity.ShippingLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShippingLocationRepository extends JpaRepository<ShippingLocation, Long> {
    Optional<ShippingLocation> findByName(String name);
    List<ShippingLocation> findByIsActiveTrue();
}
