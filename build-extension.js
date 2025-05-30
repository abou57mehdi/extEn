const fs = require("fs-extra");
const path = require("path");

async function buildExtension() {
  try {
    console.log("Starting build process...");

    // Clean build directory
    await fs.emptyDir(path.join(__dirname, "build"));
    console.log("Build directory cleaned"); // Create required directories
    await fs.ensureDir(path.join(__dirname, "build/icons"));
    await fs.ensureDir(path.join(__dirname, "build/src/popup"));
    console.log("Created directories");

    // Copy manifest.json from the root directory instead of public/
    await fs.copy(
      path.join(__dirname, "manifest.json"),
      path.join(__dirname, "build/manifest.json")
    );
    console.log("Manifest copied");

    // Copy icons - ensure they exist first
    const iconSizes = ["16", "48", "128"];
    for (const size of iconSizes) {
      const iconPath = path.join(__dirname, `public/icons/icon${size}.png`);
      const destPath = path.join(__dirname, `build/icons/icon${size}.png`);
      if (!(await fs.pathExists(iconPath))) {
        throw new Error(`Icon file missing: icons/icon${size}.png`);
      }
      await fs.copy(iconPath, destPath);
    }
    console.log("Icons copied"); // Copy and rename popup files
    // Check if new popup files exist, use them preferentially
    if (await fs.pathExists(path.join(__dirname, "src/popup/new-popup.html"))) {
      await fs.copy(
        path.join(__dirname, "src/popup/new-popup.html"),
        path.join(__dirname, "build/index.html") // Renamed to match manifest
      );
      console.log("✓ Using enhanced new-popup.html");
    } else {
      await fs.copy(
        path.join(__dirname, "src/popup/popup.html"),
        path.join(__dirname, "build/index.html") // Renamed to match manifest
      );
      console.log("✓ Using original popup.html");
    }

    // Copy the appropriate JS file
    if (await fs.pathExists(path.join(__dirname, "src/popup/new-popup.js"))) {
      await fs.copy(
        path.join(__dirname, "src/popup/new-popup.js"),
        path.join(__dirname, "build/popup.js")
      );
      console.log("✓ Using enhanced new-popup.js");
    } else {
      await fs.copy(
        path.join(__dirname, "src/popup/popup.js"),
        path.join(__dirname, "build/popup.js")
      );
      console.log("✓ Using original popup.js");
    }

    // Copy new popup files to build/src/popup directory for module imports to work
    if (await fs.pathExists(path.join(__dirname, "src/popup/new-popup.html"))) {
      await fs.copy(
        path.join(__dirname, "src/popup/new-popup.html"),
        path.join(__dirname, "build/src/popup/new-popup.html")
      );
    }

    if (await fs.pathExists(path.join(__dirname, "src/popup/new-popup.js"))) {
      await fs.copy(
        path.join(__dirname, "src/popup/new-popup.js"),
        path.join(__dirname, "build/src/popup/new-popup.js")
      );
    }

    console.log("Popup files copied"); // Explicitly update the import paths in all popup JS files
    const popupJsPath = path.join(__dirname, "build/popup.js");
    let popupJsContent = await fs.readFile(popupJsPath, "utf-8");
    popupJsContent = popupJsContent.replace(
      /import\s+\{\s*API_ENDPOINTS\s*\}\s*from\s*['"].*['"]/,
      "import { API_ENDPOINTS } from './config.js'"
    );
    await fs.writeFile(popupJsPath, popupJsContent);

    // Also fix the index.html to load the correct script
    const indexHtmlPath = path.join(__dirname, "build/index.html");
    let indexHtmlContent = await fs.readFile(indexHtmlPath, "utf-8");
    indexHtmlContent = indexHtmlContent.replace(
      /<script src="(.*?)new-popup\.js"(.*)><\/script>/,
      '<script src="popup.js"$2></script>'
    );
    await fs.writeFile(indexHtmlPath, indexHtmlContent);

    console.log("Updated popup JS and HTML paths");

    // IMPORTANT: Always use the comprehensive content.js from src folder
    console.log("Copying comprehensive content.js from src...");
    const srcContentFile = path.join(__dirname, "src/content.js");
    if (!(await fs.pathExists(srcContentFile))) {
      throw new Error("Comprehensive content script missing: src/content.js");
    }
    await fs.copy(srcContentFile, path.join(__dirname, "build/content.js"));
    console.log("✓ Comprehensive content.js copied from src folder");

    // Copy platform-specific content files
    console.log("Copying platform-specific content files...");
    const platformFiles = [
      { src: "src/content/content.js", dest: "build/chatgpt-content.js" },
      { src: "src/content/chatgpt-fix.js", dest: "build/chatgpt-fix.js" },
      { src: "src/content/debug-chatgpt.js", dest: "build/debug-chatgpt.js" },
      { src: "src/content/debug-claude.js", dest: "build/debug-claude.js" },
      {
        src: "src/content/message-extractor-test.js",
        dest: "build/message-extractor-test.js",
      },
      {
        src: "src/content/extension-reload.js",
        dest: "build/extension-reload.js",
      },
    ];

    for (const file of platformFiles) {
      if (await fs.pathExists(file.src)) {
        await fs.copy(file.src, file.dest);
        console.log(`✓ ${file.src} copied to ${file.dest}`);
      } else {
        console.warn(`⚠ ${file.src} not found, skipping`);
      }
    }

    // Copy background script
    const backgroundSrcPath = path.join(__dirname, "src/background.js");
    if (!(await fs.pathExists(backgroundSrcPath))) {
      throw new Error("Background script missing: background.js");
    }
    await fs.copy(
      backgroundSrcPath,
      path.join(__dirname, "build/background.js")
    );
    console.log("Background script copied"); // Copy config
    await fs.copy(
      path.join(__dirname, "src/config.js"),
      path.join(__dirname, "build/config.js")
    );
    // Also copy to build/src for new popup
    await fs.copy(
      path.join(__dirname, "src/config.js"),
      path.join(__dirname, "build/src/config.js")
    );
    console.log("Config copied");

    // Copy styles
    await fs.copy(
      path.join(__dirname, "src/styles.css"),
      path.join(__dirname, "build/styles.css")
    );
    console.log("Styles copied");

    // Copy new observer and messaging files
    const observerFiles = [
      { src: "observers.js", dest: "observers.js" },
      { src: "message-bridge.js", dest: "message-bridge.js" },
      { src: "shadow-dom-helper.js", dest: "shadow-dom-helper.js" },
      { src: "message-retriever.js", dest: "message-retriever.js" },
    ];

    console.log("Copying observer and messaging files...");
    for (const file of observerFiles) {
      const srcPath = path.join(__dirname, file.src);
      const destPath = path.join(__dirname, "build", file.dest);

      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, destPath);
        console.log(`✓ ${file.src} copied to build`);
      } else {
        console.warn(`Warning: ${file.src} not found, skipping`);
      }
    } // Verify final build structure
    const requiredFiles = [
      "manifest.json",
      "index.html", // Changed from popup.html
      "popup.js",
      "content.js",
      "background.js",
      "config.js",
      "styles.css",
      "icons/icon16.png",
      "icons/icon48.png",
      "icons/icon128.png",
    ];

    // Add new files to verification list
    const newFiles = [
      "observers.js",
      "message-bridge.js",
      "shadow-dom-helper.js",
      "message-retriever.js",
    ];

    // Enhanced popup module structure verification
    const enhancedPopupFiles = [
      "src/config.js",
      "src/popup/new-popup.html",
      "src/popup/new-popup.js",
    ];

    console.log("Verifying build structure...");
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, "build", file);
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`Required file missing in build: ${file}`);
      }
      console.log(`✓ ${file} verified`);
    } // Verify new files separately (without causing build failure if they don't exist yet)
    for (const file of newFiles) {
      const filePath = path.join(__dirname, "build", file);
      if (await fs.pathExists(filePath)) {
        console.log(`✓ ${file} verified`);
      } else {
        console.warn(`⚠ ${file} not found in build`);
      }
    }

    // Verify enhanced popup files
    console.log("\nVerifying enhanced popup structure...");
    for (const file of enhancedPopupFiles) {
      const filePath = path.join(__dirname, "build", file);
      if (await fs.pathExists(filePath)) {
        console.log(`✓ ${file} verified`);
      } else {
        console.warn(
          `⚠ ${file} not found in build - module imports may not work correctly`
        );
      }
    }

    // Add a warning to indicate we're using the comprehensive version
    console.log(
      "\n⚠️ NOTICE: Using comprehensive content.js (~1800 lines) from src folder."
    );
    console.log(
      "This ensures the maximum compatibility with changing AI platform interfaces."
    );

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildExtension();
