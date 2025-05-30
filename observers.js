// Advanced observers for improved message detection
(function() {
  console.log('Advanced observers initialized');
  
  // Store existing message elements to track changes
  const observedMessages = new WeakSet();
  const messagePositions = new Map();
  
  // Detected conversation container
  let conversationContainer = null;
  
  // Track detected messages
  let detectedMessages = [];
  
  // Flag to pause observers during user interaction
  let observersPaused = false;
  
  // Detect which platform we're on
  function detectPlatform() {
    const url = window.location.href;
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai') || url.includes('anthropic.com')) return 'claude';
    if (url.includes('bard.google.com') || url.includes('gemini.google.com')) return 'gemini';
    return 'unknown';
  }
  
  const platform = detectPlatform();
  console.log('Detected platform:', platform);
  
  // Find the conversation container
  function findConversationContainer() {
    // Platform-specific containers
    if (platform === 'chatgpt') {
      // ChatGPT specific selectors - prioritize these
      const chatgptContainers = [
        'div[role="presentation"]',
        'div.flex.flex-col.text-sm',
        'main div.flex-1.overflow-hidden',
        'div.flex.flex-col.items-center.text-sm',
        'div[data-testid="conversation-turn-list"]',
        'div[class*="react-scroll"]',
        'div.flex-1.overflow-hidden',
        'main'
      ];
      
      for (const selector of chatgptContainers) {
        try {
          const container = document.querySelector(selector);
          if (container && container.children.length > 0) {
            console.log('Found ChatGPT container:', selector);
            return container;
          }
        } catch (e) {
          console.error('Error finding ChatGPT container with selector', selector, e);
        }
      }
    } else {
      // Try platform-specific containers first
      const containers = [
        // Claude
        'div.prose.w-full',
        'div.conversation-container',
        'main.flex-1',
        'div[role="main"]',
        // Gemini
        'div[role="main"]',
        'div.conversation-container',
        'div[role="log"]',
        'div.chat-history'
      ];
      
      for (const selector of containers) {
        try {
          const container = document.querySelector(selector);
          if (container && container.children.length > 0) {
            return container;
          }
        } catch (e) {
          console.error('Error finding container with selector', selector, e);
        }
      }
    }
    
    // Generic selectors as last resort
    const genericSelectors = [
      'main',
      '.chat-container',
      '.conversation',
      'div[role="main"]'
    ];
    
    for (const selector of genericSelectors) {
      try {
        const container = document.querySelector(selector);
        if (container && container.children.length > 0) {
          return container;
        }
      } catch (e) {
        console.error('Error finding container with selector', selector, e);
      }
    }
    
    // Fallback to body if no container found
    return document.body;
  }
  
  // Initialize IntersectionObserver
  let intersectionObserver;
  function setupIntersectionObserver() {
    // Create observer with less aggressive update pattern
    intersectionObserver = new IntersectionObserver((entries) => {
      // Skip if we're currently paused
      if (observersPaused) return;
      
      // Batch processing to reduce DOM operations
      const newlyVisibleMessages = entries
        .filter(entry => entry.isIntersecting)
        .map(entry => entry.target);
      
      if (newlyVisibleMessages.length > 0) {
        console.log(`${newlyVisibleMessages.length} messages became visible`);
        // Delay processing to avoid interfering with user actions
        setTimeout(() => processVisibleMessages(newlyVisibleMessages), 500);
      }
    }, {
      root: null, // viewport
      rootMargin: '20px', // margin around the viewport
      threshold: 0.1, // 10% visibility is enough
      // Add a polling interval to reduce CPU usage
      trackVisibility: false,
    });
    
    // Start observing potential message elements
    observeMessageElements();
  }
  
  // Observe potential message elements
  function observeMessageElements() {
    if (!conversationContainer || observersPaused) return;
    
    // Platform-specific selectors
    let selectors = [];
    
    if (platform === 'chatgpt') {
      selectors = [
        // ChatGPT specific selectors
        'div[data-message-author-role]',
        'div.group.w-full',
        'div[data-testid="conversation-turn"]',
        'div[data-message-id]',
        'div.text-token-text-primary', // New ChatGPT
        'div.markdown',
        'div.min-h-[20px]', // Often contains message content
        'div.chat-message-container',
        'div.chat-message',
        'div.relative.flex'
      ];
    } else if (platform === 'claude') {
      selectors = [
        'div.conversation-turn',
        'div.message',
        'div[data-message-id]',
        'div.prose',
        'div.message-content'
      ];
    } else if (platform === 'gemini') {
      selectors = [
        'div[role="listitem"]',
        'div.chat-turn',
        'div.chat-message',
        'div.message-content'
      ];
    } else {
      // Generic selectors
      selectors = [
        'div[data-message-author-role]',
        'div.group.w-full',
        'div.markdown',
        'div.conversation-turn',
        'div.message',
        'div[data-message-id]',
        'div[role="listitem"]',
        'div.chat-turn',
        'div.chat-message',
        'div.message-content',
        '.chat-message',
        '.message',
        '.chat-turn'
      ];
    }
    
    try {
      // Add debug log
      console.log(`Looking for message elements with selectors: ${selectors.join(', ')}`);
      
      const selectorString = selectors.join(',');
      const messageElements = conversationContainer.querySelectorAll(selectorString);
      
      console.log(`Found ${messageElements.length} potential message elements`);
      
      // Limit number of observed elements to prevent performance issues
      const maxObservedElements = 100;
      let newElements = 0;
      
      Array.from(messageElements)
        // Skip interactive elements to avoid breaking site functionality
        .filter(element => 
          element.tagName && 
          !['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(element.tagName))
        .slice(0, maxObservedElements)
        .forEach(element => {
          if (!observedMessages.has(element)) {
            intersectionObserver.observe(element);
            observedMessages.add(element);
            newElements++;
            
            // Store original position for ordering
            messagePositions.set(element, Array.from(element.parentNode.children).indexOf(element));
          }
        });
      
      if (newElements > 0) {
        console.log(`Added ${newElements} new elements to observe (total: ${observedMessages.size})`);
      }
    } catch (error) {
      console.error('Error observing message elements:', error);
    }
  }
  
  // Process messages that became visible
  function processVisibleMessages(elements) {
    if (observersPaused) return;
    
    // Process in batches to reduce CPU usage
    setTimeout(() => {
      const newMessages = [];
      
      elements.forEach(element => {
        // Extract message data
        const messageData = extractMessageData(element);
        if (messageData) {
          // Check if this is a new message
          const isNewMessage = !detectedMessages.some(msg => 
            msg.role === messageData.role && 
            msg.content === messageData.content
          );
          
          if (isNewMessage) {
            console.log('New message detected:', messageData.role, messageData.content.substring(0, 30) + '...');
            detectedMessages.push(messageData);
            newMessages.push(messageData);
          }
        }
      });
      
      if (newMessages.length > 0) {
        notifyContentScript();
      }
    }, 100);
  }
  
  // Extract message data from element
  function extractMessageData(element) {
    try {
      // Skip interactive elements
      if (element.tagName && ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(element.tagName)) {
        return null;
      }
      
      // Try to determine if user or assistant message
      let role = 'unknown';
      
      if (platform === 'chatgpt') {
        // ChatGPT specific role detection
        if (element.hasAttribute('data-message-author-role')) {
          role = element.getAttribute('data-message-author-role');
        } else if (element.classList.contains('dark:bg-gray-800') || 
                   element.closest('div.dark:bg-gray-800') ||
                   element.closest('[data-message-author-role="user"]')) {
          role = 'user';
        } else if (element.classList.contains('dark:bg-gray-700') || 
                   element.closest('div.dark:bg-gray-700') ||
                   element.closest('[data-message-author-role="assistant"]')) {
          role = 'assistant';
        } else {
          // Look at parent elements for clues
          const parent = element.closest('div.group');
          if (parent) {
            if (parent.classList.contains('dark:bg-gray-800')) {
              role = 'user';
            } else {
              role = 'assistant';
            }
          } else {
            // Check position as fallback
            const position = messagePositions.get(element) || 0;
            role = position % 2 === 0 ? 'user' : 'assistant';
          }
        }
      } else {
        // Generic role detection for other platforms
        if (element.hasAttribute('data-message-author-role')) {
          role = element.getAttribute('data-message-author-role');
        } else if (element.classList.contains('user') || element.querySelector('.user')) {
          role = 'user';
        } else if (element.classList.contains('assistant') || element.querySelector('.assistant')) {
          role = 'assistant';
        } else {
          // Check position as fallback
          const position = messagePositions.get(element) || 0;
          role = position % 2 === 0 ? 'user' : 'assistant';
        }
      }
      
      // Extract content
      let content = '';
      
      if (platform === 'chatgpt') {
        // ChatGPT specific content extraction
        const markdownEl = element.querySelector('.markdown, .prose, div[data-message-author-role] div, div.min-h-[20px]');
        if (markdownEl) {
          content = markdownEl.innerText || markdownEl.textContent;
        } else {
          // Try specific message content areas
          const contentDiv = element.querySelector('div.text-message-content, div.text-token-text-primary');
          if (contentDiv) {
            content = contentDiv.innerText || contentDiv.textContent;
          } else {
            // Fallback to direct text content
            content = element.innerText || element.textContent;
          }
        }
      } else {
        // Generic content extraction - prefer innerText over textContent when available
        const markdownEl = element.querySelector('.markdown, .prose, .message-content');
        if (markdownEl) {
          content = markdownEl.innerText || markdownEl.textContent;
        } else {
          // Fallback to direct text content
          content = element.innerText || element.textContent;
        }
      }
      
      if (content && content.trim().length > 0) {
        return {
          role,
          content: content.trim(),
          timestamp: new Date().toISOString(),
          element: element // Store reference to element
        };
      }
    } catch (e) {
      console.error('Error extracting message data', e);
    }
    
    return null;
  }
  
  // Initialize ResizeObserver
  let resizeObserver;
  function setupResizeObserver() {
    // Create observer with less aggressive throttling
    let resizeTimeout;
    
    resizeObserver = new ResizeObserver(entries => {
      // Use debouncing to reduce frequent calls
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (observersPaused) return;
        
        entries.forEach(entry => {
          // Container size changed, likely new messages loaded
          console.log('Container size changed, looking for new messages');
          observeMessageElements();
        });
      }, 1000); // Wait 1s after resize stops
    });
    
    // Start observing conversation container
    if (conversationContainer) {
      resizeObserver.observe(conversationContainer);
    }
  }
  
  // Setup MutationObserver for ChatGPT
  let mutationObserver;
  function setupMutationObserver() {
    if (platform !== 'chatgpt') return;
    
    // Use a debounced approach to batch changes
    let mutationTimeout;
    
    mutationObserver = new MutationObserver((mutations) => {
      if (observersPaused) return;
      
      // Debounce to reduce CPU usage
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        let shouldRefresh = false;
        
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldRefresh = true;
            break;
          }
        }
        
        if (shouldRefresh) {
          console.log('DOM mutations detected, searching for new messages');
          observeMessageElements();
        }
      }, 1000); // 1 second debounce
    });
    
    mutationObserver.observe(conversationContainer, {
      childList: true,
      subtree: true,
      characterData: false // Disable characterData to reduce overhead
    });
    
    console.log('Mutation observer set up for ChatGPT');
  }
  
  // Notify content script about new messages
  function notifyContentScript() {
    if (detectedMessages.length === 0) return;
    
    // Sort messages by position
    detectedMessages.sort((a, b) => {
      const posA = messagePositions.get(a.element) || 0;
      const posB = messagePositions.get(b.element) || 0;
      return posA - posB;
    });
    
    // Strip element reference before sending
    const messagesToSend = detectedMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
    
    window.postMessage({
      type: 'observer-messages',
      messages: messagesToSend,
      platform: platform
    }, '*');
    
    console.log(`Posted ${messagesToSend.length} messages detected by observers on ${platform}`);
  }
  
  // Pause observers during user interaction to prevent interference
  function setupInteractionGuards() {
    // Pause during user typing or clicking
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        observersPaused = true;
        // Resume after typing stops
        clearTimeout(window.resumeTimeout);
        window.resumeTimeout = setTimeout(() => {
          observersPaused = false;
        }, 2000);
      }
    }, { passive: true });
    
    // Pause during clicks on interactive elements
    document.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || 
          e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
          e.target.hasAttribute('role') && 
          ['button', 'link', 'tab', 'menuitem'].includes(e.target.getAttribute('role'))) {
        
        observersPaused = true;
        // Resume shortly after click
        clearTimeout(window.resumeTimeout);
        window.resumeTimeout = setTimeout(() => {
          observersPaused = false;
        }, 1000);
      }
    }, { passive: true });
    
    // Also watch for focus changes
    document.addEventListener('focus', function(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        observersPaused = true;
      }
    }, { capture: true, passive: true });
    
    document.addEventListener('blur', function(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        // Resume after losing focus
        clearTimeout(window.resumeTimeout);
        window.resumeTimeout = setTimeout(() => {
          observersPaused = false;
        }, 500);
      }
    }, { capture: true, passive: true });
    
    console.log('Interaction guards set up to prevent interference');
  }
  
  // Initialize observers
  function init() {
    // Find conversation container
    conversationContainer = findConversationContainer();
    
    if (!conversationContainer) {
      console.log('No conversation container found, will retry');
      setTimeout(init, 2000);
      return;
    }
    
    console.log('Found conversation container:', conversationContainer);
    
    // Setup interaction guards first
    setupInteractionGuards();
    
    // Setup observers
    setupIntersectionObserver();
    setupResizeObserver();
    if (platform === 'chatgpt') {
      setupMutationObserver();
    }
    
    // Set up periodic scan for new elements, but with adaptive polling
    let scanInterval = 5000; // Start with 5 seconds
    
    function scheduleScan() {
      setTimeout(() => {
        if (!observersPaused) {
          observeMessageElements();
        }
        
        // If we have detected messages, slow down scanning
        if (detectedMessages.length > 0) {
          scanInterval = Math.min(15000, scanInterval * 1.2); // Increase interval up to 15s
        } else {
          scanInterval = 5000; // Reset to 5s if no messages
        }
        
        scheduleScan();
      }, scanInterval);
    }
    
    scheduleScan();
  }
  
  // Start when DOM is ready, but with a slight delay to let the page stabilize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
  } else {
    setTimeout(init, 1000);
  }
})(); 