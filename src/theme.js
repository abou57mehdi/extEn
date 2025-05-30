// Theme configuration for the blue-and-white design system
const theme = {
  colors: {
    primary: '#0077B5',
    primaryDark: '#005f92',
    accent: '#00A0DC',
    white: '#FFFFFF',
    softGrey: '#F5F7FA',
    dark: {
      background: '#1A1A1A',
      surface: '#2A2A2A'
    }
  },
  
  // Common styles as template literals for easy use
  styles: {
    gradientHeader: `
      background: linear-gradient(120deg, #0077B5, #00A0DC);
      color: white;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    `,
    
    card: `
      background: #FFFFFF;
      border-radius: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
    `,
    
    cardHover: `
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    `,
    
    button: `
      background: #0077B5;
      color: white;
      border-radius: 9999px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      transition: all 150ms ease-in-out;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    `,
    
    buttonHover: `
      background: #005f92;
      transform: translateY(-1px);
    `,
    
    typography: {
      headline: `
        font-size: 1.875rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        color: #0077B5;
      `,
      subheadline: `
        font-size: 1.25rem;
        font-weight: 600;
        color: #005f92;
      `,
      body: `
        font-size: 1rem;
        line-height: 1.75;
        color: #1F2937;
      `
    }
  },
  
  // Animation configurations
  animations: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: 500
    },
    slideUp: {
      from: { transform: 'translateY(20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
      duration: 500
    },
    springPop: {
      from: { transform: 'scale(1)' },
      to: { transform: 'scale(1.05)' },
      duration: 300,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  }
};

// Helper functions for creating styled elements
const createStyledElement = (element, styles) => {
  const el = document.createElement(element);
  el.style.cssText = styles;
  return el;
};

// Export theme and helper functions
export { theme, createStyledElement }; 