import { theme, createStyledElement } from '../theme.js';

class Card {
  constructor(content, className = '') {
    this.element = createStyledElement('div', theme.styles.card);
    this.element.className = `card ${className}`;
    
    // Add hover effect
    this.element.addEventListener('mouseenter', () => {
      this.element.style.cssText += theme.styles.cardHover;
    });
    
    this.element.addEventListener('mouseleave', () => {
      this.element.style.cssText = theme.styles.card;
    });
    
    // Add content
    if (typeof content === 'string') {
      this.element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.element.appendChild(content);
    }
    
    // Add animation
    this.element.style.opacity = '0';
    this.element.style.transform = 'translateY(20px)';
    
    // Trigger animation after a small delay
    setTimeout(() => {
      this.element.style.transition = 'all 0.5s ease';
      this.element.style.opacity = '1';
      this.element.style.transform = 'translateY(0)';
    }, 50);
  }
  
  // Method to update card content
  updateContent(content) {
    this.element.innerHTML = '';
    if (typeof content === 'string') {
      this.element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.element.appendChild(content);
    }
  }
  
  // Method to get the card element
  getElement() {
    return this.element;
  }
}

export default Card; 