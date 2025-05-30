import { theme, createStyledElement } from '../theme.js';

class SectionHeader {
  constructor(title, subtitle = '') {
    this.element = createStyledElement('div', `
      position: relative;
      margin-bottom: 2rem;
    `);
    
    // Create gradient background
    const gradientBg = createStyledElement('div', `
      background: linear-gradient(120deg, ${theme.colors.primary}, ${theme.colors.accent});
      height: 6rem;
      width: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
      transform: skewY(-1deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    `);
    
    // Create content container
    const content = createStyledElement('div', `
      position: relative;
      z-index: 1;
      padding-top: 1.5rem;
      padding-left: 1.5rem;
    `);
    
    // Create title
    const titleElement = createStyledElement('h2', `
      ${theme.styles.typography.headline}
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin: 0;
    `);
    titleElement.textContent = title;
    
    // Add elements to DOM
    content.appendChild(titleElement);
    
    if (subtitle) {
      const subtitleElement = createStyledElement('p', `
        margin-top: 0.5rem;
        font-size: 1.125rem;
        color: white;
        opacity: 0.9;
      `);
      subtitleElement.textContent = subtitle;
      content.appendChild(subtitleElement);
    }
    
    this.element.appendChild(gradientBg);
    this.element.appendChild(content);
    
    // Add animation
    this.element.style.opacity = '0';
    this.element.style.transform = 'translateY(-20px)';
    
    // Trigger animation after a small delay
    setTimeout(() => {
      this.element.style.transition = 'all 0.5s ease';
      this.element.style.opacity = '1';
      this.element.style.transform = 'translateY(0)';
    }, 50);
  }
  
  // Method to update header content
  updateContent(title, subtitle = '') {
    const content = this.element.querySelector('div');
    const titleElement = content.querySelector('h2');
    titleElement.textContent = title;
    
    let subtitleElement = content.querySelector('p');
    if (subtitle) {
      if (!subtitleElement) {
        subtitleElement = createStyledElement('p', `
          margin-top: 0.5rem;
          font-size: 1.125rem;
          color: white;
          opacity: 0.9;
        `);
        content.appendChild(subtitleElement);
      }
      subtitleElement.textContent = subtitle;
    } else if (subtitleElement) {
      subtitleElement.remove();
    }
  }
  
  // Method to get the header element
  getElement() {
    return this.element;
  }
}

export default SectionHeader; 