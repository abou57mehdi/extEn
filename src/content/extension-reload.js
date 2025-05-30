// Extension Reload Script
// This script provides a button to reload the extension state when switching between platforms

(function() {
  console.log('Extension Reload Script Loaded');
  
  // Add a reload button to the page
  function addReloadButton() {
    // Check if button already exists
    if (document.getElementById('extension-reload-button')) {
      return;
    }
    
    const button = document.createElement('button');
    button.id = 'extension-reload-button';
    button.textContent = 'Reload Extension';
    button.style.position = 'fixed';
    button.style.bottom = '60px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#ff5722';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    button.style.fontSize = '14px';
    button.style.fontFamily = 'Arial, sans-serif';
    
    button.addEventListener('click', () => {
      console.log('Reloading extension state...');
      
      // Send message to content script to reload
      window.postMessage({ type: 'RELOAD_EXTENSION' }, '*');
      
      // Visual feedback
      button.textContent = 'Reloaded!';
      button.style.backgroundColor = '#4CAF50';
      setTimeout(() => {
        button.textContent = 'Reload Extension';
        button.style.backgroundColor = '#ff5722';
      }, 2000);
    });
    
    document.body.appendChild(button);
    console.log('Added extension reload button');
  }
  
  // Add the reload button after a delay to ensure DOM is ready
  setTimeout(addReloadButton, 2000);
})();
