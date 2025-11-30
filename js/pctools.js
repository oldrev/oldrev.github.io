// PCTools DOS Theme JavaScript

(function() {
  'use strict';
  
  // Update clock in status bar
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
      timeElement.textContent = timeString;
    }
  }
  
  // Keyboard navigation
  function handleKeyboard(e) {
    // F1 - Show help (placeholder)
    if (e.key === 'F1') {
      e.preventDefault();
      showHelp();
    }
    
    // F10 - Focus menu
    if (e.key === 'F10') {
      e.preventDefault();
      const firstMenuLink = document.querySelector('.dos-menu a');
      if (firstMenuLink) {
        firstMenuLink.focus();
      }
    }
    
    // ESC - Go back/home
    if (e.key === 'Escape') {
      if (window.location.pathname !== '/') {
        window.history.back();
      }
    }
    
    // Alt+Left - Previous post
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevLink = document.querySelector('.post-navigation a[href*="prev"]');
      if (prevLink) {
        window.location.href = prevLink.href;
      }
    }
    
    // Alt+Right - Next post
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      const nextLink = document.querySelector('.post-navigation a[href*="next"]');
      if (nextLink) {
        window.location.href = nextLink.href;
      }
    }
  }
  
  // Show help dialog
  function showHelp() {
    const helpContent = `
╔═══════════════════════════════════════════╗
║           PCTOOLS - HELP SYSTEM           ║
╠═══════════════════════════════════════════╣
║                                           ║
║  F1         Show this help                ║
║  F10        Focus navigation menu         ║
║  ESC        Go back                       ║
║  Alt+←      Previous post                 ║
║  Alt+→      Next post                     ║
║                                           ║
║  Click links or use Tab to navigate       ║
║                                           ║
╚═══════════════════════════════════════════╝
    `;
    
    alert(helpContent);
  }
  
  // Add DOS-style loading effect
  function addLoadingEffect() {
    // Add a subtle fade-in effect on page load
    document.body.style.opacity = '0';
    setTimeout(() => {
      document.body.style.transition = 'opacity 0.3s';
      document.body.style.opacity = '1';
    }, 50);
  }
  
  // Add hover sound effect simulation (visual only)
  function addInteractiveEffects() {
    const links = document.querySelectorAll('a, .dos-button');
    links.forEach(link => {
      link.addEventListener('mouseenter', function() {
        // Visual feedback only - could add sound here
        this.style.transition = 'all 0.1s';
      });
    });
  }
  
  // Add keyboard navigation hints to focusable elements
  function enhanceAccessibility() {
    const focusableElements = document.querySelectorAll('a, button, input, select, textarea');
    focusableElements.forEach((element, index) => {
      element.setAttribute('tabindex', index === 0 ? '0' : '0');
    });
  }
  
  // Smooth scroll to top
  function addScrollToTop() {
    const scrollButton = document.createElement('div');
    scrollButton.className = 'scroll-to-top';
    scrollButton.innerHTML = '▲ TOP';
    scrollButton.style.cssText = `
      position: fixed;
      bottom: 50px;
      right: 20px;
      background-color: #55FFFF;
      color: #0000AA;
      padding: 10px 15px;
      cursor: pointer;
      border: 2px solid #FFFFFF;
      display: none;
      font-family: 'VT323', monospace;
      font-size: 18px;
      z-index: 999;
    `;
    
    scrollButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        scrollButton.style.display = 'block';
      } else {
        scrollButton.style.display = 'none';
      }
    });
    
    document.body.appendChild(scrollButton);
  }
  
  // Initialize on DOM ready
  function init() {
    // Start clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Add keyboard handlers
    document.addEventListener('keydown', handleKeyboard);
    
    // Add effects
    addLoadingEffect();
    addInteractiveEffects();
    enhanceAccessibility();
    addScrollToTop();
    
    // Console easter egg
    console.log(`
╔═══════════════════════════════════════════╗
║         WELCOME TO PCTOOLS THEME          ║
║                                           ║
║  A retro DOS-style theme for Hugo        ║
║  Inspired by 90s PC utilities            ║
║                                           ║
║  Press F1 for keyboard shortcuts         ║
╚═══════════════════════════════════════════╝
    `);
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
