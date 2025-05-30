// Import configuration (path works in both dev and build)
import { API_ENDPOINTS, config } from "../config.js";

// DOM Elements (will be populated after DOMContentLoaded)
const elements = {};

// State management
let currentConversation = null;
let currentPlatform = null;
let currentTabId = null;

// Initialize popup
async function initializePopup() {
  try {
    console.log("Initializing popup...");

    // Set the current timestamp
    if (elements.timestamp) {
      const now = new Date();
      elements.timestamp.value = now.toLocaleDateString();
    }

    // Get version
    if (elements.version) {
      elements.version.textContent = chrome.runtime.getManifest().version || "1.0";
    }

    // Get current tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    currentTabId = tab.id;
    console.log("Current tab:", tab.url, "ID:", tab.id);

    // Check if we're on a supported domain
    const supportedDomains = [
      "chat.openai.com",
      "chat.apenai.com",
      "claude.ai",
      "gemini.google.com",
    ];
    const url = new URL(tab.url);
    const isOnSupportedDomain = supportedDomains.some((domain) =>
      url.hostname.includes(domain)
    );

    if (!isOnSupportedDomain) {
      console.log("Not on a supported domain:", url.hostname);
      elements.platform.value = "Site non supporté";
      disableButtons(true);
      return;
    }

    // Set platform
    elements.platform.value = url.hostname;

    // Get conversation data
    await getConversationData(tab.id);
  } catch (error) {
    console.error("Error initializing popup:", error);
    disableButtons(true);
  }
}

// Get conversation data
async function getConversationData(tabId) {
  try {
    console.log("Attempting to get conversation data from tab", tabId);
    const response = await chrome.tabs.sendMessage(tabId, { action: "getConversationData" });
    console.log("Received response from content script:", response);
    if (response && response.conversation) {
      updateUI(response);
    } else {
      console.log("No conversation data received or response is invalid.");
      elements.messageCount.textContent = "0";
      disableButtons(true);
    }
  } catch (error) {
    console.error("Error getting conversation data:", error);
    elements.messageCount.textContent = "0";
    disableButtons(true);
  }
}

// Update UI with conversation data
function updateUI(data) {
  if (data.conversation) {
    currentConversation = data.conversation;
    currentPlatform = data.platform;
    elements.messageCount.textContent = data.conversation.length;
    disableButtons(false);
  } else {
     disableButtons(true);
  }
}

// Disable/enable buttons
function disableButtons(disabled) {
  console.log(`Setting buttons disabled: ${disabled}`);
  elements.generateSummary.disabled = disabled;
  elements.clearConversation.disabled = disabled;
  elements.reloadExtension.disabled = disabled;
  // Summary action buttons are handled separately when summary section is shown
  if (elements.summarySection && elements.summarySection.classList.contains("hidden")) {
     elements.copySummary.disabled = true;
     elements.downloadSummary.disabled = true;
     elements.toggleSummary.disabled = true;
  } else {
     elements.copySummary.disabled = disabled;
     elements.downloadSummary.disabled = disabled;
     elements.toggleSummary.disabled = disabled;
  }
}

// Generate a simple local summary
function generateLocalSummary(conversation) {
  if (!conversation || conversation.length === 0) {
    return "Aucune conversation à résumer";
  }

  // Format messages for summary
  const formattedMessages = conversation.map(msg => {
    const role = msg.role || (msg.isUser ? "Utilisateur" : "Assistant");
    const content = msg.content || msg.message || msg.text || "";
    return `${role}: ${content}`;
  });

  // Create summary
  const summary = `Résumé de la conversation (${conversation.length} messages):

${formattedMessages.join('\n\n')}

---
Généré le ${new Date().toLocaleString()}`;

  return summary;
}

// Generate summary
async function generateSummary() {
  console.log("Generate Summary button clicked");
  try {
    if (!currentConversation || currentConversation.length === 0) {
      console.warn("No conversation to summarize");
      // Optionally show a message to the user
      elements.summaryContent.textContent = "Aucune conversation à résumer.";
      elements.summarySection.classList.remove("hidden");
      // Keep summary buttons disabled if there's no content
      elements.copySummary.disabled = true;
      elements.downloadSummary.disabled = true;
      elements.toggleSummary.disabled = true;
      return;
    }

    elements.generateSummary.disabled = true;
    elements.generateSummary.textContent = "Génération en cours...";
    elements.summaryContent.textContent = ""; // Clear previous summary
    elements.summarySection.classList.remove("hidden"); // Show summary section while generating

    // Generate summary
    const summary = generateLocalSummary(currentConversation);
    
    // Update UI
    elements.summaryContent.textContent = summary;
    
    elements.generateSummary.textContent = "Générer un résumé";
    elements.generateSummary.disabled = false;
    // Enable summary buttons once content is loaded
    elements.copySummary.disabled = false;
    elements.downloadSummary.disabled = false;
    elements.toggleSummary.disabled = false;

  } catch (error) {
    console.error("Error generating summary:", error);
    elements.summaryContent.textContent = "Erreur de génération du résumé.";
    elements.generateSummary.textContent = "Erreur de génération";
    elements.generateSummary.disabled = false;
    // Disable summary buttons on error
    elements.copySummary.disabled = true;
    elements.downloadSummary.disabled = true;
    elements.toggleSummary.disabled = true;
  }
}

