// Handle summary generation
async function generateSummary() {
  if (!currentConversation) return;

  elements.generateSummary.disabled = true;
  elements.status.textContent = "Génération du résumé en cours...";

  try {
    // Debug the conversation structure
    console.log(
      "Current conversation structure:",
      Array.isArray(currentConversation)
        ? `Array with ${currentConversation.length} items`
        : typeof currentConversation
    );

    if (currentConversation.length > 0) {
      console.log("First item sample:", currentConversation[0]);
    }

    // First, check if server is available
    let serverAvailable = false;
    try {
      // Create a controller to abort the request if it takes too long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const healthCheck = await fetch(API_ENDPOINTS.HEALTH, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (healthCheck.ok) {
        const healthData = await healthCheck.json();
        serverAvailable = healthData.status === "ok";
        console.log("Server available:", serverAvailable);
      }
    } catch (healthError) {
      console.warn(
        "Server health check failed, using local summary:",
        healthError
      );
      serverAvailable = false;
    }

    let summary = "";

    // Ensure conversation data is properly formatted
    const formattedConversation = ensureProperDataFormat(currentConversation);

    // Validate we have data to summarize
    if (formattedConversation.length === 0) {
      throw new Error("No valid conversation data to summarize");
    }

    console.log(
      "Formatted conversation for summary:",
      formattedConversation.slice(0, 2)
    );

    if (serverAvailable) {
      try {
        // Log request being sent
        console.log("Sending summary request to server with data structure:", {
          dataType: typeof formattedConversation,
          isArray: Array.isArray(formattedConversation),
          length: formattedConversation.length,
        });

        const response = await fetch(API_ENDPOINTS.SUMMARY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logs: formattedConversation,
          }),
        });

        // First check if response is OK
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server error response:", response.status, errorText);
          throw new Error(`Server responded with status: ${response.status}`);
        }

        // Check Content-Type to ensure it's JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Expected JSON but got ${contentType}`);
        }

        const data = await response.json();
        console.log("Server summary response:", data);

        if (data.success && data.summary) {
          summary = data.summary;
        } else {
          throw new Error(data.error || "Unknown server error");
        }
      } catch (apiError) {
        console.error(
          "Error with API summary, falling back to local:",
          apiError
        );
        summary = generateLocalSummary(formattedConversation);
      }
    } else {
      // Generate local summary
      summary = generateLocalSummary(formattedConversation);
    }

    // Display the summary
    if (summary) {
      elements.summarySection.classList.remove("hidden");
      elements.summaryContent.textContent = summary;
      elements.status.textContent = serverAvailable
        ? "Résumé généré avec succès"
        : "Résumé généré localement (serveur indisponible)";

      // Save the summary - check for valid extension context first
      if (chrome && chrome.runtime && chrome.runtime.id) {
        try {
          chrome.storage.local.set(
            {
              latestSummary: {
                text: summary,
                timestamp: new Date().toISOString(),
                conversationId: currentConversation.id,
              },
            },
            () => {
              if (chrome.runtime.lastError) {
                console.warn("Error saving summary:", chrome.runtime.lastError);
              }
            }
          );
        } catch (storageError) {
          console.warn("Error saving summary to storage:", storageError);
        }
      }

      // Automatically download the summary
      downloadSummary(summary);
    }
  } catch (error) {
    console.error("Error generating summary:", error);
    elements.status.textContent = "Erreur lors de la génération du résumé";

    // Try local fallback as last resort
    try {
      const formattedConversation = ensureProperDataFormat(currentConversation);

      if (formattedConversation.length > 0) {
        const summary = generateLocalSummary(formattedConversation);
        elements.summarySection.classList.remove("hidden");
        elements.summaryContent.textContent = summary;
        elements.status.textContent =
          "Résumé généré localement suite à une erreur";

        // Automatically download even fallback summary
        downloadSummary(summary);
      } else {
        elements.status.textContent =
          "Impossible de générer un résumé : données invalides";
      }
    } catch (fallbackError) {
      console.error("Even local fallback failed:", fallbackError);
      elements.status.textContent = "Échec complet de la génération du résumé";
    }
  } finally {
    elements.generateSummary.disabled = false;
  }
}

// Helper function to ensure proper data format
function ensureProperDataFormat(conversation) {
  // Handle undefined or null
  if (!conversation) return [];

  // Handle non-array structures
  const conversationArray = Array.isArray(conversation)
    ? conversation
    : [conversation];

  // Normalize data structure
  return conversationArray
    .filter((msg) => msg && typeof msg === "object") // Only include valid objects
    .map((msg) => ({
      role: msg.role || msg.author || msg.sender || "unknown",
      message: msg.content || msg.message || msg.text || "",
      timestamp: msg.timestamp || msg.time || new Date().toISOString(),
    }));
}

