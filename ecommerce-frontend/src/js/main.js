document.addEventListener('DOMContentLoaded', () => {
    console.log('Frontend application loaded!');
    console.log('DOM Content Loaded event fired.'); // Diagnostic log

    const API_BASE_URL = 'http://localhost:8080/api'; // Your Spring Boot Backend URL
    const appMessageDiv = document.getElementById('app-message'); // Global message display area

    // Navigation links (for updating visibility based on login status)
    const loginLinkContainer = document.getElementById('login-link-container');
    const registerLinkContainer = document.getElementById('register-link-container');
    const orderHistoryLinkContainer = document.getElementById('order-history-link-container');
    const userDashboardLinkContainer = document.getElementById('user-dashboard-link-container');
    const adminLinkContainer = document.getElementById('admin-link-container');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Global State Variables (Managed by functions) ---
    let currentProducts = []; // Stores products fetched for the product listing page
    let currentCategories = []; // Stores categories fetched
    let currentCartItems = []; // Stores items in the user's cart
    let currentOrders = []; // Stores user's order history
    let currentAddresses = []; // Stores user's addresses
    let currentSelectedProduct = null; // Product selected for details/edit modal
    let currentSelectedOrder = null; // Order selected for details modal
    let currentCanvasIndex = 0;

    document.getElementById('current-page-num').textContent = currentCanvasIndex + 1;


    // Modal elements
    const genericModal = document.getElementById('generic-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBodyContent = document.getElementById('modal-body-content');
    const modalMessage = document.getElementById('modal-message');
    const closeModalButton = genericModal ? genericModal.querySelector('.close-button') : null;

    // --- 1. Helper Functions ---

    /**
     * Displays a temporary message (toast/alert) on the global app-message div.
     * @param {string} text The message text.
     * @param {string} type The type of message (e.g., 'success', 'danger', 'warning').
     */
    function showAppMessage(text, type) {
        if (appMessageDiv) {
            appMessageDiv.textContent = text;
            appMessageDiv.className = `alert alert-${type}`;
            appMessageDiv.style.display = 'block';
            setTimeout(() => {
                appMessageDiv.style.display = 'none';
            }, 5000); // Hide after 5 seconds
        }
    }

    /**
     * Displays a temporary message within the generic modal.
     * @param {string} text The message text.
     * @param {string} type The type of message (e.g., 'success', 'danger', 'warning').
     */
    function showModalMessage(text, type) {
        if (modalMessage) {
            modalMessage.textContent = text;
            modalMessage.className = `alert alert-${type}`;
            modalMessage.style.display = 'block';
            setTimeout(() => {
                modalMessage.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Retrieves the JWT token from local storage.
     * @returns {string|null} The JWT token or null if not found.
     */
    function getJwtToken() {
        return localStorage.getItem('jwtToken');
    }
    
    /**
     * Retrieves user roles from local storage and parses them.
     * @returns {string[]} An array of roles.
     */
    function getUserRoles() {
        const roles = localStorage.getItem('roles');
        try {
            return roles ? JSON.parse(roles) : [];
        } catch (e) {
            console.error("Error parsing roles from localStorage:", e);
            localStorage.removeItem('roles'); // Clear corrupted roles to prevent future errors
            return [];
        }
    }

    /**
     * Checks if the current user has the 'ADMIN' role.
     * @returns {boolean} True if the user is an admin, false otherwise.
     */
    function isAdmin() {
        return getUserRoles().includes('ROLE_ADMIN');
    }

    /**
     * Performs an authenticated fetch request to the backend API.
     * Automatically attaches the JWT token to the Authorization header.
     * Redirects to login if no token is found or if the session is unauthorized.
     * @param {string} url The URL to fetch.
     * @param {object} options Fetch options (method, headers, body, etc.).
     * @returns {Promise<Response>} The fetch response.
     * @throws {Error} If no JWT token is found or if the response status is 401.
     */
    async function authenticatedFetch(url, options = {}) {
        console.log('authenticatedFetch called for URL:', url); // Diagnostic log
        const token = getJwtToken();
        if (!token) {
            console.error('Authenticated fetch: No JWT token found in localStorage!'); // Diagnostic log
            showAppMessage('You need to be logged in for this action.', 'danger');
            window.location.hash = 'login'; // Redirect to login page via hash
            throw new Error('No JWT token found.'); // Throw to stop execution
        }
        console.log('Authenticated fetch: Token found, proceeding with fetch.'); // Diagnostic log

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });
        if (!response.ok && response.status === 401) {
            showAppMessage('Session expired or unauthorized. Please log in again.', 'danger');
            handleLogout(); // Log out if unauthorized
            throw new Error('Unauthorized');
        }
        return response;
    }

    /**
     * Updates the visibility of navigation links based on user authentication status and roles.
     */
    function updateAuthUI() {
        const token = getJwtToken();
        console.log('Updating Auth UI. Token present:', !!token); // Diagnostic log

        // Get direct references to DOM elements for efficiency
        const loginLink = document.getElementById('login-link-container');
        const registerLink = document.getElementById('register-link-container');
        const logoutBtnCont = document.getElementById('logout-btn-container');
        const orderHistoryLink = document.getElementById('order-history-link-container');
        const userDashboardLink = document.getElementById('user-dashboard-link-container');
        const adminLink = document.getElementById('admin-link-container');

        if (token) {
            if (loginLink) loginLink.style.display = 'none';
            if (registerLink) registerLink.style.display = 'none';
            if (logoutBtnCont) logoutBtnCont.style.display = 'inline';
            if (orderHistoryLink) orderHistoryLink.style.display = 'inline';
            if (userDashboardLink) userDashboardLink.style.display = 'inline';

            if (isAdmin()) {
                if (adminLink) adminLink.style.display = 'inline';
            } else {
                if (adminLink) adminLink.style.display = 'none';
            }
        } else {
            if (loginLink) loginLink.style.display = 'inline';
            if (registerLink) registerLink.style.display = 'inline';
            if (logoutBtnCont) logoutBtnCont.style.display = 'none';
            if (orderHistoryLink) orderHistoryLink.style.display = 'none';
            if (userDashboardLink) userDashboardLink.style.display = 'none';
            if (adminLink) adminLink.style.display = 'none';
        }
    }

    /**
     * Handles user logout: clears local storage, resets user state, and redirects to home.
     */
    function handleLogout() {
        console.log('Handling logout.'); // Diagnostic log
        localStorage.clear(); // Clear all local storage
        // In plain JS, we don't have React state, so just clear local storage and update UI
        showAppMessage('You have been logged out.', 'success');
        window.location.hash = 'home'; // Redirect to home page via hash
    }

    /**
     * Opens the generic modal with specified title and body content.
     * @param {string} title The title for the modal header.
     * @param {string} bodyHtml The HTML string content for the modal body.
     */
    function openModal(title, bodyHtml) {
        if (modalTitle) modalTitle.textContent = title;
        if (modalBodyContent) modalBodyContent.innerHTML = bodyHtml;
        if (genericModal) genericModal.style.display = 'block';
        if (modalMessage) modalMessage.style.display = 'none'; // Clear previous modal messages
    }

    /**
     * Closes the generic modal and clears its content.
     */
    function closeModal() {
        if (genericModal) genericModal.style.display = 'none';
        if (modalTitle) modalTitle.textContent = '';
        if (modalBodyContent) modalBodyContent.innerHTML = '';
        if (modalMessage) modalMessage.style.display = 'none';
    }

    // Attach modal close listeners once
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    if (genericModal) {
        genericModal.addEventListener('click', (event) => {
            if (event.target === genericModal) { // Click outside modal content
                closeModal();
            }
        });
    }

    // --- 2. Data Fetching Functions ---
    // Fixed: Added missing data fetching functions

    async function fetchProducts(filters = {}) {
        try {
            let queryString = new URLSearchParams(filters).toString();
            const url = `${API_BASE_URL}/products?${queryString}`;
            console.log('Fetching products from URL:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch products');
            }
            const data = await response.json();
            currentProducts = data.content || data; // Handle both paginated and simple arrays
            return data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    async function fetchCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            currentCategories = await response.json();
            return currentCategories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    async function fetchCart() {
        try {
        const response = await authenticatedFetch(`${API_BASE_URL}/cart`);
        const data = await response.json();
        console.log("Fetched cart data:", data); // 👈 Add this for debugging
        currentCartItems = data.cartItems || data; // Adjust depending on actual shape
        return currentCartItems;
    } catch (error) {
        console.error('Error fetching cart:', error);
        throw error;
    }
    }

    async function fetchOrders() {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/orders`);
            if (!response.ok) throw new Error('Failed to fetch orders');
            currentOrders = await response.json();
            return currentOrders;
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    }

    async function fetchAddresses() {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/addresses`);
            if (!response.ok) throw new Error('Failed to fetch addresses');
            currentAddresses = await response.json();
            return currentAddresses;
        } catch (error) {
            console.error('Error fetching addresses:', error);
            throw error;
        }
    }

    // --- 3. Core API Call Functions ---
    // These functions handle user interactions that involve backend API calls.

    async function handleLogin(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('jwtToken', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('roles', JSON.stringify(data.roles));
                showAppMessage('Login successful!', 'success');
                window.location.hash = 'products'; // Redirect to products page via hash
            } else {
                showAppMessage(data.message || 'Login failed! Check credentials.', 'danger');
                const loginMessage = document.getElementById('login-message');
                if (loginMessage) {
                    loginMessage.textContent = data.message || 'Login failed! Check credentials.';
                    loginMessage.className = 'alert alert-danger';
                    loginMessage.style.display = 'block';
                }
            }
        } catch (error) {
            showAppMessage(`An error occurred during login: ${error.message}`, 'danger');
            const loginMessage = document.getElementById('login-message');
            if (loginMessage) {
                loginMessage.textContent = `An error occurred: ${error.message}`;
                loginMessage.className = 'alert alert-danger';
                loginMessage.style.display = 'block';
            }
        }
    }

    async function handleRegister(username, email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage('Registration successful! You can now login.', 'success');
                window.location.hash = 'login'; // Redirect to login via hash
            } else {
                showAppMessage(data.message || 'Registration failed! Username/email might be in use.', 'danger');
                const registerMessage = document.getElementById('register-message');
                if (registerMessage) {
                    registerMessage.textContent = data.message || 'Registration failed! Username/email might be in use.';
                    registerMessage.className = 'alert alert-danger';
                    registerMessage.style.display = 'block';
                }
            }
        } catch (error) {
            showAppMessage(`An error occurred during registration: ${error.message}`, 'danger');
            const registerMessage = document.getElementById('register-message');
            if (registerMessage) {
                registerMessage.textContent = `An error occurred: ${error.message}`;
                registerMessage.className = 'alert alert-danger';
                registerMessage.style.display = 'block';
            }
        }
    }

    async function handleAddToCart(productId, quantity = 1) {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/cart/add`, {
                method: 'POST',
                body: JSON.stringify({ productId, quantity }),
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage(`"${data.product.name}" added to cart!`, 'success');
                fetchCart(); // Refresh cart data
            } else {
                showAppMessage(data.message || 'Failed to add to cart.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error adding to cart: ${error.message}`, 'danger');
        }
    }

    async function handleUpdateCartItem(productId, newQuantity) {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/cart/update`, {
                method: 'PUT',
                body: JSON.stringify({ productId, quantity: newQuantity }),
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage(`Cart updated for "${data.product.name}".`, 'success');
                fetchCart(); // Re-fetch cart to update display
            } else {
                showAppMessage(data.message || 'Failed to update cart.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error updating cart: ${error.message}`, 'danger');
        }
    }

    async function handleRemoveFromCart(productId) {
        if (!window.confirm('Are you sure you want to remove this item from your cart?')) return;
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/cart/remove/${productId}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage(data.message || 'Item removed from cart.', 'success');
                await fetchCart(); //  refresh cart data
            renderCartPageContent(); //  now refresh UI
            } else {
                showAppMessage(data.message || 'Failed to remove from cart.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error removing from cart: ${error.message}`, 'danger');
        }
    }

    async function handleAddAddress(address) {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/addresses`, {
                method: 'POST',
                body: JSON.stringify(address),
            });
            if (!response.ok) throw new Error('Failed to add address');
            showAppMessage('Address added successfully!', 'success');
            fetchAddresses(); // Refresh addresses
            return true;
        } catch (error) {
            showAppMessage(`Error adding address: ${error.message}`, 'danger');
            return false;
        }
    }

    async function handlePlaceOrder(addressId) {
        try {
            // Step 1: Create dummy payment intent
            const piResponse = await authenticatedFetch(`${API_BASE_URL}/checkout/create-payment-intent`, {
                method: 'POST',
                body: JSON.stringify({ addressId }),
            });
            if (!piResponse.ok) throw new Error('Failed to create payment intent');
            const { paymentIntentId } = await piResponse.json(); // Get dummy ID

            // Step 2: Confirm order with dummy ID
            const confirmResponse = await authenticatedFetch(`${API_BASE_URL}/checkout/confirm-order`, {
                method: 'POST',
                body: JSON.stringify({ paymentIntentId }),
            });
            const data = await confirmResponse.json();
            if (confirmResponse.ok) {
                showAppMessage(data.message || 'Order placed successfully!', 'success');
                fetchCart(); // Clear local cart state
                window.location.hash = 'order-history'; // Redirect via hash
            } else {
                showAppMessage(data.message || 'Order placement failed.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error placing order: ${error.message}`, 'danger');
        }
    }

    async function handleUpdateProfile(profileData) {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                body: JSON.stringify(profileData),
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage(data.message || 'Profile updated successfully!', 'success');
                // Update local storage username if it changed
                if (profileData.username) localStorage.setItem('username', profileData.username);
                // In plain JS, we just rely on re-fetching data for the page
                window.location.hash = 'user-dashboard'; // Refresh dashboard via hash
            } else {
                showAppMessage(data.message || 'Failed to update profile.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error updating profile: ${error.message}`, 'danger');
        }
    }

    async function handleAdminAddProduct(productData) {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/products`, {
                method: 'POST',
                body: JSON.stringify(productData),
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage('Product added successfully!', 'success');
                fetchProducts(); // Refresh product list
                window.location.hash = 'admin-products'; // Redirect via hash
            } else {
                showAppMessage(data.message || 'Failed to add product.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error adding product: ${error.message}`, 'danger');
        }
    }

    async function handleAdminUpdateProduct(productId, productData) {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData),
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage('Product updated successfully!', 'success');
                fetchProducts();
                closeModal(); // Close modal after update
                window.location.hash = 'admin-products'; // Redirect via hash
            } else {
                showAppMessage(data.message || 'Failed to update product.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error updating product: ${error.message}`, 'danger');
        }
    }

    async function handleAdminDeleteProduct(productId) {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/products/${productId}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage(data.message || 'Product deleted successfully!', 'success');
                fetchProducts();
                window.location.hash = 'admin-products'; // Redirect via hash
            } else {
                showAppMessage(data.message || 'Failed to delete product.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error deleting product: ${error.message}`, 'danger');
        }
    }

    async function handleAdminUpdateOrderStatus(orderId, newStatus) {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await response.json();
            if (response.ok) {
                showAppMessage(`Order #${orderId} status updated to ${newStatus}.`, 'success');
                fetchOrders(); // Refresh orders list
                window.location.hash = 'admin-orders'; // Redirect via hash
            } else {
                showAppMessage(data.message || 'Failed to update order status.', 'danger');
            }
        } catch (error) {
            showAppMessage(`Error updating order status: ${error.message}`, 'danger');
        }
    }

    // --- Gemini API Integration: Product Description Enhancer ---
    let isGeneratingDescription = false; // State for LLM loading
    async function generateProductDescription(productName, currentDescription, targetTextareaId) {
        if (isGeneratingDescription) {
            showModalMessage('Description generation already in progress...', 'warning');
            return;
        }
        isGeneratingDescription = true; // Set loading state
        const generateButton = document.getElementById('generate-description-btn');
        const originalButtonText = generateButton ? generateButton.textContent : 'Generate with AI';

        if(generateButton) {
            generateButton.textContent = 'Generating...';
            generateButton.disabled = true;
        }
        
        showModalMessage('Generating description with AI...', 'info');

        try {
            let prompt = `Generate a compelling and detailed product description for a product named "${productName}".`;
            if (currentDescription && currentDescription.trim() !== '') {
                prompt += ` Incorporate the following key details: "${currentDescription.trim()}".`;
            }
            prompt += ` Make it engaging, highlight key features, and use a friendly, persuasive tone. Keep it concise, around 100-150 words.`;

            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiKey = "YOUR_GEMINI_API_KEY"; // Replace with actual API key
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            let response;
            let retries = 0;
            const maxRetries = 5;
            while (retries < maxRetries) {
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) break; // Success, break loop
                    if (response.status === 429) { // Too Many Requests
                        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
                        console.warn(`Gemini API rate limit hit. Retrying in ${delay / 1000}s...`);
                        await new Promise(res => setTimeout(res, delay));
                        retries++;
                    } else {
                        throw new Error(`API error: ${response.status} ${response.statusText}`);
                    }
                } catch (err) {
                    if (retries === maxRetries - 1) throw err; // Last retry, rethrow
                    const delay = Math.pow(2, retries) * 1000;
                    console.warn(`Gemini API call failed. Retrying in ${delay / 1000}s... Error: ${err.message}`);
                    await new Promise(res => setTimeout(res, delay));
                    retries++;
                }
            }

            if (!response || !response.ok) throw new Error('Failed to get response from Gemini API after retries.');

            const result = await response.json();
            const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate description.";

            // Update the specific textarea in the DOM
            const descriptionElement = document.getElementById(targetTextareaId);
            if (descriptionElement) {
                descriptionElement.value = generatedText;
            }
            showModalMessage('Description generated successfully!', 'success');

        } catch (error) {
            console.error('Gemini API Error:', error);
            showModalMessage(`Failed to generate description: ${error.message}`, 'danger');
        } finally {
            isGeneratingDescription = false; // Reset loading state
            if(generateButton) {
                generateButton.textContent = originalButtonText;
                generateButton.disabled = false;
            }
        }
    }

    // --- 4. Page Content Renderers (These generate HTML and attach listeners) ---
    // They populate specific content divs defined in index.html

    async function renderProductsPageContent(filters = {}) {

        console.log('renderProductsPageContent called with filters:', filters); // Diagnostic log
        const productGrid = document.getElementById('products-page'); // Target the whole section
        if (!productGrid) { console.error('Products page section not found!'); return; }
        // Clear previous content and show loading for the whole section
        productGrid.innerHTML = `
            <div class="products-header">
                <h2>Our Products</h2>
                <div class="filters">
                    <input type="text" id="search-input" placeholder="Search products...">
                    <select id="category-filter">
                        <option value="">All Categories</option>
                        <!-- Categories dynamically loaded here by JS -->
                    </select>
                    <input type="number" id="min-price" placeholder="Min Price">
                    <input type="number" id="max-price" placeholder="Max Price">
                    <input type="number" id="min-rating" placeholder="Min Rating (0-5)" min="0" max="5" step="0.1">
                    <button class="btn btn-secondary" id="apply-filters">Apply Filters</button>
                </div>
            </div>
            <div class="canvas-container">
                <canvas id="productCanvas"></canvas>
                <div id="canvas-loading" class="loading-overlay">
                    <div class="loading-spinner"></div>
                    <p>Loading 3D models...</p>
                </div>
                <div id="canvas-info" class="canvas-info-box">
                    <h3 id="canvas-product-name"></h3>
                    <p id="canvas-product-price"></p>
                    <button id="canvas-add-to-cart" class="btn btn-primary" style="display:none;">Add to Cart</button>
                    <button id="canvas-view-details" class="btn btn-secondary" style="display:none;">Details</button>
                </div>
            </div>
            <div class="pagination">
                <button class="btn" id="prev-page">Previous</button>
                <span>Page <span id="current-page-num">1</span> of <span id="total-pages-num">1</span></span>
                <button class="btn" id="next-page">Next</button>
            </div>
        `;  

        try {
            const data = await fetchProducts(filters);
            
            // Fetch and update categories for filter
            await fetchCategories(); // Ensures currentCategories is up-to-date
            const categoryFilterSelect = document.getElementById('category-filter');
            if(categoryFilterSelect) {
                let categoryOptionsHtml = currentCategories.map(cat =>
                    `<option value="${cat.name}" ${filters.categoryName === cat.name ? 'selected' : ''}>${cat.name}</option>`
                ).join('');
                categoryFilterSelect.innerHTML = `<option value="">All Categories</option>${categoryOptionsHtml}`;
                if(filters.categoryName) categoryFilterSelect.value = filters.categoryName;
            }
            // Set filter input values
            if(document.getElementById('search-input')) document.getElementById('search-input').value = filters.searchKeyword || '';
            if(document.getElementById('min-price')) document.getElementById('min-price').value = filters.minPrice || '';
            if(document.getElementById('max-price')) document.getElementById('max-price').value = filters.maxPrice || '';
            if(document.getElementById('min-rating')) document.getElementById('min-rating').value = filters.minRating || '';

            // Pagination updates (fixed to handle both paginated and simple array responses)
            const currentPageNumSpan = document.getElementById('current-page-num');
            const totalPagesNumSpan = document.getElementById('total-pages-num');
            const prevPageBtn = document.getElementById('prev-page');
            const nextPageBtn = document.getElementById('next-page');

            if (data.number !== undefined) { // Paginated response
                if(currentPageNumSpan) currentPageNumSpan.textContent = data.number + 1;
                if(totalPagesNumSpan) totalPagesNumSpan.textContent = data.totalPages;
                if(prevPageBtn) {
                    prevPageBtn.disabled = data.first;
                    prevPageBtn.dataset.page = data.number - 1;
                }
                if(nextPageBtn) {
                    nextPageBtn.disabled = data.last;
                    nextPageBtn.dataset.page = data.number + 1;
                }
            } else { // Simple array response
                if(currentPageNumSpan) currentPageNumSpan.textContent = '1';
                if(totalPagesNumSpan) totalPagesNumSpan.textContent = '1';
                if(prevPageBtn) prevPageBtn.disabled = true;
                if(nextPageBtn) nextPageBtn.disabled = true;
            }

            // Initialize Three.js and render the first product
            initThreeJsCanvas(); // Initialize canvas

            document.getElementById('current-page-num').textContent = currentCanvasIndex + 1;
            document.getElementById('total-pages-num').textContent = currentProducts.length;

            attachProductPageListeners(filters); // Attach listeners after content is rendered


            document.getElementById('next-page').addEventListener('click', () => {
                if (currentCanvasIndex < currentProducts.length - 1) {
                    currentCanvasIndex++;
                    initThreeJsCanvas();
                }
            });
            
            document.getElementById('prev-page').addEventListener('click', () => {
                if (currentCanvasIndex > 0) {
                    currentCanvasIndex--;
                    initThreeJsCanvas();
                }
            });
            
            console.log('Products page rendered and listeners attached.'); // Diagnostic log
        } catch (error) {
            console.error('Error fetching or rendering products:', error); // Diagnostic log
            showAppMessage('Failed to load products. Please try again later. Error: ' + error.message, 'danger');
            productGrid.innerHTML = `<p class="alert alert-danger text-center">Failed to load products. Error: ${error.message}</p>`; // Update grid with error
        }
    }

    // Renders the Product Details Page (as a modal)
    async function renderProductDetailsPage(productId) {
        console.log('renderProductDetailsPage called for ID:', productId); // Diagnostic log
        // Fetch product details if not already loaded or if it's a direct link
        let product = currentProducts.find(p => p.id === productId);
        if (!product) {
            try {
                const response = await fetch(`${API_BASE_URL}/products/${productId}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Product not found.');
                }
                product = await response.json();
            } catch (error) {
                showAppMessage('Failed to load product details. Error: ' + error.message, 'danger');
                window.location.hash = 'products'; // Redirect back to products
                return;
            }
        }
        currentSelectedProduct = product; // Update global state for modal content

        const productDetailsHtml = `
            <div class="product-details-modal-content">
                <h2>${product.name}</h2>
                <div class="details-grid">
                    <div class="image-section">
                        <img src="${product.imageUrl || 'https://via.placeholder.com/300/cccccc/333333?text=No+Image'}" alt="${product.name}">
                    </div>
                    <div class="info-section">
                        <p class="details-price">${product.price.toFixed(2)}</p>
                        <p class="product-rating">Rating: ${product.averageRating ? product.averageRating.toFixed(1) : 'N/A'} <i class="fas fa-star"></i></p>
                        <p class="details-description">${product.description}</p>
                        <p class="details-stock">Stock: ${product.stockQuantity > 0 ? product.stockQuantity : 'Out of Stock'}</p>

                        <div class="quantity-selector">
                            <label for="quantity-modal">Quantity:</label>
                            <input type="number" id="quantity-modal" value="1" min="1" max="${product.stockQuantity}" ${product.stockQuantity === 0 ? 'disabled' : ''}>
                        </div>
                        <button class="btn add-to-cart-modal-btn" data-product-id="${product.id}" ${product.stockQuantity === 0 ? 'disabled' : ''}>Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
        openModal(`Product Details: ${product.name}`, productDetailsHtml);
        
        // Attach listeners for modal buttons
        const addToCartModalBtn = document.querySelector('#generic-modal .add-to-cart-modal-btn');
        if(addToCartModalBtn) {
            addToCartModalBtn.onclick = async () => {
                const qty = parseInt(document.getElementById('quantity-modal').value);
                if (!isNaN(qty) && qty > 0) {
                    await handleAddToCart(product.id, qty);
                    closeModal(); // Close modal after adding to cart
                } else {
                    showModalMessage('Please enter a valid quantity.', 'danger');
                }
            };
        }
        console.log('Product details modal rendered.'); // Diagnostic log
    }

    // Renders the Shopping Cart Page
    async function renderCartPageContent() {
        console.log('renderCartPageContent called.'); // Diagnostic log
        const cartContent = document.getElementById('cart-content');
        if (!cartContent) { console.error('Cart content element not found!'); return; }
        cartContent.innerHTML = `<div class="loading-spinner"></div><p class="text-center mt-4">Loading cart...</p>`; // Show loading

        try {
            await fetchCart(); // Fetch cart data
            
            let cartHtml = `<h2>Shopping Cart</h2>`;

            if (!currentCartItems || currentCartItems.length === 0) {
                cartHtml += '<p class="text-center">Your cart is empty.</p>';
            } else {
                let totalAmount = 0;
                cartHtml += `
                    <div class="cart-items">
                        ${currentCartItems.map(item => {
                            const itemTotal = item.quantity * item.priceAtAddition;
                            totalAmount += itemTotal;
                            return `
                                <div class="cart-item" data-product-id="${item.product.id}">
                                    <img src="${item.product.imageUrl || 'https://via.placeholder.com/80/cccccc/333333?text=No+Image'}" alt="${item.product.name}">
                                    <div class="item-info">
                                        <h4>${item.product.name}</h4>
                                        <p>Price: ${item.priceAtAddition.toFixed(2)}</p>
                                        <div class="item-quantity">
                                            <label for="qty-${item.product.id}">Qty:</label>
                                            <input
                                                type="number"
                                                id="qty-${item.product.id}"
                                                value="${item.quantity}"
                                                min="1"
                                                max="${item.product.stockQuantity}"
                                                data-product-id="${item.product.id}"
                                                class="cart-qty-input"
                                            >
                                        </div>
                                    </div>
                                    <div class="item-actions">
                                        <p class="item-total">Total: ${itemTotal.toFixed(2)}</p>
                                        <button class="btn btn-danger remove-from-cart-btn" data-product-id="${item.product.id}">Remove</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="cart-summary">
                        <h3>Cart Total: ${totalAmount.toFixed(2)}</h3>
                        <button class="btn" id="proceed-to-checkout-btn">Proceed to Checkout</button>
                    </div>
                `;
            }
            cartContent.innerHTML = cartHtml;
            attachCartPageListeners(); // Attach listeners after content is rendered
            console.log('Cart page rendered and listeners attached.'); // Diagnostic log
        } catch (error) {
            console.error('Error rendering cart page:', error);
            cartContent.innerHTML = `<p class="alert alert-danger text-center">Failed to load cart. Error: ${error.message}</p>`;
        }
    }

    // Fixed: Removed useCallback wrapper and made it a regular async function
    async function renderCheckoutPageContent() {
        console.log('renderCheckoutPageContent called.'); // Diagnostic log
        const checkoutSummarySection = document.getElementById('checkout-summary-section');
        if (!checkoutSummarySection) { console.error('Checkout summary section not found!'); return; }
        checkoutSummarySection.innerHTML = `<div class="loading-spinner"></div><p class="text-center mt-4">Loading checkout summary...</p>`; // Show loading

        try {
            // Fetch cart and addresses data
            await Promise.all([fetchCart(), fetchAddresses()]);

            if (!currentCartItems || currentCartItems.length === 0) {
                showAppMessage('Your cart is empty. Please add products before checking out.', 'warning');
                window.location.hash = 'products'; // Redirect to products page
                return;
            }

            let addressOptionsHtml = currentAddresses.length > 0 ?
                currentAddresses.map(addr => `
                    <option value="${addr.id}">
                        ${addr.street}, ${addr.city}, ${addr.state}, ${addr.postalCode}, ${addr.country}
                    </option>
                `).join('') :
                '<option value="">No saved addresses. Please add one below.</option>';

            const totalAmount = currentCartItems.reduce((sum, item) => sum + (item.quantity * item.priceAtAddition), 0);

            let checkoutHtml = `
                <h3>Order Summary</h3>
                <div class="order-summary-items">
                    ${currentCartItems.map(item => `
                        <div class="summary-item">
                            <span>${item.product.name} x ${item.quantity}</span>
                            <span>${(item.quantity * item.priceAtAddition).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <p class="order-total"><strong>Total: ${totalAmount.toFixed(2)}</strong></p>

                <h3>Shipping Address</h3>
                <form id="shipping-address-form">
                    <div class="form-group">
                        <label for="address-select">Select Existing Address:</label>
                        <select id="address-select" class="form-control">
                            ${addressOptionsHtml}
                        </select>
                        <button type="button" class="btn btn-secondary mt-2" id="toggle-new-address-form">Add New Address</button>
                    </div>

                    <div id="new-address-fields" style="display:none;">
                        <h4>Or Add a New Address:</h4>
                        <div class="form-group"><label for="street">Street:</label><input type="text" id="street" name="street" /></div>
                        <div class="form-group"><label for="city">City:</label><input type="text" id="city" name="city" /></div>
                        <div class="form-group"><label for="state">State:</label><input type="text" id="state" name="state" /></div>
                        <div class="form-group"><label for="postalCode">Postal Code:</label><input type="text" id="postalCode" name="postalCode" /></div>
                        <div class="form-group"><label for="country">Country:</label><input type="text" id="country" name="country" /></div>
                        <button type="button" class="btn btn-primary" id="save-new-address">Save New Address</button>
                    </div>
                </form>

                <h3>Payment Information (Dummy Gateway)</h3>
                <p>No real payment details needed for this dummy gateway. Click "Place Order" to confirm.</p>
                <button id="submit-payment-btn" class="btn mt-3">Place Order</button>
            `;
            checkoutSummarySection.innerHTML = checkoutHtml;
            attachCheckoutListeners(); // Attach listeners
            console.log('Checkout page rendered and listeners attached.'); // Diagnostic log
        } catch (error) {
            console.error('Error rendering checkout page:', error);
            checkoutSummarySection.innerHTML = `<p class="alert alert-danger text-center">Failed to load checkout. Error: ${error.message}</p>`;
        }
    }

    // Fixed: Removed useCallback wrapper and made it a regular function
    function renderOrderHistoryPageContent() {
        const orderHistoryContent = document.getElementById('order-history-content');
        if (!orderHistoryContent) { console.error('Order history content element not found!'); return; }
        orderHistoryContent.innerHTML = `<div class="loading-spinner"></div><p class="text-center mt-4">Loading order history...</p>`; // Show loading

        let orderHistoryHtml = `<h2>Your Order History</h2>`; 
        if (!currentOrders || currentOrders.length === 0) {
            orderHistoryHtml += '<p class="text-center">You have not placed any orders yet.</p>';
        } else {
            orderHistoryHtml += `
            <div class="order-list">
            ${currentOrders.map(order => {
                // Add a check to ensure the order and its totalAmount property exist
                if (!order || order.totalAmount === undefined) {
                    console.error('Invalid order object found:', order);
                    return ''; // Skip this invalid order
                    }
                    return `
                        <div class="order-card" data-order-id="${order.id}">
                            <h3>Order ID: #${order.id}</h3>
                            <p>Date: ${new Date(order.orderDate).toLocaleDateString()}</p>
                            <p>Total: ${order.totalAmount.toFixed(2)}</p>
                            <p>Status: <span class="order-status-${order.status.toLowerCase()}">${order.status}</span></p>
                            <button class="btn btn-secondary view-order-details-btn" data-order-id="${order.id}">View Details</button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    orderHistoryContent.innerHTML = orderHistoryHtml; 
    attachOrderHistoryListeners(); // Attach listeners [cite: 682]
    console.log('Order history page rendered and listeners attached.'); // Diagnostic log [cite: 683]
}

    // Fixed: Removed useCallback wrapper and made it a regular function
    function renderOrderDetailsPageContent() {
        const orderDetailsContent = document.getElementById('order-details-content');
        if (!orderDetailsContent) { console.error('Order details content element not found!'); return; }
        if (!currentSelectedOrder) {
            orderDetailsContent.innerHTML = '<p class="text-center">No order selected.</p>';
            return;
        }
        
        let orderDetailsHtml = `
            <button class="btn btn-secondary back-to-orders-btn"><i class="fas fa-arrow-left"></i> Back to Orders</button>
            <h2>Order Details - #${currentSelectedOrder.id}</h2>
            <p><strong>Order Date:</strong> ${new Date(currentSelectedOrder.orderDate).toLocaleDateString()} ${new Date(currentSelectedOrder.orderDate).toLocaleTimeString()}</p>
            <p><strong>Total Amount:</strong> ${currentSelectedOrder.totalAmount.toFixed(2)}</p>
            <p><strong>Status:</strong> <span class="order-status-${currentSelectedOrder.status.toLowerCase()}">${currentSelectedOrder.status}</span></p>

            <h3>Shipping Address</h3>
            <div class="address-details">
                <p>${currentSelectedOrder.shippingAddress.street}</p>
                <p>${currentSelectedOrder.shippingAddress.city}, ${currentSelectedOrder.shippingAddress.state} ${currentSelectedOrder.shippingAddress.postalCode}</p>
                <p>${currentSelectedOrder.shippingAddress.country}</p>
            </div>

            <h3>Items Ordered</h3>
            <div class="order-items-list">
                ${currentSelectedOrder.orderItems.map(item => `
                    <div class="modal-order-item-detail">
                        <img src="${item.product.imageUrl || 'https://via.placeholder.com/60/cccccc/333333?text=No+Image'}" alt="${item.product.name}">
                        <div>
                            <h5>${item.product.name}</h5>
                            <p>Qty: ${item.quantity} | Price: ${item.priceAtOrder.toFixed(2)}</p>
                            <p>Item Total: ${(item.quantity * item.priceAtOrder).toFixed(2)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        orderDetailsContent.innerHTML = orderDetailsHtml;
        attachOrderDetailsListeners(); // Attach listeners
        console.log('Order details page rendered and listeners attached.'); // Diagnostic log
    }

    // Fixed: Removed useCallback wrapper and made it a regular async function
    async function renderUserDashboardPageContent() {
        const dashboardContent = document.getElementById('dashboard-content');
        if (!dashboardContent) { console.error('Dashboard content element not found!'); return; }
        dashboardContent.innerHTML = `<div class="loading-spinner"></div><p class="text-center mt-4">Loading dashboard...</p>`; // Show loading

        const loggedInUser = localStorage.getItem('username'); // Get username from local storage
        if (!loggedInUser) {
            showAppMessage('Please login to view your dashboard.', 'danger');
            window.location.hash = 'login'; // show login page
            return;
        }

        let profileData = null;
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/users/profile`);
            profileData = await response.json();
            console.log('User profile data parsed:', profileData);
        } catch (error) {
            showAppMessage(`Error fetching user profile: ${error.message}`, 'danger');
            dashboardContent.innerHTML = `<p class="alert alert-danger text-center">Failed to load dashboard. Error: ${error.message}</p>`;
            return;
        }

        let dashboardHtml = `
            <h3>Profile Information</h3>
            <form id="profile-update-form" class="form-container">
                <div class="form-group">
                    <label for="profile-username">Username:</label>
                    <input type="text" id="profile-username" name="username" value="${profileData.username}" required>
                </div>
                <div class="form-group">
                    <label for="profile-email">Email:</label>
                    <input type="email" id="profile-email" name="email" value="${profileData.email}" required>
                </div>
                <h4>Change Password (Optional)</h4>
                <div class="form-group">
                    <label for="current-password">Current Password:</label>
                    <input type="password" id="current-password" name="currentPassword">
                </div>
                <div class="form-group">
                    <label for="new-password">New Password:</label>
                    <input type="password" id="new-password" name="newPassword">
                </div>
                <button type="submit" class="btn">Update Profile</button>
            </form>

            <h3 class="mt-3">Quick Links</h3>
            <ul>
                <li><button class="btn btn-secondary" onclick="window.location.hash = 'order-history';">View Order History</button></li>
            </ul>
        `;
        dashboardContent.innerHTML = dashboardHtml;
        attachDashboardListeners(); // Attach listeners
        console.log('User dashboard page rendered and listeners attached.'); // Diagnostic log
    }

    // Fixed: Removed useCallback wrapper and made it a regular function
    function renderAdminDashboardPageContent() {
        const adminContentArea = document.getElementById('admin-content-area');
        if (!adminContentArea) { console.error('Admin content area not found!'); return; }
        if (!isAdmin()) {
            showAppMessage('Access Denied: You do not have administrator privileges.', 'danger');
            window.location.hash = 'home'; // show home page
            return;
        }
        adminContentArea.innerHTML = `<div class="loading-spinner"></div><p class="text-center mt-4">Loading admin dashboard...</p>`; // Show loading

        let adminHtml = `
            <h2>Admin Dashboard</h2>
            <div class="admin-panel-nav">
                <button class="btn admin-nav-btn" data-admin-route="admin-products">Manage Products</button>
                <button class="btn admin-nav-btn" data-admin-route="admin-orders">Manage Orders</button>
            </div>
            <div id="admin-sub-content" class="mt-3">
                <p class="text-center">Select a management section from above.</p>
            </div>
        `;
        adminContentArea.innerHTML = adminHtml;
        attachAdminDashboardListeners(); // Attach listeners
        console.log('Admin dashboard page rendered and listeners attached.'); // Diagnostic log
    }

    // Fixed: Removed useCallback wrapper and made it a regular async function
    async function renderAdminProductManagementContent() {
        const adminProductManagementContent = document.getElementById('admin-products-page');
        if (!adminProductManagementContent) { console.error('Admin products content element not found!'); return; }
        if (!isAdmin()) {
            showAppMessage('Access Denied: You do not have administrator privileges.', 'danger');
            window.location.hash = 'home'; // show home page
            return;
        }
        adminProductManagementContent.innerHTML = `<div class="loading-spinner"></div><p class="text-center mt-4">Loading product management...</p>`; // Show loading

        try {
            // Fetch products and categories data
            await Promise.all([fetchProducts(), fetchCategories()]);

            let categoryOptionsHtml = currentCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');

            let productManageHtml = `
                <h3>Manage Products</h3>
                <div id="admin-product-message" class="alert" style="display:none;"></div>
                <h4>Add New Product</h4>
                <form id="add-product-form" class="form-container">
                    <div class="form-group"><label for="add-name">Name:</label><input type="text" id="add-name" required></div>
                    <div class="form-group">
                        <label for="add-description">Description:</label>
                        <textarea id="add-description"></textarea>
                        <button type="button" id="generate-description-btn" class="btn btn-secondary btn-small" style="margin-top: 5px;"><i class="fas fa-magic"></i> Generate with AI</button>
                    </div>
                    <div class="form-group"><label for="add-price">Price:</label><input type="number" id="add-price" step="0.01" min="0" required></div>
                    <div class="form-group"><label for="add-imageUrl">Image URL:</label><input type="text" id="add-imageUrl"></div>
                    <div class="form-group"><label for="add-stockQuantity">Stock Quantity:</label><input type="number" id="add-stockQuantity" min="0" required></div>
                    <div class="form-group">
                        <label for="add-categoryId">Category:</label>
                        <select id="add-categoryId" required>${categoryOptionsHtml}</select>
                    </div>
                    <button type="submit" class="btn">Add Product</button>
                </form>

                <h4>Existing Products</h4>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="admin-product-list">
                        ${currentProducts.length > 0 ? (
                            currentProducts.map(product => `
                                <tr data-product-id="${product.id}">
                                    <td>${product.id}</td>
                                    <td>${product.name}</td>
                                    <td>${product.price.toFixed(2)}</td>
                                    <td>${product.stockQuantity}</td>
                                    <td>${product.category ? product.category.name : 'N/A'}</td>
                                    <td>
                                        <button class="btn btn-secondary edit-product-btn" data-id="${product.id}"><i class="fas fa-edit"></i></button>
                                        <button class="btn btn-danger delete-product-btn" data-id="${product.id}"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `).join('')
                        ) : '<tr><td colspan="6" class="text-center">No products found</td></tr>'}
                    </tbody>
                </table>
            `;
            adminProductManagementContent.innerHTML = productManageHtml;
            attachAdminProductListeners(currentCategories); // Pass categories for edit modal
            console.log('Admin product management rendered and listeners attached.'); // Diagnostic log
        } catch (error) {
            console.error('Error rendering admin product management:', error);
            adminProductManagementContent.innerHTML = `<p class="alert alert-danger text-center">Failed to load product management. Error: ${error.message}</p>`;
        }
    }

    // Fixed: Removed useCallback wrapper and made it a regular async function
    async function renderAdminOrderManagementContent() {
        const adminOrderManagementContent = document.getElementById('admin-orders-page');
        if (!adminOrderManagementContent) { console.error('Admin orders content element not found!'); return; }
        if (!isAdmin()) {
            showAppMessage('Access Denied: You do not have administrator privileges.', 'danger');
            window.location.hash = 'home'; // show home page
            return;
        }
        adminOrderManagementContent.innerHTML = `<div class="loading-spinner"></div><p class="text-center mt-4">Loading order management...</p>`; // Show loading

        try {
            // Fetch orders data
            await fetchOrders();

            const orderStatusOptions = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED'];

            let orderManageHtml = `
                <h3>Manage Orders</h3>
                <div id="admin-order-message" class="alert" style="display:none;"></div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Order ID</th><th>User</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="admin-order-list">
                        ${currentOrders.length > 0 ? (
                            currentOrders.map(order => `
                                <tr key="${order.id}">
                                    <td>#${order.id}</td>
                                    <td>${order.user.username}</td>
                                    console.log("Order in admin:", order);
                                    <td>${order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'}</td>
                                    <td>
                                        <select
                                            class="order-status-select"
                                            data-order-id="${order.id}"
                                        >
                                            ${orderStatusOptions.map(status => `
                                                <option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>
                                            `).join('')}
                                        </select>
                                    </td>
                                    <td>${new Date(order.orderDate).toLocaleDateString()}</td>
                                    <td>
                                        <button class="btn btn-secondary view-admin-order-details-btn" data-id="${order.id}"><i class="fas fa-box"></i></button>
                                    </td>
                                </tr>
                            `).join('')
                        ) : '<tr><td colspan="6" class="text-center">No orders found</td></tr>'}
                    </tbody>
                </table>
            `;
            adminOrderManagementContent.innerHTML = orderManageHtml;
            attachAdminOrderListeners(); // Attach listeners
            console.log('Admin order management rendered and listeners attached.'); // Diagnostic log
        } catch (error) {
            console.error('Error rendering admin order management:', error);
            adminOrderManagementContent.innerHTML = `<p class="alert alert-danger text-center">Failed to load order management. Error: ${error.message}</p>`;
        }
    }

    // --- 5. Event Listener Attachment Functions (called AFTER HTML is inserted) ---
    // These functions attach event listeners to dynamically loaded HTML.

    function attachFormHandlers() {
        console.log('attachFormHandlers called.'); // Diagnostic log
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Login form submitted.'); // Diagnostic log
                const username = e.target.username.value;
                const password = e.target.password.value;
                await handleLogin(username, password);
            });
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Register form submitted.'); // Diagnostic log
                const username = e.target['reg-username'].value;
                const email = e.target['reg-email'].value;
                const password = e.target['reg-password'].value;
                await handleRegister(username, email, password);
            });
        }
    }

    // Three.js setup and product rendering
    let threeScene = null;
    let threeCamera = null;
    let threeRenderer = null;
    let threeControls = null;
    let threeProductMesh = null;
    let threeProductIndex = 0; // Index of the product currently displayed on canvas

    // Add this after all event listeners or at the end of main.js

function showProductInCanvas(product) {
    const container = document.querySelector(".canvas-container");
    container.style.display = "block";

    // Set product info
    document.getElementById("canvas-product-name").textContent = product.name;
    document.getElementById("canvas-product-price").textContent = "Price: ₹" + product.price;

    // Hide 3D canvas (if still there)
    const canvasEl = document.getElementById("productCanvas");
    if (canvasEl) canvasEl.style.display = "none";

    // Show image
    const imageEl = document.getElementById("canvas-product-image");
    imageEl.src = product.image;
    imageEl.style.display = "block";

    // Show buttons
    document.getElementById("canvas-add-to-cart").style.display = "inline-block";
    document.getElementById("canvas-view-details").style.display = "inline-block";
}
    
    function initThreeJsCanvas() {
        console.log('Initializing Three.js canvas...');
        const canvas = document.getElementById('productCanvas');
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }

        // Clear previous scene if exists
        if (threeScene) {
            threeScene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
                if (obj.texture) obj.texture.dispose();
            });
            threeScene = null;
            threeCamera = null;
            if (threeRenderer) {
                threeRenderer.dispose();
                threeRenderer.domElement = null; // Detach from DOM
                threeRenderer = null;
            }
            if (threeControls) {
                threeControls.dispose();
                threeControls = null;
            }
        }

        const scene = new THREE.Scene();
        threeScene = scene;
        scene.background = new THREE.Color(0xf0f0f0); // Light gray background

        const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.z = 2;
        threeCamera = camera;

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        threeRenderer = renderer;
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Fixed: OrbitControls is not available in this context, using basic mouse controls
        // For this demo, we'll skip orbit controls to avoid the undefined error
        // const controls = new OrbitControls(camera, renderer.domElement);
        // threeControls = controls;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 5, 5).normalize();
        scene.add(directionalLight);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            if (threeRenderer && threeCamera && threeScene) threeRenderer.render(threeScene, threeCamera);
        };
        animate();

        // Handle window resize
        const onWindowResize = () => {
            if (threeCamera && threeRenderer && canvas) {
                threeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
                threeCamera.updateProjectionMatrix();
                threeRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
            }
        };
        window.addEventListener('resize', onWindowResize);

        console.log('Three.js canvas initialized successfully.');
    }

    function initThreeJsCanvas() {
        console.log('Initializing Three.js canvas...');
        const canvas = document.getElementById('productCanvas');
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }

        // Clear previous scene if exists
        if (threeScene) {
            threeScene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
                if (obj.texture) obj.texture.dispose();
            });
            threeScene = null;
            threeCamera = null;
            if (threeRenderer) {
                threeRenderer.dispose();
                threeRenderer.domElement = null; // Detach from DOM
                threeRenderer = null;
            }
            if (threeControls) {
                threeControls.dispose();
                threeControls = null;
            }
        }

        const scene = new THREE.Scene();
        threeScene = scene;
        scene.background = new THREE.Color(0xf0f0f0); // Light gray background

        const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.z = 2;
        threeCamera = camera;

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        threeRenderer = renderer;
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Fixed: OrbitControls is not available in this context, using basic mouse controls
        // For this demo, we'll skip orbit controls to avoid the undefined error
        // const controls = new OrbitControls(camera, renderer.domElement);
        // threeControls = controls;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 5, 5).normalize();
        scene.add(directionalLight);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            if (threeRenderer && threeCamera && threeScene) threeRenderer.render(threeScene, threeCamera);
        };
        animate();

        // Handle window resize
        const onWindowResize = () => {
            if (threeCamera && threeRenderer && canvas) {
                threeCamera.aspect = canvas.clientWidth / canvas.clientHeight;
                threeCamera.updateProjectionMatrix();
                threeRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
            }
        };
        window.addEventListener('resize', onWindowResize);

        console.log('Three.js canvas initialized successfully.');
    }

    function renderProductOnCanvas(product) {
        if (!threeScene || !threeRenderer || !threeCamera) {
            console.error("Three.js not initialized, cannot render product.");
            return;
        }

        // Clear previous product mesh
        if (threeProductMesh) {
            threeScene.remove(threeProductMesh);
            if (threeProductMesh.geometry) threeProductMesh.geometry.dispose();
            if (threeProductMesh.material) {
                if (Array.isArray(threeProductMesh.material)) {
                    threeProductMesh.material.forEach(m => m.dispose());
                } else {
                    threeProductMesh.material.dispose();
                }
            }
            threeProductMesh = null;
        }

        // Show loading overlay
        const canvasLoading = document.getElementById('canvas-loading');
        if (canvasLoading) canvasLoading.style.display = 'flex';

        // Create a simple 3D model (e.g., a BoxGeometry for a product)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff }); // Random color for product
        const mesh = new THREE.Mesh(geometry, material);
        threeScene.add(mesh);
        threeProductMesh = mesh;

        // Update product info box
        const canvasProductName = document.getElementById('canvas-product-name');
        const canvasProductPrice = document.getElementById('canvas-product-price');
        const canvasAddToCartBtn = document.getElementById('canvas-add-to-cart');
        const canvasViewDetailsBtn = document.getElementById('canvas-view-details');

        if (canvasProductName) canvasProductName.textContent = product.name;
        if (canvasProductPrice) canvasProductPrice.textContent = `${product.price.toFixed(2)}`;
        
        if (canvasAddToCartBtn) {
            canvasAddToCartBtn.style.display = 'inline-block';
            canvasAddToCartBtn.disabled = product.stockQuantity === 0;
            canvasAddToCartBtn.onclick = () => handleAddToCart(product.id, 1);
        }
        if (canvasViewDetailsBtn) {
            canvasViewDetailsBtn.style.display = 'inline-block';
            canvasViewDetailsBtn.onclick = () => window.location.hash = `product-details-${product.id}`;
        }

        // Hide loading overlay
        if (canvasLoading) canvasLoading.style.display = 'none';
        console.log(`Product ${product.name} rendered on canvas.`);
    }

    function attachProductPageListeners(filters) { // filters parameter added
        console.log('attachProductPageListeners called.'); // Diagnostic log

        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.onclick = () => { // Use onclick for simpler attachment
                console.log('Apply Filters button clicked.'); // Diagnostic log
                const newFilters = {
                    searchKeyword: document.getElementById('search-input').value,
                    categoryName: document.getElementById('category-filter').value,
                    minPrice: document.getElementById('min-price').value,
                    maxPrice: document.getElementById('max-price').value,
                    minRating: document.getElementById('min-rating').value,
                    page: 0, // Reset to first page on new filter
                    size: 10, // Fixed page size for simplicity
                    sortBy: 'id',
                    sortDir: 'asc'
                };
                window.location.hash = `products`; // Update URL hash
                loadContent('products', newFilters); // Re-load products page with new filters
            };
        }

        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');

        if (prevPageBtn) {
            prevPageBtn.onclick = () => { // Use onclick
                console.log('Previous Page button clicked.'); // Diagnostic log
                const currentPage = parseInt(document.getElementById('current-page-num').textContent) - 1;
                if (currentPage >= 0) {
                    window.location.hash = `products`; // Update URL hash
                    loadContent('products', { ...filters, page: currentPage });
                }
            };
        }
        if (nextPageBtn) {
            nextPageBtn.onclick = () => { // Use onclick
                console.log('Next Page button clicked.'); // Diagnostic log
                const currentPage = parseInt(document.getElementById('current-page-num').textContent) + 1;
                const totalPages = parseInt(document.getElementById('total-pages-num').textContent);
                if (currentPage < totalPages) {
                    window.location.hash = `products`; // Update URL hash
                    loadContent('products', { ...filters, page: currentPage });
                }
            };
        }

        // Initial render of the first product on canvas if products are available
        if (currentProducts.length > 0) {
            renderProductOnCanvas(currentProducts[threeProductIndex]);
        } else {
            // Hide info box if no products
            const canvasInfo = document.getElementById('canvas-info');
            if(canvasInfo) canvasInfo.style.display = 'none';
            const canvasLoading = document.getElementById('canvas-loading');
            if (canvasLoading) canvasLoading.style.display = 'none'; // Hide loading if no products
        }
        
        // Add event listeners for canvas navigation (e.g., click to cycle products)
        const canvas = document.getElementById('productCanvas');
        if (canvas && currentProducts.length > 0) {
            canvas.onclick = () => {
                threeProductIndex = (threeProductIndex + 1) % currentProducts.length;
                renderProductOnCanvas(currentProducts[threeProductIndex]);
            };
        }
    }

    function attachCartPageListeners() {
        console.log('attachCartPageListeners called.'); // Diagnostic log
        document.querySelectorAll('.cart-qty-input').forEach(input => {
            input.onchange = async (e) => { // Use onchange
                console.log('Cart quantity input changed for product:', e.target.dataset.productId, 'to quantity:', e.target.value); // Diagnostic log
                const productId = parseInt(e.target.dataset.productId);
                const newQuantity = parseInt(e.target.value);
                if (!isNaN(newQuantity) && newQuantity >= 0) {
                    await handleUpdateCartItem(productId, newQuantity); // Await this call
                    // fetchCart() is called by handleUpdateCartItem, which will re-render
                } else {
                    e.target.value = e.target.defaultValue; // Revert to previous valid value
                }
            };
        });

        document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
        const product = {
            name: card.querySelector('h3').textContent,
            price: card.querySelector('p').textContent.replace('Price: ₹', ''),
            image: card.querySelector('img').src
        };
        showProductInCanvas(product);
    });
});


        document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
            button.onclick = async (e) => { // Use onclick
                console.log('Remove from cart button clicked for product:', e.target.dataset.productId); // Diagnostic log
                const productId = parseInt(e.target.dataset.productId);
                await handleRemoveFromCart(productId); // Await this call
                // fetchCart() is called by handleRemoveFromCart, which will re-render
            };
        });

        const proceedToCheckoutBtn = document.getElementById('proceed-to-checkout-btn');
        if (proceedToCheckoutBtn) {
            proceedToCheckoutBtn.onclick = () => { // Use onclick
                console.log('Proceed to Checkout button clicked.'); // Diagnostic log
                window.location.hash = 'checkout'; // Update URL hash
            };
        }
    }

    function attachCheckoutListeners() { // Fixed: Removed parameters since we use global variables
        console.log('attachCheckoutListeners called.'); // Diagnostic log
        const toggleNewAddressBtn = document.getElementById('toggle-new-address-form');
        const newAddressFieldsDiv = document.getElementById('new-address-fields');
        const saveNewAddressBtn = document.getElementById('save-new-address');
        const addressSelect = document.getElementById('address-select');
        const submitPaymentBtn = document.getElementById('submit-payment-btn');

        // Handle adding new address
        if (toggleNewAddressBtn) {
            toggleNewAddressBtn.onclick = () => { // Use onclick
                console.log('Toggle New Address Form button clicked.'); // Diagnostic log
                const isHidden = newAddressFieldsDiv.style.display === 'none';
                newAddressFieldsDiv.style.display = isHidden ? 'block' : 'none';
                toggleNewAddressBtn.textContent = isHidden ? 'Hide New Address Form' : 'Add New Address';
            };
        }

        if (saveNewAddressBtn) {
            saveNewAddressBtn.onclick = async () => { // Use onclick
                console.log('Save New Address button clicked.'); // Diagnostic log
                const newAddress = {
                    street: document.getElementById('street').value,
                    city: document.getElementById('city').value,
                    state: document.getElementById('state').value,
                    postalCode: document.getElementById('postalCode').value,
                    country: document.getElementById('country').value,
                };

                // Basic validation
                if (!newAddress.street || !newAddress.city || !newAddress.postalCode || !newAddress.country) {
                    showAppMessage('Please fill all required address fields.', 'danger');
                    return;
                }

                const success = await handleAddAddress(newAddress);
                if (success) {
                    // Re-render checkout to update address list
                    renderCheckoutPageContent();
                }
            };
        }

        // Initial Address Selection
        let selectedAddressId = null;
        if (currentAddresses && currentAddresses.length > 0) {
            selectedAddressId = currentAddresses[0].id; // Select first by default
            if (addressSelect) addressSelect.value = selectedAddressId;
        }

        // Event listener for address selection change
        if (addressSelect) {
            addressSelect.onchange = (e) => { // Use onchange
                console.log('Address select changed to:', e.target.value); // Diagnostic log
                selectedAddressId = parseInt(e.target.value);
            };
        }

        if (submitPaymentBtn) {
            submitPaymentBtn.onclick = async () => { // Use onclick
                console.log('Place Order button clicked.'); // Diagnostic log
                if (!selectedAddressId) {
                    showAppMessage('Please select or add a shipping address.', 'danger');
                    return;
                }
                await handlePlaceOrder(selectedAddressId);
            };
        }
    }

    function attachOrderHistoryListeners() {
        console.log('attachOrderHistoryListeners called.'); // Diagnostic log
        document.querySelectorAll('.view-order-details-btn').forEach(button => {
            button.onclick = (e) => { // Use onclick
                console.log('View order details button clicked for order:', e.target.dataset.orderId); // Diagnostic log
                const orderId = parseInt(e.target.dataset.orderId);
                window.location.hash = `order-details-${orderId}`; // Update URL hash
            };
        });
    }

    function attachOrderDetailsListeners() {
        console.log('attachOrderDetailsListeners called.'); // Diagnostic log
        const backButton = document.querySelector('.back-to-orders-btn');
        if (backButton) {
            backButton.onclick = () => { // Use onclick
                console.log('Back to Orders button clicked.'); // Diagnostic log
                window.location.hash = 'order-history'; // Update URL hash
            };
        }
    }

    function attachDashboardListeners() {
        console.log('attachDashboardListeners called.'); // Diagnostic log
        const profileUpdateForm = document.getElementById('profile-update-form');
        if (profileUpdateForm) {
            profileUpdateForm.onsubmit = async (e) => { // Use onsubmit
                e.preventDefault();
                console.log('Profile update form submitted.'); // Diagnostic log
                const username = document.getElementById('profile-username').value;
                const email = document.getElementById('profile-email').value;
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;

                const updateData = { username, email };
                if (currentPassword || newPassword) { // Only include if changing password
                    updateData.currentPassword = currentPassword;
                    updateData.newPassword = newPassword;
                }

                await handleUpdateProfile(updateData);
            };
        }
    }

    function attachAdminDashboardListeners() {
        console.log('attachAdminDashboardListeners called.'); // Diagnostic log
        document.querySelectorAll('.admin-nav-btn').forEach(button => {
            button.onclick = (e) => { // Use onclick
                console.log('Admin navigation button clicked:', e.target.dataset.adminRoute); // Diagnostic log
                const route = e.target.dataset.adminRoute;
                window.location.hash = route; // Update URL hash
            };
        });
    }

    function attachAdminProductListeners(categories) { // categories parameter added
        console.log('attachAdminProductListeners called.'); // Diagnostic log
        const addProductForm = document.getElementById('add-product-form');

        if (addProductForm) {
            addProductForm.onsubmit = async (e) => { // Use onsubmit
                e.preventDefault();
                console.log('Add product form submitted.'); // Diagnostic log
                const newProduct = {
                    name: document.getElementById('add-name').value,
                    description: document.getElementById('add-description').value,
                    price: parseFloat(document.getElementById('add-price').value),
                    imageUrl: document.getElementById('add-imageUrl').value,
                    stockQuantity: parseInt(document.getElementById('add-stockQuantity').value),
                    categoryId: parseInt(document.getElementById('add-categoryId').value)
                };

                await handleAdminAddProduct(newProduct);
            };
        }

        // Attach AI Generate Description button listener for add form
        const generateDescBtn = document.getElementById('generate-description-btn');
        if (generateDescBtn) {
            generateDescBtn.onclick = () => {
                const productName = document.getElementById('add-name').value;
                const currentDescription = document.getElementById('add-description').value;
                generateProductDescription(productName, currentDescription, 'add-description');
            };
        }

        document.querySelectorAll('.edit-product-btn').forEach(button => {
            button.onclick = async (e) => { // Use onclick
                console.log('Edit product button clicked for product:', e.target.dataset.id); // Diagnostic log
                const productId = parseInt(e.target.dataset.id);
                try {
                    const response = await fetch(`${API_BASE_URL}/products/${productId}`);
                    const product = await response.json();

                    // Populate modal fields
                    const modalBodyHtml = `
                        <form id="edit-product-form-modal">
                            <input type="hidden" id="edit-id-modal" value="${product.id}">
                            <div class="form-group"><label for="edit-name-modal">Name:</label><input type="text" id="edit-name-modal" value="${product.name}" required></div>
                            <div class="form-group">
                                <label for="edit-description-modal">Description:</label>
                                <textarea id="edit-description-modal">${product.description || ''}</textarea>
                                <button type="button" id="generate-description-btn-modal" class="btn btn-secondary btn-small" style="margin-top: 5px;"><i class="fas fa-magic"></i> Generate with AI</button>
                            </div>
                            <div class="form-group"><label for="edit-price-modal">Price:</label><input type="number" id="edit-price-modal" step="0.01" min="0" value="${product.price}" required></div>
                            <div class="form-group"><label for="edit-imageUrl-modal">Image URL:</label><input type="text" id="edit-imageUrl-modal" value="${product.imageUrl || ''}"></div>
                            <div class="form-group"><label for="edit-stockQuantity-modal">Stock Quantity:</label><input type="number" id="edit-stockQuantity-modal" min="0" value="${product.stockQuantity}" required></div>
                            <div class="form-group">
                                <label for="edit-categoryId-modal">Category:</label>
                                <select id="edit-categoryId-modal" required>
                                    ${categories.map(cat => `<option value="${cat.id}" ${product.category && cat.id === product.category.id ? 'selected' : ''}>${cat.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <button type="submit" class="btn">Save Changes</button>
                        </form>
                    `;
                    openModal(`Edit Product: ${product.name}`, modalBodyHtml);
                    
                    // Attach submit listener to the modal form
                    const editProductFormModal = document.getElementById('edit-product-form-modal');
                    if (editProductFormModal) {
                        editProductFormModal.onsubmit = async (e) => { // Use onsubmit
                            e.preventDefault();
                            console.log('Modal edit product form submitted for product:', document.getElementById('edit-id-modal').value); // Diagnostic log
                            const modalProductId = parseInt(document.getElementById('edit-id-modal').value);
                            const modalUpdatedProduct = {
                                name: document.getElementById('edit-name-modal').value,
                                description: document.getElementById('edit-description-modal').value,
                                price: parseFloat(document.getElementById('edit-price-modal').value),
                                imageUrl: document.getElementById('edit-imageUrl-modal').value,
                                stockQuantity: parseInt(document.getElementById('edit-stockQuantity-modal').value),
                                categoryId: parseInt(document.getElementById('edit-categoryId-modal').value)
                            };
                            await handleAdminUpdateProduct(modalProductId, modalUpdatedProduct);
                        };
                    }

                    // Attach AI Generate Description button listener for modal
                    const generateDescBtnModal = document.getElementById('generate-description-btn-modal');
                    if (generateDescBtnModal) {
                        generateDescBtnModal.onclick = () => {
                            const productName = document.getElementById('edit-name-modal').value;
                            const currentDescription = document.getElementById('edit-description-modal').value;
                            generateProductDescription(productName, currentDescription, 'edit-description-modal');
                        };
                    }

                } catch (error) {
                    console.error('Error fetching product for edit (admin):', error); // Diagnostic log
                    showAppMessage('Failed to load product for editing. Error: ' + error.message, 'danger');
                }
            };
        });

        document.querySelectorAll('.delete-product-btn').forEach(button => {
            button.onclick = async (e) => { // Use onclick
                console.log('Delete product button clicked for product:', e.target.dataset.id); // Diagnostic log
                const productId = parseInt(e.target.dataset.id);
                if (confirm('Are you sure you want to delete this product?')) {
                    await handleAdminDeleteProduct(productId);
                }
            };
        });
    }

    function attachAdminOrderListeners() {
        console.log('attachAdminOrderListeners called.'); // Diagnostic log

        document.querySelectorAll('.order-status-select').forEach(select => {
            select.onchange = async (e) => { // Use onchange
                console.log('Order status select changed for order:', e.target.dataset.orderId, 'to status:', e.target.value); // Diagnostic log
                const orderId = parseInt(e.target.dataset.orderId);
                const newStatus = e.target.value;
                await handleAdminUpdateOrderStatus(orderId, newStatus);
            };
        });

        document.querySelectorAll('.view-admin-order-details-btn').forEach(button => {
            button.onclick = async (e) => { // Use onclick
                console.log('View admin order details button clicked for order:', e.target.dataset.id); // Diagnostic log
                const orderId = parseInt(e.target.dataset.id);
                try {
                    const response = await authenticatedFetch(`${API_BASE_URL}/orders/${orderId}`);
                    const order = await response.json();

                    // Populate modal fields
                    const modalBodyHtml = `
                        <p><strong>Order ID:</strong> #${order.id}</p>
                        <p><strong>User:</strong> ${order.user.username} (${order.user.email})</p>
                        <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString()} ${new Date(order.orderDate).toLocaleTimeString()}</p>
                        <p><strong>Total Amount:</strong> ${order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'}</p>
                        <p><strong>Status:</strong> <span class="order-status-${order.status.toLowerCase()}">${order.status}</span></p>

                        <h4>Shipping Address</h4>
                        <p>${order.shippingAddress.street}</p>
                        <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</p>
                        <p>${order.shippingAddress.country}</p>

                        <h4>Items Ordered</h4>
                        <div class="modal-order-items-list">
                            ${order.orderItems.map(item => `
                                <div class="modal-order-item-detail" key="${item.id}">
                                    <img src="${item.product.imageUrl || 'https://via.placeholder.com/40/cccccc/333333?text=No+Image'}" alt="${item.product.name}">
                                    <div>
                                        <h5>${item.product.name}</h5>
                                        <p>Qty: ${item.quantity} | Price: ${item.priceAtOrder.toFixed(2)}</p>
                                        <p>Item Total: ${(item.quantity * item.priceAtOrder).toFixed(2)}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    openModal(`Order Details: #${order.id}`, modalBodyHtml);
                } catch (error) {
                    console.error('Error fetching admin order details:', error); // Diagnostic log
                    showAppMessage('Failed to load order details for admin. Error: ' + error.message, 'danger');
                }
            };
        });
    }

    // --- 6. Main Content Loader (Routing) ---
    // This function orchestrates which page rendering function to call and shows the correct HTML section.

    // This object maps hash routes to the corresponding rendering function and HTML section ID
    const routes = {
        'home': { render: null, sectionId: 'home-page' },
        'products': { render: renderProductsPageContent, sectionId: 'products-page' },
        'product-details': { render: renderProductDetailsPage, sectionId: null }, // Rendered as modal
        'cart': { render: renderCartPageContent, sectionId: 'cart-page' },
        'login': { render: null, sectionId: 'login-page' }, // No render, HTML is static
        'register': { render: null, sectionId: 'register-page' }, // No render, HTML is static
        'checkout': { render: renderCheckoutPageContent, sectionId: 'checkout-page' },
        'order-history': { render: renderOrderHistoryPageContent, sectionId: 'order-history-page' },
        'order-details': { render: renderOrderDetailsPageContent, sectionId: 'order-details-page' },
        'user-dashboard': { render: renderUserDashboardPageContent, sectionId: 'user-dashboard-page' },
        'admin-dashboard': { render: renderAdminDashboardPageContent, sectionId: 'admin-dashboard-page' },
        'admin-products': { render: renderAdminProductManagementContent, sectionId: 'admin-products-page' },
        'admin-orders': { render: renderAdminOrderManagementContent, sectionId: 'admin-orders-page' },
    };

    /**
     * Shows a specific page section and hides all others.
     * @param {string} pageId The ID of the section to show (e.g., 'home-page', 'products-page').
     */
    function showPage(pageId) {
        if (!pageId) return; // Don't show any page if pageId is null (for modals)
        document.querySelectorAll('.page-section').forEach(section => {
            section.style.display = 'none'; // Hide all sections
            section.classList.remove('active'); // Remove active class
        });
        const activeSection = document.getElementById(pageId);
        if (activeSection) {
            activeSection.style.display = 'flex'; // Show the requested section (using flex for internal layout)
            activeSection.classList.add('active'); // Add active class
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top of page
        }
    }

    // Main loadContent function - orchestrates showing/hiding and calling renderers
    async function loadContent(route, data = {}) { // 'data' can be filters, or an ID for detail pages
        console.log('loadContent called for route:', route, 'with data:', data); // Diagnostic log

        let actualRoute = route;
        let idParam = null;

        // Special handling for routes with IDs in hash (e.g., #product-details-1)
        if (route.startsWith('product-details-')) {
            actualRoute = 'product-details';
            idParam = parseInt(route.substring(route.lastIndexOf('-') + 1)); // Extract ID
        } else if (route.startsWith('order-details-')) {
            actualRoute = 'order-details';
            idParam = parseInt(route.substring(route.lastIndexOf('-') + 1)); // Extract ID
            // Fetch the specific order for order details
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/orders/${idParam}`);
                currentSelectedOrder = await response.json();
            } catch (error) {
                showAppMessage('Failed to load order details. Error: ' + error.message, 'danger');
                window.location.hash = 'order-history';
                return;
            }
        }

        const routeConfig = routes[actualRoute] || routes['home']; // Fallback to home
        showPage(routeConfig.sectionId); // Show the correct HTML section first

        // Call the appropriate data fetching/rendering function
        if (routeConfig.render) {
            try {
                if (idParam && actualRoute === 'product-details') {
                    // For product details modal
                    await routeConfig.render(idParam);
                } else if (actualRoute === 'products') {
                    // For products route with filters
                    await routeConfig.render(data);
                } else if (actualRoute === 'order-history') {
                    // Fetch orders first, then render
                    await fetchOrders();
                    routeConfig.render();
                } else {
                    // For other routes
                    await routeConfig.render();
                }
            } catch (error) {
                console.error('Error in route render function:', error);
                showAppMessage(`Error loading page: ${error.message}`, 'danger');
            }
        }

        // For static pages like login/register, the HTML is already in index.html, just attach handlers
        if (actualRoute === 'login' || actualRoute === 'register') {
            attachFormHandlers(); // Attach handlers after the static page is shown
        }
        
        updateAuthUI(); // Update UI after content loads
    }

    // --- 7. Navigation Event Handlers ---
    // Fixed: Add logout button handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // Attach global navigation listeners to header links
    document.querySelectorAll('header nav ul li a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const route = e.target.getAttribute('href').substring(1); // Get route from href (e.g., "products")
            console.log('Navigation link clicked. Route:', route); // Diagnostic log
            
            // Only update hash if it's a primary route or a new specific detail route
            if (route !== window.location.hash.substring(1)) { // Avoid endless hashchange loops
                window.location.hash = route;
            } else {
                // If hash doesn't change, manually trigger loadContent for a refresh effect
                // This covers cases like clicking 'products' when already on '/products'
                loadContent(route); 
            }
        });
    });

    // Handle browser back/forward buttons (using hashchange event)
    window.addEventListener('hashchange', () => {
        const newRoute = window.location.hash.substring(1);
        console.log('Hash changed. New route:', newRoute); // Diagnostic log
        if (newRoute) {
            loadContent(newRoute);
        } else {
            loadContent('home');
        }
    });

    // Initial content load based on URL hash or default
    const initialRoute = window.location.hash.substring(1) || 'home';
    loadContent(initialRoute);
    updateAuthUI(); // Initial UI update based on local storage

}); // End of DOMContentLoaded

function showProductInCanvas(product) {
    const container = document.querySelector(".canvas-container");
    container.style.display = "block";

    // Hide canvas
    const canvasEl = document.getElementById("productCanvas");
    if (canvasEl) canvasEl.style.display = "none";

    // Show product image
    const imgEl = document.getElementById("canvas-product-image");
    imgEl.src = product.image;
    imgEl.style.display = "block";

    // Fill text
    document.getElementById("canvas-product-name").textContent = product.name;
    document.getElementById("canvas-product-price").textContent = "Price: ₹" + product.price;

    // Show buttons
    document.getElementById("canvas-add-to-cart").style.display = "inline-block";
    document.getElementById("canvas-view-details").style.display = "inline-block";
}
