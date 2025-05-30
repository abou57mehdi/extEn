// Content script for the Conversation Log & Summary extension
/* global chrome */
console.log("Conversation Log Extension content script loaded");

// Configuration des sites d'IA supportés
const AI_PLATFORMS = {
  CHATGPT: {
    domain: "chat.openai.com",
    messageSelector:
      'article[data-testid^="conversation-turn-"], div[data-message-author-role], div.text-base, div.min-h-8.text-message, div.flex.w-full.flex-col',
    userIndicator:
      '[data-message-author-role="user"], article[data-testid="conversation-turn-user"], div.group/conversation-turn.relative',
    containerSelector:
      'main, div[role="presentation"], div.flex.flex-col.items-center, div.flex.h-full.w-full.flex-col',
  },
  CLAUDE: {
    domain: "claude.ai",
    messageSelector: "div.prose, div.text-message-content",
    userIndicator:
      "div.user-message, div.flex.min-h-screen.w-full.overflow-x-hidden div[role='region'] + div",
    containerSelector:
      "main.flex-1, div.overflow-y-auto, div.flex.min-h-screen.w-full", // Updated selector for Claude
  },
  GEMINI: {
    domain: "gemini.google.com",
    messageSelector: ".message-content",
    userIndicator: ".user-message",
    containerSelector: 'div[role="log"]',
  },
};

// State management
let currentConversation = [];
let currentPlatform = null;

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

// Message observer setup
function setupMessageObserver() {
  const platform = detectPlatform();
  console.log("Setting up observer for platform:", platform);

  if (!platform) {
    console.log("No platform detected, observer not started");
    return;
  }

  currentPlatform = platform;
  const config = { childList: true, subtree: true };

  // Try multiple possible container selectors
  const platformConfig = AI_PLATFORMS[platform];
  const possibleSelectors = platformConfig.containerSelector.split(", ");
  let container = null;

  for (const selector of possibleSelectors) {
    container = document.querySelector(selector);
    if (container) {
      console.log("Found container with selector:", selector);
      break;
    }
  }

  if (!container) {
    console.warn("Container not found for platform:", platform);
    // Try observing body as fallback
    container = document.body;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        checkForNewMessages();
      }
    });
  });

  observer.observe(container, config);
  console.log("Observer started for platform:", platform);

  // Initial message check
  checkForNewMessages();
}

