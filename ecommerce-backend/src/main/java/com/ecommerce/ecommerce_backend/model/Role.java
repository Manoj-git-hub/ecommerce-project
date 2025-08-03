package com.ecommerce.ecommerce_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "roles")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING) // Store enum as String in DB
    @Column(length = 20, nullable = false, unique = true)
    private ERole name;

    public Role(ERole name) {
        this.name = name;
    }
}
