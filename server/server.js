const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const axios = require("axios");
const config = require("./config");
const path = require("path");

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB client
let db;
let client;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    client = new MongoClient(config.MONGODB.URI, config.MONGODB.OPTIONS);
    await client.connect();
    console.log("Connected to MongoDB Atlas successfully");
    db = client.db(config.MONGODB.DB_NAME);

    // Create indexes for better performance
    await db.collection("logs").createIndex({ createdAt: -1 });
    await db.collection("summaries").createIndex({ createdAt: -1 });

    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
    // Instead of exiting, allow the server to run without DB connectivity
    console.log("Server will run without database functionality");
    return null;
  }
}

// Middleware to check database connection
app.use((req, res, next) => {
  // Skip database check for endpoints that don't require database
  const noDbRequiredPaths = ["/api/health", "/api/generate-summary", "/test"];

  if (!db && !noDbRequiredPaths.includes(req.path)) {
    return res.status(503).json({
      success: false,
      error: "Database connection not established",
      message:
        "This endpoint requires database connectivity which is currently unavailable.",
    });
  }
  next();
});

// API Routes

// Debug route for logging request structure
app.post("/api/debug-request", (req, res) => {
  console.log("Debug request received:");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  res.status(200).json({
    success: true,
    message: "Request logged for debugging",
    receivedData: {
      bodyType: typeof req.body,
      isArray: Array.isArray(req.body),
      bodyKeys: req.body ? Object.keys(req.body) : [],
      contentType: req.headers["content-type"],
    },
  });
});

