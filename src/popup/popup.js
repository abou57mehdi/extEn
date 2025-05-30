// Import configuration (update path for build)
import { API_ENDPOINTS, config } from "../config.js";

// DOM Elements
const elements = {
  status: document.getElementById("status"),
  generateSummary: document.getElementById("generateSummary"),
  downloadConversation: document.getElementById("downloadConversation"),
  clearConversation: document.getElementById("clearConversation"),
  reloadExtension: document.getElementById("reloadExtension"),
  summarySection: document.getElementById("summarySection"),
  summaryContent: document.getElementById("summaryContent"),
  downloadSummary: document.getElementById("downloadSummary"),
  messageCount: document.getElementById("messageCount"),
  platform: document.getElementById("platform"),
};

// State management
let currentConversation = null;
let currentPlatform = null;

// Initialize popup
async function initializePopup() {
  try {
    console.log("Initializing popup...");

    // Get current tab to check if we're on a supported platform
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.log("Current tab:", tab.url);

    // First try to get data from storage
    chrome.storage.local.get(
      ["latestConversation", "conversationHistory"],
      (result) => {
        console.log("Storage data:", result);

        if (result.latestConversation) {
          const { messages, platform } = result.latestConversation;
          if (messages && messages.length > 0) {
            updateUI({
              conversation: messages,
              platform: platform,
              id: result.latestConversation.id,
            });
            return;
          }
        }

        // If no latest conversation, check history for current URL
        if (result.conversationHistory) {
          const currentUrl = tab.url;
          const matchingConversation = result.conversationHistory
            .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
            .find((conv) => conv.url === currentUrl);

          if (matchingConversation) {
            updateUI({
              conversation: matchingConversation.messages,
              platform: matchingConversation.platform,
              id: matchingConversation.id,
            });
            return;
          }
        }

        // If no conversation found, try getting from content script
        chrome.tabs.sendMessage(
          tab.id,
          { action: "getConversationData" },
          (response) => {
            console.log("Content script response:", response);
            if (response && response.conversation) {
              updateUI(response);
            } else {
              console.log("No conversation data from content script");
              elements.status.textContent = "Aucune conversation détectée";
              disableButtons(true);
            }
          }
        );
      }
    );
  } catch (error) {
    console.error("Error initializing popup:", error);
    elements.status.textContent = "Erreur lors de l'initialisation";
    disableButtons(true);
  }
}

// Update UI with conversation data
function updateUI(data) {
  console.log("Updating UI with data:", data);

  currentConversation = data.conversation;
  currentPlatform = data.platform;

  elements.messageCount.textContent = data.conversation.length;
  elements.platform.textContent = data.platform || "-";
  elements.status.textContent =
    data.conversation.length > 0
      ? `Conversation active - ${data.conversation.length} messages`
      : "En attente d'une conversation...";

  disableButtons(data.conversation.length === 0);
}

// Handle summary generation
async function generateSummary() {
  if (!currentConversation) return;

  elements.generateSummary.disabled = true;
  elements.status.textContent = "Génération du résumé en cours...";

  try {
    // Ensure conversation data is properly formatted
    const formattedConversation = currentConversation.map((msg) => {
      // If message is already in the right format, return it
      if (msg.role && msg.content) return msg;

      // Otherwise, try to convert it
      return {
        role: msg.role || msg.from || (msg.isUser ? "user" : "assistant"),
        content: msg.content || msg.message || msg.text || "",
      };
    });

    try {
      // Use OpenRouter API with DeepSeek model
      const systemPrompt =
        "Vous êtes un assistant qui résume les conversations. Votre tâche est de créer un résumé concis en français des points principaux de la conversation, en mettant en évidence les questions clés et les réponses correspondantes.";

      // Format messages for OpenRouter API with system message
      const messages = [
        { role: "system", content: systemPrompt },
        // Add a user message that requests the summary
        {
          role: "user",
          content:
            "Voici une conversation. Résume-la de manière concise en français en identifiant les points clés, les questions principales et leurs réponses:" +
            formattedConversation
              .map((msg) => `\n\n${msg.role}: ${msg.content}`)
              .join(""),
        },
      ];

      console.log("Sending request to OpenRouter API with DeepSeek model");

      const response = await fetch(API_ENDPOINTS.OPENROUTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://exxbot.fr",
          "X-Title": "EXXBot Chrome Extension",
        },
        body: JSON.stringify({
          model: config.DEEPSEEK_MODEL,
          messages: messages,
          temperature: 0.3, // Low temperature for more deterministic outputs
          max_tokens: 1000, // Adjust as needed for summary length
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("OpenRouter API response:", data);

        if (
          data.choices &&
          data.choices.length > 0 &&
          data.choices[0].message
        ) {
          const summary = data.choices[0].message.content;
          console.log("Generated summary from DeepSeek:", summary);

          elements.summarySection.classList.remove("hidden");
          elements.summaryContent.textContent = summary;
          elements.status.textContent = "Résumé généré avec succès";
        } else {
          throw new Error("Invalid response format from OpenRouter API");
        }
      } else {
        const errorData = await response.json();
        console.error("Error from OpenRouter API:", errorData);
        throw new Error(
          `OpenRouter API error: ${errorData.error || response.statusText}`
        );
      }
    } catch (apiError) {
      console.error("Error using OpenRouter API:", apiError);

      if (
        apiError.message.includes("Failed to fetch") ||
        apiError.message.includes("NetworkError")
      ) {
        elements.status.textContent =
          "Erreur de connexion à l'API OpenRouter. Vérifiez votre connexion internet.";
      } else {
        elements.status.textContent = `Erreur: ${apiError.message}`;
      }
    }
  } catch (error) {
    console.error("Error generating summary:", error);

    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError")
    ) {
      elements.status.textContent =
        "Impossible de se connecter au serveur de résumé. Veuillez démarrer le serveur Python.";
    } else {
      elements.status.textContent = `Erreur: ${error.message}`;
    }
  } finally {
    elements.generateSummary.disabled = false;
  }
}