// Check for new messages based on platform
function checkForNewMessages() {
  if (!currentPlatform) return;

  console.log("Checking for messages on platform:", currentPlatform);
  const platformConfig = AI_PLATFORMS[currentPlatform];
  let messages = [];

  try {
    // Try multiple possible container selectors
    const possibleSelectors = platformConfig.containerSelector.split(", ");
    let container = null;

    for (const selector of possibleSelectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log("Found container with selector:", selector);
        break;
      }
    }

    if (!container) {
      console.warn("Message container not found");
      return;
    }

    // Special handling for ChatGPT
    if (currentPlatform === "CHATGPT") {
      console.log("Using ChatGPT-specific message extraction");

      // Try conversation turns first (newest UI) - updated for new DOM structure
      let conversationTurns = container.querySelectorAll(
        'article[data-testid^="conversation-turn-"]'
      );

      if (conversationTurns && conversationTurns.length > 0) {
        console.log(
          `Found ${conversationTurns.length} conversation turns with article elements`
        );

        messages = Array.from(conversationTurns)
          .map((turn) => {
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
              srOnlyElements.forEach((el) => el.remove());

              content = clone.textContent.trim();
            }

            return { role, content };
          })
          .filter((msg) => msg.content); // Filter out empty messages
      } else {
        // Fallback to older UI patterns
        console.log(
          "No conversation turns found, trying alternative selectors"
        );

        // Try data-message-author-role elements - updated for new DOM structure
        const messageElements = container.querySelectorAll(
          "[data-message-author-role]"
        );
        if (messageElements && messageElements.length > 0) {
          console.log(
            `Found ${messageElements.length} messages with data-message-author-role`
          );

          messages = Array.from(messageElements)
            .map((msg) => {
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

              return { role, content };
            })
            .filter((msg) => msg.content);
        } else {
          // Last resort: try generic message selectors - updated for new DOM structure
          console.log("Trying generic message selectors for ChatGPT");
          const messageElements = container.querySelectorAll(
            platformConfig.messageSelector
          );
          console.log(
            `Found ${messageElements.length} message elements with generic selectors`
          );

          messages = Array.from(messageElements)
            .map((msg) => {
              // Determine role
              const isUser =
                msg.matches(platformConfig.userIndicator) ||
                msg.closest(platformConfig.userIndicator) ||
                (msg.getAttribute &&
                  msg.getAttribute("data-testid") &&
                  msg.getAttribute("data-testid").includes("user"));

              // Get content, but filter out sr-only elements
              let content = "";

              // Clone to avoid modifying original
              const clone = msg.cloneNode(true);

              // Remove sr-only elements that contain labels
              const srOnlyElements = clone.querySelectorAll(".sr-only");
              srOnlyElements.forEach((el) => el.remove());

              content = clone.textContent.trim();

              return {
                role: isUser ? "user" : "assistant",
                content: content,
              };
            })
            .filter((msg) => msg.content && msg.content.length > 2);
        }
      }
    } else if (currentPlatform === "CLAUDE") {
      console.log("Using Claude-specific message extraction");

      // Get all message elements
      const messageElements = container.querySelectorAll(
        platformConfig.messageSelector
      );
      console.log(
        `Found ${messageElements.length} message elements for Claude`
      );

      if (messageElements.length > 0) {
        // Group messages by their parent container to identify conversation turns
        const messageGroups = {};

        messageElements.forEach((el, index) => {
          // Find the closest parent that might be a message container
          const parent = el.closest(
            ".flex.items-start, .flex.flex-col, .w-full.border-b"
          );
          const parentId = parent
            ? parent.id || `parent-${index}`
            : `no-parent-${index}`;

          if (!messageGroups[parentId]) {
            messageGroups[parentId] = [];
          }

          messageGroups[parentId].push(el);
        });

        console.log(
          `Grouped into ${
            Object.keys(messageGroups).length
          } message groups for Claude`
        );

        // Process each group to determine role and content
        let lastRole = null; // Track last role to avoid duplicates

        Object.values(messageGroups).forEach((group, groupIndex) => {
          // Determine if this is a user message
          const isUserMessage = group.some(
            (el) =>
              el.matches(platformConfig.userIndicator) ||
              el.closest(platformConfig.userIndicator) !== null ||
              el.parentElement?.matches(platformConfig.userIndicator) ||
              el.parentElement?.closest(platformConfig.userIndicator) !== null
          );

          // Determine role based on user indicator and DOM structure
          let role;

          if (isUserMessage) {
            role = "user";
          } else {
            // If no explicit indicators, check the DOM structure
            // In Claude, user messages are often in a different container structure
            const hasUserMessageStructure = group.some((el) => {
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
            console.log(
              `Skipping consecutive ${role} message at group ${groupIndex}`
            );
            return;
          }

          // Combine all text in the group
          const content = group
            .map((el) => el.textContent.trim())
            .join("\n")
            .trim();

          if (content) {
            console.log(
              `Adding ${role} message from group ${groupIndex}: ${content.substring(
                0,
                50
              )}...`
            );

            messages.push({
              role,
              content,
            });

            lastRole = role;
          }
        });
      }

      // If we couldn't extract messages using groups, fall back to standard processing
      if (messages.length === 0) {
        console.log("Falling back to standard processing for Claude");

        // Try to determine message roles based on DOM structure and alternating pattern
        const allMessages = Array.from(messageElements);
        let currentRole = "user"; // Start with user (will alternate)

        messages = allMessages
          .map((msg, index) => {
            // Check if this is explicitly a user message
            const isUserMessage =
              msg.matches(platformConfig.userIndicator) ||
              msg.closest(platformConfig.userIndicator) !== null;

            // Determine role - if explicitly user, use that, otherwise alternate
            let role;
            if (isUserMessage) {
              role = "user";
            } else {
              // If previous message was processed with a different role, use alternating pattern
              if (index > 0 && messages.length > 0) {
                role =
                  messages[messages.length - 1].role === "user"
                    ? "assistant"
                    : "user";
              } else {
                // First message defaults to alternating from the initial value
                role = currentRole;
              }
            }

            // Update current role for next iteration
            currentRole = role === "user" ? "assistant" : "user";

            return {
              role,
              content: msg.textContent.trim(),
            };
          })
          .filter((msg) => msg.content); // Filter out empty messages
      }

      // Post-process to ensure we don't have duplicate consecutive roles
      if (messages.length > 1) {
        const dedupedMessages = [];
        let lastProcessedRole = null;

        messages.forEach((msg) => {
          // Skip if this would create consecutive messages with the same role
          if (msg.role === lastProcessedRole) {
            console.log(
              `Post-processing: Skipping consecutive ${msg.role} message`
            );
            return;
          }

          dedupedMessages.push(msg);
          lastProcessedRole = msg.role;
        });

        if (dedupedMessages.length !== messages.length) {
          console.log(
            `Post-processing: Reduced from ${messages.length} to ${dedupedMessages.length} messages`
          );
          messages = dedupedMessages;
        }
      }

      console.log(`Extracted ${messages.length} messages from Claude`);
    } else {
      // Standard processing for other platforms
      const messageElements = container.querySelectorAll(
        platformConfig.messageSelector
      );
      console.log(`Found ${messageElements.length} message elements`);

      messages = Array.from(messageElements)
        .map((msg) => ({
          role:
            msg.matches(platformConfig.userIndicator) ||
            msg.closest(platformConfig.userIndicator)
              ? "user"
              : "assistant",
          content: msg.textContent.trim(),
        }))
        .filter((msg) => msg.content); // Filter out empty messages
    }

    console.log("Processed messages:", messages.length);
  } catch (error) {
    console.error("Error processing messages:", error);
  }

  // Update storage if we have messages or if the count changed
  if (messages.length > 0 || messages.length !== currentConversation.length) {
    console.log("Updating conversation with", messages.length, "messages");
    currentConversation = messages;

    chrome.storage.local.set(
      {
        currentConversation: messages,
        currentPlatform: currentPlatform,
      },
      () => {
        console.log("Storage updated");
      }
    );
  }
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request.action);

  switch (request.action) {
    case "getConversationData":
      console.log("Sending conversation data:", {
        messageCount: currentConversation.length,
        platform: currentPlatform,
      });
      sendResponse({
        conversation: currentConversation,
        platform: currentPlatform,
      });
      break;

    case "clearConversation":
      currentConversation = [];
      chrome.storage.local.set({
        currentConversation: [],
        currentPlatform: currentPlatform,
      });
      sendResponse({ success: true });
      break;

    case "reloadExtension":
      console.log("Reloading extension state...");

      // Clear storage
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

      // Reset conversation state
      currentConversation = [];

      // Force re-detection of platform
      const platform = detectAIPlatform();
      if (platform) {
        console.log("Re-detected platform:", platform);
        currentPlatform = platform;
        setupMessageObserver();

        sendResponse({
          success: true,
          platform: platform,
          message: "Extension reloaded successfully",
        });
      } else {
        console.log("No platform detected after reload");
        sendResponse({
          success: false,
          message: "Failed to detect platform after reload",
        });
      }

      return true; // Keep the message channel open for async response
  }
  return true; // Keep the message channel open for async response
});

