// ChatGPT specific DOM selectors based on actual HTML structure
// This file contains optimized selectors for the latest ChatGPT DOM structure
// Updated to handle both chat.openai.com and chat.apenai.com domains

const CHATGPT_SELECTORS = {
  // Domain matching, used for compatibility with multiple domains
  domains: ["chat.openai.com", "chat.apenai.com"],

  // Container selectors based on DOM inspection
  // These target the main conversation container
  containers: [
    // Primary container selectors - more reliable
    '[data-testid="conversation"]',
    '[data-testid="conversation-turns"]',
    '[data-testid="conversation-main"]',
    // Standard container class-based selectors
    "#thread",
    'main[id="main"]',
    'div[role="presentation"]',
    'div[role="main"]',
    ".chat-container",
    ".conversation-container",
    // Tailwind-based classes used in the ChatGPT interface
    "div.flex-1.overflow-hidden",
    "div.flex.h-full.flex-col",
    "div.flex.flex-col.items-center.text-sm",
    "div.flex.h-full.w-full.flex-col",
    ".relative.flex.w-full.flex-col",
    // Additional selectors for chat.apenai.com domain
    "div.chat-pg",
    "main.chat-main",
    "main div.overflow-y-auto",
    // Fallback general selectors
    "main .overflow-y-auto",
    ".overflow-y-auto:not(code)",
    "#__next main",
  ], // Message selectors optimized for current ChatGPT DOM
  messages: [
    // Primary data-attribute based selectors (most reliable)
    '[data-testid^="conversation-turn-"]',
    'article[data-testid^="conversation-turn-"]',
    "[data-message-id]",
    "[data-message-author-role]",
    // Class-based selectors from both domains
    ".conversation-turn",
    ".chat-message",
    ".chat-turn",
    ".message",
    ".message-container",
    "div.message-content",
    // Tailwind and specific class-based selectors
    ".text-token-text-primary",
    "div.min-h-[20px]",
    "div.markdown.prose",
    "div.text-base.gap-4",
    "div.text-message-content",
    // Generic fallback selectors
    "div.group.w-full",
    ".prose",
  ], // User message selectors
  userMessages: [
    // Data-attribute based selectors (most reliable)
    '[data-message-author-role="user"]',
    '[data-message-role="user"]',
    '[data-user-message="true"]',
    '[data-testid*="user"]',
    // Numbered conversation turns (odd numbers for user messages)
    'article[data-testid="conversation-turn-1"]',
    'article[data-testid="conversation-turn-3"]',
    'article[data-testid="conversation-turn-5"]',
    'article[data-testid="conversation-turn-7"]',
    'article[data-testid="conversation-turn-9"]',
    'article[data-testid="conversation-turn-11"]',
    'article[data-testid^="conversation-turn-"][data-message-author-role="user"]',
    // Class-based selectors
    'div.text-token-text-primary w-full[data-message-author-role="user"]',
    ".user-message",
    ".human-message",
    ".message.user",
    'div.chat-turn[data-user="true"]',
    // Role-based selectors
    'div[role="user"]',
    // Xpath-like selectors (for future expansion)
    ".conversation-turn:has(.user)",
  ], // AI message selectors
  aiMessages: [
    // Data-attribute based selectors (most reliable)
    '[data-message-author-role="assistant"]',
    '[data-message-role="assistant"]',
    '[data-assistant-message="true"]',
    '[data-testid*="assistant"]',
    // Numbered conversation turns (even numbers for AI messages)
    'article[data-testid="conversation-turn-2"]',
    'article[data-testid="conversation-turn-4"]',
    'article[data-testid="conversation-turn-6"]',
    'article[data-testid="conversation-turn-8"]',
    'article[data-testid="conversation-turn-10"]',
    'article[data-testid="conversation-turn-12"]',
    'article[data-testid^="conversation-turn-"][data-message-author-role="assistant"]',
    // Class-based selectors
    'div.text-token-text-primary w-full[data-message-author-role="assistant"]',
    ".assistant-message",
    ".ai-message",
    ".message.assistant",
    'div.chat-turn[data-assistant="true"]',
    "div.chat-message-ai",
    ".chatgpt-message",
    // Role-based selectors
    'div[role="assistant"]',
    // Xpath-like selectors (for future expansion)
    ".conversation-turn:has(.assistant)",
  ],
  // Special handling for article elements
  articlePattern: /conversation-turn-(\d+)$/,

  // Content selectors for extracting text
  contentSelectors: {
    text: [
      ".text-base",
      ".text-token-text-primary",
      ".whitespace-pre-wrap",
      ".chat-message-text",
      "p",
      ".text-message",
      ".message-text",
      ".content-text",
      ".message-content",
      ".prose p",
      ".chat-text",
    ],
    markdown: [
      ".markdown.prose",
      "div[data-message-author-role] div.text-base",
      ".chat-markdown",
      ".message-markdown",
      ".prose",
      ".markdown-content",
      ".formatted-text",
    ],
    code: [
      'pre[class*="language-"]',
      "code",
      "pre > code",
      ".code-block",
      ".chat-code",
      ".message-code",
      'pre[class*="hljs"]',
      "[data-code-block]",
    ],
  },

  // Helper functions for safe DOM operations and enhanced detection
  helpers: {
    // Safely check if an element matches a selector
    safeMatches: function (element, selector) {
      try {
        return (
          element &&
          typeof element.matches === "function" &&
          element.matches(selector)
        );
      } catch (error) {
        console.debug(
          "Safe matches check failed for selector:",
          selector,
          error
        );
        return false;
      }
    },

    // Check if current URL is ChatGPT (either domain)
    isChatGPTDomain: function () {
      const hostname = window.location.hostname;
      return (
        hostname.includes("chat.openai.com") ||
        hostname.includes("chat.apenai.com")
      );
    },
    // Enhanced platform detection that checks DOM characteristics
    detectChatGPTPlatform: function () {
      // First check domain
      if (!this.isChatGPTDomain()) return false;

      // More comprehensive check that tries multiple selector patterns
      // to handle variations between chat.openai.com and chat.apenai.com
      const commonSelectors = [
        // Basic DOM structure indicators
        '[data-testid^="conversation-turn-"]',
        "[data-message-author-role]",
        ".markdown.prose",
        ".chat-container",
        "main.w-full.h-full",

        // Alternative indicators for chat.apenai.com
        ".chat-pg",
        ".chat-turn",
        ".conversation-container",
        "[data-message-id]",
        'div[role="presentation"] div.overflow-y-auto',

        // Generic conversation indicators
        "main div.overflow-hidden",
        "div.flex.h-full.flex-col",
        "div.flex.flex-col.items-center",
        'main[role="main"]',
        "div.whitespace-pre-wrap",
      ];

      // Check if any of the ChatGPT indicators are present
      for (const selector of commonSelectors) {
        try {
          if (document.querySelector(selector)) {
            return true;
          }
        } catch (err) {
          // Continue with next selector if this one fails
          console.debug("Selector check error:", err);
        }
      }

      return false;
    },

    // Extract role from an element
    extractRole: function (element) {
      if (!element) return null;

      // Check data attributes first (most reliable)
      if (element.dataset) {
        if (element.dataset.messageAuthorRole === "user") return "user";
        if (element.dataset.messageAuthorRole === "assistant")
          return "assistant";
        if (element.dataset.messageRole === "user") return "user";
        if (element.dataset.messageRole === "assistant") return "assistant";
        if (element.dataset.userMessage === "true") return "user";
        if (element.dataset.assistantMessage === "true") return "assistant";
      }

      // Check test IDs
      const testId = element.getAttribute("data-testid") || "";
      if (testId.includes("user")) return "user";
      if (testId.includes("assistant")) return "assistant";

      // Check classes
      const className = element.className || "";
      if (
        className.includes("user-message") ||
        className.includes("human-message")
      )
        return "user";
      if (
        className.includes("assistant-message") ||
        className.includes("ai-message")
      )
        return "assistant";

      // Check content for typical patterns
      const text = element.textContent || "";
      if (text.startsWith("You:") || text.startsWith("User:")) return "user";
      if (text.startsWith("ChatGPT:") || text.startsWith("Assistant:"))
        return "assistant";

      return null;
    },
    // Get a collection of text content from an element using all text selectors
    extractText: function (element) {
      if (!element) return "";

      // Try content selectors first
      let content = "";

      // Try text selectors with safeguards
      const trySelectors = (selectorArray) => {
        for (const selector of selectorArray) {
          try {
            const textElements = element.querySelectorAll(selector);
            if (textElements.length > 0) {
              Array.from(textElements).forEach((el) => {
                content += (el.textContent || "").trim() + "\n";
              });
              if (content.trim()) return true;
            }
          } catch (err) {
            console.debug("Selector extraction failed:", selector, err);
          }
        }
        return false;
      };

      // First try text selectors
      let foundContent = trySelectors(this.contentSelectors.text);

      // If no content found, try markdown selectors
      if (!foundContent) {
        foundContent = trySelectors(this.contentSelectors.markdown);
      }

      // If still no content, try code selectors
      if (!foundContent) {
        foundContent = trySelectors(this.contentSelectors.code);
      }

      // If still no content, try some additional selectors for chat.apenai.com
      if (!foundContent) {
        foundContent = trySelectors([
          ".chat-text",
          ".message-content > div",
          ".text-token-text-primary",
          "div.whitespace-pre-wrap",
          "div.min-h-[20px]",
          "div.text-message-content",
        ]);
      }

      // If still no content, use direct text content with fallbacks
      if (!content.trim()) {
        try {
          content = element.textContent.trim();
        } catch (err) {
          console.debug("Failed to get direct textContent:", err);
          // One last attempt - try innerText
          try {
            content = element.innerText || "";
          } catch (innerErr) {
            console.debug("Failed to get innerText:", innerErr);
          }
        }
      }

      return content.trim();
    },
  },
};
