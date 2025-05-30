// Import configuration
import { config } from './config.js';

// DOM Elements
const statusElement = document.getElementById('status');
const generateSummaryBtn = document.getElementById('generateSummary');
const downloadConversationBtn = document.getElementById('downloadConversation');
const clearConversationBtn = document.getElementById('clearConversation');
const summarySection = document.getElementById('summarySection');
const summaryContent = document.getElementById('summaryContent');
const messageCountElement = document.getElementById('messageCount');
const platformElement = document.getElementById('platform');

// State
let currentConversation = null;
let currentSummary = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab to check if we're on a supported platform
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  
  // Update UI based on current state
  chrome.storage.local.get(['latestConversation', 'latestSummary'], (result) => {
    currentConversation = result.latestConversation || [];
    currentSummary = result.latestSummary;
    
    updateUI(url.hostname);
  });
});

// Update UI state
function updateUI(hostname) {
  // Update message count
  messageCountElement.textContent = currentConversation.length;
  
  // Update platform
  const platform = detectPlatform(hostname);
  platformElement.textContent = platform || 'Non supporté';
  
  // Update status
  if (!platform) {
    statusElement.textContent = 'Plateforme non supportée';
    generateSummaryBtn.disabled = true;
    return;
  }
  
  if (currentConversation.length === 0) {
    statusElement.textContent = 'En attente d\'une conversation...';
    generateSummaryBtn.disabled = true;
  } else {
    statusElement.textContent = 'Conversation en cours';
    generateSummaryBtn.disabled = false;
  }
  
  // Show summary if available
  if (currentSummary) {
    summarySection.classList.remove('hidden');
    summaryContent.textContent = currentSummary;
  } else {
    summarySection.classList.add('hidden');
  }
}

// Detect AI platform
function detectPlatform(hostname) {
  if (hostname.includes('chat.openai.com')) return 'ChatGPT';
  if (hostname.includes('claude.ai')) return 'Claude';
  if (hostname.includes('bard.google.com')) return 'Bard';
  if (hostname.includes('gemini.google.com')) return 'Gemini';
  return null;
}

// Generate summary
generateSummaryBtn.addEventListener('click', async () => {
  try {
    statusElement.textContent = 'Génération du résumé...';
    generateSummaryBtn.disabled = true;
    
    const response = await fetch(`${config.API_BASE_URL}/generate-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.HUGGINGFACE_API_KEY}`
      },
      body: JSON.stringify({ logs: currentConversation })
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentSummary = data.summary;
      chrome.storage.local.set({ latestSummary: data.summary });
      summarySection.classList.remove('hidden');
      summaryContent.textContent = data.summary;
      statusElement.textContent = 'Résumé généré avec succès';
    } else {
      throw new Error(data.error || 'Erreur lors de la génération du résumé');
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    statusElement.textContent = 'Erreur: ' + error.message;
  } finally {
    generateSummaryBtn.disabled = false;
  }
});

// Download conversation
downloadConversationBtn.addEventListener('click', () => {
  if (!currentConversation.length) {
    statusElement.textContent = 'Aucune conversation à télécharger';
    return;
  }
  
  const conversationData = {
    conversation: currentConversation,
    summary: currentSummary,
    timestamp: new Date().toISOString(),
    platform: platformElement.textContent
  };
  
  const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  statusElement.textContent = 'Conversation téléchargée';
});

// Clear conversation
clearConversationBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['latestConversation', 'latestSummary'], () => {
    currentConversation = [];
    currentSummary = null;
    updateUI(new URL(window.location.href).hostname);
    statusElement.textContent = 'Conversation effacée';
  });
}); 