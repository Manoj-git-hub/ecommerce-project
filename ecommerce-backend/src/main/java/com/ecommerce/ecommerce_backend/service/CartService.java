package com.ecommerce.ecommerce_backend.service;

import com.ecommerce.ecommerce_backend.model.Cart;
import com.ecommerce.ecommerce_backend.model.CartItem;
import com.ecommerce.ecommerce_backend.model.Product;
import com.ecommerce.ecommerce_backend.model.User;
import com.ecommerce.ecommerce_backend.repository.CartItemRepository;
import com.ecommerce.ecommerce_backend.repository.CartRepository;
import com.ecommerce.ecommerce_backend.repository.ProductRepository;
import com.ecommerce.ecommerce_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class CartService {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Transactional
    public Cart getOrCreateCart(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        return cartRepository.findByUser(user)
                .orElseGet(() -> {
                    Cart newCart = new Cart();
                    newCart.setUser(user);
                    newCart.setCreatedAt(LocalDateTime.now());
                    newCart.setUpdatedAt(LocalDateTime.now());
                    return cartRepository.save(newCart);
                });
    }

    @Transactional
    public CartItem addProductToCart(String username, Long productId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive.");
        }

        Cart cart = getOrCreateCart(username);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + productId));

        if (product.getStockQuantity() < quantity) {
            throw new RuntimeException("Not enough stock for product: " + product.getName() + ". Available: " + product.getStockQuantity());
        }

        Optional<CartItem> existingCartItem = cartItemRepository.findByCartAndProduct(cart, product);

        CartItem cartItem;
        if (existingCartItem.isPresent()) {
            cartItem = existingCartItem.get();
            int newQuantity = cartItem.getQuantity() + quantity;
            if (product.getStockQuantity() < newQuantity) {
                throw new RuntimeException("Adding " + quantity + " to cart would exceed available stock (" + product.getStockQuantity() + ")");
            }
            cartItem.setQuantity(newQuantity);
        } else {
            cartItem = new CartItem();
            cartItem.setCart(cart);
            cartItem.setProduct(product);
            cartItem.setQuantity(quantity);
            cartItem.setPriceAtAddition(product.getPrice()); // Capture current price
            cart.addCartItem(cartItem); // Add to cart's list
        }
        return cartItemRepository.save(cartItem);
    }

    @Transactional
    public CartItem updateCartItemQuantity(String username, Long productId, int newQuantity) {
        if (newQuantity <= 0) {
            return removeProductFromCart(username, productId); // Remove if quantity is 0 or less
        }

        Cart cart = getOrCreateCart(username);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + productId));

        CartItem cartItem = cartItemRepository.findByCartAndProduct(cart, product)
                .orElseThrow(() -> new RuntimeException("Product not in cart."));

        if (product.getStockQuantity() < newQuantity) {
            throw new RuntimeException("Cannot update quantity. Not enough stock for product: " + product.getName() + ". Available: " + product.getStockQuantity());
        }

        cartItem.setQuantity(newQuantity);
        return cartItemRepository.save(cartItem);
    }

    @Transactional
    public CartItem removeProductFromCart(String username, Long productId) {
        Cart cart = getOrCreateCart(username);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + productId));

        CartItem cartItem = cartItemRepository.findByCartAndProduct(cart, product)
                .orElseThrow(() -> new RuntimeException("Product not in cart."));

        cart.removeCartItem(cartItem); // Remove from cart's list
        cartItemRepository.delete(cartItem);
        return cartItem; // Return the deleted item (optional, for confirmation)
    }

    public Cart getUserCart(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return cartRepository.findByUser(user)
                .orElse(null); // Return null if cart doesn't exist yet for this user
    }
}