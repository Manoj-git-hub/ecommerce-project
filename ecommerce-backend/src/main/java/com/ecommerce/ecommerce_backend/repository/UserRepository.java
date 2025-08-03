package com.ecommerce.ecommerce_backend.repository;

import com.ecommerce.ecommerce_backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository // Marks this as a Spring Data JPA repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Custom query methods
    Optional<User> findByUsername(String username);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
}
