// Content script for the Conversation Log & Summary extension
/* global chrome */
console.log("Conversation Log Extension content script loaded");

// Immediately announce the content script's presence to avoid connection issues
try {
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    console.log("Setting up global message listener");
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      if (request.action === "ping") {
        console.log("Received ping, responding with pong");
        sendResponse({
          pong: true,
          timestamp: Date.now(),
          url: window.location.href,
        });
        return true;
      }
      
      if (request.action === "clearConversation") {
        console.log("Clearing conversation state");
        resetConversationState();
        sendResponse({ success: true });
        return true;
      }
      
      if (request.action === "reloadExtension") {
        console.log("Reloading extension state");
        resetConversationState();
        loadPlatformScripts(window.location.hostname);
        sendResponse({ success: true });
        return true;
      }
    });
  }
} catch (initError) {
  console.error("Error setting up initial ping listener:", initError);
}

// Check if we're on a supported domain
const currentDomain = window.location.hostname;
console.log("Content script running on domain:", currentDomain);

// Check explicitly for supported domains
const isSupportedDomain =
  currentDomain.includes("chat.openai.com") ||
  currentDomain.includes("chat.apenai.com") ||
  currentDomain.includes("claude.ai") ||
  currentDomain.includes("gemini.google.com");

if (!isSupportedDomain) {
  console.log(
    "Not on a supported AI platform domain, some features may not work properly"
  );
}

// Listen for URL changes (for single-page apps)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log("URL changed to", url);

    // Reset state and reload scripts for new URL
    resetConversationState();

    // Clear the storage for this tab
    safelyUseChrome(() => {
      chrome.storage.local.remove(["latestConversation"], () => {
        console.log(
          "Cleared latest conversation from storage due to URL change"
        );
      });
    });

    loadPlatformScripts(window.location.hostname);
  }
}).observe(document, { subtree: true, childList: true });

// Load platform-specific scripts based on the current domain
(function () {
  const hostname = window.location.hostname;

  // Check if Chrome runtime is available
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime ||
    !chrome.runtime.getURL
  ) {
    console.log("Chrome runtime not available, skipping script injection");
    return;
  }

  // Add a reload button to the page
  function addReloadButton() {
    // Check if button already exists
    if (document.getElementById("extension-reload-button")) {
      return;
    }

    const button = document.createElement("button");
    button.id = "extension-reload-button";
    button.textContent = "Reload Extension";
    button.style.position = "fixed";
    button.style.bottom = "60px";
    button.style.right = "20px";
    button.style.zIndex = "9999";
    button.style.padding = "8px 12px";
    button.style.backgroundColor = "#ff5722";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    button.style.fontSize = "14px";
    button.style.fontFamily = "Arial, sans-serif";

    button.addEventListener("click", () => {
      console.log("Reloading extension state...");

      // Clear storage
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(
          {
            currentConversation: [],
            currentPlatform: null,
            lastDetectedPlatform: null,
          },
          () => {
            console.log("Storage cleared");
          }
        );
      }

      // Reset conversation state
      resetConversationState();

      // Force re-detection of platform
      detectAIPlatform().then((platform) => {
        if (platform) {
          console.log("Re-detected platform:", platform.name);
          conversationState.platform = platform;
          setupMessageObserver(platform);
        } else {
          console.log("No platform detected after reload");
        }
      });

      // Reload scripts based on current hostname
      loadPlatformScripts(window.location.hostname);

      // Visual feedback
      button.textContent = "Reloaded!";
      button.style.backgroundColor = "#4CAF50";
      setTimeout(() => {
        button.textContent = "Reload Extension";
        button.style.backgroundColor = "#ff5722";
      }, 2000);
    });

    document.body.appendChild(button);
    console.log("Added extension reload button");
  }

  // Function to load platform-specific scripts
  function loadPlatformScripts(hostname) {
    // Load the universal message extractor test script for all platforms
    try {
      // Remove existing script if present
      const existingExtractor = document.querySelector(
        'script[src*="message-extractor-test.js"]'
      );
      if (existingExtractor) {
        existingExtractor.remove();
      }

      const extractorScript = document.createElement("script");
      extractorScript.src = chrome.runtime.getURL("message-extractor-test.js");
      document.head.appendChild(extractorScript);
      console.log("Loaded universal message extractor test script");
    } catch (error) {
      console.error("Error loading message extractor test script:", error);
    }

    // ChatGPT-specific scripts
    if (
      hostname.includes("chat.openai.com") ||
      hostname.includes("chat.apenai.com")
    ) {
      console.log(
        "ChatGPT detected, loading specialized scripts for domain:",
        hostname
      );

      try {
        // Remove existing scripts if present
        const existingFix = document.querySelector(
          'script[src*="chatgpt-fix.js"]'
        );
        const existingArticleExtraction = document.querySelector(
          'script[src*="chatgpt-article-extraction.js"]'
        );
        const existingDebug = document.querySelector(
          'script[src*="debug-chatgpt.js"]'
        );

        if (existingFix) existingFix.remove();
        if (existingArticleExtraction) existingArticleExtraction.remove();
        if (existingDebug) existingDebug.remove();

        // Load ChatGPT fix script
        const chatgptFixScript = document.createElement("script");
        chatgptFixScript.src = chrome.runtime.getURL("chatgpt-fix.js");
        document.head.appendChild(chatgptFixScript);
        console.log("Loaded ChatGPT fix script");

        // Load ChatGPT article extraction script
        const chatgptArticleExtractionScript = document.createElement("script");
        chatgptArticleExtractionScript.src = chrome.runtime.getURL(
          "chatgpt-article-extraction.js"
        );
        document.head.appendChild(chatgptArticleExtractionScript);
        console.log("Loaded ChatGPT article extraction script");

        // Load ChatGPT debug script
        const debugScript = document.createElement("script");
        debugScript.src = chrome.runtime.getURL("debug-chatgpt.js");
        document.head.appendChild(debugScript);
        console.log("Loaded ChatGPT debug script");
      } catch (error) {
        console.error("Error loading ChatGPT scripts:", error);
      }
    }

    // Claude-specific scripts
    else if (
      hostname.includes("claude.ai") ||
      hostname.includes("anthropic.com")
    ) {
      console.log("Claude detected, loading specialized scripts...");

      try {
        // Remove existing script if present
        const existingClaudeDebug = document.querySelector(
          'script[src*="debug-claude.js"]'
        );
        if (existingClaudeDebug) existingClaudeDebug.remove();

        // Load Claude debug script
        const claudeDebugScript = document.createElement("script");
        claudeDebugScript.src = chrome.runtime.getURL("debug-claude.js");
        document.head.appendChild(claudeDebugScript);
        console.log("Loaded Claude debug script");
      } catch (error) {
        console.error("Error loading Claude scripts:", error);
      }
    }
  }

  // Initial load of platform scripts
  loadPlatformScripts(hostname);

  // Load the extension reload script
  try {
    const reloadScript = document.createElement("script");
    reloadScript.src = chrome.runtime.getURL("extension-reload.js");
    document.head.appendChild(reloadScript);
    console.log("Loaded extension reload script");
  } catch (error) {
    console.error("Error loading extension reload script:", error);
  }

  // Add reload button after a delay to ensure DOM is ready
  setTimeout(addReloadButton, 2000);

  // Listen for reload messages from the page
  window.addEventListener("message", (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    if (event.data.type === "RELOAD_EXTENSION") {
      console.log("Received reload request from page");

      // Clear storage
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(
          {
            currentConversation: [],
            currentPlatform: null,
            lastDetectedPlatform: null,
          },
          () => {
            console.log("Storage cleared");
          }
        );
      }

      // Reset conversation state
      resetConversationState();

      // Force re-detection of platform
      detectAIPlatform().then((platform) => {
        if (platform) {
          console.log("Re-detected platform:", platform.name);
          conversationState.platform = platform;
          setupMessageObserver(platform);
        } else {
          console.log("No platform detected after reload");
        }
      });
    }
  });

  // Also add a listener for URL changes (for single-page apps)
  // Using the lastUrl variable that's already declared at the top level
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log("URL changed to", url);

      // Reset state and reload scripts for new URL
      safelyUseChrome(() => {
        chrome.storage.local.remove(["latestConversation"], () => {
          console.log(
            "Cleared latest conversation from storage due to URL change"
          );
        });

        // Also clear any tab-specific storage
        chrome.storage.local.get(["conversationHistory"], (result) => {
          if (result.conversationHistory) {
            const updatedHistory = result.conversationHistory.filter(
              (conv) => !conv.url || !conv.url.includes(new URL(url).hostname)
            );
            chrome.storage.local.set({ conversationHistory: updatedHistory });
          }
        });
      });

      resetConversationState();
      loadPlatformScripts(window.location.hostname);
    }
  }).observe(document, { subtree: true, childList: true });
})();

