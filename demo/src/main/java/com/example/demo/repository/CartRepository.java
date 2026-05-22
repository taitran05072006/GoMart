package com.example.demo.repository;

import com.example.demo.entity.Cart;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartRepository extends JpaRepository<Cart, Long> {
    Cart findByUser(User user);
    Cart findByUserId(Long userId);
}
