// Enhanced ChatGPT content script
// This needs to be added to the extension's content.js file to fix ChatGPT extraction

// ====== ADD THIS TO YOUR content.js FILE ======

// Enhanced ChatGPT detection - add to detectAIPlatform function
if (hostname.includes("chat.openai.com")) {
  console.log("ChatGPT detected by hostname, using enhanced detection");

  // Try to find ChatGPT container with more aggressive approach
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait longer for DOM

  // First look specifically for article elements which contain the messages
  const articles = document.querySelectorAll(
    'article[data-testid^="conversation-turn-"]'
  );
  console.log(`Found ${articles.length} ChatGPT message articles`);

  if (articles.length > 0) {
    // Find the thread container or main container
    const threadContainer = document.querySelector('#thread, main[id="main"]');

    if (threadContainer) {
      console.log(
        "Found ChatGPT thread container:",
        threadContainer.id || threadContainer.tagName
      );
      return {
        name: "CHATGPT",
        container: threadContainer,
        selectors: AI_PLATFORMS.CHATGPT.selectors,
      };
    } else {
      // If thread container not found, use the parent of the first article
      const parent = articles[0].parentElement;
      if (parent) {
        console.log("Using article parent as ChatGPT container");
        return {
          name: "CHATGPT",
          container: parent,
          selectors: AI_PLATFORMS.CHATGPT.selectors,
        };
      }
    }
  }
}

// Enhanced ChatGPT message extraction - add to extractConversation function
// Replace or modify the existing extraction logic for ChatGPT
if (platform.name === "CHATGPT") {
  console.log("Using specialized ChatGPT extraction");

  // Find all article elements which contain the messages
  const articles = document.querySelectorAll(
    'article[data-testid^="conversation-turn-"]'
  );
  console.log(`Found ${articles.length} conversation articles`);

  if (articles.length > 0) {
    const extractedMessages = [];
    articles.forEach((article) => {
      // Extract the turn number from the data-testid attribute
      const testId = article.getAttribute("data-testid");
      const turnMatch = testId.match(/conversation-turn-(\d+)/);

      if (!turnMatch) return;

      const turnNumber = parseInt(turnMatch[1], 10);
      // In ChatGPT, odd turn numbers are user, even are assistant
      const role = turnNumber % 2 === 1 ? "user" : "assistant";

      // Find message content container - specific for ChatGPT's DOM structure
      const contentDiv = article.querySelector(
        ".text-base, .min-h-\\[20px\\], .markdown.prose, .text-token-text-primary"
      );
      const content = contentDiv ? contentDiv.textContent : article.textContent;

      if (content && content.trim()) {
        extractedMessages.push({
          role,
          content: cleanMessageContent(content),
          timestamp: new Date().toISOString(),
          position: turnNumber,
        });
      }
    });

    if (extractedMessages.length > 0) {
      // Sort by position and remove position property
      extractedMessages.sort((a, b) => a.position - b.position);
      extractedMessages.forEach((msg) => delete msg.position);

      console.log(
        `Successfully extracted ${extractedMessages.length} messages from ChatGPT articles`
      );
      return deduplicateMessages(extractedMessages);
    }
  }
}
