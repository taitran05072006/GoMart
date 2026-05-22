package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "user_vouchers")
public class UserVoucher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_code", referencedColumnName = "code", nullable = false)
    private Voucher voucher;

    @Column(name = "is_used")
    @Builder.Default
    private boolean used = false;

    @Column(name = "collected_at")
    private LocalDateTime collectedAt;

    @PrePersist
    protected void onCreate() {
        collectedAt = LocalDateTime.now();
    }
}
