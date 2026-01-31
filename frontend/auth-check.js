// auth-check.js - Protect admin dashboard from unauthorized access

// Check if user is authenticated
if (sessionStorage.getItem('govAuth') !== 'true') {
    // Not authenticated, redirect to login
    window.location.href = '../login.html';
}

// Optional: Add logout functionality
window.logout = function () {
    sessionStorage.removeItem('govAuth');
    window.location.href = '../login.html';
};
