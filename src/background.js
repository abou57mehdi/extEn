// Background script for handling extension-wide functionality
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

// Add tab switching detection
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log("Tab activated:", activeInfo.tabId);

  // Clear the latestConversation when switching tabs
  chrome.storage.local.remove(["latestConversation"], () => {
    console.log("Cleared latest conversation due to tab switch");
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateConversation") {
    // Store conversation data with tab ID
    chrome.storage.local.set({
      currentConversation: request.data.conversation,
      currentPlatform: request.data.platform,
      currentTabId: sender.tab ? sender.tab.id : null,
    });
  }
});