// Handle conversation download
function downloadConversation() {
  if (!currentConversation) return;

  const conversationText = currentConversation
    .map((msg) => `[${msg.timestamp}] ${msg.role}: ${msg.content}`)
    .join("\n\n");

  const blob = new Blob([conversationText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const a = document.createElement("a");
  a.href = url;
  a.download = `conversation-${currentPlatform}-${timestamp}.txt`;
  a.click();

  URL.revokeObjectURL(url);
}

// Download summary as text file
function downloadSummary() {
  const summaryText = elements.summaryContent.textContent;

  if (!summaryText || summaryText.trim() === "") {
    console.warn("No summary to download");
    elements.status.textContent = "Aucun résumé à télécharger";
    return;
  }

  try {
    // Create a blob with the summary text
    const blob = new Blob([summaryText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const dateString = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `resume_conversation_${dateString}.txt`;

    // Create temporary link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    // Clean up
    URL.revokeObjectURL(url);

    elements.status.textContent = "Résumé téléchargé";
  } catch (error) {
    console.error("Error downloading summary:", error);
    elements.status.textContent = "Erreur lors du téléchargement";
  }
}

// Handle conversation clearing
function clearConversation() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "clearConversation" },
      (response) => {
        if (response && response.success) {
          // Clear both latest conversation and history for current URL
          chrome.storage.local.get(["conversationHistory"], (result) => {
            const history = result.conversationHistory || [];
            const currentUrl = tab.url;
            const updatedHistory = history.filter(
              (conv) => conv.url !== currentUrl
            );

            chrome.storage.local.set(
              {
                conversationHistory: updatedHistory,
                latestConversation: null,
              },
              () => {
                currentConversation = null;
                elements.status.textContent = "Conversation effacée";
                elements.messageCount.textContent = "0";
                elements.summarySection.classList.add("hidden");
                disableButtons(true);
              }
            );
          });
        }
      }
    );
  });
}

// Handle extension reloading
function reloadExtension() {
  elements.status.textContent = "Rechargement en cours...";

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    // Clear storage for the current platform
    chrome.storage.local.set(
      {
        currentConversation: [],
        currentPlatform: null,
        lastDetectedPlatform: null,
      },
      () => {
        console.log("Storage cleared for reload");

        // Send reload message to content script
        chrome.tabs.sendMessage(
          tab.id,
          { action: "reloadExtension" },
          (response) => {
            console.log("Reload response:", response);

            // Update UI to show reload is complete
            elements.status.textContent = "Extension rechargée";
            elements.messageCount.textContent = "0";
            elements.platform.textContent = "-";
            elements.summarySection.classList.add("hidden");

            // Re-initialize after a short delay
            setTimeout(() => {
              initializePopup();
            }, 1000);
          }
        );
      }
    );
  });
}

// Disable/enable buttons based on conversation state
function disableButtons(disabled) {
  elements.generateSummary.disabled = disabled;
  elements.downloadConversation.disabled = disabled;
  elements.clearConversation.disabled = disabled;
  // Don't disable the reload button - it should always be available
}

// Event listeners
document.addEventListener("DOMContentLoaded", initializePopup);
elements.generateSummary.addEventListener("click", generateSummary);
elements.downloadConversation.addEventListener("click", downloadConversation);
elements.clearConversation.addEventListener("click", clearConversation);
elements.reloadExtension.addEventListener("click", reloadExtension);
elements.downloadSummary.addEventListener("click", downloadSummary);
