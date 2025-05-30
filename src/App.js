/* global chrome */
import React, { useState, useEffect } from 'react';
import { ConversationLog, DownloadButton } from './components';
import Card from './components/Card';
import PrimaryButton from './components/PrimaryButton';
import SectionHeader from './components/SectionHeader';
import './App.css';

// Use window.chrome instead of chrome directly to avoid undefined errors
const chromeAPI = {
  storage: {
    local: {
      get: (keys, callback) => {
        if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
          return window.chrome.storage.local.get(keys, callback);
        } else {
          callback({});
        }
      },
      set: (data) => {
        if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
          return window.chrome.storage.local.set(data);
        }
      },
      remove: (keys) => {
        if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
          return window.chrome.storage.local.remove(keys);
        }
      }
    }
  },
  tabs: {
    query: (queryInfo, callback) => {
      if (typeof window !== 'undefined' && window.chrome && window.chrome.tabs) {
        return window.chrome.tabs.query(queryInfo, callback);
      } else {
        callback([]);
      }
    },
    sendMessage: (tabId, message, callback) => {
      if (typeof window !== 'undefined' && window.chrome && window.chrome.tabs) {
        try {
          return window.chrome.tabs.sendMessage(tabId, message, callback);
        } catch (error) {
          console.error('Error sending message:', error);
          if (callback) callback(null);
        }
      } else {
        if (callback) callback(null);
      }
    }
  }
};

