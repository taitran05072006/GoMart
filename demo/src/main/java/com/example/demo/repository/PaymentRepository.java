package com.example.demo.repository;

import com.example.demo.entity.Payment;
import com.example.demo.entity.PaymentMethod;
import com.example.demo.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByOrderId(Long orderId);

    List<Payment> findByMethodAndStatusAndCreatedAtBefore(
            PaymentMethod method,
            PaymentStatus status,
            LocalDateTime createdAt
    );

    Optional<Payment> findByTransactionCode(String transactionCode);
}