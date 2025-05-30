/**
 * File verification script for Chrome Extension
 * Checks if all required files for advanced observation methods exist
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk') || { red: (text) => text, green: (text) => text, yellow: (text) => text };

async function verifyFiles() {
  console.log('Verifying required files for extension functionality...');
  
  // Check for the core files first
  console.log('\nChecking core extension files:');
  const coreFiles = [
    { path: 'src/content.js', required: true, description: 'Comprehensive content script for AI platform detection' },
    { path: 'src/background.js', required: true, description: 'Background script for extension' },
    { path: 'src/config.js', required: true, description: 'Configuration file for API endpoints' },
    { path: 'src/styles.css', required: true, description: 'Styles for extension UI' },
    { path: 'src/popup/popup.html', required: true, description: 'Popup HTML file' },
    { path: 'src/popup/popup.js', required: true, description: 'Popup JavaScript file' },
    { path: 'manifest.json', required: true, description: 'Extension manifest file' }
  ];
  
  let allCoreFilesExist = true;
  let missingCoreFiles = [];
  
  for (const file of coreFiles) {
    const filePath = path.join(__dirname, file.path);
    const exists = await fs.pathExists(filePath);
    
    if (exists) {
      console.log(`${chalk.green('✓')} ${file.path} - ${file.description}`);
    } else {
      if (file.required) {
        console.log(`${chalk.red('✗')} ${file.path} - ${file.description} (REQUIRED)`);
        missingCoreFiles.push(file.path);
        allCoreFilesExist = false;
      } else {
        console.log(`${chalk.yellow('!')} ${file.path} - ${file.description} (OPTIONAL)`);
      }
    }
  }
  
  // Check for content.js size to ensure it's the comprehensive version
  const contentPath = path.join(__dirname, 'src/content.js');
  if (await fs.pathExists(contentPath)) {
    const stats = await fs.stat(contentPath);
    const sizeInKB = Math.round(stats.size / 1024);
    
    if (sizeInKB < 50) { // A simple content.js would be smaller
      console.log(`${chalk.yellow('⚠')} src/content.js is only ${sizeInKB}KB. This may not be the comprehensive version!`);
    } else {
      console.log(`${chalk.green('✓')} src/content.js size: ${sizeInKB}KB (Comprehensive version confirmed)`);
    }
  }
  
  // Check for observer files
  console.log('\nChecking advanced observer files:');
  const observerFiles = [
    { path: 'observers.js', required: true, description: 'Advanced observers implementation' },
    { path: 'message-bridge.js', required: true, description: 'Communication bridge between scripts' },
    { path: 'shadow-dom-helper.js', required: true, description: 'Helper for shadow DOM traversal' },
    { path: 'message-retriever.js', required: true, description: 'Direct message retrieval implementation' }
  ];
  
  let allObserverFilesExist = true;
  let missingObserverFiles = [];
  
  for (const file of observerFiles) {
    const filePath = path.join(__dirname, file.path);
    const exists = await fs.pathExists(filePath);
    
    if (exists) {
      console.log(`${chalk.green('✓')} ${file.path} - ${file.description}`);
    } else {
      if (file.required) {
        console.log(`${chalk.red('✗')} ${file.path} - ${file.description} (REQUIRED)`);
        missingObserverFiles.push(file.path);
        allObserverFilesExist = false;
      } else {
        console.log(`${chalk.yellow('!')} ${file.path} - ${file.description} (OPTIONAL)`);
      }
    }
  }
  
  // Check for icon files
  console.log('\nChecking icon files:');
  const iconFiles = [
    { path: 'public/icons/icon16.png', required: true, description: '16px icon' },
    { path: 'public/icons/icon48.png', required: true, description: '48px icon' },
    { path: 'public/icons/icon128.png', required: true, description: '128px icon' }
  ];
  
  let allIconFilesExist = true;
  let missingIconFiles = [];
  
  for (const file of iconFiles) {
    const filePath = path.join(__dirname, file.path);
    const exists = await fs.pathExists(filePath);
    
    if (exists) {
      console.log(`${chalk.green('✓')} ${file.path} - ${file.description}`);
    } else {
      if (file.required) {
        console.log(`${chalk.red('✗')} ${file.path} - ${file.description} (REQUIRED)`);
        missingIconFiles.push(file.path);
        allIconFilesExist = false;
      }
    }
  }
  
  const allFilesExist = allCoreFilesExist && allObserverFilesExist && allIconFilesExist;
  const missingRequiredFiles = [...missingCoreFiles, ...missingObserverFiles, ...missingIconFiles];
  
  if (!allFilesExist) {
    console.log('\n');
    console.log(chalk.red('Error: Missing required files for the extension'));
    console.log('The following files are required but missing:');
    missingRequiredFiles.forEach(file => {
      console.log(`- ${file}`);
    });
    console.log('\nPlease ensure these files exist in the project directory before building.');
    process.exit(1);
  }
  
  console.log(chalk.green('\nAll required files are present. Proceeding with build...'));
  return true;
}

// Run the verification if called directly
if (require.main === module) {
  verifyFiles().catch(err => {
    console.error('Error during file verification:', err);
    process.exit(1);
  });
}

module.exports = verifyFiles; 