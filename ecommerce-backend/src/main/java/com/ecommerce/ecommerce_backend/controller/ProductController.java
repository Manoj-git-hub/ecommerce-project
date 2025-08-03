package com.ecommerce.ecommerce_backend.controller;

import com.ecommerce.ecommerce_backend.model.Category;
import com.ecommerce.ecommerce_backend.model.Product;
import com.ecommerce.ecommerce_backend.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://127.0.0.1:5500", maxAge = 3600) // IMPORTANT: Adjust this if your frontend port changes!
@RestController
@RequestMapping("/api")
public class ProductController {

    @Autowired
    private ProductService productService;

    // PUBLIC ACCESS: Get all products with filters
    @GetMapping("/products")
    public ResponseEntity<Page<Product>> getAllProducts(
            @RequestParam(required = false) String categoryName,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) String searchKeyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        Page<Product> products = productService.getAllProducts(
                categoryName, minPrice, maxPrice, minRating,
                searchKeyword, page, size, sortBy, sortDir);
        return ResponseEntity.ok(products);
    }

    // PUBLIC ACCESS: Get product by ID
    @GetMapping("/products/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // PUBLIC ACCESS: Get all categories
    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        List<Category> categories = productService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    // ADMIN ONLY: Add new product
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin/products")
    public ResponseEntity<Product> addProduct(@RequestBody Map<String, Object> productRequest) {
        // Manually map to avoid creating another DTO for admin add
        Product product = new Product();
        product.setName((String) productRequest.get("name"));
        product.setDescription((String) productRequest.get("description"));
        product.setPrice(new java.math.BigDecimal(productRequest.get("price").toString()));
        product.setImageUrl((String) productRequest.get("imageUrl"));
        product.setStockQuantity((Integer) productRequest.get("stockQuantity"));
        Double averageRating = (Double) productRequest.get("averageRating");
        if (averageRating != null)
            product.setAverageRating(averageRating);

        Long categoryId = Long.valueOf(productRequest.get("categoryId").toString());

        Product newProduct = productService.addProduct(product, categoryId);
        return new ResponseEntity<>(newProduct, HttpStatus.CREATED);
    }

    // ADMIN ONLY: Update product
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/admin/products/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id,
            @RequestBody Map<String, Object> productRequest) {
        // Manually map
        Product product = new Product();
        product.setName((String) productRequest.get("name"));
        product.setDescription((String) productRequest.get("description"));
        product.setPrice(new java.math.BigDecimal(productRequest.get("price").toString()));
        product.setImageUrl((String) productRequest.get("imageUrl"));
        product.setStockQuantity((Integer) productRequest.get("stockQuantity"));
        Double averageRating = (Double) productRequest.get("averageRating");
        if (averageRating != null)
            product.setAverageRating(averageRating);

        Long categoryId = null;
        if (productRequest.get("categoryId") != null) {
            categoryId = Long.valueOf(productRequest.get("categoryId").toString());
        }

        Product updatedProduct = productService.updateProduct(id, product, categoryId);
        return ResponseEntity.ok(updatedProduct);
    }

    // ADMIN ONLY: Delete product
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/products/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    // ADMIN ONLY: Add category
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin/categories")
    public ResponseEntity<Category> addCategory(@RequestBody Category category) {
        Category newCategory = productService.addCategory(category);
        return new ResponseEntity<>(newCategory, HttpStatus.CREATED);
    }
}