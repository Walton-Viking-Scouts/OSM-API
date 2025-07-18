// Custom JavaScript for OAuth token handling in Swagger UI

// Wait for Swagger UI to be loaded
window.addEventListener('load', function() {
  // Check if we have an access token
  fetch('/oauth/token-info')
    .then(response => response.json())
    .then(data => {
      if (data.authenticated) {
        // Add OAuth status indicator to the page
        addOAuthStatusIndicator(data);
        
        // Set up request interceptor to add OAuth token
        setupRequestInterceptor();
      } else {
        // Show OAuth setup message
        addOAuthSetupMessage();
      }
    })
    .catch(error => {
      console.error('Error checking OAuth status:', error);
      addOAuthSetupMessage();
    });
});

function addOAuthStatusIndicator(tokenInfo) {
  const container = document.querySelector('.swagger-ui .info');
  if (container) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'oauth-status';
    statusDiv.innerHTML = `
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 10px; margin: 10px 0; border-radius: 4px;">
        <strong>✅ OAuth Authenticated</strong><br>
        <small>Token expires: ${tokenInfo.tokenInfo?.expiresAt || 'Unknown'}</small>
        <br>
        <small>Scopes: ${tokenInfo.tokenInfo?.scope || 'Unknown'}</small>
        <br>
        <button onclick="refreshOAuthToken()" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px;">
          Refresh Token
        </button>
      </div>
    `;
    container.appendChild(statusDiv);
  }
}

function addOAuthSetupMessage() {
  const container = document.querySelector('.swagger-ui .info');
  if (container) {
    const setupDiv = document.createElement('div');
    setupDiv.className = 'oauth-setup-message';
    setupDiv.innerHTML = `
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; margin: 10px 0; border-radius: 4px;">
        <strong>⚠️ OAuth Not Configured</strong><br>
        <small>You need to set up OAuth credentials to test API calls.</small>
        <br>
        <a href="/oauth/setup" style="color: #007bff; text-decoration: underline;">Set up OAuth credentials</a>
      </div>
    `;
    container.appendChild(setupDiv);
  }
}

function setupRequestInterceptor() {
  // Override fetch to add OAuth token
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [resource, config] = args;
    
    // Check if this is an API request to OSM
    if (typeof resource === 'string' && 
        (resource.includes('onlinescoutmanager.co.uk') || 
         resource.includes('onlinescoutmanager.com'))) {
      
      // Get token from our endpoint
      return fetch('/oauth/token-info')
        .then(response => response.json())
        .then(data => {
          if (data.authenticated) {
            // Add Authorization header
            const newConfig = {
              ...config,
              headers: {
                ...config?.headers,
                'Authorization': `Bearer ${data.accessToken}`
              }
            };
            return originalFetch.call(this, resource, newConfig);
          } else {
            // No token available, proceed without authorization
            return originalFetch.call(this, resource, config);
          }
        });
    }
    
    // For non-API requests, proceed normally
    return originalFetch.call(this, resource, config);
  };
}

function refreshOAuthToken() {
  fetch('/oauth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Refresh the page to update token info
      location.reload();
    } else {
      alert('Token refresh failed: ' + data.error);
    }
  })
  .catch(error => {
    console.error('Error refreshing token:', error);
    alert('Token refresh failed. Please check the console for details.');
  });
}

// Add some custom CSS for better OAuth status display
const style = document.createElement('style');
style.textContent = `
  .oauth-status, .oauth-setup-message {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  
  .oauth-status button:hover {
    background-color: #0056b3 !important;
  }
`;
document.head.appendChild(style);