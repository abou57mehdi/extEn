# Advanced Observer Files for AI Conversation Logger

This document explains the purpose of the additional JavaScript files used for enhanced conversation detection in the AI Chat Logger Chrome Extension.

## File Overview

The extension uses several specialized files to improve the reliability of conversation detection across different AI platforms:

### 1. `observers.js`

**Purpose**: Implements advanced DOM observation using modern browser APIs to reliably track message elements.

**Features**:
- Uses `IntersectionObserver` to detect messages as they appear in the viewport
- Uses `ResizeObserver` to detect when containers change size (typically when new messages load)
- Provides real-time monitoring of scrolling conversation windows
- Tracks message positions for accurate ordering

### 2. `message-bridge.js`

**Purpose**: Provides communication between page scripts and the extension's content script.

**Features**:
- Implements lightweight DOM diffing to detect UI changes
- Relays messages from multiple sources to the content script
- Coordinates between different detection methods
- Loads other observer scripts when needed

### 3. `shadow-dom-helper.js`

**Purpose**: Traverses Shadow DOM elements that are often used in modern web applications.

**Features**:
- Provides access to elements inside Shadow DOM boundaries
- Extracts messages from Shadow DOM containers
- Periodically checks for changes in Shadow DOM structure
- Delivers messages back to the content script

### 4. `message-retriever.js`

**Purpose**: Direct DOM access for message extraction across multiple AI platforms.

**Features**:
- Platform-specific selectors for ChatGPT, Claude, and Gemini
- Fallback strategies when primary detection fails
- Deduplicates messages to prevent redundancy
- Handles different message formats and structures

## Build Process

These files must be included in every build of the extension. The build process has been updated to:

1. Verify these files exist before starting the build
2. Copy them to the build directory
3. Include them in the extension package

## Development

When making changes to these files:

1. Update the corresponding selectors if AI platforms change their DOM structure
2. Test on all supported platforms (ChatGPT, Claude, Gemini) after changes
3. Run the verification script (`npm run verify-files`) to ensure all files are present

## Troubleshooting

If the extension fails to detect messages:

1. Check browser console for errors related to these files
2. Verify all files are present in the extension package
3. Update platform selectors if AI platforms have changed their UI

## Adding Support for New Platforms

To add support for a new AI platform:

1. Add platform-specific selectors to `message-retriever.js`
2. Update container selectors in `observers.js`
3. Test message detection on the new platform
4. Document the changes in this README

---

*These files use the browser's built-in APIs and modern observer patterns to provide reliable conversation detection even when AI platforms change their DOM structure or load messages dynamically.* 