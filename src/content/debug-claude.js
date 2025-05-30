// Debug script for Claude detection
// This script can be injected into the Claude page to debug detection issues

(function () {
  console.log("Claude Debug Script Loaded");

  // Log DOM structure
  function logDOMStructure() {
    console.log("Logging DOM structure for Claude...");

    // Find main container
    const mainElement = document.querySelector("main");
    if (!mainElement) {
      console.log("Main element not found");
      return;
    }

    console.log("Main element:", mainElement);

    // Log key elements based on the screenshots
    const keySelectors = [
      "div.prose",
      "div.text-message-content",
      "div.user-message",
      "div.overflow-y-auto",
      "h-screen",
      "div.bg-token-main-surface-primary",
      "div.relative.flex.h-full",
      "div.flex.h-full.w-full",
      'div[role="region"]',
      "div[aria-label]",
      "div[data-message]",
      "div[data-conversation]",
    ];

    keySelectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}" found ${elements.length} elements`);

        if (elements.length > 0 && elements.length < 10) {
          // Log details of first few elements
          Array.from(elements)
            .slice(0, 3)
            .forEach((el, i) => {
              console.log(`Element ${i} for "${selector}":`, {
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                textContent: el.textContent.substring(0, 50) + "...",
                attributes: Array.from(el.attributes)
                  .map((attr) => `${attr.name}="${attr.value}"`)
                  .join(", "),
              });
            });
        }
      } catch (error) {
        console.error(`Error with selector "${selector}":`, error);
      }
    });

    // Try to identify conversation structure
    console.log("Attempting to identify conversation structure...");

    // Look for potential message containers
    const potentialMessageContainers = [
      document.querySelectorAll("div.prose"),
      document.querySelectorAll("div.text-message-content"),
      document.querySelectorAll("div.overflow-y-auto > div > div"),
      document.querySelectorAll("main > div > div > div"),
    ];

    potentialMessageContainers.forEach((containers, i) => {
      if (containers.length > 0) {
        console.log(
          `Found ${
            containers.length
          } potential message containers with selector ${i + 1}`
        );

        // Check the first few containers
        Array.from(containers)
          .slice(0, 5)
          .forEach((container, j) => {
            // Check if this is a user message
            const isUserMessage =
              container.classList.contains("user-message") ||
              container.querySelector(".user-message") !== null ||
              container.textContent.includes("You:");

            console.log(
              `Container ${j + 1}: isUserMessage=${isUserMessage}, classes=${
                container.className
              }`
            );
            console.log(
              `  Content preview: ${container.textContent.substring(0, 50)}...`
            );

            // Check parent structure
            const parent = container.parentElement;
            if (parent) {
              console.log(`  Parent classes: ${parent.className}`);
            }
          });
      }
    });
  }

  // Extract messages function - this will attempt to extract messages using the DOM structure
  function extractMessages() {
    console.log("Attempting to extract messages from Claude...");
    const messages = [];

    // Try to find the main conversation container
    const conversationContainer =
      document.querySelector("main .overflow-y-auto") ||
      document.querySelector("main");

    if (!conversationContainer) {
      console.log("Conversation container not found");
      return messages;
    }

    console.log("Found conversation container:", conversationContainer);

    // Method 1: Look for alternating messages
    // In Claude, messages typically alternate between user and assistant
    const messageElements = conversationContainer.querySelectorAll(
      "div.prose, div.text-message-content"
    );

    if (messageElements.length > 0) {
      console.log(`Found ${messageElements.length} message elements`);

      // Group messages by their parent container to identify turns
      const messageGroups = {};

      messageElements.forEach((el, index) => {
        const parent = el.parentElement;
        const parentId = parent
          ? parent.id || `parent-${index}`
          : `no-parent-${index}`;

        if (!messageGroups[parentId]) {
          messageGroups[parentId] = [];
        }

        messageGroups[parentId].push(el);
      });

      console.log(
        `Grouped into ${Object.keys(messageGroups).length} message groups`
      );

      // Process each group
      let lastRole = null; // Track last role to avoid duplicates

      Object.values(messageGroups).forEach((group, groupIndex) => {
        // Check if this is explicitly a user message
        const isExplicitUserMessage = group.some(
          (el) =>
            el.classList.contains("user-message") ||
            el.closest(".user-message") !== null ||
            el.parentElement?.classList.contains("user-message") ||
            el.parentElement?.closest(".user-message") !== null ||
            el.textContent.includes("You:")
        );

        // Check if this is explicitly an assistant message
        const isExplicitAssistantMessage = group.some(
          (el) =>
            el.classList.contains("assistant-message") ||
            el.closest(".assistant-message") !== null ||
            el.textContent.includes("Claude:")
        );

        // Determine role based on explicit indicators
        let role;
        if (isExplicitUserMessage) {
          role = "user";
        } else if (isExplicitAssistantMessage) {
          role = "assistant";
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
            // If still no clear indicator, alternate based on last role
            role = lastRole === "user" ? "assistant" : "user";
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
            groupIndex,
          });

          lastRole = role;
        }
      });
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
    const button = document.createElement("button");
    button.textContent = "Debug Claude Detection";
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    button.style.zIndex = "9999";
    button.style.padding = "10px";
    button.style.backgroundColor = "#8e44ad"; // Purple for Claude
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";

    button.addEventListener("click", () => {
      console.log("Debug button clicked");
      logDOMStructure();
      const messages = extractMessages();
      console.log("Extracted messages:", messages);

      // Show a visual confirmation
      const messageCount = messages.length;
      alert(
        `Found ${messageCount} messages in the conversation. Check the console for details.`
      );
    });

    document.body.appendChild(button);
  }

  // Add the debug button
  setTimeout(addDebugButton, 2000);
})();
