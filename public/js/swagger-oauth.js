// Custom JavaScript for OAuth token handling in Swagger UI

// Wait for Swagger UI to be loaded
window.addEventListener('load', function() {
  // Add a small delay to ensure Swagger UI is fully initialized
  setTimeout(() => {
    // Check if we have an access token
    fetch('/oauth/token-info')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
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
        // Add error indicator
        addErrorMessage(`OAuth status check failed: ${error.message}`);
      });
  }, 500);
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
        <button onclick="refreshOAuthToken()" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px; margin-right: 5px;">
          Refresh Token
        </button>
        <button onclick="openSwaggerOAuth()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px;">
          Use Different Credentials
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
        <a href="/oauth/setup" style="color: #007bff; text-decoration: underline; margin-right: 10px;">Set up OAuth credentials</a>
        <button onclick="openSwaggerOAuth()" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
          Use Swagger OAuth
        </button>
      </div>
    `;
    container.appendChild(setupDiv);
  }
}

function setupRequestInterceptor() {
  // Wait for Swagger UI to be available, then configure OAuth
  const waitForSwagger = setInterval(() => {
    if (window.ui && window.ui.authActions) {
      clearInterval(waitForSwagger);
      
      // Check if we have a token in session
      fetch('/oauth/token-info')
        .then(response => response.json())
        .then(data => {
          if (data.authenticated) {
            // Pre-authorize Swagger UI with our token
            window.ui.authActions.authorize({
              oauth2: {
                token: {
                  access_token: data.accessToken,
                  token_type: 'Bearer',
                  scope: data.tokenInfo?.scope || ''
                }
              }
            });
            console.log('✅ Swagger UI pre-authorized with session token');
          }
        })
        .catch(error => console.error('Failed to pre-authorize Swagger UI:', error));
    }
  }, 100);

  // Override fetch to add OAuth token for any remaining requests
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

function openSwaggerOAuth() {
  // Wait for Swagger UI to be available
  const waitForSwagger = setInterval(() => {
    if (window.ui && window.ui.authActions) {
      clearInterval(waitForSwagger);
      
      try {
        // Trigger Swagger UI's built-in OAuth dialog
        const authWrapper = document.querySelector('.auth-wrapper');
        if (authWrapper) {
          // Find and click the authorize button
          const authorizeBtn = document.querySelector('.btn.authorize');
          if (authorizeBtn) {
            authorizeBtn.click();
          } else {
            // Fallback: manually trigger auth action
            window.ui.authActions.showDefinitions(['oauth2']);
          }
        } else {
          // Manual auth action trigger
          window.ui.authActions.showDefinitions(['oauth2']);
        }
      } catch (error) {
        console.error('Error opening Swagger OAuth:', error);
        addErrorMessage(`Failed to open OAuth dialog: ${error.message}`);
      }
    }
  }, 100);
  
  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(waitForSwagger);
  }, 5000);
}

function addErrorMessage(message) {
  const container = document.querySelector('.swagger-ui .info');
  if (container) {
    // Remove any existing error messages
    const existingError = container.querySelector('.oauth-error-message');
    if (existingError) {
      existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'oauth-error-message';
    errorDiv.innerHTML = `
      <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 10px; margin: 10px 0; border-radius: 4px;">
        <strong>❌ OAuth Error</strong><br>
        <small>${message}</small>
        <button onclick="this.parentElement.parentElement.remove()" style="float: right; background: none; border: none; color: #721c24; cursor: pointer;">×</button>
      </div>
    `;
    container.appendChild(errorDiv);
  }
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