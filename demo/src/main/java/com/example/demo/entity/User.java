package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "users")
@SQLDelete(sql = "UPDATE users SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    @Column(unique = true, nullable = false)
    private String email;
    private String password;
    private String avatar;
    private String phone;
    private String address;
    private String province;
    private String district;
    private String ward;
    private String houseNumber;
    @Column(updatable = false)
    private LocalDateTime createdAt;
    @Enumerated(EnumType.STRING)
    private Role role;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private Store store;
    private String otp;
    private LocalDateTime otpExpiry;
    @Builder.Default
    private Integer rewardStars = 0;
    @Builder.Default
    private String tier = "MEMBER";
    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Order> orders;
    public boolean isAdmin() {
        return role == Role.SUPER_ADMIN || role == Role.STORE_ADMIN;
    }
}
