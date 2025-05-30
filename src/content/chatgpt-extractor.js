// ChatGPT-specific message extraction functions

// Import selectors or define them here if needed
// const CHATGPT_SELECTORS = ...

/**
 * Specialized extraction function for ChatGPT based on its unique DOM structure
 * @param {HTMLElement} container - The container element to extract messages from
 * @returns {Array} - Array of extracted messages with roles
 */
function extractChatGPTMessages(container) {
  debug(
    "Using specialized ChatGPT message extraction with article-based approach"
  );
  const messages = [];

  try {
    debug("Current URL:", window.location.href);

    // Find all article elements which contain the messages - PRIMARY APPROACH
    const articles = document.querySelectorAll(
      'article[data-testid^="conversation-turn-"]'
    );
    debug(`Found ${articles.length} conversation articles`);

    if (articles.length > 0) {
      // Use the article-based approach as the primary method
      articles.forEach((article) => {
        // Extract the turn number from the data-testid attribute
        const testId = article.getAttribute("data-testid");
        const turnMatch = testId.match(/conversation-turn-(\d+)/);

        if (!turnMatch) {
          debug(`Could not extract turn number from ${testId}`);
          return;
        }

        const turnNumber = parseInt(turnMatch[1], 10);
        // In ChatGPT, odd turn numbers are user, even are assistant
        const role = turnNumber % 2 === 1 ? "user" : "assistant";

        // Extract content from the article
        const content = extractChatGPTArticleContent(article);

        if (content && content.trim()) {
          debug(`Found ${role} message in turn ${turnNumber}`);
          messages.push({
            role,
            content: cleanMessageContent(content),
            timestamp: new Date().toISOString(),
            position: turnNumber,
          });
        }
      });
    } else {
      // FALLBACK: If no articles are found, try alternative selectors
      debug("No article elements found, trying alternative extraction methods");

      // First check for data-message-author-role attributes
      const userRoleElements = document.querySelectorAll(
        'div[data-message-author-role="user"]'
      );
      const assistantRoleElements = document.querySelectorAll(
        'div[data-message-author-role="assistant"]'
      );

      if (userRoleElements.length > 0 || assistantRoleElements.length > 0) {
        debug(
          `Found ${userRoleElements.length} user role elements and ${assistantRoleElements.length} assistant role elements`
        );

        // Process user messages
        Array.from(userRoleElements).forEach((el, index) => {
          const content = extractTextFromNode(el);
          if (content && content.trim()) {
            messages.push({
              role: "user",
              content: cleanMessageContent(content),
              timestamp: new Date().toISOString(),
              position: index * 2,
            });
          }
        });

        // Process assistant messages
        Array.from(assistantRoleElements).forEach((el, index) => {
          const content = extractTextFromNode(el);
          if (content && content.trim()) {
            messages.push({
              role: "assistant",
              content: cleanMessageContent(content),
              timestamp: new Date().toISOString(),
              position: index * 2 + 1,
            });
          }
        });
      } else {
        // Last resort: try to find message containers using common class names
        debug("No role attributes found, trying class-based selectors");

        const userSelectors = ".text-token-text-primary, div.min-h-[20px]";
        const assistantSelectors = ".markdown.prose, .text-base";

        const userMessages = Array.from(
          document.querySelectorAll(userSelectors)
        ).filter(
          (el) =>
            isElementVisibleAndExists(el) && el.textContent.trim().length > 0
        );

        const aiMessages = Array.from(
          document.querySelectorAll(assistantSelectors)
        ).filter(
          (el) =>
            isElementVisibleAndExists(el) && el.textContent.trim().length > 0
        );

        debug(
          `Found ${userMessages.length} user messages and ${aiMessages.length} AI messages with alternative selectors`
        );

        // Process user messages
        userMessages.forEach((msg, index) => {
          const content = extractTextFromNode(msg);
          if (content && content.trim()) {
            messages.push({
              role: "user",
              content: cleanMessageContent(content),
              timestamp: new Date().toISOString(),
              position: index * 2,
            });
          }
        });

        // Process AI messages
        aiMessages.forEach((msg, index) => {
          const content = extractTextFromNode(msg);
          if (content && content.trim()) {
            messages.push({
              role: "assistant",
              content: cleanMessageContent(content),
              timestamp: new Date().toISOString(),
              position: index * 2 + 1,
            });
          }
        });
      }
    }

    // Sort by position and remove the position property
    messages.sort((a, b) => a.position - b.position);
    messages.forEach((msg) => delete msg.position);

    debug("ChatGPT messages extracted:", messages.length);
  } catch (error) {
    debug("Error in ChatGPT extraction:", error);
  }

  return messages;
}

/**
 * Extract content from a ChatGPT article element
 * @param {HTMLElement} article - The article element containing the message
 * @returns {string} - The extracted message content
 */
function extractChatGPTArticleContent(article) {
  // Look for specific message container elements
  const messageContent = article.querySelector(
    ".text-base, div.min-h-\\[20px\\], div.markdown, .text-token-text-primary"
  );

  if (messageContent) {
    // Extract specially formatted content
    const codeBlocks = messageContent.querySelectorAll(
      'pre code, pre[class*="language-"]'
    );
    if (codeBlocks.length > 0) {
      // Handle code blocks specially
      let content = "";

      // Process all text nodes and code blocks in order
      const childNodes = Array.from(messageContent.childNodes);
      let inCode = false;

      for (const node of childNodes) {
        // Check if this is or contains a code block
        const codeBlock =
          node.tagName === "PRE" ? node.querySelector("code") : null;

        if (codeBlock) {
          // Get language if available
          const language =
            codeBlock.className.match(/language-(\w+)/)?.[1] || "";
          content += `\`\`\`${language}\n${codeBlock.textContent}\n\`\`\`\n\n`;
          inCode = true;
        } else if (!inCode && node.textContent.trim()) {
          // Regular text outside code blocks
          content += node.textContent + "\n";
        }

        // Reset code flag
        if (inCode && node.tagName === "PRE") inCode = false;
      }

      return content.trim();
    }

    // If no special code blocks, just get text content
    return messageContent.textContent.trim();
  }

  // Fallback to entire article text
  return article.textContent.trim();
}

// Export the functions if using modules
// export { extractChatGPTMessages, extractChatGPTArticleContent };
