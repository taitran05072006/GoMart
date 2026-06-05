package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "stores")
@SQLDelete(sql = "UPDATE stores SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Store {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    private String address;
    private Double latitude;
    private Double longitude;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;
}
