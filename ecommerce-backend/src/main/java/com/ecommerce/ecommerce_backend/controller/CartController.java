package com.ecommerce.ecommerce_backend.controller;

import com.ecommerce.ecommerce_backend.model.Cart;
import com.ecommerce.ecommerce_backend.model.CartItem;
import com.ecommerce.ecommerce_backend.payload.response.MessageResponse;
import com.ecommerce.ecommerce_backend.security.services.UserDetailsImpl;
import com.ecommerce.ecommerce_backend.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "http://127.0.0.1:5500", maxAge = 3600) // IMPORTANT: Adjust this if your frontend port changes!
@RestController
@RequestMapping("/api/cart")
@PreAuthorize("hasRole('USER') or hasRole('ADMIN')") // Only authenticated users can manage cart
public class CartController {

    @Autowired
    private CartService cartService;

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getUsername();
    }

    @GetMapping
    public ResponseEntity<Cart> getCart() {
        String username = getCurrentUsername();
        Cart cart = cartService.getUserCart(username);
        if (cart == null) {
            // If cart doesn't exist, create an empty one for the user
            cart = cartService.getOrCreateCart(username);
        }
        return ResponseEntity.ok(cart);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addProductToCart(@RequestBody Map<String, Object> request) {
        Long productId = Long.valueOf(request.get("productId").toString());
        Integer quantity = (Integer) request.get("quantity");
        String username = getCurrentUsername();

        try {
            CartItem cartItem = cartService.addProductToCart(username, productId, quantity);
            return ResponseEntity.ok(cartItem);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateCartItemQuantity(@RequestBody Map<String, Object> request) {
        Long productId = Long.valueOf(request.get("productId").toString());
        Integer quantity = (Integer) request.get("quantity");
        String username = getCurrentUsername();

        try {
            CartItem cartItem = cartService.updateCartItemQuantity(username, productId, quantity);
            return ResponseEntity.ok(cartItem);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/remove/{productId}")
    public ResponseEntity<?> removeProductFromCart(@PathVariable Long productId) {
        String username = getCurrentUsername();

        try {
            cartService.removeProductFromCart(username, productId);
            return ResponseEntity.ok(new MessageResponse("Product removed from cart successfully!"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}