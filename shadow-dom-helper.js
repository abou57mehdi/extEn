// Helper to access shadow DOM
(function() {
  console.log('Shadow DOM helper initialized');
  
  // Keep track of elements we've already processed
  let processedElements = new WeakSet();
  
  window.getShadowRoots = function(element) {
    const result = [];
    
    function traverse(node) {
      // Skip if already processed to avoid infinite loops
      if (processedElements.has(node)) return;
      processedElements.add(node);
      
      if (node.shadowRoot) {
        result.push(node.shadowRoot);
        
        // Only process direct children of shadow root to reduce DOM traversal
        Array.from(node.shadowRoot.children || []).forEach(child => {
          if (child.tagName && !child.classList.contains('CodeMirror') && !child.classList.contains('monaco-editor')) {
            traverse(child);
          }
        });
      }
      
      // Process a limited number of child elements to reduce performance impact
      if (node.children && node.children.length < 50) { // Skip large containers
        Array.from(node.children).forEach(child => {
          // Skip interactive elements to prevent breaking site functionality
          if (child.tagName && 
              !['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(child.tagName) &&
              !child.classList.contains('CodeMirror') && 
              !child.classList.contains('monaco-editor')) {
            traverse(child);
          }
        });
      }
    }
    
    try {
      traverse(element);
    } catch (e) {
      console.log('Error traversing shadow DOM:', e);
    }
    
    return result;
  };
  
  // Message extraction helper for Shadow DOM with minimal DOM traversal
  window.extractMessagesFromShadow = function() {
    try {
      const messages = [];
      
      // WeakSet doesn't have clear() method, so create a new one each time
      processedElements = new WeakSet();
      const shadows = window.getShadowRoots(document.body);
      
      shadows.forEach(shadow => {
        try {
          // Look for chat messages in shadow with specific selectors to reduce scope
          const messageSelectors = [
            'div[role="listitem"]', 
            '.message:not(input):not(button):not(textarea)', 
            '.chat-message:not(input):not(button):not(textarea)', 
            '.chat-turn:not(input):not(button):not(textarea)',
            '.message-bubble:not(input):not(button):not(textarea)',
            '.message-content:not(input):not(button):not(textarea)'
          ];
          
          // Use a less intensive selector
          const messageElements = shadow.querySelectorAll(messageSelectors.join(','));
          
          if (messageElements.length > 50) {
            // Skip if too many elements to prevent performance issues
            return;
          }
          
          Array.from(messageElements).forEach((msg, index) => {
            try {
              // Skip if the element is an input or interactive element
              if (msg.tagName && ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(msg.tagName)) {
                return;
              }
              
              // Determine role with minimal DOM access
              let role = 'unknown';
              
              if (msg.getAttribute('data-message-author-role') === 'user' || 
                  msg.classList.contains('user') || 
                  msg.getAttribute('data-author') === 'human') {
                role = 'user';
              } else if (msg.getAttribute('data-message-author-role') === 'assistant' || 
                        msg.classList.contains('assistant') || 
                        msg.getAttribute('data-author') === 'assistant') {
                role = 'assistant';
              } else {
                // Fallback based on position (less reliable)
                role = (index % 2 === 0) ? 'user' : 'assistant';
              }
              
              // Get content with minimal DOM access - avoid textContent which is expensive
              let content = '';
              const contentElement = msg.querySelector('.message-content, .prose, .markdown, p');
              
              if (contentElement) {
                // Only get text from the most specific element
                content = contentElement.innerText || '';
              } else {
                // Fallback to innerText which is less expensive than textContent
                content = msg.innerText || '';
              }
              
              if (content && content.trim() && content.length > 5) {
                messages.push({
                  role,
                  content: content.trim(),
                  position: index
                });
              }
            } catch (elementError) {
              // Silently skip problematic elements
            }
          });
        } catch (shadowError) {
          // Silently skip problematic shadow roots
        }
      });
      
      return messages.sort((a, b) => a.position - b.position);
    } catch (e) {
      console.log('Error extracting messages from shadow DOM:', e);
      return [];
    }
  };
  
  // Notify when messages change - use a slower interval to reduce performance impact
  let lastMessageCount = 0;
  let lastMessageHash = '';
  let pollInterval = 3000; // Start with 3 seconds
  let consecutiveNoChanges = 0;
  
  // Use requestAnimationFrame for more browser-friendly timing
  function checkMessages() {
    try {
      // Skip processing if the page is busy (user is typing)
      if (document.activeElement && 
          (document.activeElement.tagName === 'TEXTAREA' || 
           document.activeElement.tagName === 'INPUT')) {
        // Don't check while user is typing to avoid interference
        setTimeout(checkMessages, pollInterval);
        return;
      }
      
      const messages = window.extractMessagesFromShadow();
      
      // Create a simple hash of the messages to detect changes
      const messagesHash = messages.map(m => `${m.role}:${m.content.substring(0, 50)}`).join('|');
      
      if (messages.length !== lastMessageCount || messagesHash !== lastMessageHash) {
        lastMessageCount = messages.length;
        lastMessageHash = messagesHash;
        consecutiveNoChanges = 0;
        pollInterval = 3000; // Reset to base interval when changes detected
        
        if (messages.length > 0) {
          // Use window.postMessage instead of CustomEvent
          window.postMessage({
            type: 'shadow-messages',
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date().toISOString()
            }))
          }, '*');
          
          console.log('Posted shadow DOM messages:', messages.length);
        }
      } else {
        // If no changes, gradually increase the polling interval
        consecutiveNoChanges++;
        if (consecutiveNoChanges > 5) {
          // Slow down polling if no changes (max 10 seconds)
          pollInterval = Math.min(10000, pollInterval * 1.5);
        }
      }
    } catch (e) {
      console.log('Error in checkMessages:', e);
    }
    
    // Schedule next check
    setTimeout(checkMessages, pollInterval);
  }
  
  // Start checking after a delay to let the page load
  setTimeout(checkMessages, 3000);
})(); 