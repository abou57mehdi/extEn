// Message retrieval system
(function() {
  console.log('Message retrieval system initialized');
  
  // Store message history
  const messageHistory = [];
  
  // Universal message detection function
  function detectMessages() {
    let messages = [];
    
    // 1. Try ChatGPT
    try {
      const chatgptMessages = document.querySelectorAll('div[data-message-author-role]');
      if (chatgptMessages.length > 0) {
        console.log('Found ChatGPT messages:', chatgptMessages.length);
        chatgptMessages.forEach((msg, index) => {
          const role = msg.getAttribute('data-message-author-role') === 'user' ? 'user' : 'assistant';
          const contentEl = msg.querySelector('.markdown, .text-base');
          const content = contentEl ? contentEl.textContent : msg.textContent;
          
          if (content && content.trim()) {
            messages.push({
              role,
              content: content.trim(),
              index,
              source: 'chatgpt'
            });
          }
        });
      }
    } catch(e) {
      console.error('Error detecting ChatGPT messages:', e);
    }
    
    // 2. Try Claude
    if (messages.length === 0) {
      try {
        const claudeContainer = document.querySelector('.conversation-container, div.prose.w-full, main, .chat, .conversation');
        if (claudeContainer) {
          const claudeTurns = claudeContainer.querySelectorAll('.conversation-turn, .message, .message-container, div[role="listitem"]');
          
          console.log('Found Claude messages:', claudeTurns.length);
          claudeTurns.forEach((turn, index) => {
            const isHuman = turn.querySelector('.human, .human-message, .user') || 
                            turn.classList.contains('human') || 
                            turn.classList.contains('user');
                            
            const isAssistant = turn.querySelector('.assistant, .assistant-message, .ai') ||
                                turn.classList.contains('assistant') ||
                                turn.classList.contains('ai');
                                
            const role = isHuman ? 'user' : isAssistant ? 'assistant' : (index % 2 === 0 ? 'user' : 'assistant');
            
            const contentEl = turn.querySelector('.prose, .message-content, p');
            const content = contentEl ? contentEl.textContent : turn.textContent;
            
            if (content && content.trim()) {
              messages.push({
                role,
                content: content.trim(),
                index,
                source: 'claude'
              });
            }
          });
        }
      } catch(e) {
        console.error('Error detecting Claude messages:', e);
      }
    }
    
    // 3. Try Gemini
    if (messages.length === 0) {
      try {
        const geminiContainer = document.querySelector('div[role="log"], div[role="main"], div.chat-history');
        if (geminiContainer) {
          const geminiItems = geminiContainer.querySelectorAll('div[role="listitem"], div.chat-turn, div.message-content');
          
          console.log('Found Gemini messages:', geminiItems.length);
          geminiItems.forEach((item, index) => {
            // Determine role
            const isUser = item.querySelector('div[data-test-id="user-input"], div[data-message-type="user"], .user-message');
            const isAI = item.querySelector('div[data-test-id="response"], div[data-message-type="model"], .model-response');
            const role = isUser ? 'user' : isAI ? 'assistant' : (index % 2 === 0 ? 'user' : 'assistant');
            
            // Get content
            const contentEl = item.querySelector('.ProseMirror, div[data-test-id="response-text"], div[data-test-id="query-text"]');
            const content = contentEl ? contentEl.textContent : item.textContent;
            
            if (content && content.trim()) {
              messages.push({
                role,
                content: content.trim(),
                index,
                source: 'gemini'
              });
            }
          });
        }
      } catch(e) {
        console.error('Error detecting Gemini messages:', e);
      }
    }
    
    // Generic approach as fallback
    if (messages.length === 0) {
      try {
        // Find any conversation container
        const container = document.querySelector(
          'div[role="main"], div[role="log"], main, .chat-container, .conversation-container, .chat'
        );
        
        if (container) {
          // Find potential message elements
          const items = container.querySelectorAll(
            'div[role="listitem"], .message, .chat-message, .chat-turn, div[data-message-id], .chat-entry, .turn'
          );
          
          console.log('Found generic messages:', items.length);
          items.forEach((item, index) => {
            if (item.textContent.trim().length < 10) return; // Skip short UI elements
            
            // Determine role based on position
            const role = index % 2 === 0 ? 'user' : 'assistant';
            
            messages.push({
              role,
              content: item.textContent.trim(),
              index,
              source: 'generic'
            });
          });
        }
      } catch(e) {
        console.error('Error in generic message detection:', e);
      }
    }
    
    // Last resort - try paragraphs
    if (messages.length === 0) {
      try {
        const paragraphs = document.querySelectorAll('p, div > div > span');
        const validParagraphs = Array.from(paragraphs)
          .filter(p => p.innerText && p.innerText.trim().length > 15 && 
                      window.getComputedStyle(p).display !== 'none');
        
        if (validParagraphs.length > 1) {
          console.log('Using paragraph fallback, found:', validParagraphs.length);
          
          validParagraphs.forEach((p, index) => {
            messages.push({
              role: index % 2 === 0 ? 'user' : 'assistant',
              content: p.innerText.trim(),
              index,
              source: 'paragraphs'
            });
          });
        }
      } catch(e) {
        console.error('Error in paragraph fallback:', e);
      }
    }
    
    // Sort and deduplicate
    messages = messages
      .sort((a, b) => a.index - b.index)
      .filter((msg, i, arr) => 
        !arr.some((other, j) => i > j && msg.content === other.content && msg.role === other.role)
      );
      
    console.log('Total messages detected:', messages.length);
    return messages;
  }
  
  // Check for messages on a timer
  function checkMessages() {
    const detected = detectMessages();
    
    if (detected.length > 0 && (
        messageHistory.length === 0 || 
        detected.length !== messageHistory.length ||
        JSON.stringify(detected) !== JSON.stringify(messageHistory)
      )) {
      // Update history
      messageHistory.length = 0;
      messageHistory.push(...detected);
      
      // Notify extension using postMessage
      window.postMessage({
        type: 'ai-chat-messages',
        messages: detected.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString(),
          source: msg.source
        }))
      }, '*');
      
      console.log('Posted message event with', detected.length, 'messages');
    }
  }
  
  // Run detection immediately and then every 1 second
  checkMessages();
  setInterval(checkMessages, 1000);
})(); 