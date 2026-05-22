package com.example.demo.repository;

import com.example.demo.entity.User;
import com.example.demo.entity.UserVoucher;
import com.example.demo.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserVoucherRepository extends JpaRepository<UserVoucher, Long> {
    List<UserVoucher> findByUser(User user);
    List<UserVoucher> findByUserAndUsedFalse(User user);
    Optional<UserVoucher> findByUserAndVoucher(User user, Voucher voucher);
    boolean existsByUserAndVoucher(User user, Voucher voucher);
    void deleteByVoucher(Voucher voucher);
}
