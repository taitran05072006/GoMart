package com.example.demo.repository;

import com.example.demo.entity.ShippingFee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ShippingFeeRepository extends JpaRepository<ShippingFee, Long> {
    Optional<ShippingFee> findByProvinceAndDistrictAndWard(String province, String district, String ward);
    Optional<ShippingFee> findByProvinceAndDistrict(String province, String district);
}
