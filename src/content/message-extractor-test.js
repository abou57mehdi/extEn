// Message Extractor Test Script
// This script can be injected into any AI chat page to test message extraction

(function() {
  console.log('Message Extractor Test Script Loaded');
  
  // Platform detection
  function detectPlatform() {
    const hostname = window.location.hostname;
    console.log("Checking hostname:", hostname);
    
    if (hostname.includes("chat.openai.com")) {
      console.log("Detected ChatGPT");
      return "ChatGPT";
    } else if (hostname.includes("claude.ai")) {
      console.log("Detected Claude");
      return "Claude";
    } else if (hostname.includes("gemini.google.com")) {
      console.log("Detected Gemini");
      return "Gemini";
    }
    console.log("No platform detected");
    return null;
  }
  
  // Platform configurations
  const AI_PLATFORMS = {
    ChatGPT: {
      domain: "chat.openai.com",
      messageSelector: "div.text-base, div.min-h-8.text-message, article[data-testid^='conversation-turn-'] div.text-message-content",
      userIndicator: "[data-message-author-role='user'], article[data-testid='conversation-turn-user'], div.group/conversation-turn.relative",
      containerSelector: "main, div[role='presentation'], div.flex.flex-col.items-center, div.flex.h-full.w-full.flex-col",
    },
    Claude: {
      domain: "claude.ai",
      messageSelector: "div.prose, div.text-message-content",
      userIndicator: "div.user-message, div.flex.min-h-screen.w-full.overflow-x-hidden div[role='region'] + div",
      containerSelector: "main.flex-1, div.overflow-y-auto, div.flex.min-h-screen.w-full",
    },
    Gemini: {
      domain: "gemini.google.com",
      messageSelector: ".message-content",
      userIndicator: ".user-message",
      containerSelector: "div[role='log']",
    },
  };
  
  // Extract messages based on platform
  function extractMessages() {
    const platform = detectPlatform();
    if (!platform) {
      console.log("No platform detected, cannot extract messages");
      return [];
    }
    
    console.log(`Extracting messages for ${platform}...`);
    const platformConfig = AI_PLATFORMS[platform];
    const messages = [];
    
    try {
      // Find container
      let container = null;
      const possibleSelectors = platformConfig.containerSelector.split(", ");
      
      for (const selector of possibleSelectors) {
        container = document.querySelector(selector);
        if (container) {
          console.log(`Found container with selector: ${selector}`);
          break;
        }
      }
      
      if (!container) {
        console.warn("Message container not found");
        return [];
      }
      
      // ChatGPT-specific extraction
      if (platform === "ChatGPT") {
        console.log("Using ChatGPT-specific message extraction");
        
        // Try conversation turns first (newest UI)
        const conversationTurns = container.querySelectorAll('article[data-testid^="conversation-turn-"]');
        
        if (conversationTurns && conversationTurns.length > 0) {
          console.log(`Found ${conversationTurns.length} conversation turns with article elements`);
          
          conversationTurns.forEach((turn, index) => {
            // Determine role from data-testid attribute
            const testId = turn.getAttribute("data-testid") || "";
            const role = testId.includes("-user") ? "user" : "assistant";
            
            // Extract content from the turn - multiple approaches
            let content = "";
            
            // Approach 1: Look for text-base
            const textBase = turn.querySelector(".text-base");
            if (textBase) {
              content = textBase.textContent.trim();
            }
            // Approach 2: Look for min-h-8.text-message
            else if (!content) {
              const textMessage = turn.querySelector(".min-h-8.text-message");
              if (textMessage) {
                content = textMessage.textContent.trim();
              }
            }
            // Approach 3: If no content yet, try to get all text except sr-only
            else if (!content) {
              // Clone the node to avoid modifying the original
              const clone = turn.cloneNode(true);
              
              // Remove sr-only elements
              const srOnlyElements = clone.querySelectorAll(".sr-only");
              srOnlyElements.forEach(el => el.remove());
              
              content = clone.textContent.trim();
            }
            
            if (content) {
              messages.push({ 
                role, 
                content,
                index,
                source: 'conversation-turn'
              });
            }
          });
        } else {
          // Try data-message-author-role elements
          const messageElements = container.querySelectorAll("[data-message-author-role]");
          
          if (messageElements && messageElements.length > 0) {
            console.log(`Found ${messageElements.length} messages with data-message-author-role`);
            
            messageElements.forEach((msg, index) => {
              const role = msg.getAttribute("data-message-author-role");
              let content = "";
              
              // Try to find content in text-base div first
              const textBase = msg.closest(".text-base");
              if (textBase) {
                content = textBase.textContent.trim();
              }
              // Try to find content in min-h-8.text-message
              else if (!content) {
                const textMessage = msg.closest(".min-h-8.text-message");
                if (textMessage) {
                  content = textMessage.textContent.trim();
                }
              }
              // Fallback to direct text content
              else {
                content = msg.textContent.trim();
              }
              
              if (content) {
                messages.push({ 
                  role, 
                  content,
                  index,
                  source: 'data-message-author-role'
                });
              }
            });
          }
        }
      } 
      // Claude-specific extraction
      else if (platform === "Claude") {
        console.log("Using Claude-specific message extraction");
        
        // Get all message elements
        const messageElements = container.querySelectorAll(platformConfig.messageSelector);
        console.log(`Found ${messageElements.length} message elements for Claude`);
        
        if (messageElements.length > 0) {
          // Group messages by their parent container to identify conversation turns
          const messageGroups = {};
          
          messageElements.forEach((el, index) => {
            // Find the closest parent that might be a message container
            const parent = el.closest('.flex.items-start, .flex.flex-col, .w-full.border-b');
            const parentId = parent ? (parent.id || `parent-${index}`) : `no-parent-${index}`;
            
            if (!messageGroups[parentId]) {
              messageGroups[parentId] = [];
            }
            
            messageGroups[parentId].push(el);
          });
          
          console.log(`Grouped into ${Object.keys(messageGroups).length} message groups for Claude`);
          
          // Process each group to determine role and content
          let lastRole = null; // Track last role to avoid duplicates
          
          Object.values(messageGroups).forEach((group, groupIndex) => {
            // Determine if this is a user message
            const isUserMessage = group.some(el => 
              el.matches(platformConfig.userIndicator) || 
              el.closest(platformConfig.userIndicator) !== null ||
              el.parentElement?.matches(platformConfig.userIndicator) ||
              el.parentElement?.closest(platformConfig.userIndicator) !== null
            );
            
            // Determine role based on user indicator and alternating pattern
            let role;
            
            if (isUserMessage) {
              role = "user";
            } else {
              // If no explicit indicators, check the DOM structure
              // In Claude, user messages are often in a different container structure
              const hasUserMessageStructure = group.some(el => {
                const parent = el.closest('div[role="region"] + div');
                return parent !== null;
              });
              
              if (hasUserMessageStructure) {
                role = "user";
              } else {
                // If not explicitly a user message, it's an assistant message
                role = "assistant";
              }
            }
            
            // Skip if this would create consecutive messages with the same role
            if (role === lastRole && messages.length > 0) {
              console.log(`Skipping consecutive ${role} message`);
              return;
            }
            
            // Combine all text in the group
            const content = group.map(el => el.textContent.trim()).join('\n').trim();
            
            if (content) {
              messages.push({
                role,
                content,
                groupIndex,
                source: 'claude-group'
              });
              
              lastRole = role;
            }
          });
        }
      }
      // Standard processing for other platforms
      else {
        const messageElements = container.querySelectorAll(platformConfig.messageSelector);
        console.log(`Found ${messageElements.length} message elements`);
        
        messageElements.forEach((msg, index) => {
          const isUser = 
            msg.matches(platformConfig.userIndicator) ||
            msg.closest(platformConfig.userIndicator) !== null;
          
          messages.push({
            role: isUser ? "user" : "assistant",
            content: msg.textContent.trim(),
            index,
            source: 'standard'
          });
        });
      }
      
      console.log(`Extracted ${messages.length} messages`);
    } catch (error) {
      console.error("Error extracting messages:", error);
    }
    
    return messages;
  }
  
  // Display messages in a floating panel
  function displayMessages(messages) {
    // Remove any existing panel
    const existingPanel = document.getElementById('message-extractor-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    // Create panel
    const panel = document.createElement('div');
    panel.id = 'message-extractor-panel';
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.right = '20px';
    panel.style.width = '400px';
    panel.style.maxHeight = '80vh';
    panel.style.overflowY = 'auto';
    panel.style.backgroundColor = '#fff';
    panel.style.border = '1px solid #ccc';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    panel.style.zIndex = '10000';
    panel.style.padding = '16px';
    panel.style.fontFamily = 'Arial, sans-serif';
    panel.style.fontSize = '14px';
    panel.style.color = '#333';
    
    // Add header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '16px';
    header.style.borderBottom = '1px solid #eee';
    header.style.paddingBottom = '8px';
    
    const title = document.createElement('h3');
    title.textContent = `Extracted Messages (${messages.length})`;
    title.style.margin = '0';
    title.style.fontSize = '16px';
    title.style.fontWeight = 'bold';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#666';
    closeButton.onclick = () => panel.remove();
    
    header.appendChild(title);
    header.appendChild(closeButton);
    panel.appendChild(header);
    
    // Add message list
    const messageList = document.createElement('div');
    
    messages.forEach((msg, index) => {
      const messageItem = document.createElement('div');
      messageItem.style.marginBottom = '12px';
      messageItem.style.padding = '8px';
      messageItem.style.borderRadius = '6px';
      messageItem.style.backgroundColor = msg.role === 'user' ? '#f0f7ff' : '#f5f5f5';
      messageItem.style.borderLeft = `4px solid ${msg.role === 'user' ? '#0066cc' : '#666'}`;
      
      const roleLabel = document.createElement('div');
      roleLabel.textContent = msg.role.toUpperCase();
      roleLabel.style.fontWeight = 'bold';
      roleLabel.style.marginBottom = '4px';
      roleLabel.style.fontSize = '12px';
      roleLabel.style.color = msg.role === 'user' ? '#0066cc' : '#666';
      
      const contentPreview = document.createElement('div');
      contentPreview.textContent = msg.content.length > 100 ? 
        msg.content.substring(0, 100) + '...' : 
        msg.content;
      contentPreview.style.fontSize = '13px';
      contentPreview.style.lineHeight = '1.4';
      
      const sourceInfo = document.createElement('div');
      sourceInfo.textContent = `Source: ${msg.source || 'unknown'}, Index: ${msg.index || msg.groupIndex || index}`;
      sourceInfo.style.fontSize = '11px';
      sourceInfo.style.color = '#999';
      sourceInfo.style.marginTop = '4px';
      
      messageItem.appendChild(roleLabel);
      messageItem.appendChild(contentPreview);
      messageItem.appendChild(sourceInfo);
      messageList.appendChild(messageItem);
    });
    
    panel.appendChild(messageList);
    
    // Add actions
    const actions = document.createElement('div');
    actions.style.marginTop = '16px';
    actions.style.display = 'flex';
    actions.style.justifyContent = 'space-between';
    
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh';
    refreshButton.style.padding = '8px 16px';
    refreshButton.style.backgroundColor = '#4CAF50';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '4px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.onclick = () => {
      const updatedMessages = extractMessages();
      displayMessages(updatedMessages);
    };
    
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy to Clipboard';
    copyButton.style.padding = '8px 16px';
    copyButton.style.backgroundColor = '#2196F3';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    copyButton.onclick = () => {
      const formattedMessages = messages.map(msg => 
        `${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n\n');
      
      navigator.clipboard.writeText(formattedMessages)
        .then(() => {
          alert('Messages copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy messages:', err);
          alert('Failed to copy messages. See console for details.');
        });
    };
    
    actions.appendChild(refreshButton);
    actions.appendChild(copyButton);
    panel.appendChild(actions);
    
    // Add to page
    document.body.appendChild(panel);
  }
  
  // Add a button to the page to trigger extraction
  function addExtractButton() {
    const button = document.createElement('button');
    button.textContent = 'Extract Messages';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '10px 16px';
    button.style.backgroundColor = '#2196F3';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    button.style.fontSize = '14px';
    button.style.fontFamily = 'Arial, sans-serif';
    
    button.addEventListener('click', () => {
      console.log('Extract button clicked');
      const messages = extractMessages();
      console.log('Extracted messages:', messages);
      displayMessages(messages);
    });
    
    document.body.appendChild(button);
  }
  
  // Run initial extraction after a delay
  setTimeout(() => {
    const messages = extractMessages();
    console.log('Initial extraction:', messages);
  }, 3000);
  
  // Add the extract button
  setTimeout(addExtractButton, 2000);
})();