// Configuration des sites d'IA supportés
const AI_PLATFORMS = {
  CHATGPT: {
    domain: "chat.openai.com",
    alternateDomains: ["chat.apenai.com"],
    selectors: {
      container: [
        "div.flex.flex-col.items-center.text-sm.h-full",
        "main div.flex-1.overflow-hidden",
        'div[role="presentation"]',
        "div.flex.flex-col.items-center",
        "div.chat-pg",
        "div.chat-container",
        // New improved container selectors for ChatGPT
        "div.flex.h-full.flex-col",
        "main.w-full.h-full.flex-col",
        "main.relative.h-full.w-full.overflow-hidden",
        "body .w-full.h-full.flex",
        "div.overflow-y-auto",
      ],
      message: [
        "div.group.w-full",
        "div[data-message-author-role]",
        "div.text-base",
        "div.markdown",
        "div.chat-message",
        "div.message-content",
        "div.chat-message-container",
        // Additional selectors based on latest ChatGPT DOM
        "div.min-h-[20px]",
        'div[data-testid^="conversation-turn-"]',
        "div.chat-turn",
        ".message",
        // New message selectors for better detection
        "article[data-testid^='conversation-turn-']",
        ".text-message-content",
        ".chatgpt-message",
      ],
      userMessage: [
        'div[data-message-author-role="user"]',
        "div.min-h-[20px].flex.flex-col.items-start.gap-4.whitespace-pre-wrap.break-words",
        "div.text-base.gap-4",
        'div[data-testid="conversation-turn-user"]',
        "div.chat-message-user",
        // New user message indicators
        'div[role="user"]',
        "div.user-message",
        "div.chat-user-message",
        ".user",
        // More comprehensive selectors
        'article[data-testid="conversation-turn-user"]',
        '.group[data-testid="conversation-turn-user"]',
        'div[data-message-id][data-testid*="user"]',
        'div[data-user-message="true"]',
        ".text-token-text-user",
      ],
      aiMessage: [
        'div[data-message-author-role="assistant"]',
        "div.markdown.prose",
        "div.text-base.gap-4.markdown",
        'div[data-testid="conversation-turn-assistant"]',
        "div.chat-message-ai",
        // New AI message indicators
        'div[role="assistant"]',
        "div.assistant-message",
        "div.chat-assistant-message",
        ".assistant",
        // More comprehensive selectors
        'article[data-testid="conversation-turn-assistant"]',
        '.group[data-testid="conversation-turn-assistant"]',
        'div[data-message-id][data-testid*="assistant"]',
        'div[data-assistant-message="true"]',
        ".text-token-text-assistant",
      ],
      contentSelectors: {
        code: 'pre[class*="language-"], code, pre > code, .code-block, .chat-code',
        markdown:
          ".markdown-content, .prose, div[data-message-author-role] div.text-base, .chat-markdown",
        text: ".text-base, .whitespace-pre-wrap, .chat-message-text, p, .text-message",
      },
    },
  },
  CLAUDE: {
    domain: "claude.ai",
    selectors: {
      container: [
        "div.prose.w-full",
        "div.conversation-container",
        "main.flex-1",
        'div[role="main"]',
        "div.claude-container",
        "div.conversation",
        "main.conversation-main",
        "div.chat-full-container",
        "div.chat-workspace-container",
      ],
      message: [
        "div.conversation-turn",
        "div.message",
        "div[data-message-id]",
        "div.prose",
        "div.message-container",
        "div.chat-turn",
        "div.chat-message-container",
        // Latest Claude selectors
        "div.message-wrapper",
        "div.conversationTurn",
        "div.message-row",
        "div.claudeMessage",
        ".message-block",
      ],
      userMessage: [
        "div.conversation-turn:has(div.human)",
        "div.human-message",
        'div[data-message-author="human"]',
        "div.user-message",
        "div.chat-message-user",
        // Latest Claude user selectors
        'div[data-author="human"]',
        "div.humanMessage",
        "div.human",
        "div.userMessageContent",
        ".human-bubble",
      ],
      aiMessage: [
        "div.conversation-turn:has(div.assistant)",
        "div.assistant-message",
        'div[data-message-author="assistant"]',
        "div.ai-message",
        "div.chat-message-assistant",
        // Latest Claude AI selectors
        'div[data-author="assistant"]',
        "div.assistantMessage",
        "div.assistant",
        "div.assistantMessageContent",
        ".assistant-bubble",
      ],
      contentSelectors: {
        code: 'pre[class*="language-"], code, pre > code, .code-block',
        markdown:
          ".prose, .message-content, div[data-message-content], .markdown-content, .formatted-content",
        text: ".message-text, .content-text, .message-body, .text-content, p",
      },
    },
  },
  GEMINI: {
    domain: "gemini.google.com",
    selectors: {
      container: [
        'div[role="main"]',
        "div.conversation-container",
        'div[role="log"]',
        "div.chat-history",
        'div[role="region"]',
        "main.gemini-main",
        "div.chat-container",
        "vertexai-chat",
        "div.chat-message-list-container",
        "div.conversation-list",
      ],
      message: [
        'div[role="listitem"]',
        "div.message-content",
        "div.query-content",
        "div.response-content",
        "div.markdown-container",
        'div[data-test-id="message-list"] > div',
        "div[data-message-id]",
        // Latest Gemini message selectors
        "div.chat-message",
        "div.chat-turn",
        "div.gemini-message",
        'div[data-testid="chat-message"]',
        'div[data-testid="chat-turn"]',
        "div.turn",
        "div.message-wrapper",
        "div.chat-bubble",
      ],
      userMessage: [
        'div[data-test-id="user-input"]',
        'div[data-message-type="user"]',
        "div.query-content",
        "div.user-query",
        "div.human-message",
        'div[data-test-id="message-list"] div[data-test-id="query-text"]',
        'div[data-test-id="conversation-turn-user"]',
        // Latest Gemini user message selectors
        "div.user-message",
        "div.user-bubble",
        'div[data-testid="user-message"]',
        "div.user-chat-bubble",
        "div.user-message-container",
        "div.input-message",
      ],
      aiMessage: [
        'div[data-test-id="response"]',
        'div[data-message-type="model"]',
        "div.response-content",
        "div.model-response",
        "div.markdown-content",
        "div.ProseMirror",
        "div.assistant-message",
        'div[data-test-id="message-list"] div[data-test-id="response-text"]',
        'div[data-test-id="conversation-turn-assistant"]',
        // Latest Gemini AI message selectors
        "div.ai-message",
        "div.model-message",
        "div.gemini-bubble",
        'div[data-testid="model-response"]',
        "div.gemini-response",
        "div.ai-bubble",
        "div.ai-response-container",
      ],
      contentSelectors: {
        code: 'pre[class*="language-"], code, pre > code, .code-block, div[data-code-block]',
        markdown:
          '.markdown-content, .ProseMirror, div[data-test-id="response-text"], div[data-test-id="query-text"], .formatted-text',
        text: '.response-text, .message-text, div[data-test-id="message-list"] div, .plain-text, p, .text-content',
      },
    },
  },
};

// State of the conversation
let conversationState = {
  messages: [],
  messagePairs: [], // Add message pairs for turn-based tracking
  platform: null,
  lastMessageCount: 0,
  summarized: false,
  observing: false,
  currentConversationId: null,
};

