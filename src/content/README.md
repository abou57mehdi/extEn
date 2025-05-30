# Message Extraction for AI Platforms

This directory contains scripts for extracting and categorizing messages from various AI chat platforms:

- ChatGPT
- Claude
- Gemini

## Key Files

- `content.js` - Main content script that runs on all supported AI platforms
- `debug-chatgpt.js` - Debug script for ChatGPT message extraction
- `debug-claude.js` - Debug script for Claude message extraction
- `message-extractor-test.js` - Universal test script for all platforms

## Claude-Specific Message Extraction

Claude's DOM structure is unique and requires special handling to properly categorize messages between user and assistant. The main challenges are:

1. Claude doesn't always have explicit role indicators in the DOM
2. Messages are sometimes grouped differently than other platforms
3. The DOM structure can change between versions

The current implementation uses several strategies to identify message roles:

1. Looking for explicit class indicators like `user-message`
2. Analyzing the DOM structure and parent-child relationships
3. Using the position in the conversation flow
4. Post-processing to ensure alternating roles (user → assistant → user)

## Using the Debug Tools

### For Developers

1. Open the AI platform you want to debug (ChatGPT, Claude, or Gemini)
2. Open the browser's developer console
3. Copy and paste the content of the appropriate debug script:
   - `debug-chatgpt.js` for ChatGPT
   - `debug-claude.js` for Claude
4. Press Enter to run the script
5. A debug button will appear in the bottom-right corner of the page
6. Click the button to run the message extraction and see the results in the console

### For Users

The `message-extractor-test.js` script provides a more user-friendly interface:

1. Open any supported AI platform
2. Open the browser's developer console
3. Copy and paste the content of `message-extractor-test.js`
4. Press Enter to run the script
5. Click the "Extract Messages" button that appears in the bottom-right corner
6. A panel will show the extracted messages with their roles
7. You can refresh the extraction or copy the messages to clipboard

## Troubleshooting

If message extraction isn't working correctly:

1. Check the console for error messages
2. Verify that the selectors in the AI platform configuration match the current DOM structure
3. Try using the debug scripts to get more detailed information
4. If the DOM structure has changed, update the selectors in `content.js`

## Known Issues

- Claude's DOM structure can vary between versions, requiring updates to selectors
- Some messages might be incorrectly categorized if they don't follow the expected pattern
- Very long conversations might have performance issues
