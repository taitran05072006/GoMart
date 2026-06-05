package com.example.demo.repository;

import com.example.demo.entity.User;
import com.example.demo.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
    List<User> findByRoleOrderByNameAsc(Role role);
    List<User> findByRoleInOrderByNameAsc(java.util.List<Role> roles);
    List<User> findByRoleAndStoreId(Role role, Long storeId);
    Optional<User> findByPhone(String phone);

    @Query(value = "SELECT * FROM users WHERE store_id = :storeId AND role IN ('STORE_ADMIN', 'SHIPPER')", nativeQuery = true)
    List<User> findStoreAdminsAndShippersIncludingDeleted(@Param("storeId") Long storeId);

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE users SET reward_stars = 0 WHERE reward_stars IS NULL", nativeQuery = true)
    int normalizeNullRewardStars();

    @Query(value = "SELECT COUNT(*) FROM users WHERE reward_stars IS NULL", nativeQuery = true)
    long countNullRewardStars();

    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE users SET tier = 'MEMBER' WHERE tier IS NULL", nativeQuery = true)
    int normalizeNullTiers();

    @Query(value = "SELECT COUNT(*) FROM users WHERE tier IS NULL", nativeQuery = true)
    long countNullTiers();
}