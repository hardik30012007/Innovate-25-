/**
 * URBANGREEN DELHI - ANIMATION CONTROLLER
 * Handles micro-interactions, scroll animations, and UI feedback
 */

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initHoverEffects();
    initLoadingStates();
    initToastNotifications();
});

/**
 * Scroll-triggered animations using Intersection Observer
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements with data-animate attribute
    document.querySelectorAll('[data-animate]').forEach(el => {
        observer.observe(el);
    });
}

/**
 * Enhanced hover effects for interactive elements
 */
function initHoverEffects() {
    // Add ripple effect to buttons
    document.querySelectorAll('.btn-gradient, .btn-submit, .map-control-btn').forEach(button => {
        button.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add CSS for ripple effect if not already present
    if (!document.getElementById('ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `
      .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
      }
      
      @keyframes ripple-animation {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
        document.head.appendChild(style);
    }
}

/**
 * Loading state animations
 */
function initLoadingStates() {
    // Create loading overlay template
    window.showLoading = function (message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      animation: fadeIn 0.3s ease-out;
    `;

        overlay.innerHTML = `
      <div style="
        width: 60px;
        height: 60px;
        border: 4px solid rgba(16, 185, 129, 0.2);
        border-top-color: #10b981;
        border-radius: 50%;
        animation: rotate 1s linear infinite;
      "></div>
      <p style="
        color: #f8fafc;
        margin-top: 20px;
        font-size: 1rem;
        font-weight: 500;
      ">${message}</p>
    `;

        document.body.appendChild(overlay);
    };

    window.hideLoading = function () {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => overlay.remove(), 300);
        }
    };

    // Add fadeOut animation
    if (!document.getElementById('loading-styles')) {
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
        document.head.appendChild(style);
    }
}

/**
 * Toast notification system
 */
function initToastNotifications() {
    window.showToast = function (message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';

        const colors = {
            success: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            error: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            info: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
            warning: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
        };

        toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      font-weight: 500;
      z-index: 100000;
      animation: slideInRight 0.3s ease-out;
      max-width: 400px;
    `;

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    // Add toast animations
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
        document.head.appendChild(style);
    }
}

/**
 * Smooth scroll to element
 */
window.smoothScrollTo = function (element, offset = 0) {
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
};

/**
 * Count-up animation for numbers
 */
window.animateNumber = function (element, start, end, duration = 1000) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
};

// Export functions for use in other scripts
window.AnimationController = {
    showLoading: window.showLoading,
    hideLoading: window.hideLoading,
    showToast: window.showToast,
    smoothScrollTo: window.smoothScrollTo,
    animateNumber: window.animateNumber
};
