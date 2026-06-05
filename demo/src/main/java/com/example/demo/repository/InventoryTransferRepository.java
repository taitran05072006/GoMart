package com.example.demo.repository;

import com.example.demo.entity.InventoryTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryTransferRepository extends JpaRepository<InventoryTransfer, Long> {
    List<InventoryTransfer> findAllByOrderByCreatedAtDesc();
}