// Initialize immediately and after delay to ensure DOM is ready
console.log("Content script initializing...");
setupMessageObserver();

// Also initialize after a short delay to ensure dynamic content is loaded
setTimeout(setupMessageObserver, 1000);

// Reinitialize on significant DOM changes
const pageObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      // Check if significant elements were added
      const significant = Array.from(mutation.addedNodes).some(
        (node) =>
          node.nodeType === 1 && // Element node
          (node.matches?.("main") || node.matches?.('div[role="main"]'))
      );

      if (significant) {
        console.log("Significant DOM change detected, reinitializing...");
        setupMessageObserver();
        break;
      }
    }
  }
});

pageObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// Identifier la plateforme IA actuelle
function detectAIPlatform() {
  const hostname = window.location.hostname;
  console.log("Current hostname:", hostname);

  for (const [platform, config] of Object.entries(AI_PLATFORMS)) {
    console.log(`Checking platform ${platform} with domain ${config.domain}`);
    if (hostname.includes(config.domain)) {
      console.log("Detected platform:", platform);

      // Try multiple possible container selectors
      const possibleSelectors = config.containerSelector.split(", ");
      let container = null;

      for (const selector of possibleSelectors) {
        try {
          container = document.querySelector(selector);
          if (container) {
            console.log(`Container found with selector: ${selector}`);
            break;
          }
        } catch (error) {
          console.error(`Error with selector "${selector}":`, error);
        }
      }

      if (container) {
        // For ChatGPT, use special detection logic
        if (platform === "CHATGPT") {
          console.log("Using ChatGPT-specific detection");

          // Try conversation turns first (newest UI) - updated for new DOM structure
          const conversationTurns = document.querySelectorAll(
            'article[data-testid^="conversation-turn-"]'
          );
          if (conversationTurns && conversationTurns.length > 0) {
            console.log(
              `Found ${conversationTurns.length} conversation turns with article elements`
            );
            return platform;
          }

          // Try data-message-author-role elements
          const messageElements = document.querySelectorAll(
            "[data-message-author-role]"
          );
          if (messageElements && messageElements.length > 0) {
            console.log(
              `Found ${messageElements.length} messages with data-message-author-role`
            );
            return platform;
          }

          // Try text-base elements
          const textBaseElements = document.querySelectorAll(".text-base");
          if (textBaseElements && textBaseElements.length > 0) {
            console.log(`Found ${textBaseElements.length} text-base elements`);
            return platform;
          }

          // Try min-h-8.text-message elements
          const textMessageElements = document.querySelectorAll(
            ".min-h-8.text-message"
          );
          if (textMessageElements && textMessageElements.length > 0) {
            console.log(
              `Found ${textMessageElements.length} min-h-8.text-message elements`
            );
            return platform;
          }

          // Try group/conversation-turn elements
          const groupConversationElements = document.querySelectorAll(
            ".group\\/conversation-turn"
          );
          if (
            groupConversationElements &&
            groupConversationElements.length > 0
          ) {
            console.log(
              `Found ${groupConversationElements.length} group/conversation-turn elements`
            );
            return platform;
          }
        }

        // Standard detection for all platforms
        try {
          const messageSelectors = config.messageSelector.split(", ");
          let foundMessages = false;

          for (const selector of messageSelectors) {
            const messages = container.querySelectorAll(selector);
            if (messages && messages.length > 0) {
              console.log(
                `Found ${messages.length} messages with selector: ${selector}`
              );
              foundMessages = true;
              break;
            }
          }

          const userIndicators = config.userIndicator.split(", ");
          let foundUserMessages = false;

          for (const selector of userIndicators) {
            const userMessages = container.querySelectorAll(selector);
            if (userMessages && userMessages.length > 0) {
              console.log(
                `Found ${userMessages.length} user messages with selector: ${selector}`
              );
              foundUserMessages = true;
              break;
            }
          }

          if (foundMessages || foundUserMessages) {
            return platform;
          }
        } catch (error) {
          console.error("Error during message detection:", error);
        }
      }

      // Even if we couldn't verify selectors, return the platform based on domain
      // This helps with new UI versions where selectors might have changed
      console.log("Returning platform based on domain match only");
      return platform;
    }
  }

  console.log("No AI platform detected");
  return null;
}

// ... rest of your content.js code ...
