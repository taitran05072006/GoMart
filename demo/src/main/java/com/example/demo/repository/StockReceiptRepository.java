package com.example.demo.repository;

import com.example.demo.entity.StockReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StockReceiptRepository extends JpaRepository<StockReceipt, Long> {
    Optional<StockReceipt> findByCode(String code);
}
