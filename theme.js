// theme.js - Global Theme Management System

class ThemeManager {
    constructor() {
        this.THEME_KEY = 'greenCorridorTheme';
        this.currentTheme = this.getInitialTheme();
        this.init();
    }

    // Get initial theme based on user preference or system setting
    getInitialTheme() {
        // Check if user has a saved preference
        const savedTheme = localStorage.getItem(this.THEME_KEY);
        if (savedTheme) {
            return savedTheme;
        }

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light'; // Default to light
    }

    // Initialize theme system
    init() {
        // Apply theme immediately to prevent flash
        this.applyTheme(this.currentTheme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only update if user hasn't manually chosen a theme
                if (!localStorage.getItem(this.THEME_KEY)) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    // Apply theme to document
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;

        // Update toggle button if it exists
        this.updateToggleButton();
    }

    // Set and save theme
    setTheme(theme) {
        this.applyTheme(theme);
        localStorage.setItem(this.THEME_KEY, theme);
    }

    // Toggle between light and dark
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    // Update toggle button state
    updateToggleButton() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (!toggleBtn) return;

        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = this.currentTheme === 'light'
                ? 'fa-solid fa-moon'
                : 'fa-solid fa-sun';
        }

        toggleBtn.setAttribute('aria-label',
            `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} mode`);
    }

    // Create and inject toggle button
    createToggleButton() {
        const button = document.createElement('button');
        button.id = 'theme-toggle';
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', 'Toggle theme');
        button.innerHTML = `<i class="fa-solid ${this.currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>`;

        button.addEventListener('click', () => this.toggle());

        document.body.appendChild(button);
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Create toggle button when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager.createToggleButton();
    });
} else {
    themeManager.createToggleButton();
}

// Export for use in other scripts
window.themeManager = themeManager;
