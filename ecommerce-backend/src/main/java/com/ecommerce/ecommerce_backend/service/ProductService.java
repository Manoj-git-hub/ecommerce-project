package com.ecommerce.ecommerce_backend.service;

import com.ecommerce.ecommerce_backend.model.Category;
import com.ecommerce.ecommerce_backend.model.Product;
import com.ecommerce.ecommerce_backend.repository.CategoryRepository;
import com.ecommerce.ecommerce_backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    // Admin: Add new product
    @Transactional
    public Product addProduct(Product product, Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found with ID: " + categoryId));
        product.setCategory(category);
        return productRepository.save(product);
    }

    // Admin: Update product
    @Transactional
    public Product updateProduct(Long id, Product updatedProduct, Long categoryId) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + id));

        existingProduct.setName(updatedProduct.getName());
        existingProduct.setDescription(updatedProduct.getDescription());
        existingProduct.setPrice(updatedProduct.getPrice());
        existingProduct.setImageUrl(updatedProduct.getImageUrl());
        existingProduct.setStockQuantity(updatedProduct.getStockQuantity());
        // For admin updates, it's possible to manually set averageRating
        // In a real system, this would primarily be updated by review aggregates
        existingProduct.setAverageRating(updatedProduct.getAverageRating());

        if (categoryId != null && (existingProduct.getCategory() == null || !existingProduct.getCategory().getId().equals(categoryId))) {
            Category newCategory = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new RuntimeException("Category not found with ID: " + categoryId));
            existingProduct.setCategory(newCategory);
        }

        return productRepository.save(existingProduct);
    }

    // Admin: Delete product
    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Product not found with ID: " + id);
        }
        productRepository.deleteById(id);
    }

    // Get single product by ID
    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    // Get all products with filters and pagination
    public Page<Product> getAllProducts(
            String categoryName, Double minPrice, Double maxPrice, Double minRating,
            String searchKeyword, int page, int size, String sortBy, String sortDir) {

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return productRepository.findByNameContainingIgnoreCase(searchKeyword, pageable);
        }

        Long categoryId = null;
        if (categoryName != null && !categoryName.isEmpty()) {
            Category category = categoryRepository.findByName(categoryName)
                    .orElseThrow(() -> new RuntimeException("Category not found: " + categoryName));
            categoryId = category.getId();
        }

        // Set default price and rating if not provided
        minPrice = (minPrice == null) ? 0.0 : minPrice;
        maxPrice = (maxPrice == null) ? Double.MAX_VALUE : maxPrice;
        minRating = (minRating == null) ? 0.0 : minRating;

        if (categoryId != null) {
            return productRepository.findByCategoryIdAndPriceBetweenAndAverageRatingGreaterThanEqual(
                    categoryId, minPrice, maxPrice, minRating, pageable);
        } else {
            return productRepository.findByPriceBetweenAndAverageRatingGreaterThanEqual(
                    minPrice, maxPrice, minRating, pageable);
        }
    }

    // Get all categories
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    // Admin: Add category
    @Transactional
    public Category addCategory(Category category) {
        if (categoryRepository.existsByName(category.getName())) {
            throw new RuntimeException("Category with name '" + category.getName() + "' already exists.");
        }
        return categoryRepository.save(category);
    }
}