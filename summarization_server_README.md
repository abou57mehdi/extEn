# Text Summarization Microservice

This is a Python microservice for text summarization that replaces the Hugging Face API calls in the Chrome extension.

## Features

- Uses transformers library with distilbart-cnn model for text summarization
- Provides a Flask API endpoint for generating summaries
- Includes fallback to extractive summarization if the model fails
- CORS enabled for cross-origin requests from the Chrome extension

## Installation

1. Make sure you have Python 3.7+ installed
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Running the Server

Start the server with:

```bash
python summarization_server.py
```

The server will run on http://localhost:5000 by default.

## API Endpoints

### Generate Summary

- **URL**: `/api/generate-summary`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "conversation": [
      { "role": "user", "content": "Hello, how are you?" },
      {
        "role": "assistant",
        "content": "I'm doing well, thank you for asking!"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "summary": "A brief conversation where a user asks how the assistant is doing, and the assistant responds positively."
  }
  ```

### Health Check

- **URL**: `/api/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "model": "distilbart-cnn-12-6"
  }
  ```

## Integration with Chrome Extension

The Chrome extension is configured to use this microservice for text summarization. Make sure the server is running before using the "Generate Summary" feature in the extension.

## Troubleshooting

If you encounter any issues:

1. Check that the server is running on port 5000
2. Ensure all dependencies are installed correctly
3. Check the server logs for any error messages
4. Make sure the extension is configured to use http://localhost:5000/api/generate-summary as the summary endpoint
