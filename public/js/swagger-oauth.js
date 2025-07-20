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
        console.log('OAuth token info response:', data);
        if (data.authenticated) {
          // Add OAuth status indicator to the page
          addOAuthStatusIndicator(data);
          
          // Set up request interceptor to add OAuth token
          setupRequestInterceptor();
        } else {
          // Check if we have OAuth config but no token
          checkOAuthConfig().then(hasConfig => {
            if (hasConfig) {
              addOAuthConfiguredMessage();
            } else {
              addOAuthSetupMessage();
            }
          });
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
        <button onclick="openSwaggerOAuth()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px; margin-right: 5px;">
          Use Different Credentials
        </button>
        <button onclick="checkLastOAuthRequest()" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px;">
          Check Last Request
        </button>
      </div>
    `;
    container.appendChild(statusDiv);
  }
}

function checkOAuthConfig() {
  return fetch('/oauth/config-status')
    .then(response => response.json())
    .then(data => data.hasConfig)
    .catch(() => false);
}

function addOAuthConfiguredMessage() {
  const container = document.querySelector('.swagger-ui .info');
  if (container) {
    const setupDiv = document.createElement('div');
    setupDiv.className = 'oauth-setup-message';
    setupDiv.innerHTML = `
      <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 10px; margin: 10px 0; border-radius: 4px;">
        <strong>🔧 OAuth Configured</strong><br>
        <small>Credentials are saved but no active token. Click below to get a token.</small>
        <br>
        <button onclick="getOAuthToken()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
          Get Token
        </button>
        <button onclick="openSwaggerOAuth()" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
          Use Swagger OAuth
        </button>
        <button onclick="testOAuthProxy()" style="background: #ffc107; color: #212529; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
          Test OAuth Proxy
        </button>
        <button onclick="checkLastOAuthRequest()" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
          Check Last Request
        </button>
      </div>
    `;
    container.appendChild(setupDiv);
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
        <button onclick="openSwaggerOAuth()" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
          Use Swagger OAuth
        </button>
        <button onclick="testOAuthProxy()" style="background: #ffc107; color: #212529; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">
          Test OAuth Proxy
        </button>
        <button onclick="checkLastOAuthRequest()" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
          Check Last Request
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

  // Add global error handler for OAuth requests
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('oauth')) {
      console.error('OAuth Promise Rejection:', event.reason);
      addErrorMessage(`OAuth request failed: ${event.reason.message}`);
    }
  });

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
  // Add debug info to the page
  addDebugMessage('Opening Swagger OAuth dialog...');
  
  // Wait for Swagger UI to be available
  const waitForSwagger = setInterval(() => {
    if (window.ui && window.ui.authActions) {
      clearInterval(waitForSwagger);
      
      try {
        addDebugMessage('Swagger UI found, triggering OAuth dialog');
        
        // Trigger Swagger UI's built-in OAuth dialog
        const authWrapper = document.querySelector('.auth-wrapper');
        if (authWrapper) {
          // Find and click the authorize button
          const authorizeBtn = document.querySelector('.btn.authorize');
          if (authorizeBtn) {
            addDebugMessage('Clicking authorize button');
            authorizeBtn.click();
          } else {
            // Fallback: manually trigger auth action
            addDebugMessage('Using fallback auth action trigger');
            window.ui.authActions.showDefinitions(['oauth2']);
          }
        } else {
          // Manual auth action trigger
          addDebugMessage('Using manual auth action trigger');
          window.ui.authActions.showDefinitions(['oauth2']);
        }
      } catch (error) {
        addErrorMessage(`Failed to open OAuth dialog: ${error.message}`);
      }
    }
  }, 100);
  
  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(waitForSwagger);
    addDebugMessage('OAuth dialog timeout - check if modal opened');
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

function addDebugMessage(message) {
  const container = document.querySelector('.swagger-ui .info');
  if (container) {
    const debugDiv = document.createElement('div');
    debugDiv.className = 'oauth-debug-message';
    debugDiv.innerHTML = `
      <div style="background-color: #e2e3e5; border: 1px solid #d6d8db; color: #383d41; padding: 5px; margin: 5px 0; border-radius: 4px; font-size: 12px;">
        <strong>🔧 Debug:</strong> ${message}
        <button onclick="this.parentElement.parentElement.remove()" style="float: right; background: none; border: none; color: #383d41; cursor: pointer; font-size: 10px;">×</button>
      </div>
    `;
    container.appendChild(debugDiv);
  }
}

function getOAuthToken() {
  console.log('Getting OAuth token using saved credentials...');
  
  fetch('/oauth/token')
    .then(response => {
      if (response.redirected) {
        // Server redirected us, likely back to setup page with success/error
        window.location.href = response.url;
      } else {
        return response.json();
      }
    })
    .then(data => {
      if (data) {
        console.log('Token response:', data);
        // Reload to refresh the UI
        window.location.reload();
      }
    })
    .catch(error => {
      console.error('Get token failed:', error);
      addErrorMessage(`Failed to get token: ${error.message}`);
    });
}

function testOAuthProxy() {
  addDebugMessage('Testing OAuth proxy endpoint...');
  
  // First test if the debug endpoint is accessible
  fetch('/oauth/debug')
    .then(response => response.json())
    .then(data => {
      addDebugMessage('Debug endpoint accessible');
      
      // Now test the actual proxy with dummy credentials
      return fetch('/oauth/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          grant_type: 'client_credentials',
          scope: 'section:member:read'
        })
      });
    })
    .then(response => {
      addDebugMessage(`OAuth proxy response status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (data.error) {
        addErrorMessage(`OAuth proxy test: ${data.error} - ${data.error_description || 'Check credentials'}`);
      } else {
        addErrorMessage('OAuth proxy is working! (Used test credentials - use real ones for actual auth)');
      }
    })
    .catch(error => {
      addErrorMessage(`OAuth proxy test failed: ${error.message}`);
    });
}

function checkLastOAuthRequest() {
  addDebugMessage('Checking last OAuth request...');
  
  fetch('/oauth/last-request')
    .then(response => response.json())
    .then(data => {
      if (data.lastRequest) {
        const req = data.lastRequest;
        addDebugMessage(`Last request: ${req.timestamp}`);
        addDebugMessage(`Content-Type: ${req.contentType}`);
        addDebugMessage(`Body keys: ${Object.keys(req.body || {}).join(', ')}`);
        addDebugMessage(`Headers: ${req.headers.join(', ')}`);
        
        // Show body content if it exists
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyStr = JSON.stringify(req.body, null, 2);
          addDebugMessage(`Body content: ${bodyStr.substring(0, 200)}${bodyStr.length > 200 ? '...' : ''}`);
        }
      } else {
        addDebugMessage('No OAuth requests recorded yet');
      }
    })
    .catch(error => {
      addErrorMessage(`Failed to check last request: ${error.message}`);
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