// Helper function to check if element exists and is visible
function isElementVisibleAndExists(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

// Helper function to wait for DOM to stabilize
function waitForStableDOM(callback, delay = 1000, maxRetries = 10) {
  let tries = 0;
  const interval = setInterval(() => {
    const bodyReady = document.body && document.body.innerText.length > 100;
    if (bodyReady || ++tries >= maxRetries) {
      clearInterval(interval);
      console.log("DOM appears stable, initializing detection");
      callback();
    }
  }, delay);
}

// Helper function to try multiple selectors with visibility check
function findElementWithSelectors(selectors, context = document) {
  if (!selectors || !Array.isArray(selectors)) {
    console.warn("Invalid selectors:", selectors);
    return null;
  }

  for (const selector of selectors) {
    try {
      const elements = context.querySelectorAll(selector);
      for (const element of elements) {
        if (isElementVisibleAndExists(element)) {
          console.log(`Found visible element with selector: ${selector}`);
          return element;
        }
      }
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
    }
  }
  return null;
}

// Helper function to find all elements with selectors
function findAllElementsWithSelectors(selectors, context = document) {
  if (!selectors || !Array.isArray(selectors)) {
    console.warn("Invalid selectors:", selectors);
    return [];
  }

  const elements = [];
  for (const selector of selectors) {
    try {
      const found = context.querySelectorAll(selector);
      found.forEach((element) => {
        if (isElementVisibleAndExists(element)) {
          elements.push(element);
        }
      });
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
    }
  }
  return elements;
}

// Enhanced platform detection with validation and retries
async function detectAIPlatform() {
  const hostname = window.location.hostname;
  console.log("Current hostname:", hostname);

  // Special handling for ChatGPT which has been problematic
  if (
    hostname.includes("chat.openai.com") ||
    hostname.includes("chat.apenai.com")
  ) {
    console.log("ChatGPT detected by hostname, using optimized detection");

    // Try to find ChatGPT container with more aggressive approach
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait longer for DOM

    // Look for any ChatGPT container with multiple strategies
    const chatgptSelectors = [
      "main.relative.h-full.w-full",
      "div.flex.flex-col.items-center.text-sm",
      "div.flex.h-full.flex-col",
      "div[role='presentation']",
      ".chat-pg",
      "body main",
      "body .overflow-hidden",
    ];

    for (let selector of chatgptSelectors) {
      const container = document.querySelector(selector);
      if (container && isElementVisibleAndExists(container)) {
        console.log("Found ChatGPT container with selector:", selector);
        return {
          name: "CHATGPT",
          container: container,
          selectors: AI_PLATFORMS.CHATGPT.selectors,
        };
      }
    }

    // If no container found but we're on ChatGPT domain, still return ChatGPT
    console.log(
      "ChatGPT confirmed by URL but container not found, using document.body"
    );
    return {
      name: "CHATGPT",
      container: document.body,
      selectors: AI_PLATFORMS.CHATGPT.selectors,
    };
  }

  // Try to detect other platforms with standard approach
  for (let attempt = 0; attempt < 10; attempt++) {
    for (const [platformName, config] of Object.entries(AI_PLATFORMS)) {
      if (
        hostname.includes(config.domain) ||
        (config.alternateDomains &&
          config.alternateDomains.some((domain) => hostname.includes(domain)))
      ) {
        console.log(
          `Attempting to detect ${platformName} (attempt ${attempt + 1})`
        );

        // Wait for DOM to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Find container
        const container = findElementWithSelectors(config.selectors.container);
        if (!container) {
          console.log(`${platformName}: Container not found, will retry...`);
          continue;
        }

        // Validate message elements (be more lenient with detection)
        const messages = findElementWithSelectors(
          config.selectors.message,
          container
        );
        const userMessage = findElementWithSelectors(
          config.selectors.userMessage,
          container
        );
        const aiMessage = findElementWithSelectors(
          config.selectors.aiMessage,
          container
        );

        console.log(`${platformName} detection results:`, {
          container: !!container,
          messages: !!messages,
          userMessage: !!userMessage,
          aiMessage: !!aiMessage,
        });

        // Be much more lenient with platform detection - if we have a container, consider it detected
        // This is especially important for platforms that load content dynamically
        if (container) {
          console.log(
            `Successfully detected ${platformName} (container found)`
          );
          return {
            name: platformName,
            container,
            selectors: config.selectors,
          };
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Last resort: try to detect by URL only if we're on a known domain
  const knownDomains = Object.values(AI_PLATFORMS).map(
    (config) => config.domain
  );
  for (const domain of knownDomains) {
    if (hostname.includes(domain)) {
      console.log(`Platform detected by URL only: ${domain}`);
      // Find which platform this domain belongs to
      const platformName = Object.keys(AI_PLATFORMS).find(
        (name) => AI_PLATFORMS[name].domain === domain
      );

      if (platformName) {
        return {
          name: platformName,
          container: document.body, // Use document.body as fallback
          selectors: AI_PLATFORMS[platformName].selectors,
        };
      }
    }
  }

  console.log("No platform detected after all attempts");
  return null;
}

// Enhanced debugging function
function debug(message, ...args) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`[AI-Logger ${timestamp}]`, message, ...args);
}

// Enhanced DOM inspection
function inspectDOM(platform) {
  if (!platform || !platform.container) {
    debug("Cannot inspect DOM: Invalid platform or container");
    return;
  }

  debug("Starting DOM inspection for", platform.name);

  // Container info
  const containerHTML = platform.container.outerHTML.substring(0, 500) + "...";
  debug("Container HTML sample:", containerHTML);

  // Message selectors test
  debug("Testing message selectors...");
  platform.selectors.message.forEach((selector) => {
    try {
      const elements = platform.container.querySelectorAll(selector);
      debug(`Selector "${selector}" found ${elements.length} elements`);

      if (elements.length > 0) {
        const sampleElement = elements[0];
        debug("First element classes:", sampleElement.className);
        debug(
          "First element attributes:",
          Array.from(sampleElement.attributes)
            .map((attr) => `${attr.name}="${attr.value}"`)
            .join(", ")
        );
        debug(
          "First element HTML sample:",
          sampleElement.outerHTML.substring(0, 300) + "..."
        );
      }
    } catch (error) {
      debug(`Error testing selector "${selector}":`, error);
    }
  });

  // User message selectors test
  debug("Testing user message selectors...");
  platform.selectors.userMessage.forEach((selector) => {
    try {
      const elements = platform.container.querySelectorAll(selector);
      debug(`User selector "${selector}" found ${elements.length} elements`);
    } catch (error) {
      debug(`Error testing user selector "${selector}":`, error);
    }
  });

  // AI message selectors test
  debug("Testing AI message selectors...");
  platform.selectors.aiMessage.forEach((selector) => {
    try {
      const elements = platform.container.querySelectorAll(selector);
      debug(`AI selector "${selector}" found ${elements.length} elements`);
    } catch (error) {
      debug(`Error testing AI selector "${selector}":`, error);
    }
  });

  // Try generic message detection
  debug("Testing generic message detection...");
  const commonMessageSelectors = [
    'div[role="listitem"]',
    "div.message",
    "div[data-message-id]",
    "div[data-message-author-role]",
    "div.chat-message",
    "div.chat-entry",
    'div[data-testid*="message"]',
    'div[data-test-id*="message"]',
    "div.conversation-turn",
  ];

  commonMessageSelectors.forEach((selector) => {
    try {
      const elements = platform.container.querySelectorAll(selector);
      debug(`Common selector "${selector}" found ${elements.length} elements`);
    } catch (error) {
      debug(`Error testing common selector "${selector}":`, error);
    }
  });

  debug("DOM inspection complete");
}

// Direct DOM traversal for Gemini platform
function extractGeminiMessages(container) {
  debug("Using enhanced Gemini message extraction");
  const messages = [];

  try {
    // Add debug info for troubleshooting
    debug("Current URL:", window.location.href);
    debug("Container provided:", container);

    // Try multiple container selectors for better reliability
    const potentialContainers = [
      // New selectors based on actual Gemini DOM structure
      document.querySelector(".conversation-container"),
      document.querySelector(".chat-history"),
      document.querySelector("main.chat-app"),
      document.querySelector(".bots-list-container"),
      document.querySelector(".streamlit-chat-container"),
      document.querySelector(".chat-container"),
      document.querySelector(".chat-panel"),
      document.querySelector(".gemini-chat"),
      document.querySelector("[data-conversation-id]"),
      // Original selectors as fallback
      document.querySelector('div[role="log"]'),
      document.querySelector('div[role="region"]'),
      document.querySelector("main"),
      document.querySelector("vertexai-chat"),
      document.querySelector(".chat-message-list-container"),
      container,
    ].filter((c) => c !== null);

    debug("Potential Gemini containers found:", potentialContainers.length);

    // If no container found, try a more aggressive approach
    if (potentialContainers.length === 0) {
      debug("No container found, using document body as fallback");
      potentialContainers.push(document.body);
    }

    // Use the first valid container
    const chatContainer = potentialContainers[0];
    debug(
      "Selected container:",
      chatContainer.tagName,
      chatContainer.className
    );

    // More reliable role identification based on element attributes and classes
    function detectRole(element) {
      const elementHTML = element.outerHTML.toLowerCase();
      const classNames = element.className.toLowerCase();

      // Check for user indicators
      if (
        elementHTML.includes('data-message-author="human"') ||
        elementHTML.includes('data-author="human"') ||
        elementHTML.includes('data-role="user"') ||
        elementHTML.includes('data-message-type="user"') ||
        elementHTML.includes('data-testid="user"') ||
        classNames.includes("user-message") ||
        classNames.includes("human") ||
        classNames.includes("request") ||
        classNames.includes("query") ||
        classNames.includes("prompt")
      ) {
        return "user";
      }

      // Check for assistant indicators
      if (
        elementHTML.includes('data-message-author="assistant"') ||
        elementHTML.includes('data-author="assistant"') ||
        elementHTML.includes('data-role="assistant"') ||
        elementHTML.includes('data-message-type="model"') ||
        elementHTML.includes('data-testid="model"') ||
        classNames.includes("assistant-message") ||
        classNames.includes("gemini") ||
        classNames.includes("response") ||
        classNames.includes("answer") ||
        classNames.includes("model-response")
      ) {
        return "assistant";
      }

      return null; // Role couldn't be determined
    }

    // Try multiple message selector strategies
    // Strategy 1: Look for well-defined chat elements with role detection
    const chatElements = Array.from(
      document.querySelectorAll(
        ".message, .chat-message, .conversation-turn, .chat-turn, .message-wrapper, " +
          ".prompt-response, .conversation-item, .request-response, .user-assistant-container"
      )
    ).filter(
      (el) => isElementVisibleAndExists(el) && el.textContent.trim().length > 5
    );

    debug(`Found ${chatElements.length} chat elements for role analysis`);

    // Process each element with improved role detection
    chatElements.forEach((element, index) => {
      // Try to detect role
      let role = detectRole(element);

      // If role couldn't be determined, fallback to odd/even pattern
      if (!role) {
        role = index % 2 === 0 ? "user" : "assistant";
        debug(
          `Using odd/even pattern for element ${index}: assigned role ${role}`
        );
      } else {
        debug(`Detected role for element ${index}: ${role}`);
      }

      const content = extractTextFromNode(element);
      if (content && content.trim()) {
        messages.push({
          role,
          content: cleanMessageContent(content),
          timestamp: new Date().toISOString(),
          position: index,
        });
      }
    });

    // If no messages found with the first approach, try the explicit selector approach
    if (messages.length === 0) {
      debug("No messages found with role detection, trying explicit selectors");

      // Try direct targeting of user and assistant messages
      const userMessages = Array.from(
        document.querySelectorAll(
          ".user-message, .human, .query, .prompt, .request, " +
            '.user-input, .user-query, [data-message-author="human"], ' +
            ".request-text, .human-message, .user-input-text, " +
            ".query-message, .prompt-text, .user-message-bubble, " +
            '[data-role="user"], [data-message-type="user"]'
        )
      ).filter(
        (el) =>
          isElementVisibleAndExists(el) && el.textContent.trim().length > 0
      );

      const aiMessages = Array.from(
        document.querySelectorAll(
          ".assistant-message, .gemini, .response, .model-response, " +
            '.ai-response, .ai-answer, [data-message-author="assistant"], ' +
            ".response-text, .gemini-response, .response-message, " +
            ".assistant-bubble, .gemini-bubble, .bot-response, " +
            '[data-role="assistant"], [data-message-type="model"]'
        )
      ).filter(
        (el) =>
          isElementVisibleAndExists(el) && el.textContent.trim().length > 0
      );

      debug(
        `Found ${userMessages.length} explicit user messages and ${aiMessages.length} AI messages`
      );

      // Process user messages
      userMessages.forEach((msg, index) => {
        const content = extractTextFromNode(msg);
        if (content && content.trim()) {
          messages.push({
            role: "user",
            content: cleanMessageContent(content),
            timestamp: new Date().toISOString(),
            position: index * 2, // Even positions for users
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
            position: index * 2 + 1, // Odd positions for AI
          });
        }
      });
    }

    // Strategy 3: Look for alternating chat messages as last resort
    if (messages.length === 0) {
      debug("Falling back to alternating message pattern detection");

      // Look for any chat-turn or chat-message elements
      const chatTurns = Array.from(
        chatContainer.querySelectorAll(
          // Gemini-specific selectors
          ".message, .message-container, .conversation-item, .query-response-container, " +
            ".chat-message-container, .chat-entry, .conversation-turn, .message-wrapper, " +
            '.chat-turn, .chat-bubble, .chat-node, div[role="listitem"], [data-message-id]'
        )
      ).filter(
        (el) =>
          isElementVisibleAndExists(el) && el.textContent.trim().length > 5
      );

      debug(
        `Found ${chatTurns.length} potential chat turns for alternating pattern`
      );

      // Process each chat turn
      chatTurns.forEach((turn, index) => {
        // For chat turns, even = user, odd = assistant
        const role = index % 2 === 0 ? "user" : "assistant";
        const content = extractTextFromNode(turn);

        if (content && content.trim()) {
          messages.push({
            role,
            content: cleanMessageContent(content),
            timestamp: new Date().toISOString(),
            position: index,
          });
        }
      });
    }

    // Sort messages by position
    messages.sort((a, b) => a.position - b.position);
    messages.forEach((msg) => delete msg.position);

    debug("Final messages extracted from Gemini:", messages.length);
    if (messages.length > 0) {
      debug("First message:", messages[0]);
      if (messages.length > 1) {
        debug("Last message:", messages[messages.length - 1]);
      }
    }
  } catch (error) {
    debug("Error in enhanced Gemini extraction:", error);
  }

  return messages;
}

// Add third-party library for shadow DOM access
function injectShadowDOMHelper() {
  debug("Injecting shadow DOM helper");

  try {
    // Check if chrome.runtime is available before using getURL
    if (!chrome || !chrome.runtime || !chrome.runtime.getURL) {
      debug("Chrome runtime is not available for getURL");
      return;
    }

    // Create a separate script file instead of inline script
    const script = document.createElement("script");
    try {
      script.src = chrome.runtime.getURL("shadow-dom-helper.js");
    } catch (urlError) {
      debug("Error getting URL for shadow-dom-helper.js:", urlError);
      return;
    }

    script.onload = () => {
      debug("Shadow DOM helper script loaded");
      // Listen for shadow messages using message events
      window.addEventListener("message", (event) => {
        // Only accept messages from the same window
        if (event.source !== window) return;

        if (event.data.type === "shadow-messages") {
          debug(
            `Received ${event.data.messages.length} messages from shadow DOM`
          );
          processShadowMessages(event.data.messages);
        }
      });
    };
    script.onerror = (error) => {
      debug("Error loading shadow DOM helper:", error);
    };
    document.head.appendChild(script);

    // Also add a message bridge for communication
    const bridgeScript = document.createElement("script");
    try {
      bridgeScript.src = chrome.runtime.getURL("message-bridge.js");
      document.head.appendChild(bridgeScript);
    } catch (urlError) {
      debug("Error getting URL for message-bridge.js:", urlError);
    }
  } catch (error) {
    debug("Error in shadow DOM helper injection:", error);
  }
}

// Process messages received from shadow DOM
function processShadowMessages(shadowMessages) {
  if (!shadowMessages || shadowMessages.length === 0) return;

  const messages = shadowMessages.map((msg) => ({
    role: msg.role,
    content: cleanMessageContent(msg.content),
    timestamp: new Date().toISOString(),
  }));

  if (messages.length !== conversationState.lastMessageCount) {
    debug(`Shadow DOM found ${messages.length} messages`);
    conversationState.messages = messages;
    conversationState.lastMessageCount = messages.length;
    saveConversation(messages);
  }
}

// Enhanced extractConversation with improved fallback mechanisms
function extractConversation(platform) {
  if (
    !platform ||
    !platform.name ||
    !platform.container ||
    !platform.selectors
  ) {
    debug("Invalid platform configuration");
    return [];
  }

  let messages = [];
  debug("Extracting conversation for platform:", platform.name);

  try {
    // Special handling for Gemini
    if (platform.name === "GEMINI") {
      messages = extractGeminiMessages(platform.container);
      // If Gemini extraction failed, continue with general extraction
      if (messages.length === 0) {
        debug("Gemini-specific extraction failed, trying general methods");
      } else {
        return deduplicateMessages(messages);
      }
    }

    // Run DOM inspection first to gather information
    inspectDOM(platform);

    // Get all message containers first - attempt different strategies
    let messageContainers = [];

    // Strategy 1: Use defined selectors
    debug("Strategy 1: Using defined selectors");
    messageContainers = Array.from(
      platform.container.querySelectorAll(platform.selectors.message.join(","))
    ).filter((el) => isElementVisibleAndExists(el));

    debug(
      `Found ${messageContainers.length} message containers using defined selectors`
    );

    // Strategy 2: If that failed, try using role-based traversal
    if (messageContainers.length === 0) {
      debug("Strategy 2: Using role-based traversal");
      // Look for user and AI messages with both direct and nested selectors
      const userSelectors = platform.selectors.userMessage.join(",");
      const aiSelectors = platform.selectors.aiMessage.join(",");

      const userMessages = Array.from(
        platform.container.querySelectorAll(userSelectors)
      ).filter((el) => isElementVisibleAndExists(el));
      const aiMessages = Array.from(
        platform.container.querySelectorAll(aiSelectors)
      ).filter((el) => isElementVisibleAndExists(el));

      debug(
        `Found ${userMessages.length} user messages and ${aiMessages.length} AI messages directly`
      );

      // Combine and get unique containers (some might be child elements of others)
      messageContainers = [...userMessages, ...aiMessages];

      // Remove duplicates by preferring parent containers
      messageContainers = messageContainers.filter((container, index) => {
        return !messageContainers.some(
          (otherContainer, otherIndex) =>
            index !== otherIndex && otherContainer.contains(container)
        );
      });

      debug(
        `After deduplication, have ${messageContainers.length} message containers`
      );
    }

    // Strategy 3: If still nothing, try generic message patterns
    if (messageContainers.length === 0) {
      debug("Strategy 3: Using generic message patterns");
      const genericSelectors = [
        'div[role="listitem"]',
        "div.message",
        "div[data-message-id]",
        "div[data-message-author-role]",
        "div.chat-message",
        "div.chat-entry",
        'div[data-testid*="message"]',
        'div[data-test-id*="message"]',
        "div.conversation-turn",
      ];

      for (const selector of genericSelectors) {
        const elements = Array.from(
          platform.container.querySelectorAll(selector)
        ).filter((el) => isElementVisibleAndExists(el));

        if (elements.length > 0) {
          debug(
            `Generic selector "${selector}" found ${elements.length} elements`
          );
          messageContainers = elements;
          break;
        }
      }
    }

    // Strategy 4: If all else fails, get direct children of the container that have significant content
    if (messageContainers.length === 0) {
      debug("Strategy 4: Using direct children with content");
      messageContainers = Array.from(platform.container.children).filter(
        (el) => {
          const hasContent =
            el.textContent && el.textContent.trim().length > 20;
          const isVisible = isElementVisibleAndExists(el);
          return hasContent && isVisible;
        }
      );

      debug(`Found ${messageContainers.length} direct children with content`);
    }

    // Strategy 5: If we still found nothing, try using the fallback extraction
    if (messageContainers.length === 0) {
      debug("Strategy 5: Using fallback extraction method");
      messages = fallbackExtract(platform.container);

      // If fallback extraction worked, return the results
      if (messages.length > 0) {
        debug(
          `Fallback extraction found ${messages.length} messages, using these`
        );

        // Sort messages by their position
        messages.sort((a, b) => a.position - b.position);

        // Remove the position property
        messages.forEach((msg) => delete msg.position);

        // Deduplicate messages
        return deduplicateMessages(messages);
      }

      debug("Fallback extraction also failed");
      return [];
    }

    debug(`Final message container count: ${messageContainers.length}`);

    // Log HTML of first few containers for debugging
    messageContainers.slice(0, 3).forEach((container, i) => {
      debug(
        `Container ${i} HTML sample:`,
        container.outerHTML.substring(0, 200) + "..."
      );
    });

    // Process each message container in order
    messageContainers.forEach((container, index) => {
      try {
        // Skip containers that are still loading/streaming
        if (!isMessageComplete(container)) {
          debug(
            `Skipping container ${index} as it appears to be still loading/streaming`
          );
          return;
        }

        // Get DOM position for accurate ordering
        const position = getMessagePosition(container);

        // Detect message role with multiple strategies
        let role = detectMessageRole(container, platform);

        // Skip unknown message types
        if (role === "unknown") {
          debug(
            `Container ${index} has unknown role, trying alternative detection...`
          );

          // Try alternative role detection based on content or position
          if (index % 2 === 0) {
            role = "user"; // Even positions are often user messages
            debug(
              `Assuming container ${index} is a user message based on position`
            );
          } else {
            role = "assistant"; // Odd positions are often AI messages
            debug(
              `Assuming container ${index} is an AI message based on position`
            );
          }
        }

        // Extract content
        const content = extractFullContent(container);

        if (content && content.trim()) {
          debug(
            `Adding ${role} message at position ${position} with content length ${content.length}`
          );
          messages.push({
            role,
            content: cleanMessageContent(content),
            timestamp: new Date().toISOString(),
            position,
          });
        } else {
          debug(`Skipping container ${index} due to empty content`);
        }
      } catch (error) {
        debug(`Error processing container ${index}:`, error);
      }
    });

    // Sort messages by their position in the DOM
    messages.sort((a, b) => a.position - b.position);

    // Remove the position property as it's no longer needed
    messages.forEach((msg) => delete msg.position);

    // Deduplicate messages
    messages = deduplicateMessages(messages);

    debug(`Extracted ${messages.length} total messages after deduplication`);
    debug(
      "Message roles count:",
      messages.reduce((acc, msg) => {
        acc[msg.role] = (acc[msg.role] || 0) + 1;
        return acc;
      }, {})
    );

    if (messages.length > 0) {
      debug(
        "First message sample:",
        messages[0].content.substring(0, 100) + "..."
      );
      if (messages.length > 1) {
        debug(
          "Last message sample:",
          messages[messages.length - 1].content.substring(0, 100) + "..."
        );
      }
    }
  } catch (error) {
    debug("Error extracting conversation:", error);
  }

  return messages;
}

// Helper function to get element's position in container
function getElementPosition(element, container) {
  const elements = Array.from(container.querySelectorAll("*"));
  return elements.indexOf(element);
}

// Enhanced helper function to extract full content with multiple strategies
function extractFullContent(element) {
  if (!element) return "";

  // Get platform configuration
  const platform = conversationState.platform;
  if (!platform) return element.textContent.trim();

  debug(
    `Extracting content from element with tag ${element.tagName} and class "${element.className}"`
  );

  let content = "";
  let extracted = false;

  // Strategy 1: Use platform-specific content selectors
  if (platform.selectors.contentSelectors) {
    try {
      debug("Strategy 1: Using platform-specific content selectors");
      const contentSelectors = platform.selectors.contentSelectors;

      // Extract code blocks
      const codeBlocks = element.querySelectorAll(contentSelectors.code);
      if (codeBlocks.length > 0) {
        debug(`Found ${codeBlocks.length} code blocks`);
        codeBlocks.forEach((block) => {
          const language = block.className.match(/language-(\w+)/)?.[1] || "";
          content += `\`\`\`${language}\n${block.textContent}\n\`\`\`\n`;
        });
        extracted = true;
      }

      // Extract markdown content
      const markdownElements = element.querySelectorAll(
        contentSelectors.markdown
      );
      if (markdownElements.length > 0) {
        debug(`Found ${markdownElements.length} markdown elements`);
        markdownElements.forEach((md) => {
          content += md.textContent + "\n";
        });
        extracted = true;
      }

      // Extract regular text content
      const textElements = element.querySelectorAll(contentSelectors.text);
      if (textElements.length > 0) {
        debug(`Found ${textElements.length} text elements`);
        textElements.forEach((text) => {
          content += text.textContent + "\n";
        });
        extracted = true;
      }
    } catch (error) {
      debug("Error with content selectors extraction:", error);
    }
  }

  // Strategy 2: Look for common content container classes
  if (!extracted || !content.trim()) {
    debug("Strategy 2: Looking for common content container classes");
    const commonContentSelectors = [
      ".prose",
      ".markdown",
      ".content",
      ".message-content",
      ".text-base",
      ".whitespace-pre-wrap",
      ".ProseMirror",
      "[data-message-content]",
      "[data-message-text]",
    ];

    for (const selector of commonContentSelectors) {
      try {
        const contentElements = element.querySelectorAll(selector);
        if (contentElements.length > 0) {
          debug(
            `Found ${contentElements.length} elements with selector ${selector}`
          );
          contentElements.forEach((el) => {
            content += el.textContent + "\n";
          });
          extracted = true;
          break;
        }
      } catch (error) {
        debug(`Error with selector ${selector}:`, error);
      }
    }
  }

  // Strategy 3: Check for specific platform patterns
  if (!extracted || !content.trim()) {
    debug("Strategy 3: Using platform-specific patterns");

    if (platform.name === "CHATGPT") {
      // ChatGPT-specific pattern
      const markdownDiv = element.querySelector(".markdown");
      if (markdownDiv) {
        content = markdownDiv.textContent;
        extracted = true;
        debug("Extracted content from ChatGPT markdown div");
      }
    } else if (platform.name === "CLAUDE") {
      // Claude-specific pattern
      const messageContent = element.querySelector(".message-content, .prose");
      if (messageContent) {
        content = messageContent.textContent;
        extracted = true;
        debug("Extracted content from Claude message content");
      }
    } else if (platform.name === "GEMINI") {
      // Gemini-specific pattern
      const responseContent = element.querySelector(
        '[data-test-id="response-text"], [data-test-id="query-text"]'
      );
      if (responseContent) {
        content = responseContent.textContent;
        extracted = true;
        debug("Extracted content from Gemini response text");
      }
    }
  }

  // Strategy 4: If nothing found yet, try traversing the DOM for text nodes
  if (!extracted || !content.trim()) {
    debug("Strategy 4: Traversing DOM for text nodes");
    content = extractTextFromNode(element);
    extracted = true;
  }

  // If still nothing, fall back to direct textContent
  if (!content.trim()) {
    debug("Falling back to direct textContent");
    content = element.textContent;
  }

  debug(`Extracted content length: ${content.length} characters`);
  return content.trim();
}

// Helper to extract text from DOM node and its children
function extractTextFromNode(node) {
  if (!node) return "";

  let text = "";

  // Skip hidden elements
  if (node.nodeType === Node.ELEMENT_NODE && !isElementVisibleAndExists(node)) {
    return "";
  }

  // For text nodes, just get the content
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.trim();
  }

  // Skip non-content elements
  const skipTags = ["SCRIPT", "STYLE", "NOSCRIPT", "META", "LINK"];
  if (node.nodeType === Node.ELEMENT_NODE && skipTags.includes(node.tagName)) {
    return "";
  }

  // Process element node
  if (node.nodeType === Node.ELEMENT_NODE) {
    // Special handling for code blocks
    if (node.tagName === "PRE" || node.tagName === "CODE") {
      const language = node.className.match(/language-(\w+)/)?.[1] || "";
      return `\`\`\`${language}\n${node.textContent}\n\`\`\`\n`;
    }

    // Special handling for list items
    if (node.tagName === "LI") {
      return `• ${node.textContent.trim()}\n`;
    }

    // Add newlines for block elements
    const blockElements = [
      "DIV",
      "P",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "BLOCKQUOTE",
      "UL",
      "OL",
    ];
    const addNewline = blockElements.includes(node.tagName);

    // Process all child nodes
    for (const child of node.childNodes) {
      text += extractTextFromNode(child);
    }

    if (addNewline && text.trim()) {
      text += "\n";
    }

    return text;
  }

  return "";
}

// Clean message content
function cleanMessageContent(content) {
  if (!content) return "";
  return content
    .replace(/^\s+|\s+$/g, "") // Trim whitespace
    .replace(/\s+/g, " ") // Normalize spaces
    .replace(/\n+/g, "\n") // Normalize newlines
    .replace(/[^\S\r\n]+/g, " "); // Replace multiple spaces with single space
}

// Setup message observer
function setupMessageObserver(platform) {
  if (!platform || conversationState.observing) {
    console.warn("Observer already running or invalid platform");
    return;
  }

  console.log("Setting up message observer for", platform.name);

  // Debounce timeout
  let observerTimeout;

  // Create mutation observer
  const observer = new MutationObserver((mutations) => {
    // Check if any of the mutations are relevant to our message containers
    const relevantChanges = mutations.some((mutation) => {
      // Check if the mutation target or its parent matches our selectors
      const isMessageContainer = (element) => {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

        try {
          // First check if element has matches method
          if (typeof element.matches !== "function") {
            // Try to use closest if available as fallback
            return (
              typeof element.closest === "function" &&
              platform.selectors.message.some((selector) =>
                element.closest(selector)
              )
            );
          }

          // Check direct match
          const directMatch = platform.selectors.message.some((selector) =>
            element.matches(selector)
          );
          if (directMatch) return true;

          // Check parent match
          return (
            typeof element.closest === "function" &&
            platform.selectors.message.some((selector) =>
              element.closest(selector)
            )
          );
        } catch (err) {
          console.debug("Error in message container check:", err.message);
          return false;
        }
      };

      // Check added nodes
      const hasNewMessages = Array.from(mutation.addedNodes).some(
        isMessageContainer
      );

      // Check modified nodes
      const isMessageModified = isMessageContainer(mutation.target);

      // Check if the mutation affects message content
      const affectsMessageContent =
        platform.selectors.contentSelectors &&
        Object.values(platform.selectors.contentSelectors)
          .flat()
          .some((selector) => {
            try {
              // Enhanced guard against Elements that don't have matches method
              if (!mutation.target) return false;
              if (mutation.target.nodeType !== Node.ELEMENT_NODE) return false;
              if (typeof mutation.target.matches !== "function") return false;
              return mutation.target.matches(selector);
            } catch (matchError) {
              console.debug("Element match check failed:", matchError.message);
              return false;
            }
          });

      // Check for attribute changes that might affect messages
      const hasRelevantAttributeChange =
        mutation.type === "attributes" &&
        ["class", "data-message-id", "data-test-id"].includes(
          mutation.attributeName
        );

      return (
        hasNewMessages ||
        isMessageModified ||
        affectsMessageContent ||
        hasRelevantAttributeChange
      );
    });

    // Only process if we have relevant changes
    if (relevantChanges) {
      // Clear existing timeout
      clearTimeout(observerTimeout);

      // Set new timeout for debouncing
      observerTimeout = setTimeout(() => {
        console.log("Processing debounced conversation changes");
        const messages = extractConversation(platform);

        if (messages.length !== conversationState.lastMessageCount) {
          console.log("Conversation updated:", messages.length, "messages");
          conversationState.messages = messages;
          conversationState.lastMessageCount = messages.length;

          // Save to storage
          saveConversation(messages);
        }
      }, 500); // Debounce delay
    }
  });

  // Enhanced observer configuration
  const observerConfig = {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: true,
    attributes: true,
    attributeFilter: [
      "class",
      "data-message-id",
      "data-test-id",
      "data-message-type",
    ],
  };

  // Start observing with enhanced options
  observer.observe(platform.container, observerConfig);

  conversationState.observing = true;
  console.log("Message observer started");

  // Do initial extraction
  const initialMessages = extractConversation(platform);
  if (initialMessages.length > 0) {
    console.log("Initial messages found:", initialMessages.length);
    conversationState.messages = initialMessages;
    conversationState.lastMessageCount = initialMessages.length;
    saveConversation(initialMessages);
  }

  // Start container monitoring
  monitorContainerChanges(platform);

  // Return the observer instance for cleanup
  return observer;
}

// Helper to pair messages into conversation turns
function pairMessages(messages) {
  const paired = [];
  // Handle case where the first message is from assistant (some platforms may show welcome message)
  let startIndex = messages[0]?.role === "assistant" ? 1 : 0;

  for (let i = startIndex; i < messages.length - 1; i += 2) {
    if (messages[i]?.role === "user" && messages[i + 1]?.role === "assistant") {
      paired.push({
        user: messages[i].content,
        assistant: messages[i + 1].content,
        timestamp: messages[i + 1].timestamp, // use assistant's timestamp as reference
      });
    }
  }

  // Handle unpaired last message (if user sent a message that hasn't been responded to)
  const lastIndex = messages.length - 1;
  if (
    lastIndex >= 0 &&
    messages[lastIndex].role === "user" &&
    (lastIndex === 0 || messages[lastIndex - 1].role === "assistant")
  ) {
    paired.push({
      user: messages[lastIndex].content,
      assistant: null, // No response yet
      timestamp: messages[lastIndex].timestamp,
    });
  }

  return paired;
}

// Helper to deduplicate messages
function deduplicateMessages(messages) {
  const seen = new Set();
  return messages.filter((msg) => {
    // Skip incomplete or streaming messages
    if (
      !msg.content ||
      msg.content.includes("▌") ||
      msg.content.includes("...")
    ) {
      return false;
    }

    const key = `${msg.role}-${msg.content.substring(0, 50)}`; // Use prefix for comparison
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Helper to check if message is complete or still streaming
function isMessageComplete(element) {
  const loadingSelectors = [
    ".loading",
    '[aria-busy="true"]',
    ".streaming",
    ".partial-message",
    ".typing-indicator",
    ".cursor-blink",
  ];
  return !loadingSelectors.some((selector) => element.querySelector(selector));
}

// Check if the extension context is still valid before accessing chrome APIs
function isExtensionContextValid() {
  try {
    // This will throw an error if the extension context is invalidated
    return !!chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    console.log("Extension context is invalid:", e);
    return false;
  }
}

// Function to safely use chrome API
function safelyUseChrome(callback, fallback = () => {}) {
  if (isExtensionContextValid()) {
    try {
      return callback();
    } catch (e) {
      console.error("Error using Chrome API:", e);
      return fallback();
    }
  } else {
    console.warn("Skipping Chrome API call - extension context is invalid");
    return fallback();
  }
}

// Modified saveConversation to use tab-specific storage
function saveConversation(messages) {
  if (!messages || messages.length === 0) return;

  // If extension context is invalid, don't try to use chrome APIs
  if (!isExtensionContextValid()) {
    console.warn("Extension context invalidated, cannot save conversation");
    return;
  }

  // Generate a unique conversation ID based on URL, timestamp and platform
  const platformName = conversationState.platform
    ? conversationState.platform.name
    : "UNKNOWN";

  // Get tab identification
  const tabUrl = window.location.href;
  const tabId = tabUrl.split(/[?#]/)[0]; // Base URL without params/fragments
  const conversationId = `${platformName}-${tabId}-${Date.now()}`;

  // Generate message pairs for turn-based viewing
  const messagePairs = pairMessages(messages);
  conversationState.messagePairs = messagePairs;

  // Get current URL as conversation identifier
  const conversationUrl = window.location.href;

  safelyUseChrome(() => {
    chrome.storage.local.get(["conversationHistory"], (result) => {
      const history = result.conversationHistory || [];

      // Check if this is a new conversation or update to existing one
      const existingConversationIndex = history.findIndex(
        (conv) =>
          conv.url === conversationUrl &&
          Date.now() - new Date(conv.timestamp).getTime() < 30 * 60 * 1000 // 30 minutes threshold
      );

      if (existingConversationIndex !== -1) {
        // Update existing conversation
        history[existingConversationIndex] = {
          id: history[existingConversationIndex].id,
          url: conversationUrl,
          platform: platformName,
          messages,
          messagePairs,
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };
      } else {
        // Add new conversation
        history.push({
          id: conversationId,
          url: conversationUrl,
          platform: platformName,
          messages,
          messagePairs,
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });
      }

      // Keep only last 100 conversations and save
      const updatedHistory = history
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        .slice(0, 100);

      chrome.storage.local.set(
        {
          conversationHistory: updatedHistory,
          latestConversation: {
            id: conversationId,
            tabUrl: tabUrl,
            tabId: tabId,
            messages,
            messagePairs,
            timestamp: new Date().toISOString(),
          },
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Error saving conversation:",
              chrome.runtime.lastError
            );
          } else {
            console.log("Conversation saved with ID:", conversationId);
          }
        }
      );
    });
  });
}

// Reset conversation state with safe Chrome API usage
function resetConversationState() {
  console.log("Resetting conversation state completely");

  conversationState = {
    messages: [],
    messagePairs: [], // Add message pairs for turn-based tracking
    platform: null,
    lastMessageCount: 0,
    summarized: false,
    observing: false,
    currentConversationId: null,
    tabUrl: window.location.href,
  };

  // Clear latest conversation in storage
  safelyUseChrome(() => {
    chrome.storage.local.remove(["latestConversation"], () => {
      if (chrome.runtime.lastError) {
        console.warn("Error clearing conversation:", chrome.runtime.lastError);
      } else {
        console.log("Cleared latest conversation from storage");
      }
    });

    // Also reset any observers
    if (window.messageObserver) {
      window.messageObserver.disconnect();
      window.messageObserver = null;
    }
  });
}

// Inject MutationSummary library for reliable DOM observation
function injectMutationSummaryLibrary() {
  debug("Injecting MutationSummary library");
  const script = document.createElement("script");
  script.src =
    "https://rawgit.com/rafaelw/mutation-summary/master/src/mutation-summary.js";
  script.onload = () => {
    debug("MutationSummary loaded successfully");
    initializeMutationObserver();
  };
  script.onerror = (error) => {
    debug("Failed to load MutationSummary:", error);
    // Fallback to direct loading from string
    injectMutationSummaryFromString();
  };
  document.head.appendChild(script);
}

// Fallback to inject the library as a string if CDN fails
function injectMutationSummaryFromString() {
  debug("Injecting MutationSummary from string");
  const script = document.createElement("script");
  // Shortened version of MutationSummary
  script.textContent = `
    // MutationSummary API (simplified version)
    (function(global) {
      'use strict';

      // MutationObserver shim
      var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

      // Main MutationSummary constructor
      function MutationSummary(opts) {
        var observer;
        var callback = opts.callback;
        var queries = opts.queries || [];

        function getSummary(mutations) {
          var added = new Set();
          var removed = new Set();
          var attributeChanged = new Set();

          mutations.forEach(function(mutation) {
            // Handle added nodes
            if (mutation.addedNodes && mutation.addedNodes.length) {
              Array.prototype.forEach.call(mutation.addedNodes, function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  added.add(node);
                  if (node.textContent) {
                    attributeChanged.add(node);
                  }
                }
              });
            }

            // Handle removed nodes
            if (mutation.removedNodes && mutation.removedNodes.length) {
              Array.prototype.forEach.call(mutation.removedNodes, function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  removed.add(node);
                }
              });
            }

            // Handle attributes
            if (mutation.type === 'attributes') {
              attributeChanged.add(mutation.target);
            }

            // Handle character data
            if (mutation.type === 'characterData') {
              attributeChanged.add(mutation.target.parentNode);
            }
          });

          // Convert sets to arrays
          return queries.map(function(query) {
            var result = {
              added: [],
              removed: [],
              attributeChanged: []
            };

            // Filter elements based on query
            if (query.element) {
              var selector = query.element;

              added.forEach(function(node) {
                if (node.matches && node.matches(selector)) {
                  result.added.push(node);
                } else if (node.querySelectorAll) {
                  Array.prototype.push.apply(result.added, Array.from(node.querySelectorAll(selector)));
                }
              });

              removed.forEach(function(node) {
                if (node.matches && node.matches(selector)) {
                  result.removed.push(node);
                }
              });

              attributeChanged.forEach(function(node) {
                if (node.matches && node.matches(selector)) {
                  result.attributeChanged.push(node);
                }
              });
            }

            return result;
          });
        }

        // Initialize observer
        observer = new MutationObserver(function(mutations) {
          var summary = getSummary(mutations);
          callback(summary);
        });

        // Start observing
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
          attributeOldValue: true,
          characterDataOldValue: true
        });

        // API
        this.disconnect = function() {
          if (observer) {
            observer.disconnect();
            observer = undefined;
          }
        };
      }

      // Export
      global.MutationSummary = MutationSummary;
    })(window);
  `;
  script.onload = () => {
    debug("MutationSummary string version loaded");
    initializeMutationObserver();
  };
  document.head.appendChild(script);
}

// Initialize the advanced mutation observer with MutationSummary
function initializeMutationObserver() {
  debug("Initializing advanced mutation observer");

  // Wait for MutationSummary to be available
  if (!window.MutationSummary) {
    setTimeout(initializeMutationObserver, 500);
    return;
  }

  try {
    // Generate selectors for all platforms
    const allMessageSelectors = Object.values(AI_PLATFORMS).flatMap(
      (platform) => [
        ...platform.selectors.message,
        ...platform.selectors.userMessage,
        ...platform.selectors.aiMessage,
      ]
    );

    // Common message selectors across platforms
    const commonSelectors = [
      'div[role="listitem"]',
      "div.message",
      "div.chat-message",
      "div.chat-turn",
      "div[data-message-id]",
      "div[data-message-author-role]",
      'div[data-testid*="message"]',
      'div[data-test-id*="message"]',
      "div.conversation-turn",
    ];

    // Combine all selectors
    const combinedSelectors = [
      ...new Set([...allMessageSelectors, ...commonSelectors]),
    ].join(",");

    debug("Using combined selector:", combinedSelectors);

    // Create new observer with MutationSummary
    window.messageObserver = new MutationSummary({
      callback: handleMessageChanges,
      queries: [{ element: combinedSelectors }],
    });

    debug("MutationSummary observer started");
  } catch (error) {
    debug("Error setting up MutationSummary:", error);
  }
}

// Handle message changes detected by MutationSummary
function handleMessageChanges(summaries) {
  if (!summaries || !summaries[0]) return;

  const summary = summaries[0];
  debug(
    `MutationSummary detected changes: ${summary.added.length} added, ${summary.removed.length} removed, ${summary.attributeChanged.length} changed`
  );

  // Process if we have new or changed messages
  if (summary.added.length > 0 || summary.attributeChanged.length > 0) {
    processDetectedMessages();
  }
}

// Process messages detected by MutationSummary
function processDetectedMessages() {
  debug("Processing detected messages");

  // If no platform detected yet, try to detect
  if (!conversationState.platform) {
    detectAIPlatform().then((platform) => {
      if (platform) {
        conversationState.platform = platform;
        processMessageElements();
      }
    });
    return;
  }

  // Process message elements
  processMessageElements();
}

// Process message elements based on current platform
function processMessageElements() {
  const platform = conversationState.platform;
  if (!platform) return;

  debug(`Processing message elements for ${platform.name}`);

  try {
    // Get messages based on platform
    let messages = [];

    if (platform.name === "GEMINI") {
      messages = extractGeminiMessages(platform.container);
    } else {
      // Default extraction for other platforms
      messages = extractConversation(platform);
    }

    if (
      messages.length > 0 &&
      messages.length !== conversationState.lastMessageCount
    ) {
      debug(
        `Found ${messages.length} messages (was ${conversationState.lastMessageCount})`
      );
      conversationState.messages = messages;
      conversationState.lastMessageCount = messages.length;
      saveConversation(messages);
    }
  } catch (error) {
    debug("Error processing message elements:", error);
  }
}

// Direct message retrieval approach inspired by commercial tools
function initializeDirectMessageRetrieval() {
  debug("Initializing direct message retrieval");

  try {
    // Check if chrome.runtime is available before using getURL
    if (!chrome || !chrome.runtime || !chrome.runtime.getURL) {
      debug(
        "Chrome runtime is not available for getURL in direct message retrieval"
      );
      return;
    }

    // Use an external script file instead of inline script
    const script = document.createElement("script");
    try {
      script.src = chrome.runtime.getURL("message-retriever.js");
    } catch (urlError) {
      debug("Error getting URL for message-retriever.js:", urlError);
      return;
    }

    script.onload = () => {
      debug("Message retriever script loaded");
    };
    script.onerror = (error) => {
      debug("Error loading message retriever:", error);
    };
    document.head.appendChild(script);

    // Listen for message events from the page script
    window.addEventListener("message", (event) => {
      // Only accept messages from the same window
      if (event.source !== window) return;

      if (event.data.type === "ai-chat-messages") {
        if (event.data.messages && event.data.messages.length > 0) {
          debug(
            `Direct retrieval found ${event.data.messages.length} messages`
          );
          processRetrieverMessages(event.data.messages);
        }
      } else if (event.data.type === "bridge-relay") {
        // Handle messages from observers and DOM diffing
        if (event.data.messages && event.data.messages.length > 0) {
          debug(
            `Received ${event.data.messages.length} messages from ${event.data.source}`
          );
          processRetrieverMessages(event.data.messages);
        }
      }
    });
  } catch (error) {
    debug("Error in direct message retrieval setup:", error);
  }
}

// Process messages from the direct retriever
function processRetrieverMessages(messages) {
  if (!messages || messages.length === 0) return;

  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content: cleanMessageContent(msg.content),
    timestamp: msg.timestamp || new Date().toISOString(),
    source: msg.source,
  }));

  if (formattedMessages.length !== conversationState.lastMessageCount) {
    debug(
      `Chat retriever found ${formattedMessages.length} messages from ${formattedMessages[0].source}`
    );
    conversationState.messages = formattedMessages;
    conversationState.lastMessageCount = formattedMessages.length;
    saveConversation(formattedMessages);
  }
}

// Initialize advanced observers for better message detection
function initializeAdvancedObservers() {
  debug("Initializing advanced observers");

  try {
    // Check if chrome.runtime is available before using getURL
    if (!chrome || !chrome.runtime || !chrome.runtime.getURL) {
      debug("Chrome runtime is not available for getURL in advanced observers");
      return;
    }

    // Load message bridge which will also load observers
    const script = document.createElement("script");
    try {
      script.src = chrome.runtime.getURL("message-bridge.js");
    } catch (urlError) {
      debug("Error getting URL for message-bridge.js:", urlError);
      return;
    }

    script.onload = () => {
      debug("Message bridge loaded");
    };
    script.onerror = (error) => {
      debug("Error loading message bridge:", error);
    };
    document.head.appendChild(script);
  } catch (error) {
    debug("Error initializing advanced observers:", error);
  }
}

// Modify initializePlatformDetection to use all available methods
async function initializePlatformDetection() {
  try {
    // Clean up existing observers and intervals
    if (containerMonitorInterval) {
      clearInterval(containerMonitorInterval);
      containerMonitorInterval = null;
    }

    if (conversationState.observer) {
      conversationState.observer.disconnect();
    }

    if (window.messageObserver) {
      window.messageObserver.disconnect();
    }

    // Reset state
    resetConversationState();

    // Initialize all message capture methods
    injectShadowDOMHelper();
    initializeDirectMessageRetrieval();
    initializeAdvancedObservers(); // Add advanced observers

    const platform = await detectAIPlatform();
    if (platform) {
      debug("Platform detected:", platform.name);
      conversationState.platform = platform;
      currentContainer = platform.container;
      const observer = setupMessageObserver(platform);

      // Store observer for cleanup
      conversationState.observer = observer;

      // Generate new conversation ID
      conversationState.currentConversationId = `${
        platform.name
      }-${Date.now()}`;
    } else {
      debug("No supported AI platform detected");
    }
  } catch (error) {
    debug("Error during platform detection:", error);
  }
}

// Start detection when page loads - use improved loading logic
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    waitForStableDOM(initializePlatformDetection);
  });
} else {
  waitForStableDOM(initializePlatformDetection);
}

