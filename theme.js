// theme.js - Global Theme Management System

// theme.js - Global Theme Management System

class ThemeManager {
    constructor() {
        this.THEME_KEY = 'greenCorridorTheme';
        this.currentTheme = 'light'; // Force light
        this.init();
    }

    // Initialize theme system
    init() {
        // Apply theme immediately
        this.applyTheme('light');
    }

    // Apply theme to document
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        // No toggles
    }

    // Empty functions to prevent errors if called elsewhere
    setTheme(theme) { }
    toggle() { }
    updateToggleButton() { }
    createToggleButton() {
        // Do nothing - user requested no toggle
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for use in other scripts
window.themeManager = themeManager;

// Export for use in other scripts
window.themeManager = themeManager;