// Generate a simple local summary when API is unavailable
function generateLocalSummary(conversation) {
  console.log(
    "Generating local summary for conversation:",
    Array.isArray(conversation)
      ? `${conversation.length} messages`
      : typeof conversation
  );

  // Ensure conversation is an array
  if (!Array.isArray(conversation) || conversation.length === 0) {
    return "Impossible de générer un résumé : pas de conversation valide.";
  }

  // Extract basic statistics
  const messageCount = conversation.length;
  const userMessages = conversation.filter(
    (msg) => msg.role === "user" || msg.role === "human"
  ).length;
  const aiMessages = conversation.filter(
    (msg) => msg.role === "assistant" || msg.role === "ai" || msg.role === "bot"
  ).length;

  // Extract timestamps if available
  let startTime = "";
  let endTime = "";

  if (conversation.length > 0) {
    const firstMsg = conversation[0];
    startTime = firstMsg.timestamp || firstMsg.time || "unknown";

    if (conversation.length > 1) {
      const lastMsg = conversation[conversation.length - 1];
      endTime = lastMsg.timestamp || lastMsg.time || "unknown";
    }
  }

  // Extract some sample content from the conversation
  const topicExtracts = conversation
    .filter((msg) => msg.role === "user" || msg.role === "human")
    .slice(0, 3)
    .map((msg) => {
      const content = msg.message || msg.content || msg.text || "";
      const words = content.split(" ");
      return words.slice(0, 5).join(" ") + (words.length > 5 ? "..." : "");
    });

  // Build the summary
  let summary = `Résumé de conversation (génération locale)\n\n`;
  summary += `Cette conversation contient ${messageCount} messages `;
  summary += `(${userMessages} de l'utilisateur, ${aiMessages} de l'IA)\n\n`;

  if (startTime && endTime) {
    summary += `Période: de ${startTime} à ${endTime}\n\n`;
  }

  if (topicExtracts.length > 0) {
    summary += `Extraits des sujets abordés:\n`;
    topicExtracts.forEach((topic, index) => {
      summary += `${index + 1}. ${topic}\n`;
    });
    summary += "\n";
  }

  // Add a few message samples
  summary += "Extraits de messages:\n";

  conversation.slice(0, Math.min(5, conversation.length)).forEach((msg, i) => {
    const content = msg.message || msg.content || msg.text || "";
    let role = "unknown";

    if (msg.role === "user" || msg.role === "human") {
      role = "utilisateur";
    } else if (
      msg.role === "assistant" ||
      msg.role === "ai" ||
      msg.role === "bot"
    ) {
      role = "IA";
    } else {
      role = msg.role;
    }

    const excerpt =
      content.length > 80 ? content.substring(0, 80) + "..." : content;

    summary += `- ${role}: ${excerpt}\n`;
  });

  return summary;
}

// Check if extension context is valid before using Chrome APIs
function isExtensionContextValid() {
  try {
    return !!chrome && !!chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    console.log("Extension context invalid:", e);
    return false;
  }
}

// Safe wrapper for Chrome API calls
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

// Initialize popup with error handling
async function initializePopup() {
  try {
    console.log("Initializing popup...");

    // Check for valid extension context first
    if (!isExtensionContextValid()) {
      console.warn(
        "Extension context is invalid, using minimal initialization"
      );
      elements.status.textContent = "Extension en mode limité";
      disableButtons(true);
      return;
    }

    // Get current tab to check if we're on a supported platform
    safelyUseChrome(
      async () => {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          console.log("Current tab:", tab.url);

          // First try to get data from storage
          chrome.storage.local.get(
            ["latestConversation", "conversationHistory"],
            (result) => {
              if (chrome.runtime.lastError) {
                console.warn(
                  "Error accessing storage:",
                  chrome.runtime.lastError
                );
                elements.status.textContent = "Erreur d'accès au stockage";
                disableButtons(true);
                return;
              }

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
                  .sort(
                    (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)
                  )
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

              // If no conversation found, try getting from content script (with timeout)
              const messageTimeout = setTimeout(() => {
                console.log("Content script communication timed out");
                elements.status.textContent = "Pas de conversation détectée";
                disableButtons(true);
              }, 2000);
              try {
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: "getConversationData" },
                  (response) => {
                    clearTimeout(messageTimeout);

                    if (chrome.runtime.lastError) {
                      console.warn(
                        "Error communicating with content script:",
                        chrome.runtime.lastError
                      );

                      // Handle different error scenarios
                      const errorMessage =
                        chrome.runtime.lastError.message || "";

                      if (
                        errorMessage.includes("receiving end does not exist")
                      ) {
                        console.log(
                          "Content script might not be loaded yet, retrying..."
                        );

                        // Retry after a short delay (the content script might still be loading)
                        setTimeout(() => {
                          chrome.tabs.sendMessage(
                            tab.id,
                            { action: "getConversationData", retry: true },
                            (retryResponse) => {
                              if (chrome.runtime.lastError) {
                                console.warn(
                                  "Retry failed:",
                                  chrome.runtime.lastError
                                );
                                elements.status.textContent =
                                  "La page n'est pas encore prête. Veuillez recharger la page.";
                              } else if (
                                retryResponse &&
                                retryResponse.conversation
                              ) {
                                updateUI(retryResponse);
                              } else {
                                elements.status.textContent =
                                  "Aucune conversation détectée";
                                disableButtons(true);
                              }
                            }
                          );
                        }, 1500);
                      } else {
                        elements.status.textContent =
                          "Communication impossible avec la page";
                        disableButtons(true);
                      }
                      return;
                    }

                    console.log("Content script response:", response);
                    if (response && response.conversation) {
                      updateUI(response);
                    } else {
                      console.log("No conversation data from content script");
                      elements.status.textContent =
                        "Aucune conversation détectée";
                      disableButtons(true);
                    }
                  }
                );
              } catch (messageError) {
                clearTimeout(messageTimeout);
                console.error(
                  "Error sending message to content script:",
                  messageError
                );
                elements.status.textContent = "Erreur de communication";
                disableButtons(true);
              }
            }
          );
        } catch (tabError) {
          console.error("Error querying tabs:", tabError);
          elements.status.textContent = "Erreur d'accès aux onglets";
          disableButtons(true);
        }
      },
      () => {
        // Fallback for invalid extension context
        elements.status.textContent = "Extension en mode limité";
        disableButtons(true);
      }
    );
  } catch (error) {
    console.error("Error initializing popup:", error);
    elements.status.textContent = "Erreur lors de l'initialisation";
    disableButtons(true);
  }
}