// Also initialize when load event fires to ensure we capture fully rendered DOM
window.addEventListener("load", () => {
  console.log("Page fully loaded, initializing conversation detection");
  initializePlatformDetection();
});

// Update URL change handler
// Using the lastUrl variable that's already declared at the top level
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log("URL changed, reinitializing...");
    initializePlatformDetection();
  }
}).observe(document, { subtree: true, childList: true });

// Helper function to get message position in DOM
function getMessagePosition(element) {
  return Array.from(element.parentNode.children).indexOf(element);
}

// Helper function to detect message role with validation and text-based fallback
function detectMessageRole(element, platform) {
  const isUser = platform.selectors.userMessage.some(
    (selector) => element.matches(selector) || element.closest(selector)
  );

  const isAI = platform.selectors.aiMessage.some(
    (selector) => element.matches(selector) || element.closest(selector)
  );

  if (isUser && isAI) {
    console.warn("Conflicting role detection:", element);
    // If conflicting, try text-based inference
    const text = element.textContent.trim();
    const inferredRole = inferRoleFromText(text);
    if (inferredRole !== "unknown") {
      debug(`Using text-based role inference: ${inferredRole}`);
      return inferredRole;
    }
    return "unknown";
  }

  if (isUser) return "user";
  if (isAI) return "assistant";

  // If role couldn't be determined by selectors, try text-based inference
  const text = element.textContent.trim();
  const inferredRole = inferRoleFromText(text);
  if (inferredRole !== "unknown") {
    debug(`Using text-based role inference: ${inferredRole}`);
    return inferredRole;
  }

  return "unknown";
}