// Copy summary to clipboard
function copySummary() {
  console.log("Copy Summary button clicked");
  try {
    const text = elements.summaryContent.textContent;
    if (!text || text.trim().length === 0) {
      console.warn("No summary to copy");
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      const originalText = elements.copySummary.textContent;
      elements.copySummary.textContent = "Copié!";
      setTimeout(() => {
        elements.copySummary.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy text:", err);
    });
  } catch (error) {
    console.error("Error copying summary:", error);
  }
}

// Download summary
function downloadSummary() {
   console.log("Download Summary button clicked");
  try {
    const text = elements.summaryContent.textContent;
    if (!text || text.trim().length === 0) {
      console.warn("No summary to download");
      return;
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading summary:", error);
  }
}

// Toggle summary expansion
function toggleSummary() {
   console.log("Toggle Summary button clicked");
  try {
    elements.summaryContent.classList.toggle("expanded");
    elements.toggleSummary.textContent = 
      elements.summaryContent.classList.contains("expanded") ? "▲" : "▼";
  } catch (error) {
    console.error("Error toggling summary:", error);
  }
}

// Clear conversation
async function clearConversation() {
   console.log("Clear Conversation button clicked");
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error("No active tab found");
      // Optionally show an error message in the popup
      return;
    }

    console.log("Sending clearConversation message to content script...");
    const response = await chrome.tabs.sendMessage(tab.id, { action: "clearConversation" });
    console.log("Response from content script:", response);

    if (response && response.success) {
      console.log("Conversation cleared successfully by content script");
      // Clear storage
      await chrome.storage.local.remove(["latestConversation", "conversationHistory"]);
      console.log("Storage cleared");
      
      // Reset state
      currentConversation = null; // Reset to null initially
      currentPlatform = null;
      
      // Update UI
      elements.platform.value = "Detecting...";
      elements.timestamp.value = "Fetching...";
      elements.messageCount.textContent = "0";
      elements.summarySection.classList.add("hidden");
      elements.summaryContent.textContent = "";
      
      // Disable buttons
      disableButtons(true);
      
      console.log("Popup UI and state reset after clearing conversation");
    } else {
      console.error("Failed to clear conversation in content script:", response ? response.message : "No response");
      // Optionally show an error message in the popup
    }
  } catch (error) {
    console.error("Error clearing conversation:", error);
    // Optionally show an error message in the popup
  }
}

// Reload extension
async function reloadExtension() {
  console.log("Reload Extension button clicked");
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error("No active tab found");
       // Optionally show an error message in the popup
      return;
    }

    console.log("Sending reloadExtension message to content script...");
    const response = await chrome.tabs.sendMessage(tab.id, { action: "reloadExtension" });
    console.log("Response from content script:", response);

    if (response && response.success) {
      console.log("Extension state reloaded successfully by content script");
       // Reload the current tab - this should trigger the content script to re-initialize
      await chrome.tabs.reload(tab.id);
      console.log("Current tab reloaded");

      // No need to chrome.runtime.reload() here, reloading the tab is sufficient
      // chrome.runtime.reload(); // This reloads the entire extension, not just the content script
      
      console.log("Extension reload process initiated.");
    } else {
       console.error("Failed to reload extension in content script:", response ? response.message : "No response");
       // Optionally show an error message in the popup
    }
  } catch (error) {
    console.error("Error reloading extension:", error);
     // Optionally show an error message in the popup
  }
}

// Add event listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event fired.");
  try {
    // Populate elements object after DOM is ready
    elements.generateSummary = document.getElementById("generateSummary");
    elements.clearConversation = document.getElementById("clearConversation");
    elements.reloadExtension = document.getElementById("reloadExtension");
    elements.summarySection = document.getElementById("summarySection");
    elements.summaryContent = document.getElementById("summaryContent");
    elements.copySummary = document.getElementById("copySummary");
    elements.downloadSummary = document.getElementById("downloadSummary");
    elements.toggleSummary = document.getElementById("toggleSummary");
    elements.messageCount = document.getElementById("messageCount");
    elements.platform = document.getElementById("platform");
    elements.timestamp = document.getElementById("timestamp");
    elements.version = document.getElementById("version");

    // Log to verify elements are found
    console.log("Elements after DOMContentLoaded:", elements);

    initializePopup();
    
    // Add event listeners with error handling
    elements.generateSummary?.addEventListener("click", generateSummary);
    elements.copySummary?.addEventListener("click", copySummary);
    elements.downloadSummary?.addEventListener("click", downloadSummary);
    elements.toggleSummary?.addEventListener("click", toggleSummary);
    elements.clearConversation?.addEventListener("click", clearConversation);
    elements.reloadExtension?.addEventListener("click", reloadExtension);

    console.log("Event listeners added.");

  } catch (error) {
    console.error("Error setting up event listeners:", error);
  }
});

// Initial call to disable buttons until data is loaded
disableButtons(true);
