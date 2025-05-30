import { theme, createStyledElement } from '../theme.js';

class PrimaryButton {
  constructor(text, onClick, variant = 'filled') {
    this.element = createStyledElement('button', theme.styles.button);
    this.element.textContent = text;
    this.variant = variant;
    
    // Set variant-specific styles
    if (variant === 'outline') {
      this.element.style.background = 'transparent';
      this.element.style.border = `2px solid ${theme.colors.primary}`;
      this.element.style.color = theme.colors.primary;
    }
    
    // Add click handler
    if (onClick) {
      this.element.addEventListener('click', (e) => {
        // Add spring animation
        this.element.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.element.style.transform = 'scale(1)';
        }, 150);
        
        onClick(e);
      });
    }
    
    // Add hover effect
    this.element.addEventListener('mouseenter', () => {
      if (this.variant === 'filled') {
        this.element.style.cssText += theme.styles.buttonHover;
      } else {
        this.element.style.background = `${theme.colors.primary}10`;
        this.element.style.color = theme.colors.primaryDark;
      }
    });
    
    this.element.addEventListener('mouseleave', () => {
      if (this.variant === 'filled') {
        this.element.style.cssText = theme.styles.button;
      } else {
        this.element.style.background = 'transparent';
        this.element.style.color = theme.colors.primary;
      }
    });
  }
  
  // Method to update button text
  setText(text) {
    this.element.textContent = text;
  }
  
  // Method to update button variant
  setVariant(variant) {
    this.variant = variant;
    if (variant === 'outline') {
      this.element.style.background = 'transparent';
      this.element.style.border = `2px solid ${theme.colors.primary}`;
      this.element.style.color = theme.colors.primary;
    } else {
      this.element.style.cssText = theme.styles.button;
    }
  }
  
  // Method to get the button element
  getElement() {
    return this.element;
  }
}

export default PrimaryButton; 