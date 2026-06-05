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
@Table(name = "regions")
@SQLDelete(sql = "UPDATE regions SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Region {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;
}
