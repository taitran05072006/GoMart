package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "import_unit_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportUnitType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // e.g. "Kg", "G", "Cái", "Thùng"

    private String description;
}