// Helper to infer role from message text content
function inferRoleFromText(text) {
  if (!text || text.length < 5) return "unknown";

  // Common user message patterns
  if (
    text.match(
      /^(hi|hello|hey|how|can you|what is|could you|please|I need|I want|I'm trying|explain)/i
    )
  ) {
    return "user";
  }

  // Common AI response patterns
  if (
    text.match(
      /^(sure|here|let me|certainly|absolutely|I'd be happy|as an AI|based on|according to|I don't have|I cannot)/i
    )
  ) {
    return "assistant";
  }

  // Look for code blocks - more common in AI responses
  if (text.includes("```") || text.match(/function\s+\w+\s*\(/)) {
    return "assistant";
  }

  // Longer explanatory text is usually from AI
  if (text.length > 200 && text.includes(". ")) {
    return "assistant";
  }

  return "unknown";
}

// Fallback extraction method when all other methods fail
function fallbackExtract(container) {
  debug("Using fallback content extraction");
  const messages = [];

  try {
    // Try to find paragraphs or text blocks
    const paragraphs = container.querySelectorAll(
      'p, div > span, div[role="listitem"]'
    );

    if (paragraphs.length > 0) {
      debug(`Found ${paragraphs.length} potential paragraph elements`);

      // Only include paragraphs with substantial content
      const contentParagraphs = Array.from(paragraphs)
        .filter(
          (p) => isElementVisibleAndExists(p) && p.innerText.trim().length > 10
        )
        .map((p) => ({
          element: p,
          content: p.innerText.trim(),
          // Try to determine parent message container
          container: p.closest(
            '.message, .chat-message, div[role="listitem"], .conversation-turn'
          ),
        }));

      debug(`${contentParagraphs.length} paragraphs have substantial content`);

      // Group by message container when possible
      const messageGroups = new Map();

      contentParagraphs.forEach((para) => {
        if (para.container) {
          if (!messageGroups.has(para.container)) {
            messageGroups.set(para.container, []);
          }
          messageGroups.get(para.container).push(para);
        }
      });

      // Process grouped paragraphs first
      let messageIndex = 0;
      messageGroups.forEach((paragraphs, container) => {
        const combinedContent = paragraphs.map((p) => p.content).join("\n\n");

        // Try to detect role for the container
        let role = "unknown";

        // First try standard detection
        if (platform && platform.selectors) {
          role = detectMessageRole(container, platform);
        }

        // If that fails, infer from content
        if (role === "unknown") {
          role = inferRoleFromText(combinedContent);
        }

        // If still unknown, alternate based on position
        if (role === "unknown") {
          role = messageIndex % 2 === 0 ? "user" : "assistant";
        }

        if (combinedContent.trim()) {
          messages.push({
            role,
            content: combinedContent,
            timestamp: new Date().toISOString(),
            position: messageIndex,
          });
          messageIndex++;
        }
      });

      // Process ungrouped paragraphs
      const ungrouped = contentParagraphs.filter((para) => !para.container);
      for (let i = 0; i < ungrouped.length; i++) {
        // Try to infer role from content
        let role = inferRoleFromText(ungrouped[i].content);

        // If unknown, alternate
        if (role === "unknown") {
          role = messageIndex % 2 === 0 ? "user" : "assistant";
        }

        messages.push({
          role,
          content: ungrouped[i].content,
          timestamp: new Date().toISOString(),
          position: messageIndex,
        });
        messageIndex++;
      }
    } else {
      // If no paragraphs, try direct text nodes
      debug("No paragraphs found, trying direct text extraction");
      const lines = extractTextFromNode(container)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 10);

      debug(`Found ${lines.length} text lines`);

      // Group consecutive lines from same speaker
      let currentRole = "user";
      let currentMessage = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const inferredRole = inferRoleFromText(line);

        if (inferredRole !== "unknown" && inferredRole !== currentRole) {
          // Role changed, save current message
          if (currentMessage) {
            messages.push({
              role: currentRole,
              content: currentMessage,
              timestamp: new Date().toISOString(),
              position: messages.length,
            });
            currentMessage = "";
          }
          currentRole = inferredRole;
        }

        if (currentMessage) currentMessage += "\n";
        currentMessage += line;

        // Force role toggle on long sections
        if (currentMessage.length > 1000 && i < lines.length - 1) {
          messages.push({
            role: currentRole,
            content: currentMessage,
            timestamp: new Date().toISOString(),
            position: messages.length,
          });
          currentMessage = "";
          currentRole = currentRole === "user" ? "assistant" : "user";
        }
      }

      // Add final message
      if (currentMessage) {
        messages.push({
          role: currentRole,
          content: currentMessage,
          timestamp: new Date().toISOString(),
          position: messages.length,
        });
      }
    }

    debug(`Fallback extraction found ${messages.length} messages`);
  } catch (error) {
    debug("Error in fallback extraction:", error);
  }

  return messages;
}

