package com.example.demo.repository;

import com.example.demo.entity.StockReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockReceiptItemRepository extends JpaRepository<StockReceiptItem, Long> {
}