// Store a conversation log
app.post("/api/logs", async (req, res) => {
  try {
    const { logs } = req.body;
    const collection = db.collection("logs");
    const result = await collection.insertOne({
      logs,
      createdAt: new Date(),
    });
    res.status(201).json({
      success: true,
      id: result.insertedId,
      message: "Logs saved successfully to MongoDB Atlas",
    });
  } catch (error) {
    console.error("Error storing logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all conversation logs
app.get("/api/logs", async (req, res) => {
  try {
    const collection = db.collection("logs");
    const logs = await collection
      .find()
      .sort({ createdAt: -1 })
      .limit(100) // Limit to last 100 entries
      .toArray();
    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("Error retrieving logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a specific log by ID
app.get("/api/logs/:id", async (req, res) => {
  try {
    const collection = db.collection("logs");
    const log = await collection.findOne({ _id: new ObjectId(req.params.id) });

    if (!log) {
      return res.status(404).json({ success: false, error: "Log not found" });
    }

    res.status(200).json({ success: true, log });
  } catch (error) {
    console.error("Error retrieving log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a specific log
app.delete("/api/logs/:id", async (req, res) => {
  try {
    const collection = db.collection("logs");
    const result = await collection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Log not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Log deleted successfully" });
  } catch (error) {
    console.error("Error deleting log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate summary using Python microservice (primary) or Hugging Face API (fallback)
app.post("/api/generate-summary", async (req, res) => {
  try {
    // Add comprehensive logging
    console.log("Request body received:", JSON.stringify(req.body, null, 2));

    // Fix the issue with logs extraction - use more robust approach
    let logs = [];

    // Handle different request formats
    if (req.body && typeof req.body === "object") {
      if (Array.isArray(req.body)) {
        // If request body is directly an array
        logs = req.body;
        console.log("Request body is directly an array");
      } else if (req.body.logs && Array.isArray(req.body.logs)) {
        // Standard format with logs property
        logs = req.body.logs;
        console.log("Found logs array in req.body.logs");
      } else if (
        req.body.conversation &&
        Array.isArray(req.body.conversation)
      ) {
        // Alternative property name
        logs = req.body.conversation;
        console.log("Found logs array in req.body.conversation");
      } else if (req.body.messages && Array.isArray(req.body.messages)) {
        // Another alternative
        logs = req.body.messages;
        console.log("Found logs array in req.body.messages");
      } else {
        // If no array found, create an array with the object itself
        console.log("No array found in request, using object itself");
        logs = [req.body];
      }
    } else {
      console.log("Request body is not a valid object:", req.body);
      return res.status(400).json({
        success: false,
        error: "Invalid request body format",
        received: req.body,
      });
    }

    console.log(`Extracted ${logs.length} log entries`);

    // Validate logs parameter
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      console.log("Invalid or empty logs data:", logs);
      return res.status(400).json({
        success: false,
        error: "Invalid logs data. Logs must be a non-empty array.",
        receivedType: typeof logs,
        received: logs,
      });
    }

    // Normalize the logs format to ensure consistent structure
    const normalizedLogs = logs.map((log) => {
      if (!log)
        return {
          role: "unknown",
          message: "",
          timestamp: new Date().toISOString(),
        };

      return {
        role: log.role || log.author || log.sender || "unknown",
        message: log.content || log.message || log.text || "",
        timestamp: log.timestamp || log.time || new Date().toISOString(),
      };
    });

    console.log("Normalized logs sample:", normalizedLogs.slice(0, 2));

    // Format logs for the prompt
    const conversationText = normalizedLogs
      .map((log) => {
        return `[${log.timestamp}] ${log.role}: ${log.message}`;
      })
      .join("\n");

    console.log(
      "Formatted conversation text sample:",
      conversationText.substring(0, Math.min(200, conversationText.length)) +
        "..."
    );

    // Try to use the Python microservice first
    try {
      console.log(
        "Attempting to use Python summarization service at:",
        config.PYTHON_SUMMARIZER_URL
      );

      // First check if the Python service is available
      const healthCheck = await axios.get(
        `${config.PYTHON_SUMMARIZER_URL}/health`,
        { timeout: 3000 }
      );
      console.log("Python service health check response:", healthCheck.data);

      if (healthCheck.data && healthCheck.data.status === "ok") {
        // Call the Python summarization service
        const pythonResponse = await axios.post(
          `${config.PYTHON_SUMMARIZER_URL}/summarize`,
          {
            text: conversationText,
            max_length: 500,
            min_length: 100,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 10000, // 10 second timeout
          }
        );

        console.log(
          "Python service response:",
          JSON.stringify(pythonResponse.data)
        );

        // Extract summary from response
        if (
          pythonResponse.data &&
          pythonResponse.data.success &&
          pythonResponse.data.summary
        ) {
          const summary = pythonResponse.data.summary;

          // Store the summary in MongoDB if database is connected
          let id = null;
          if (db) {
            try {
              const collection = db.collection("summaries");
              const result = await collection.insertOne({
                originalLogs: normalizedLogs,
                summary,
                createdAt: new Date(),
                method: "python-service",
                model: pythonResponse.data.model || "t5-small",
              });
              id = result.insertedId;
            } catch (dbError) {
              console.error(
                "Error saving to database, continuing without storage:",
                dbError
              );
            }
          }

          return res.status(200).json({
            success: true,
            summary,
            id,
            method: "python-service",
            model: pythonResponse.data.model || "t5-small",
            message:
              "Summary generated successfully using Python service" +
              (id ? " and saved" : " but not saved to database"),
          });
        } else {
          throw new Error("Invalid response from Python service");
        }
      } else {
        throw new Error("Python service health check failed");
      }
    } catch (pythonServiceError) {
      console.error(
        "Error using Python summarization service:",
        pythonServiceError
      );
      console.log("Falling back to Hugging Face API or local fallback...");

      // If Python service fails, try Hugging Face API if available
      if (config.HUGGINGFACE_API_KEY) {
        try {
          console.log("Attempting to use Hugging Face API as fallback");

          // Call Hugging Face Inference API
          const response = await axios.post(
            `https://api-inference.huggingface.co/models/${config.HUGGINGFACE_MODEL}`,
            {
              inputs: conversationText,
              parameters: {
                max_length: 500,
                min_length: 100,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${config.HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );

          console.log(
            "HuggingFace API response:",
            JSON.stringify(response.data)
          );

          // Extract summary from response
          let summary;
          if (
            response.data &&
            response.data[0] &&
            response.data[0].summary_text
          ) {
            summary = response.data[0].summary_text;
          } else if (Array.isArray(response.data) && response.data.length > 0) {
            summary = response.data[0];
          } else {
            summary = "No summary could be generated. Please try again later.";
          }

          // Store the summary in MongoDB if database is connected
          let id = null;
          if (db) {
            try {
              const collection = db.collection("summaries");
              const result = await collection.insertOne({
                originalLogs: normalizedLogs,
                summary,
                createdAt: new Date(),
                method: "huggingface",
              });
              id = result.insertedId;
            } catch (dbError) {
              console.error(
                "Error saving to database, continuing without storage:",
                dbError
              );
            }
          }

          return res.status(200).json({
            success: true,
            summary,
            id,
            method: "huggingface",
            message:
              "Summary generated using Hugging Face API (fallback)" +
              (id ? " and saved" : " but not saved to database"),
          });
        } catch (huggingFaceError) {
          console.error("Error using Hugging Face API:", huggingFaceError);
          console.log("Falling back to local summary generation...");
        }
      } else {
        console.log(
          "No Hugging Face API key available, using local fallback directly"
        );
      }

      // If both Python service and Hugging Face API fail (or HF API key not available),
      // use the local fallback method
      const summary = generateFallbackSummary(normalizedLogs);

      // Store the summary in MongoDB if database is connected
      let id = null;
      if (db) {
        try {
          const collection = db.collection("summaries");
          const result = await collection.insertOne({
            originalLogs: normalizedLogs,
            summary,
            createdAt: new Date(),
            method: "fallback",
          });
          id = result.insertedId;
        } catch (dbError) {
          console.error(
            "Error saving to database, continuing without storage:",
            dbError
          );
        }
      }

      return res.status(200).json({
        success: true,
        summary,
        id,
        method: "fallback",
        message:
          "Summary generated using local fallback method" +
          (id ? " and saved" : " but not saved to database"),
      });
    }
  } catch (error) {
    console.error("Error in main summary generation flow:", error);

    // If everything fails, use the fallback method as a last resort
    try {
      // Use same robust extraction as above
      let logs = [];

      if (req.body && typeof req.body === "object") {
        if (Array.isArray(req.body)) {
          logs = req.body;
        } else if (req.body.logs && Array.isArray(req.body.logs)) {
          logs = req.body.logs;
        } else if (
          req.body.conversation &&
          Array.isArray(req.body.conversation)
        ) {
          logs = req.body.conversation;
        } else if (req.body.messages && Array.isArray(req.body.messages)) {
          logs = req.body.messages;
        } else {
          logs = [req.body];
        }
      }

      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid logs data in fallback. Logs must be a non-empty array.",
          receivedType: typeof logs,
        });
      }

      // Normalize logs
      const normalizedLogs = logs.map((log) => {
        if (!log)
          return {
            role: "unknown",
            message: "",
            timestamp: new Date().toISOString(),
          };

        return {
          role: log.role || log.author || log.sender || "unknown",
          message: log.content || log.message || log.text || "",
          timestamp: log.timestamp || log.time || new Date().toISOString(),
        };
      });

      const summary = generateFallbackSummary(normalizedLogs);

      let id = null;
      if (db) {
        try {
          const collection = db.collection("summaries");
          const result = await collection.insertOne({
            originalLogs: normalizedLogs,
            summary,
            createdAt: new Date(),
            method: "fallback",
          });
          id = result.insertedId;
        } catch (dbError) {
          console.error(
            "Error saving to database, continuing without storage:",
            dbError
          );
        }
      }

      return res.status(200).json({
        success: true,
        summary,
        id,
        method: "fallback",
        message:
          "Summary generated using fallback method after all other methods failed" +
          (id ? " and saved" : " but not saved to database"),
      });
    } catch (fallbackError) {
      console.error("Fallback summary also failed:", fallbackError);
      return res.status(500).json({
        success: false,
        error: "All summary generation methods failed",
        message:
          "Unable to generate a summary due to technical issues. Please try again later.",
      });
    }
  }
});

// Helper function to generate a simple fallback summary when the API is not available
function generateFallbackSummary(logs) {
  try {
    console.log(
      "Starting fallback summary generation with logs:",
      Array.isArray(logs) ? `${logs.length} entries` : typeof logs
    );

    // Validate logs parameter
    if (!logs || !Array.isArray(logs)) {
      console.error("Invalid logs in generateFallbackSummary:", logs);
      return "Could not generate summary: Invalid log format";
    }

    // Check for empty logs array
    if (logs.length === 0) {
      return "No conversation data available to summarize.";
    }

    console.log("Fallback summary first log sample:", JSON.stringify(logs[0]));

    // Extract basic statistics
    const messageCount = logs.length;

    // Safely filter messages by role with null checks
    const userMessages = logs.filter(
      (log) => log && (log.role === "user" || log.role === "human")
    ).length;
    const aiMessages = logs.filter(
      (log) =>
        log &&
        (log.role === "assistant" || log.role === "ai" || log.role === "bot")
    ).length;

    // Extract timestamps if available
    let startTime = "";
    let endTime = "";
    if (logs[0] && logs[0].timestamp) {
      startTime = logs[0].timestamp;
      if (logs.length > 1 && logs[logs.length - 1].timestamp) {
        endTime = logs[logs.length - 1].timestamp;
      }
    }

    // Extract main topics (simple approach - first few words of user messages)
    const topics = logs
      .filter((log) => log && (log.role === "user" || log.role === "human"))
      .map((log) => {
        // Safely access message with fallbacks
        const content = log.message || log.content || log.text || "";
        const words = content.split(" ");
        return words.slice(0, 5).join(" ") + (words.length > 5 ? "..." : "");
      })
      .slice(0, 3);

    // Build the summary
    let summary = `Conversation Summary (Local Generation)\n\n`;
    summary += `This conversation contains ${messageCount} messages `;
    summary += `(${userMessages} from user, ${aiMessages} from AI)`;

    if (startTime && endTime) {
      summary += `\nTimestamp: from ${startTime} to ${endTime}`;
    }

    if (topics.length > 0) {
      summary += `\n\nMain topics discussed:\n`;
      topics.forEach((topic, index) => {
        summary += `${index + 1}. ${topic}\n`;
      });
    }

    // Add a few message samples
    if (logs.length > 0) {
      summary += `\nExcerpt from conversation:\n`;

      // Get up to 3 exchanges (user+ai)
      const sampleSize = Math.min(6, logs.length);
      for (let i = 0; i < sampleSize; i++) {
        const log = logs[i];
        if (!log) continue;

        // Determine role with more flexibility
        let displayRole = "Unknown";
        if (log.role === "user" || log.role === "human") {
          displayRole = "User";
        } else if (
          log.role === "assistant" ||
          log.role === "ai" ||
          log.role === "bot"
        ) {
          displayRole = "AI";
        }

        // Safely access message with fallbacks
        const messageContent = log.message || log.content || log.text || "";
        const message =
          messageContent.length > 100
            ? messageContent.substring(0, 100) + "..."
            : messageContent;
        summary += `${displayRole}: ${message}\n`;
      }
    }

    console.log("Successfully generated fallback summary");
    return summary;
  } catch (error) {
    console.error("Error in fallback summary generation:", error);
    return "Failed to generate summary. Please try again later.";
  }
}

// Get all summaries
app.get("/api/summaries", async (req, res) => {
  try {
    const collection = db.collection("summaries");
    const summaries = await collection
      .find()
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    res.status(200).json({ success: true, summaries });
  } catch (error) {
    console.error("Error retrieving summaries:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  // Check Python service availability
  let pythonServiceStatus = "unknown";
  try {
    const response = await axios.get(`${config.PYTHON_SUMMARIZER_URL}/health`, {
      timeout: 2000,
    });
    if (response.data && response.data.status === "ok") {
      pythonServiceStatus = "available";
    } else {
      pythonServiceStatus = "unavailable";
    }
  } catch (error) {
    console.log("Python service health check failed:", error.message);
    pythonServiceStatus = "unavailable";
  }

  res.status(200).json({
    status: "ok",
    mongodb: !!db,
    python_service: pythonServiceStatus,
    python_service_url: config.PYTHON_SUMMARIZER_URL,
    message: "Server is running",
  });
});

// Root route - redirect to test page
app.get("/", (req, res) => {
  res.redirect("/test");
});

// Test endpoint to verify summary generation works
app.get("/api/test-summary", (req, res) => {
  try {
    // Create sample conversation data
    const sampleData = [
      {
        role: "user",
        message: "Hello, can you help me understand how to use React hooks?",
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant",
        message:
          "Of course! React hooks are functions that let you use state and lifecycle features in functional components. The most common hooks are useState and useEffect.",
        timestamp: new Date().toISOString(),
      },
      {
        role: "user",
        message: "How do I use useState?",
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant",
        message:
          "To use useState, you first import it from React, then call it in your component to declare a state variable. It returns the current state value and a function to update it. For example: const [count, setCount] = useState(0)",
        timestamp: new Date().toISOString(),
      },
    ];

    // Generate a fallback summary
    const summary = generateFallbackSummary(sampleData);

    res.status(200).json({
      success: true,
      message: "Test summary generated successfully",
      summary,
      sampleData,
    });
  } catch (error) {
    console.error("Error in test summary generation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to generate test summary",
    });
  }
});

// API documentation
app.get("/api", (req, res) => {
  res.json({
    message: "Conversation Log & Summary API",
    endpoints: [
      {
        path: "/api/health",
        method: "GET",
        description: "Health check endpoint",
      },
      {
        path: "/api/logs",
        method: "GET",
        description: "Get all conversation logs",
      },
      {
        path: "/api/logs/:id",
        method: "GET",
        description: "Get a specific log by ID",
      },
      {
        path: "/api/logs",
        method: "POST",
        description: "Store a conversation log",
      },
      {
        path: "/api/logs/:id",
        method: "DELETE",
        description: "Delete a specific log",
      },
      {
        path: "/api/generate-summary",
        method: "POST",
        description:
          "Generate summary using Python microservice (primary) or Hugging Face API (fallback)",
      },
      {
        path: "/api/summaries",
        method: "GET",
        description: "Get all summaries",
      },
      { path: "/test", method: "GET", description: "Test page for the API" },
      {
        path: "/api/test-summary",
        method: "GET",
        description: "Test endpoint to verify summary generation works",
      },
    ],
  });
});

// Add a route to serve the test page
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "test-page.html"));
});

// Start the server
async function startServer() {
  await connectToDatabase();
  const server = app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
  });

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(async () => {
      console.log("Closed express server");
      if (client) {
        await client.close();
        console.log("MongoDB connection closed");
      }
      process.exit(0);
    });
  });
}

startServer();
