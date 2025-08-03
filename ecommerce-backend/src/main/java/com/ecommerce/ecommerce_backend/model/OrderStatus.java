package com.ecommerce.ecommerce_backend.model;

public enum OrderStatus {
    PENDING,
    PROCESSING,
    SHIPPED,
    DELIVERED,
    CANCELLED,
    FAILED // For payment failures or other issues
    , PLACED
}