// Container monitoring
let currentContainer = null;
let containerMonitorInterval = null;

function monitorContainerChanges(platform) {
  if (containerMonitorInterval) {
    clearInterval(containerMonitorInterval);
  }

  containerMonitorInterval = setInterval(() => {
    const newContainer = findElementWithSelectors(platform.selectors.container);
    if (newContainer !== currentContainer) {
      currentContainer = newContainer;
      if (currentContainer) {
        platform.container = currentContainer;
        setupMessageObserver(platform);
      }
    }
  }, 3000);
}

// Add message listener for extension actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request.action);

  // Immediately acknowledge message receipt to prevent connection issues
  const acknowledgeReceipt = () => {
    try {
      sendResponse({ received: true, processing: true });
    } catch (err) {
      console.error("Error acknowledging message receipt:", err);
    }
  };

  // For actions that might take time, acknowledge receipt first
  if (
    request.action === "getConversationData" ||
    request.action === "reloadExtension"
  ) {
    acknowledgeReceipt();
  }

  try {
    switch (request.action) {
      case "ping":
        // Simple ping-pong to check if content script is responsive
        console.log("Received ping, sending detailed pong");
        sendResponse({
          pong: true,
          timestamp: Date.now(),
          url: window.location.href,
          domain: window.location.hostname,
          platform: conversationState.platform
            ? conversationState.platform.name
            : null,
          ready: true,
          version: "1.0.1", // Include version to help with debugging
        });
        break;

      case "getConversationData":
        console.log("Sending conversation data:", {
          messageCount: conversationState.messages.length,
          platform: conversationState.platform
            ? conversationState.platform.name
            : null,
        });

        // Get fresh conversation data if available
        let currentMessages = [];
        if (conversationState.platform) {
          try {
            // Try to extract fresh conversation
            currentMessages = extractConversation(conversationState.platform);
          } catch (extractError) {
            console.error("Error extracting fresh conversation:", extractError);
            // Fall back to stored messages
            currentMessages = conversationState.messages;
          }
        } else {
          currentMessages = conversationState.messages;
        }

        // If we have no messages, try to detect platform again
        if (currentMessages.length === 0) {
          console.log("No messages found, attempting to re-detect platform");
          detectAIPlatform().then((platform) => {
            if (platform) {
              console.log("Re-detected platform:", platform.name);
              conversationState.platform = platform;
              const freshMessages = extractConversation(platform);

              // Send response after async operations
              sendResponse({
                conversation: freshMessages,
                platform: platform.name,
              });
            } else {
              sendResponse({
                conversation: [],
                platform: null,
              });
            }
          });
          return true; // Keep channel open for async response
        }

        sendResponse({
          conversation: currentMessages,
          platform: conversationState.platform
            ? conversationState.platform.name
            : null,
        });
        break;

      case "reloadExtension":
        console.log("Reloading extension state...");

        // Clear storage
        safelyUseChrome(() => {
          chrome.storage.local.set(
            {
              currentConversation: [],
              currentPlatform: null,
              lastDetectedPlatform: null,
            },
            () => {
              console.log("Storage cleared");
            }
          );
        });

        // Reset conversation state
        resetConversationState();

        // Force re-detection of platform
        detectAIPlatform().then((platform) => {
          if (platform) {
            console.log("Re-detected platform:", platform.name);
            conversationState.platform = platform;
            setupMessageObserver(platform);
          } else {
            console.log("No platform detected after reload");
          }
        });

        // Tell popup that we've reset
        sendResponse({
          success: true,
          message: "Extension state reset successfully",
        });
        break;

      case "clearConversation":
        // Clear conversation state
        conversationState.messages = [];
        conversationState.lastMessageCount = 0;

        // Clear storage
        safelyUseChrome(() => {
          chrome.storage.local.remove(["latestConversation"], () => {
            console.log("Cleared conversation from storage");
          });
        });

        sendResponse({
          success: true,
          message: "Conversation cleared",
        });
        break;
      default:
        sendResponse({ success: false, message: "Unknown action" });
        break;
    }
  } catch (error) {
    console.error("Error handling message in content script:", error);
    // Try to send error response, but don't fail if it's not possible
    try {
      // Format error to avoid [object Object] in error messages
      let errorDetail = "Unknown error";
      if (error) {
        if (typeof error === "string") {
          errorDetail = error;
        } else if (error.message) {
          errorDetail = error.message;
        } else if (error.toString) {
          errorDetail = error.toString();
        }
      }

      sendResponse({
        success: false,
        error: errorDetail,
        action: request.action,
      });
    } catch (sendError) {
      console.error("Error sending response:", sendError);
    }
  }

  // Required for async response
  return true;
});