function App() {
  const [conversation, setConversation] = useState([]);
  const [summary, setSummary] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationLogs, setConversationLogs] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [capturedConversations, setCapturedConversations] = useState([]);
  const [aiPlatform, setAiPlatform] = useState(null);
  const [latestSummary, setLatestSummary] = useState('');
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' ou 'captured'

  // Charger les logs depuis localStorage au montage du composant
  useEffect(() => {
    const savedLogs = JSON.parse(localStorage.getItem('conversationLogs') || '[]');
    setConversationLogs(savedLogs);

    // Récupérer le dernier résumé du stockage local de Chrome
    try {
      chromeAPI.storage.local.get(['latestConversation', 'latestSummary'], (result) => {
        if (result.latestConversation) {
          setCapturedConversations(result.latestConversation);
        }
        if (result.latestSummary) {
          setLatestSummary(result.latestSummary);
        }
      });

      // Essayer de communiquer avec le content script pour obtenir la conversation actuelle
      chromeAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          // Check if we're on a supported page first
          const currentUrl = tabs[0].url || '';
          const isAIPlatform = 
            currentUrl.includes('chat.openai.com') || 
            currentUrl.includes('claude.ai') || 
            currentUrl.includes('anthropic.com') || 
            currentUrl.includes('bard.google.com') || 
            currentUrl.includes('gemini.google.com');
          
          if (!isAIPlatform) {
            console.log('Not on a supported AI platform, skipping content script communication');
            return;
          }
          
          // Add a timeout for the sendMessage to prevent hanging
          const messageTimeout = setTimeout(() => {
            console.log('Content script communication timed out');
            // Continue with stored data if available
          }, 1000);
          
          chromeAPI.tabs.sendMessage(tabs[0].id, { action: 'getConversation' }, (response) => {
            clearTimeout(messageTimeout);
            
            if (chrome.runtime.lastError) {
              console.log('Communication error:', chrome.runtime.lastError.message);
              return;
            }
            
            if (response && response.messages && response.messages.length) {
              console.log('Received conversation from content script:', response);
              setCapturedConversations(response.messages);
              setAiPlatform(response.platform);
            } else {
              console.log('No conversation data received from content script');
            }
          });
        }
      });
    } catch (error) {
      console.error('Error communicating with content script:', error);
    }
  }, []);

  // Fonction pour ajouter un log à la conversation
  const addConversation = () => {
    if (!currentMessage.trim()) return;
    
    const newLog = {
      message: currentMessage,
      timestamp: new Date().toLocaleString(),
    };

    // Mettre à jour le stockage local avec le nouveau log de conversation
    const updatedLogs = [...conversationLogs, newLog];
    setConversationLogs(updatedLogs);
    localStorage.setItem('conversationLogs', JSON.stringify(updatedLogs));
    setCurrentMessage('');
  };

  // Générer un résumé simple
  const generateSummary = () => {
    if (activeTab === 'manual') {
      return conversationLogs.map(log => {
        return `[${log.timestamp}] ${log.message}`;
      }).join('\n\n');
    } else {
      // Pour les conversations capturées
      return capturedConversations.map(log => {
        return `[${log.timestamp}] (${log.role}) ${log.message}`;
      }).join('\n\n');
    }
  };

  // Générer un résumé par l'API
  const generateAISummary = async () => {
    // Choisir les logs en fonction de l'onglet actif
    const logsToSummarize = activeTab === 'manual' 
      ? conversationLogs.map(log => ({
          message: log.message,
          timestamp: log.timestamp,
          role: 'user'
        }))
      : capturedConversations;
    
    if (logsToSummarize.length === 0) {
      alert('Aucune conversation à résumer. Capturez d\'abord des messages.');
      return;
    }
    
    try {
      console.log('Sending to backend:', logsToSummarize);

      // First, check if server is running
      try {
        // Ping the server with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const healthCheck = await fetch('http://localhost:3000/api/health', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!healthCheck.ok) {
          throw new Error('Server is not responding correctly');
        }
      } catch (healthError) {
        console.error('Server health check failed:', healthError);
        
        // Server not available, use fallback immediately
        console.log('Server unavailable, using fallback summary generation');
        const localSummary = generateLocalSummary(logsToSummarize);
        setLatestSummary(localSummary);
        
        // Store locally generated summary
        chromeAPI.storage.local.set({
          latestSummary: localSummary,
          timestamp: new Date().toISOString()
        });
        
        alert('Serveur indisponible - Utilisation de la génération locale de résumé à la place.');
        return;
      }
      
      // Try to connect to the server for summary generation
      const response = await fetch('http://localhost:3000/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logs: logsToSummarize })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response from server:', data);
      
      if (data.success) {
        setLatestSummary(data.summary);
        
        // Stocker le résumé
        chromeAPI.storage.local.set({
          latestSummary: data.summary,
          timestamp: new Date().toISOString()
        });
        
        // Show success message
        alert('Résumé généré avec succès!');
      } else {
        throw new Error('Server returned an error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      
      // Fallback to local summary generation if server is unavailable
      console.log('Using fallback local summary generation');
      const localSummary = generateLocalSummary(logsToSummarize);
      setLatestSummary(localSummary);
      
      // Store locally generated summary
      chromeAPI.storage.local.set({
        latestSummary: localSummary,
        timestamp: new Date().toISOString()
      });
      
      alert('Erreur de connexion au serveur - Utilisation de la génération locale de résumé à la place.');
    }
  };
  
  // Local fallback method to generate summaries when server is unavailable
  const generateLocalSummary = (logs) => {
    // Extract basic statistics
    const messageCount = logs.length;
    const userMessages = logs.filter(log => log.role === 'user').length;
    const aiMessages = messageCount - userMessages;
    
    // Extract timestamps if available
    let startTime = '';
    let endTime = '';
    if (logs.length > 0 && logs[0].timestamp) {
      startTime = logs[0].timestamp;
      if (logs.length > 1 && logs[logs.length - 1].timestamp) {
        endTime = logs[logs.length - 1].timestamp;
      }
    }
    
    // Extract main topics (simple approach - first few words of messages)
    const topics = logs
      .map(log => {
        const words = log.message.split(' ');
        return words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
      })
      .slice(0, 3);
    
    // Build the summary
    let summary = `Conversation Summary (Local Generation)\n\n`;
    summary += `This conversation contains ${messageCount} messages `;
    summary += `(${userMessages} from user, ${aiMessages} from AI)\n`;
    
    if (startTime && endTime) {
      summary += `\nTimestamp: from ${startTime} to ${endTime}\n`;
    }
    
    if (topics.length > 0) {
      summary += `\nMain topics discussed:\n`;
      topics.forEach((topic, index) => {
        summary += `${index + 1}. ${topic}\n`;
      });
    }
    
    // Add message snippets
    summary += '\nMessage Excerpts:\n';
    logs.slice(0, Math.min(5, logs.length)).forEach((log, index) => {
      const snippet = log.message.length > 100 ? 
                    log.message.substring(0, 100) + '...' : 
                    log.message;
      summary += `- ${log.role}: ${snippet}\n`;
    });
    
    return summary;
  };

  // Effacer tous les logs
  const clearLogs = () => {
    if (activeTab === 'manual') {
      setConversationLogs([]);
      localStorage.removeItem('conversationLogs');
    } else {
      setCapturedConversations([]);
      setLatestSummary('');
      chromeAPI.storage.local.remove(['latestConversation', 'latestSummary']);
    }
  };

  const handleGenerateSummary = async () => {
    setIsProcessing(true);
    try {
      const response = await chrome.runtime.sendMessage({ action: 'generateSummary' });
      if (response.success) {
        setSummary(response.summary);
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const content = JSON.stringify(conversation, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversation.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReload = () => {
    chrome.runtime.reload();
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>AI Conversation Logger</h1>
        <p>Capture and summarize your AI conversations</p>
      </div>

      <div className="input-field">
        <div className="icon">👤</div>
        <input
          type="text"
          placeholder="Name"
          readonly
          value="AI Conversation"
        />
      </div>

      <div className="input-field">
        <div className="icon">📅</div>
        <input
          type="text"
          placeholder="Date"
          readonly
          value={new Date().toLocaleString()}
        />
      </div>

      <div className="input-field">
        <div className="icon">🔤</div>
        <input
          type="text"
          placeholder="Platform"
          readonly
          value="Chrome Extension"
        />
      </div>

      <div className="status-box">
        <p className="status-text">
          {isProcessing ? 'Generating summary...' : 'Ready to capture conversations'}
        </p>
      </div>

      <div className="button-group">
        <button
          className="btn-primary"
          onClick={handleGenerateSummary}
          disabled={isProcessing || conversation.length === 0}
        >
          Generate Summary
        </button>
        <button
          className="btn-outline"
          onClick={handleDownload}
          disabled={conversation.length === 0}
        >
          Download
        </button>
        <button
          className="btn-outline"
          onClick={handleReload}
        >
          Reload
        </button>
      </div>

      {summary && (
        <div className="summary-section">
          <div className="summary-header">
            <h3 className="summary-title">Conversation Summary</h3>
            <div className="summary-actions">
              <button
                className="btn-icon"
                onClick={handleCopySummary}
                title="Copy to clipboard"
              >
                📋
              </button>
              <button
                className="btn-icon"
                onClick={toggleExpand}
                title={isExpanded ? "Show less" : "Show more"}
              >
                {isExpanded ? "▲" : "▼"}
              </button>
            </div>
          </div>
          <div className={`summary-content ${isExpanded ? 'expanded' : ''}`}>
            {summary}
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              const blob = new Blob([summary], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'summary.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download Summary
          </button>
        </div>
      )}

      <div className="stats-container">
        <p className="stats-text">Messages: {conversation.length}</p>
        <p className="stats-text">Version: {chrome.runtime.getManifest().version}</p>
      </div>
    </div>
  );
}

export default App; 