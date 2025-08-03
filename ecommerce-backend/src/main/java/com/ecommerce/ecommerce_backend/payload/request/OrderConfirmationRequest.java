package com.ecommerce.ecommerce_backend.payload.request;

// No need for validation here as it's an internal DTO for service
public class OrderConfirmationRequest {
    public String paymentIntentId;
}