package com.example.demo.repository;

import com.example.demo.entity.Order;
import com.example.demo.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Order> findByAssignedShipperIdOrderByCreatedAtDesc(Long shipperId);
    List<Order> findByStatusAndActualDeliveryTimeBefore(OrderStatus status, LocalDateTime time);
    java.util.Optional<Order> findByOrderCode(String orderCode);
    java.util.Optional<Order> findByOrderCodeContaining(String partialOrderCode);

    List<Order> findByStoreIdOrderByCreatedAtDesc(Long storeId);
}
