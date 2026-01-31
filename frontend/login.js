// login.js - Simple authentication for government dashboard

// Credentials
const VALID_EMAIL = 'admin@test.com';
const VALID_PASSWORD = 'admin123';

// DOM Elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Check if already logged in
if (sessionStorage.getItem('govAuth') === 'true') {
    window.location.href = 'admin.html';
}

// Handle form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validate credentials
    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
        // Authentication successful
        sessionStorage.setItem('govAuth', 'true');

        // Optional: Show success feedback
        errorMessage.classList.add('hidden');

        // Redirect to admin dashboard
        window.location.href = 'admin.html';
    } else {
        // Authentication failed
        errorMessage.classList.remove('hidden');

        // Clear password field
        passwordInput.value = '';
        passwordInput.focus();

        // Shake animation is handled by CSS
    }
});

// Clear error on input
emailInput.addEventListener('input', () => {
    errorMessage.classList.add('hidden');
});

passwordInput.addEventListener('input', () => {
    errorMessage.classList.add('hidden');
});
