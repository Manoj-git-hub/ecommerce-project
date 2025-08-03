package com.ecommerce.ecommerce_backend.repository;

import com.ecommerce.ecommerce_backend.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    // Find by category ID, with price range and rating filter
    Page<Product> findByCategoryIdAndPriceBetweenAndAverageRatingGreaterThanEqual(Long categoryId, Double minPrice, Double maxPrice, Double minRating, Pageable pageable);
    Page<Product> findByPriceBetweenAndAverageRatingGreaterThanEqual(Double minPrice, Double maxPrice, Double minRating, Pageable pageable);
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable); // For search
}
