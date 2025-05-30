// Debug script for ChatGPT detection - Updated based on DOM screenshots
// This script can be injected into the ChatGPT page to debug detection issues

(function() {
  console.log('ChatGPT Debug Script Loaded - Updated Version');

  // Log DOM structure
  function logDOMStructure() {
    console.log('Logging DOM structure for ChatGPT...');

    // Find main container - based on screenshots
    const mainElement = document.querySelector('main');
    if (!mainElement) {
      console.log('Main element not found');
      return;
    }

    console.log('Main element:', mainElement);

    // Log key elements - updated based on screenshots
    const keySelectors = [
      'article[data-testid^="conversation-turn-"]', // New selector from screenshots
      'div[data-message-author-role]',
      'div.text-base',
      'div.group/conversation-turn',
      'div.flex.w-full',
      'div.relative.flex-col.gap-1',
      'div.flex.flex-col.items-start',
      'h5.sr-only', // Text labels from screenshots
      'div.min-h-8.text-message'
    ];

    keySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}" found ${elements.length} elements`);

        if (elements.length > 0 && elements.length < 10) {
          // Log details of first few elements
          Array.from(elements).slice(0, 3).forEach((el, i) => {
            console.log(`Element ${i} for "${selector}":`, {
              tagName: el.tagName,
              id: el.id,
              className: el.className,
              textContent: el.textContent.substring(0, 50) + '...',
              attributes: Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ')
            });
          });
        }
      } catch (error) {
        console.error(`Error with selector "${selector}":`, error);
      }
    });

    // Check for conversation turns - updated based on screenshots
    const conversationTurns = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
    if (conversationTurns.length > 0) {
      console.log('Found conversation turns, checking roles...');

      // Log each conversation turn
      conversationTurns.forEach((turn, index) => {
        const testId = turn.getAttribute('data-testid') || '';
        const role = testId.includes('-user') ? 'user' : 'assistant';
        const textContent = turn.textContent.substring(0, 100) + '...';

        console.log(`Turn ${index + 1}: role=${role}, testId=${testId}, content=${textContent}`);

        // Try to find the actual message content
        const textBase = turn.querySelector('.text-base');
        const h5 = turn.querySelector('h5.sr-only');

        if (textBase) {
          console.log(`  - Found .text-base with content: ${textBase.textContent.substring(0, 50)}...`);
        }

        if (h5) {
          console.log(`  - Found h5.sr-only with content: ${h5.textContent}`);
        }
      });
    } else {
      console.log('No conversation turns found with article[data-testid^="conversation-turn-"]');

      // Try alternative selectors
      const altTurns = document.querySelectorAll('div.group/conversation-turn, div.flex.w-full.gap-1.relative');
      console.log(`Found ${altTurns.length} potential conversation turns with alternative selectors`);
    }

    // Check for data-message-author-role - from screenshots
    const roleElements = document.querySelectorAll('[data-message-author-role]');
    if (roleElements.length > 0) {
      console.log('Found elements with data-message-author-role, checking roles...');

      const userRoles = document.querySelectorAll('[data-message-author-role="user"]');
      const assistantRoles = document.querySelectorAll('[data-message-author-role="assistant"]');

      console.log(`User roles: ${userRoles.length}, Assistant roles: ${assistantRoles.length}`);

      // Log each message with role
      roleElements.forEach((el, index) => {
        const role = el.getAttribute('data-message-author-role');
        const messageId = el.getAttribute('data-message-id');
        const content = el.textContent.substring(0, 50) + '...';

        console.log(`Message ${index + 1}: role=${role}, id=${messageId}, content=${content}`);
      });
    }

    // Try to find the actual message content containers
    console.log('Searching for message content containers...');

    // Based on screenshots, these might contain the actual message content
    const contentContainers = [
      document.querySelectorAll('div.min-h-8.text-message'),
      document.querySelectorAll('div.text-base'),
      document.querySelectorAll('div.flex-col.gap-1'),
      document.querySelectorAll('div.flex.w-full.flex-col')
    ];

    contentContainers.forEach((containers, i) => {
      if (containers.length > 0) {
        console.log(`Found ${containers.length} potential content containers with selector ${i + 1}`);

        // Log a sample of containers
        Array.from(containers).slice(0, 3).forEach((container, j) => {
          console.log(`Container ${j + 1} content: ${container.textContent.substring(0, 50)}...`);
        });
      }
    });
  }

  // Extract messages function - this will attempt to extract messages using the DOM structure
  function extractMessages() {
    console.log('Attempting to extract messages from ChatGPT...');
    const messages = [];

    // Try conversation turns first (from screenshots)
    const conversationTurns = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
    if (conversationTurns.length > 0) {
      console.log(`Found ${conversationTurns.length} conversation turns`);

      conversationTurns.forEach((turn, index) => {
        const testId = turn.getAttribute('data-testid') || '';
        const role = testId.includes('-user') ? 'user' : 'assistant';

        // Try to find the content - multiple approaches
        let content = '';

        // Approach 1: Look for text-base
        const textBase = turn.querySelector('.text-base');
        if (textBase) {
          content = textBase.textContent.trim();
        }

        // Approach 2: If no content yet, try to get all text except sr-only
        if (!content) {
          // Clone the node to avoid modifying the original
          const clone = turn.cloneNode(true);

          // Remove sr-only elements
          const srOnlyElements = clone.querySelectorAll('.sr-only');
          srOnlyElements.forEach(el => el.remove());

          content = clone.textContent.trim();
        }

        if (content) {
          messages.push({
            role,
            content,
            index
          });
        }
      });
    } else {
      // Try data-message-author-role approach (also from screenshots)
      const messageElements = document.querySelectorAll('[data-message-author-role]');
      if (messageElements.length > 0) {
        console.log(`Found ${messageElements.length} messages with data-message-author-role`);

        messageElements.forEach((el, index) => {
          const role = el.getAttribute('data-message-author-role');
          const content = el.textContent.trim();

          if (content) {
            messages.push({
              role,
              content,
              index
            });
          }
        });
      }
    }

    console.log(`Extracted ${messages.length} messages:`, messages);
    return messages;
  }

  // Run the debug function
  logDOMStructure();

  // Also run after a delay to ensure the UI is fully loaded
  setTimeout(() => {
    logDOMStructure();
    extractMessages();
  }, 3000);

  // Add a button to the page to trigger debugging
  function addDebugButton() {
    const button = document.createElement('button');
    button.textContent = 'Debug ChatGPT Detection';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '10px';
    button.style.backgroundColor = '#10a37f';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', () => {
      console.log('Debug button clicked');
      logDOMStructure();
      const messages = extractMessages();
      console.log('Extracted messages:', messages);

      // Show a visual confirmation
      const messageCount = messages.length;
      alert(`Found ${messageCount} messages in the conversation. Check the console for details.`);
    });

    document.body.appendChild(button);
  }

  // Add the debug button
  setTimeout(addDebugButton, 2000);
})();
