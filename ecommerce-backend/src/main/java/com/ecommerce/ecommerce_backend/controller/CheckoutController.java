package com.ecommerce.ecommerce_backend.controller;

import com.ecommerce.ecommerce_backend.model.Address;
import com.ecommerce.ecommerce_backend.model.Order;
import com.ecommerce.ecommerce_backend.model.OrderStatus;
import com.ecommerce.ecommerce_backend.payload.response.MessageResponse;
import com.ecommerce.ecommerce_backend.security.services.UserDetailsImpl;
import com.ecommerce.ecommerce_backend.service.CheckoutService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://127.0.0.1:5500", maxAge = 3600) // IMPORTANT: Adjust this if your frontend port changes!
@RestController
@RequestMapping("/api")
@PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
public class CheckoutController {

    @Autowired
    private CheckoutService checkoutService;

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getUsername();
    }

    // Endpoint to get user's addresses
    @GetMapping("/addresses")
    public ResponseEntity<List<Address>> getUserAddresses() {
        String username = getCurrentUsername();
        List<Address> addresses = checkoutService.getUserAddresses(username);
        return ResponseEntity.ok(addresses);
    }

    // Endpoint to add a new address
    @PostMapping("/addresses")
    public ResponseEntity<?> addAddress(@RequestBody Address address) {
        String username = getCurrentUsername();
        try {
            Address savedAddress = checkoutService.addAddress(username, address);
            return new ResponseEntity<>(savedAddress, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // Endpoint to create a Dummy PaymentIntent
    @PostMapping("/checkout/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody CheckoutService.PaymentIntentCreateRequest request) {
        String username = getCurrentUsername();
        try {
            // Call the modified service method which now returns a Map with dummy values
            Map<String, Object> paymentIntentResponse = checkoutService.createPaymentIntent(username,
                    request.addressId);
            return ResponseEntity.ok(paymentIntentResponse);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // Endpoint to confirm the order after dummy payment success
    @PostMapping("/checkout/confirm-order")
    public ResponseEntity<?> confirmOrder(@RequestBody CheckoutService.OrderConfirmationRequest request) {
        try {
            Order order = checkoutService.confirmOrder(request.paymentIntentId);
            return ResponseEntity.ok(new MessageResponse("Order placed successfully! Order ID: " + order.getId()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // Endpoint to get user's order history
    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getUserOrders() {
        String username = getCurrentUsername();
        List<Order> orders = checkoutService.getUserOrders(username);
        return ResponseEntity.ok(orders);
    }

    // Endpoint to get details of a specific order for the current user
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<Order> getOrderById(@PathVariable Long orderId) {
        String username = getCurrentUsername();
        return checkoutService.getOrderByIdForUser(username, orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ADMIN ONLY: Update order status
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/admin/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long orderId,
            @RequestBody Map<String, String> statusUpdate) {
        String newStatusStr = statusUpdate.get("status");
        if (newStatusStr == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Status field is required."));
        }
        try {
            OrderStatus newStatus = OrderStatus.valueOf(newStatusStr.toUpperCase());
            Order updatedOrder = checkoutService.updateOrderStatus(orderId, newStatus);
            return ResponseEntity.ok(updatedOrder);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid order status: " + newStatusStr));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}