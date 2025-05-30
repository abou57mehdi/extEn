export const config = {
  MONGODB_URL:
    "mongodb+srv://aboum77:Mehdi%40500@cluster0.smdgbe0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  API_BASE_URL: "http://localhost:5000/api",
  OPENROUTER_API_KEY:
    "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",
  OPENROUTER_API_URL: "https://openrouter.ai/api/v1/chat/completions",
  DEEPSEEK_MODEL: "deepseek/deepseek-prover-v2:free",
};

// Add API_ENDPOINTS export that's being imported in popup.js
export const API_ENDPOINTS = {
  SUMMARY: "http://localhost:5000/api/generate-summary",
  CONVERSATION: "http://localhost:5000/api/logs",
  MESSAGES: "http://localhost:5000/api/messages",
  HEALTH: "http://localhost:5000/api/health",
  OPENROUTER: "https://openrouter.ai/api/v1/chat/completions",
};