// Function to download summary as a text file
function downloadSummary(summaryText) {
  try {
    // Create a blob with the summary text
    const blob = new Blob([summaryText], { type: "text/plain" });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a download link
    const downloadLink = document.createElement("a");
    downloadLink.href = url;

    // Set the file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadLink.download = `ai-conversation-summary-${timestamp}.txt`;

    // Append to the document, click to download, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      console.log("Summary downloaded successfully");
    }, 100);
  } catch (error) {
    console.error("Error downloading summary:", error);
  }
}

// Handle download button click
function handleDownloadClick() {
  // Get the current summary text
  const summaryText = elements.summaryContent.textContent;

  if (summaryText && summaryText.trim()) {
    downloadSummary(summaryText);
  } else {
    // If no summary is available, generate one first
    generateSummary();
  }
}

// Initialize elements and set up event listeners
let elements = {};
let currentConversation = null;

// Set up UI when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize UI elements
  elements = {
    status: document.getElementById("status"),
    messageCount: document.getElementById("message-count"),
    platform: document.getElementById("platform"),
    summarySection: document.getElementById("summary-section"),
    summaryContent: document.getElementById("summary-content"),
    generateSummary: document.getElementById("generate-summary"),
    downloadConversation: document.getElementById("download-conversation"),
    clearConversation: document.getElementById("clear-conversation"),
  };

  // Set up event listeners
  if (elements.generateSummary) {
    elements.generateSummary.addEventListener("click", generateSummary);
  }

  if (elements.downloadConversation) {
    elements.downloadConversation.addEventListener(
      "click",
      handleDownloadClick
    );
  }

  if (elements.clearConversation) {
    elements.clearConversation.addEventListener("click", () => {
      if (confirm("Êtes-vous sûr de vouloir effacer cette conversation ?")) {
        clearConversation();
      }
    });
  }

  // Initialize the popup
  initializePopup();
});

// Function to update the UI with conversation data
function updateUI(data) {
  if (!data || !data.conversation) {
    elements.status.textContent = "Aucune conversation détectée";
    disableButtons(true);
    return;
  }

  currentConversation = data.conversation;

  // Update message count
  const messageCount = currentConversation.length;
  elements.messageCount.textContent = messageCount;

  // Update platform if available
  if (data.platform) {
    elements.platform.textContent = data.platform;
  } else {
    elements.platform.textContent = "Plateforme inconnue";
  }

  // Enable buttons
  disableButtons(false);

  // Update status
  elements.status.textContent = `${messageCount} messages capturés`;
}

// Function to clear the current conversation
function clearConversation() {
  safelyUseChrome(() => {
    chrome.storage.local.remove(["latestConversation"], () => {
      currentConversation = null;
      elements.messageCount.textContent = "0";
      elements.platform.textContent = "-";
      elements.status.textContent = "Conversation effacée";
      elements.summarySection.classList.add("hidden");
      disableButtons(true);
    });
  });
}

// Function to enable/disable buttons based on conversation availability
function disableButtons(disable) {
  if (elements.generateSummary) elements.generateSummary.disabled = disable;
  if (elements.downloadConversation)
    elements.downloadConversation.disabled = disable;
  if (elements.clearConversation) elements.clearConversation.disabled = disable;
}
