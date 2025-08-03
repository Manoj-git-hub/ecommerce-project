package com.ecommerce.ecommerce_backend.service;

import com.ecommerce.ecommerce_backend.model.*;
import com.ecommerce.ecommerce_backend.repository.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID; // ADD this import for generating dummy ID

@Service
public class CheckoutService {

    @Autowired
    private CartRepository cartRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AddressRepository addressRepository;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private ProductRepository productRepository;

    // NO Stripe Secret Key or initialization needed for dummy payment
    public CheckoutService() {
        // Stripe.apiKey initialization is removed
    }

    // DTO for creating Payment Intent (keep as is)
    public static class PaymentIntentCreateRequest {
        public Long addressId;
    }

    // DTO for confirming Order (keep as is)
    public static class OrderConfirmationRequest {
        public String paymentIntentId; // Still use this for consistency, will be a dummy ID
    }


    @Transactional
    // Change return type from PaymentIntent to Map<String, Object> for dummy
    public Map<String, Object> createPaymentIntent(String username, Long addressId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        Cart cart = cartRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Cart not found for user: " + username));

        if (cart.getCartItems().isEmpty()) {
            throw new RuntimeException("Cannot create payment intent for an empty cart.");
        }

        Address shippingAddress = addressRepository.findByIdAndUser(addressId, user)
                .orElseThrow(() -> new RuntimeException("Shipping address not found or does not belong to user."));

        // Calculate total amount from cart items
        long amountInCents = 0; // Amount in cents
        for (CartItem item : cart.getCartItems()) {
            Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProduct().getName()));
            if (product.getStockQuantity() < item.getQuantity()) {
                throw new RuntimeException("Insufficient stock for product: " + product.getName() + ". Available: " + product.getStockQuantity());
            }
            amountInCents += item.getPriceAtAddition().multiply(BigDecimal.valueOf(item.getQuantity())).movePointRight(2).longValue();
        }

        // --- DUMMY PAYMENT INTENT LOGIC START ---
        String dummyPaymentIntentId = "pi_" + UUID.randomUUID().toString().replace("-", "");
        String dummyClientSecret = "cs_" + UUID.randomUUID().toString().replace("-", "") + "_dummy";

        // Optionally, create a PENDING order now to link the dummy payment intent
        // This is important so the confirmOrder method has an order to find
        Order order = new Order();
        order.setUser(user);
        order.setShippingAddress(shippingAddress);
        order.setPaymentIntentId(dummyPaymentIntentId); // Use dummy ID
        order.setTotalAmount(BigDecimal.valueOf(amountInCents).movePointLeft(2)); // Store in original currency (e.g., USD)
        order.setStatus(OrderStatus.PENDING); // Set initial status

        // Add items to order (capture current prices)
        for (CartItem cartItem : cart.getCartItems()) {
            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(cartItem.getProduct());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPriceAtOrder(cartItem.getPriceAtAddition());
            order.addOrderItem(orderItem);
        }
        orderRepository.save(order);

        Map<String, Object> response = new HashMap<>();
        response.put("clientSecret", dummyClientSecret);
        // Also return the dummy payment intent ID so frontend can pass it back
        response.put("paymentIntentId", dummyPaymentIntentId);
        return response;
        // --- DUMMY PAYMENT INTENT LOGIC END ---
    }

    @Transactional
    public Order confirmOrder(String paymentIntentId) {
        try {
            // In a real system, you'd retrieve the PaymentIntent from Stripe here
            // We just assume success for the dummy gateway
            System.out.println("Dummy Payment Gateway: Payment Intent " + paymentIntentId + " assumed successful.");

            Order order = orderRepository.findByPaymentIntentId(paymentIntentId)
                    .orElseThrow(() -> new RuntimeException("Order not found for Payment Intent ID: " + paymentIntentId));

            if (order.getStatus() != OrderStatus.PENDING) {
                throw new RuntimeException("Order is not in PENDING status. Current status: " + order.getStatus());
            }

            // Update product stock and clear cart
            User user = order.getUser();
            Cart cart = cartRepository.findByUser(user)
                    .orElseThrow(() -> new RuntimeException("Cart not found for user: " + user.getUsername()));

            for (OrderItem orderItem : order.getOrderItems()) {
                Product product = productRepository.findById(orderItem.getProduct().getId())
                        .orElseThrow(() -> new RuntimeException("Product not found: " + orderItem.getProduct().getName()));
                if (product.getStockQuantity() < orderItem.getQuantity()) {
                    throw new RuntimeException("Critical: Insufficient stock for " + product.getName() + " during order confirmation.");
                }
                product.setStockQuantity(product.getStockQuantity() - orderItem.getQuantity());
                productRepository.save(product);
            }

            cartRepository.delete(cart); // Clear the user's cart (cascade will delete CartItems)

            order.setStatus(OrderStatus.PROCESSING); // Mark as processing
            return orderRepository.save(order);

        } catch (RuntimeException e) {
            throw new RuntimeException("Application error confirming order: " + e.getMessage(), e);
        }
    }

    @Transactional
    public Order updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with ID: " + orderId));
        order.setStatus(newStatus);
        return orderRepository.save(order);
    }

    public List<Order> getUserOrders(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return orderRepository.findByUserOrderByOrderDateDesc(user);
    }

    public Optional<Order> getOrderByIdForUser(String username, Long orderId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return orderRepository.findByIdAndUser(orderId, user);
    }

     public List<Address> getUserAddresses(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        return addressRepository.findByUser(user);
    }

    @Transactional
    public Address addAddress(String username, Address address) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        address.setUser(user);
        return addressRepository.save(address);
    }
}