-- Sample Categories
INSERT IGNORE INTO categories (id, name) VALUES (1, 'Electronics');
INSERT IGNORE INTO categories (id, name) VALUES (2, 'Books');
INSERT IGNORE INTO categories (id, name) VALUES (3, 'Apparel');
INSERT IGNORE INTO categories (id, name) VALUES (4, 'Home & Kitchen');

-- Sample Products
INSERT IGNORE INTO products (id, name, description, price, image_url, stock_quantity, category_id, average_rating) VALUES
(1, 'Laptop Pro X', 'Powerful laptop for professionals. 16GB RAM, 512GB SSD.', 1200.00, 'https://via.placeholder.com/150/007bff/ffffff?text=Laptop', 50, 1, 4.8),
(2, 'The Great Novel', 'An epic story of adventure and discovery.', 25.50, 'https://via.placeholder.com/150/28a745/ffffff?text=Book', 100, 2, 4.5),
(3, 'Wireless Headphones', 'Immersive sound with noise cancellation.', 99.99, 'https://via.placeholder.com/150/ffc107/ffffff?text=Headphones', 200, 1, 4.2),
(4, 'Cotton T-Shirt', 'Comfortable and stylish 100% cotton t-shirt.', 15.00, 'https://via.placeholder.com/150/dc3545/ffffff?text=T-Shirt', 300, 3, 3.9),
(5, 'Smart Coffee Maker', 'Brew perfect coffee with your smartphone.', 75.00, 'https://via.placeholder.com/150/6c757d/ffffff?text=CoffeeMaker', 80, 4, 4.6);

-- If you want to add an admin user
-- Make sure roles are inserted first (ROLE_USER, ROLE_ADMIN)
-- Password is 'adminpass' hashed with BCrypt, 10 rounds.
-- Generated using BCryptPasswordEncoder().encode("adminpass") in Java.
INSERT IGNORE INTO users (id, username, email, password, created_at, updated_at) VALUES
(100, 'admin', 'admin@example.com', '$2a$10$o.cT7X.1V.N.X.G2q.Z1O.w7G3J.y.R.X.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0', NOW(), NOW());

-- Link admin to ROLE_ADMIN
INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (100, (SELECT id FROM roles WHERE name = 'ROLE_ADMIN'));