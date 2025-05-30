// ChatGPT detection and message capture fix
console.log('ChatGPT detection fix loaded');

// Updated selectors for ChatGPT (as of latest UI)
const CHATGPT_SELECTORS = {
  // Main container selectors
  container: [
    'div[role="presentation"]',
    'div.flex.flex-col.items-center.text-sm.dark:bg-gray-800',
    'main div.flex-1.overflow-hidden',
    'div[data-testid="conversation-turn-list"]',
    'div.flex.flex-col.items-center',
    'main'
  ],
  
  // Message selectors
  message: [
    'div[data-testid^="conversation-turn-"]',
    'div.group.w-full',
    'div[data-message-author-role]',
    'div.min-h-[20px]',
    'div.markdown',
    'div.text-base'
  ],
  
  // User message indicators
  userMessage: [
    'div[data-message-author-role="user"]',
    'div[data-testid="conversation-turn-user"]',
    'div.dark:bg-gray-800'
  ],
  
  // AI message indicators
  aiMessage: [
    'div[data-message-author-role="assistant"]',
    'div[data-testid="conversation-turn-assistant"]',
    'div.dark:bg-gray-700'
  ]
};

// Helper function to find elements with multiple possible selectors
function findElementWithSelectors(selectors, parent = document) {
  for (const selector of selectors) {
    try {
      const elements = parent.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        console.log(`Found elements with selector: ${selector}`, elements.length);
        return elements;
      }
    } catch (error) {
      console.error(`Error with selector "${selector}":`, error);
    }
  }
  return null;
}

// Function to detect ChatGPT and log details
function detectChatGPT() {
  console.log('Attempting to detect ChatGPT...');
  const hostname = window.location.hostname;
  
  if (!hostname.includes('chat.openai.com')) {
    console.log('Not on ChatGPT domain');
    return false;
  }
  
  console.log('On ChatGPT domain, checking for UI elements...');
  
  // Find container
  const container = findElementWithSelectors(CHATGPT_SELECTORS.container);
  if (!container) {
    console.log('ChatGPT container not found');
    return false;
  }
  
  console.log('ChatGPT container found:', container);
  
  // Check for message elements
  const messages = findElementWithSelectors(CHATGPT_SELECTORS.message);
  const userMessages = findElementWithSelectors(CHATGPT_SELECTORS.userMessage);
  const aiMessages = findElementWithSelectors(CHATGPT_SELECTORS.aiMessage);
  
  console.log('ChatGPT detection results:', {
    messages: messages ? messages.length : 0,
    userMessages: userMessages ? userMessages.length : 0,
    aiMessages: aiMessages ? aiMessages.length : 0
  });
  
  // Log the DOM structure for debugging
  console.log('DOM structure for debugging:');
  const mainElement = document.querySelector('main');
  if (mainElement) {
    console.log('Main element found:', mainElement);
    console.log('Main element children:', mainElement.children.length);
    
    // Log the first few levels of the DOM hierarchy
    const structure = [];
    function logElement(element, depth = 0) {
      if (depth > 3) return; // Limit depth to avoid too much output
      
      const info = {
        tag: element.tagName,
        id: element.id || null,
        classes: element.className || null,
        attributes: {},
        children: element.children.length
      };
      
      // Log key attributes
      ['role', 'data-testid', 'data-message-author-role'].forEach(attr => {
        if (element.hasAttribute(attr)) {
          info.attributes[attr] = element.getAttribute(attr);
        }
      });
      
      structure.push({ depth, info });
      
      // Log children
      Array.from(element.children).forEach(child => {
        logElement(child, depth + 1);
      });
    }
    
    logElement(mainElement);
    console.log('DOM structure:', structure);
  }
  
  return !!(container && (messages || userMessages || aiMessages));
}

// Run detection
detectChatGPT();

// Set up a MutationObserver to detect when the UI is fully loaded
const observer = new MutationObserver((mutations) => {
  // Check if we have enough DOM elements to indicate the UI is loaded
  const mainElement = document.querySelector('main');
  if (mainElement && mainElement.children.length > 0) {
    console.log('Main element has children, checking ChatGPT detection again...');
    detectChatGPT();
    
    // Stop observing after a successful check
    observer.disconnect();
  }
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Also try again after a delay
setTimeout(() => {
  console.log('Delayed ChatGPT detection check...');
  detectChatGPT();
}, 5000);
