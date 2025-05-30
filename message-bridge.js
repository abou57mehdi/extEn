// Message bridge for content script communication with DOM diffing
(function() {
  console.log('Message bridge initialized');
  
  // Detect which platform we're on
  function detectPlatform() {
    const url = window.location.href;
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai') || url.includes('anthropic.com')) return 'claude';
    if (url.includes('bard.google.com') || url.includes('gemini.google.com')) return 'gemini';
    return 'unknown';
  }
  
  const platform = detectPlatform();
  console.log('Message bridge initialized on platform:', platform);
  
  // Flag to pause processing during user interaction
  let processingPaused = false;
  
  // Simple DOM diffing implementation
  // (We'll use a lightweight version since DiffDOM library would be large)
  const DOMDiff = {
    // Store previous DOM state for comparison
    previousState: null,
    
    // Capture current DOM state of message container
    captureState: function(container) {
      if (!container) return null;
      
      try {
        // Capture simple representation of message elements
        let messageElements;
        
        if (platform === 'chatgpt') {
          messageElements = container.querySelectorAll(
            'div[data-message-author-role], div.group.w-full, div[data-testid="conversation-turn"], div.markdown, div.min-h-[20px]'
          );
        } else {
          messageElements = container.querySelectorAll(
            '.message, .chat-message, div[data-message-author-role], .conversation-turn, div[role="listitem"]'
          );
        }
        
        // Skip if we have too many elements to avoid performance issues
        if (messageElements.length > 200) {
          console.log(`DOMDiff: Too many elements (${messageElements.length}), skipping capture`);
          return this.previousState || [];
        }
        
        console.log(`DOMDiff: Found ${messageElements.length} message elements to track`);
        
        // Filter out interactive elements to avoid interfering with site functionality
        return Array.from(messageElements)
          .filter(element => 
            element.tagName && 
            !['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(element.tagName))
          .map(element => ({
            role: this.getMessageRole(element),
            content: element.innerText || element.textContent,
            position: Array.from(element.parentNode.children).indexOf(element)
          }));
      } catch (e) {
        console.error('Error capturing DOM state:', e);
        return null;
      }
    },
    
    // Determine message role from element
    getMessageRole: function(element) {
      if (platform === 'chatgpt') {
        if (element.hasAttribute('data-message-author-role')) {
          return element.getAttribute('data-message-author-role');
        }
        
        // Look for ChatGPT specific indicators
        if (element.classList.contains('dark:bg-gray-800') || 
            element.closest('div.dark:bg-gray-800') ||
            element.closest('[data-message-author-role="user"]')) {
          return 'user';
        }
        
        if (element.classList.contains('dark:bg-gray-700') || 
            element.closest('div.dark:bg-gray-700') ||
            element.closest('[data-message-author-role="assistant"]')) {
          return 'assistant';
        }
        
        // Parent check
        const parent = element.closest('div.group');
        if (parent) {
          if (parent.classList.contains('dark:bg-gray-800')) {
            return 'user';
          } else {
            return 'assistant';
          }
        }
      } else {
        // Generic platform checks
        if (element.hasAttribute('data-message-author-role')) {
          return element.getAttribute('data-message-author-role');
        }
        
        if (element.classList.contains('user') || 
            element.querySelector('.user') ||
            element.classList.contains('human')) {
          return 'user';
        }
        
        if (element.classList.contains('assistant') || 
            element.querySelector('.assistant') ||
            element.classList.contains('ai')) {
          return 'assistant';
        }
      }
      
      // Default to position-based role assignment
      const position = Array.from(element.parentNode.children).indexOf(element);
      return position % 2 === 0 ? 'user' : 'assistant';
    },
    
    // Check for changes in DOM state
    detectChanges: function(container) {
      if (processingPaused) return null;
      
      const newState = this.captureState(container);
      
      if (!newState) return null;
      
      // If no previous state, all messages are new
      if (!this.previousState) {
        this.previousState = newState;
        return {
          added: newState,
          removed: [],
          changed: []
        };
      }
      
      // Find added messages
      const added = newState.filter(newMsg => 
        !this.previousState.some(prevMsg => 
          prevMsg.content === newMsg.content && prevMsg.role === newMsg.role
        )
      );
      
      // Find removed messages
      const removed = this.previousState.filter(prevMsg => 
        !newState.some(newMsg => 
          newMsg.content === prevMsg.content && newMsg.role === prevMsg.role
        )
      );
      
      // Find changed messages (same position, different content)
      const changed = newState.filter(newMsg => {
        const prevMsg = this.previousState.find(msg => msg.position === newMsg.position);
        return prevMsg && (prevMsg.content !== newMsg.content || prevMsg.role !== newMsg.role);
      });
      
      // Update previous state
      this.previousState = newState;
      
      return {
        added,
        removed,
        changed
      };
    }
  };
  
  // Find conversation container
  function findConversationContainer() {
    // Platform-specific containers
    const possibleContainers = [];
    
    if (platform === 'chatgpt') {
      // ChatGPT specific containers
      possibleContainers.push(
        'div[role="presentation"]',
        'div.flex.flex-col.text-sm',
        'main div.flex-1.overflow-hidden',
        'div.flex.flex-col.items-center.text-sm',
        'div[data-testid="conversation-turn-list"]',
        'div.flex-1.overflow-hidden',
        'main'
      );
    } else if (platform === 'claude') {
      // Claude specific containers
      possibleContainers.push(
        'div.prose.w-full',
        'div.conversation-container',
        'main.flex-1',
        'div[role="main"]'
      );
    } else if (platform === 'gemini') {
      // Gemini specific containers
      possibleContainers.push(
        'div[role="log"]',
        'div.chat-history',
        'div[role="main"]'
      );
    } else {
      // Generic
      possibleContainers.push(
        'main',
        '.chat-container'
      );
    }
    
    for (const selector of possibleContainers) {
      try {
        const container = document.querySelector(selector);
        if (container && container.children.length > 0) {
          console.log('Found conversation container with selector:', selector);
          return container;
        }
      } catch (e) {
        console.error('Error finding container with selector:', selector, e);
      }
    }
    
    console.log('No specific container found, trying fallback to body');
    return document.body;
  }
  
  // Set up pause mechanism during user interaction
  function setupInteractionGuards() {
    // Pause during user typing or clicking
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        processingPaused = true;
        // Resume after typing stops
        clearTimeout(window.resumeTimeout);
        window.resumeTimeout = setTimeout(() => {
          processingPaused = false;
        }, 2000);
      }
    }, { passive: true });
    
    // Pause during clicks on interactive elements
    document.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || 
          e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
          e.target.hasAttribute('role') && 
          ['button', 'link', 'tab', 'menuitem'].includes(e.target.getAttribute('role'))) {
        
        processingPaused = true;
        // Resume shortly after click
        clearTimeout(window.resumeTimeout);
        window.resumeTimeout = setTimeout(() => {
          processingPaused = false;
        }, 1000);
      }
    }, { passive: true });
    
    // Also watch for focus changes
    document.addEventListener('focus', function(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        processingPaused = true;
      }
    }, { capture: true, passive: true });
    
    document.addEventListener('blur', function(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        // Resume after losing focus
        clearTimeout(window.resumeTimeout);
        window.resumeTimeout = setTimeout(() => {
          processingPaused = false;
        }, 500);
      }
    }, { capture: true, passive: true });
    
    console.log('Interaction guards set up to prevent interference');
  }
  
  // Bridge to relay messages from observers
  window.addEventListener('message', event => {
    // Only accept messages from the same window
    if (event.source !== window) return;
    
    // Relay messages from observers to content script
    if (event.data.type === 'observer-messages') {
      console.log('Received messages from observers, relaying to content script');
      window.postMessage({
        type: 'bridge-relay',
        source: 'observers',
        messages: event.data.messages,
        platform: event.data.platform || platform
      }, '*');
    }
  });
  
  // Setup DOM diffing with less aggressive polling
  let checkInterval = 3000; // Start with 3 seconds
  let consecutiveNoChanges = 0;
  
  function setupDOMDiffing(container) {
    if (!container) {
      console.log('No container found for DOM diffing');
      return;
    }
    
    console.log('Setting up DOM diffing for container');
    
    // First, set up interaction guards
    setupInteractionGuards();
    
    // Check for changes adaptively
    function checkForChanges() {
      if (processingPaused) {
        // Skip this check if paused
        setTimeout(checkForChanges, checkInterval);
        return;
      }
      
      const changes = DOMDiff.detectChanges(container);
      
      if (changes && (changes.added.length > 0 || changes.changed.length > 0)) {
        console.log('DOM changes detected:', changes);
        
        // Reset the check interval when changes are detected
        checkInterval = 3000;
        consecutiveNoChanges = 0;
        
        // Notify about new and changed messages
        const messages = [...changes.added, ...changes.changed].map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString()
        }));
        
        if (messages.length > 0) {
          console.log(`Sending ${messages.length} messages from DOM diff`);
          window.postMessage({
            type: 'bridge-relay',
            source: 'dom-diff',
            messages,
            platform
          }, '*');
        }
      } else {
        // If no changes, gradually slow down checking
        consecutiveNoChanges++;
        if (consecutiveNoChanges > 5) {
          // Increase check interval up to 10 seconds max
          checkInterval = Math.min(10000, checkInterval * 1.5);
        }
      }
      
      // Schedule next check
      setTimeout(checkForChanges, checkInterval);
    }
    
    // Start checking for changes after a delay
    setTimeout(checkForChanges, 3000);
    
    // For ChatGPT, add a MutationObserver for more reliable change detection
    if (platform === 'chatgpt') {
      console.log('Setting up additional MutationObserver for ChatGPT');
      
      // Use debouncing to avoid excessive processing
      let mutationTimeout;
      
      const observer = new MutationObserver(() => {
        // Skip if paused
        if (processingPaused) return;
        
        // Debounce to reduce CPU usage
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(() => {
          // Trigger a check when DOM changes
          const changes = DOMDiff.detectChanges(container);
          if (changes && (changes.added.length > 0 || changes.changed.length > 0)) {
            console.log('DOM changes detected by MutationObserver:', changes);
            
            // Notify about new and changed messages
            const messages = [...changes.added, ...changes.changed].map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date().toISOString()
            }));
            
            if (messages.length > 0) {
              window.postMessage({
                type: 'bridge-relay',
                source: 'dom-diff-mutation',
                messages,
                platform
              }, '*');
            }
          }
        }, 1000); // 1 second debounce
      });
      
      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: false // Disable characterData to reduce overhead
      });
    }
  }
  
  // Initialize after a delay to let the page fully load
  setTimeout(() => {
    const container = findConversationContainer();
    setupDOMDiffing(container);
    
    // Load external scripts if needed
    function loadScript(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // Try to load observers
    try {
      // Check if we're in a Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('observers.js');
        document.head.appendChild(script);
        console.log('Loaded observers.js from extension');
      } else {
        console.log('Not in a Chrome extension context, skipping observers.js');
        // Fallback: try to load observers.js directly if it might be available
        try {
          const script = document.createElement('script');
          script.src = 'observers.js';
          document.head.appendChild(script);
          console.log('Attempted to load observers.js directly');
        } catch (err) {
          console.log('Could not load observers.js directly:', err);
        }
      }
    } catch (e) {
      console.error('Error loading observers:', e);
    }
  }, 2000); // Wait 2 seconds before initialization
})(); 