package com.example.demo.repository;

import com.example.demo.entity.User;
import com.example.demo.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
    List<User> findByRoleOrderByNameAsc(Role role);
    Optional<User> findByPhone(String phone);

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE users SET reward_stars = 0 WHERE reward_stars IS NULL", nativeQuery = true)
    int normalizeNullRewardStars();

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE users SET tier = 'MEMBER' WHERE tier IS NULL", nativeQuery = true)
    int normalizeNullTiers();
}