// Configuration file for environment variables
require("dotenv").config();

module.exports = {
  // MongoDB Atlas connection configuration
  MONGODB: {
    URI:
      process.env.MONGODB_URI ||
      "mongodb+srv://aboum77:Mehdi%40500@cluster0.smdgbe0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    DB_NAME: process.env.MONGODB_DB_NAME || "conversation-logs",
    OPTIONS: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: "majority",
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: true,
    },
  },
  // Port for the server
  PORT: process.env.PORT || 3000,
  // Python summarization service URL
  PYTHON_SUMMARIZER_URL:
    process.env.PYTHON_SUMMARIZER_URL || "http://localhost:5000",
  // Hugging Face API key (has free tier) - kept as fallback
  // Get your key at: https://huggingface.co/settings/tokens
  HUGGINGFACE_API_KEY:
    process.env.HUGGINGFACE_API_KEY || "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", // Your Hugging Face API key
  // Hugging Face model to use - kept as fallback
  HUGGINGFACE_MODEL: process.env.HUGGINGFACE_MODEL || "facebook/bart-large-cnn",
};
