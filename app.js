const express = require('express');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI spec
const swaggerSpec = JSON.parse(fs.readFileSync(path.join(__dirname, 'api_spec.json'), 'utf8'));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'osm-api-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true, // Force session creation
  cookie: { 
    secure: false, // Disable secure cookies temporarily for debugging
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Help with cross-site requests
    httpOnly: true
  },
  // Use default MemoryStore only in development
  // In production, this warning can be safely ignored for single-instance deployments
  // For multi-instance deployments, consider using connect-redis or similar
  name: 'osm-api-session'
}));

// Parse URL-encoded bodies and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Add CORS headers for Swagger UI
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Serve static files (CSS, JS, images)
app.use(express.static('public'));

// Serve raw spec.json at /swagger.json
app.get('/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OSM API Documentation',
  swaggerOptions: {
    oauth2RedirectUrl: process.env.NODE_ENV === 'production' ? 
      'https://osm-api-docs.onrender.com/api-docs/oauth2-redirect.html' : 
      `http://localhost:${PORT}/api-docs/oauth2-redirect.html`,
    initOAuth: {
      clientId: 'your-client-id-placeholder',
      clientSecret: 'your-client-secret-placeholder',
      realm: 'osm-api',
      appName: 'OSM API Documentation',
      scopeSeparator: ' ',
      additionalQueryStringParams: {},
      useBasicAuthenticationWithAccessCodeGrant: true
    },
    requestInterceptor: (req) => {
      // Add token from session if available
      if (req.url.includes('onlinescoutmanager.co.uk')) {
        // This will be handled by client-side JavaScript
        return req;
      }
      return req;
    }
  },
  customJs: '/js/swagger-oauth.js'
}));

// Home route
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'OSM API Documentation',
    apiTitle: swaggerSpec.info?.title || 'API Documentation',
    apiVersion: swaggerSpec.info?.version || '1.0.0',
    apiDescription: swaggerSpec.info?.description || 'API documentation powered by OpenAPI'
  });
});

// Health check endpoint (required for Render)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// OAuth setup page
app.get('/oauth/setup', (req, res) => {
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('host');
  
  res.render('oauth-setup', {
    title: 'OAuth Setup - OSM API',
    protocol,
    host,
    clientId: req.session.oauthConfig?.clientId || '',
    clientSecret: req.session.oauthConfig?.clientSecret || '',
    hasToken: !!req.session.accessToken,
    tokenInfo: req.session.tokenInfo,
    success: req.query.success,
    error: req.query.error
  });
});

// OAuth configuration handler
app.post('/oauth/configure', (req, res) => {
  let { client_id, client_secret, scopes } = req.body;
  
  // Trim whitespace from credentials (common issue with copy/paste)
  client_id = client_id?.trim();
  client_secret = client_secret?.trim();
  
  console.log('OAuth configure received:', { 
    client_id: client_id ? '***' : 'undefined', 
    client_secret: client_secret ? '***' : 'undefined', 
    scopes,
    clientIdLength: client_id?.length || 0,
    clientSecretLength: client_secret?.length || 0
  });
  
  if (!client_id || !client_secret) {
    return res.redirect('/oauth/setup?error=Client ID and Secret are required');
  }

  // Store OAuth configuration in session
  req.session.oauthConfig = {
    clientId: client_id,
    clientSecret: client_secret,
    scopes: Array.isArray(scopes) ? scopes : (scopes ? [scopes] : [])
  };

  console.log('Session after save:', { 
    sessionId: req.sessionID, 
    hasOauthConfig: !!req.session.oauthConfig,
    configKeys: req.session.oauthConfig ? Object.keys(req.session.oauthConfig) : []
  });

  res.redirect('/oauth/setup?success=Configuration saved successfully');
});

// OAuth direct token exchange using client credentials flow
app.get('/oauth/token', async (req, res) => {
  if (!req.session.oauthConfig) {
    return res.redirect('/oauth/setup?error=Please configure OAuth settings first');
  }

  const { clientId, clientSecret, scopes } = req.session.oauthConfig;

  try {
    // Direct token exchange using client credentials flow with HTTP Basic Auth
    const tokenResponse = await axios.post('https://www.onlinescoutmanager.co.uk/oauth/token', 
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: scopes.join(' ')
      }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }
    });

    const tokenData = tokenResponse.data;
    
    // Store access token in session
    req.session.accessToken = tokenData.access_token;
    req.session.refreshToken = tokenData.refresh_token;
    req.session.tokenInfo = {
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      scope: tokenData.scope
    };

    res.redirect('/oauth/setup?success=Token obtained successfully! You can now test API calls.');
  } catch (error) {
    console.error('OAuth token exchange error:', error.response?.data || error.message);
    res.redirect(`/oauth/setup?error=Token exchange failed: ${error.response?.data?.error || error.message}`);
  }
});


// OAuth token refresh endpoint
app.post('/oauth/refresh', async (req, res) => {
  if (!req.session.refreshToken || !req.session.oauthConfig) {
    return res.json({ error: 'No refresh token available' });
  }

  try {
    const tokenResponse = await axios.post('https://www.onlinescoutmanager.co.uk/oauth/token', {
      grant_type: 'refresh_token',
      client_id: req.session.oauthConfig.clientId,
      client_secret: req.session.oauthConfig.clientSecret,
      refresh_token: req.session.refreshToken
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokenData = tokenResponse.data;
    
    // Update tokens in session
    req.session.accessToken = tokenData.access_token;
    if (tokenData.refresh_token) {
      req.session.refreshToken = tokenData.refresh_token;
    }
    req.session.tokenInfo = {
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      scope: tokenData.scope
    };

    res.json({ success: true, message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('OAuth token refresh error:', error.response?.data || error.message);
    res.json({ error: 'Token refresh failed: ' + (error.response?.data?.error || error.message) });
  }
});

// Get current token info
app.get('/oauth/token-info', (req, res) => {
  if (!req.session.accessToken) {
    return res.json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    accessToken: req.session.accessToken,
    tokenInfo: req.session.tokenInfo,
    hasRefreshToken: !!req.session.refreshToken
  });
});

// Debug endpoint to test OAuth proxy
app.get('/oauth/debug', async (req, res) => {
  console.log('🔧 OAuth debug endpoint called');
  
  const results = {
    status: 'OAuth proxy is accessible',
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Test 1: OSM base URL
  try {
    console.log('Testing OSM base URL...');
    const testResponse = await axios.get('https://www.onlinescoutmanager.co.uk', {
      timeout: 5000,
      headers: {
        'User-Agent': 'OSM-API-Debug/1.0'
      }
    });
    
    console.log('✅ OSM base URL is reachable:', {
      status: testResponse.status,
      statusText: testResponse.statusText
    });
    
    results.tests.osmBaseUrl = {
      success: true,
      status: testResponse.status,
      statusText: testResponse.statusText
    };
  } catch (error) {
    console.log('❌ OSM base URL not reachable:', {
      message: error.message,
      code: error.code
    });
    
    results.tests.osmBaseUrl = {
      success: false,
      error: error.message,
      code: error.code
    };
  }
  
  // Test 2: OSM OAuth endpoint specifically
  try {
    console.log('Testing OSM OAuth endpoint...');
    const oauthTestResponse = await axios.post('https://www.onlinescoutmanager.co.uk/oauth/token', 
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'section:member:read'
      }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from('test:test').toString('base64')}`,
        'User-Agent': 'OSM-API-Debug/1.0'
      },
      timeout: 5000
    });
    
    console.log('✅ OSM OAuth endpoint responded (expected 401):', {
      status: oauthTestResponse.status
    });
    
    results.tests.osmOauthEndpoint = {
      success: true,
      status: oauthTestResponse.status,
      note: 'Unexpected success - should be 401'
    };
  } catch (error) {
    console.log('OAuth endpoint response:', {
      status: error.response?.status,
      message: error.message,
      code: error.code
    });
    
    results.tests.osmOauthEndpoint = {
      success: error.response?.status === 401 || error.response?.status === 400, // Expected for bad credentials
      status: error.response?.status,
      error: error.message,
      code: error.code,
      note: error.response?.status === 401 ? 'Expected 401 - endpoint is working' : 'Unexpected error'
    };
  }
  
  // Test 3: DNS resolution
  try {
    console.log('Testing DNS resolution...');
    const dns = require('dns').promises;
    const addresses = await dns.resolve4('www.onlinescoutmanager.co.uk');
    
    console.log('✅ DNS resolution successful:', addresses);
    results.tests.dnsResolution = {
      success: true,
      addresses: addresses
    };
  } catch (error) {
    console.log('❌ DNS resolution failed:', error.message);
    results.tests.dnsResolution = {
      success: false,
      error: error.message
    };
  }
  
  res.json(results);
});

// Check if OAuth config exists in session
app.get('/oauth/config-status', (req, res) => {
  res.json({
    hasConfig: !!(req.session.oauthConfig?.clientId && req.session.oauthConfig?.clientSecret),
    hasToken: !!req.session.accessToken,
    sessionId: req.sessionID
  });
});

// Handle preflight OPTIONS requests for CORS
app.options('/oauth/proxy', (req, res) => {
  console.log('🔧 OAuth proxy OPTIONS request received');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Test endpoint to verify Swagger UI can reach the server
app.post('/oauth/test', (req, res) => {
  console.log('🧪 OAuth test endpoint called:', {
    timestamp: new Date().toISOString(),
    contentType: req.get('content-type'),
    body: req.body,
    headers: Object.keys(req.headers),
    userAgent: req.get('user-agent')
  });
  
  res.json({
    success: true,
    message: 'Test endpoint reached successfully',
    receivedData: {
      contentType: req.get('content-type'),
      bodyKeys: Object.keys(req.body || {}),
      timestamp: new Date().toISOString()
    }
  });
});

// Get last OAuth request info for debugging
app.get('/oauth/last-request', (req, res) => {
  res.json({
    lastRequest: global.lastOAuthRequest || null,
    timestamp: new Date().toISOString()
  });
});

// OAuth proxy endpoint for Swagger UI (avoids CORS issues)
app.post('/oauth/proxy', async (req, res) => {
  const startTime = Date.now();
  const requestInfo = {
    timestamp: new Date().toISOString(),
    contentType: req.get('content-type'),
    body: req.body,
    headers: Object.keys(req.headers),
    ip: req.ip
  };
  console.log('🔵 OAuth proxy request started:', requestInfo);
  
  // Store request info in a global variable so we can display it later
  global.lastOAuthRequest = requestInfo;

  // Set timeout for this request
  const timeoutId = setTimeout(() => {
    console.log('⏰ OAuth proxy timeout after 10 seconds');
    if (!res.headersSent) {
      res.status(408).json({ error: 'timeout', error_description: 'Request timed out after 10 seconds' });
    }
  }, 10000);

  try {
    // Handle both JSON and form-encoded requests from Swagger UI
    let client_id, client_secret, grant_type, scope;
    
    if (req.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      // Form-encoded request
      ({ client_id, client_secret, grant_type, scope } = req.body);
    } else if (req.get('content-type')?.includes('application/json')) {
      // JSON request
      ({ client_id, client_secret, grant_type, scope } = req.body);
    } else {
      // Try to parse anyway
      ({ client_id, client_secret, grant_type, scope } = req.body || {});
    }
    
    // Trim whitespace from credentials (common issue with copy/paste)
    client_id = client_id?.trim();
    client_secret = client_secret?.trim();
    grant_type = grant_type?.trim();
    scope = scope?.trim();
    
    console.log('📋 Parsed OAuth params:', {
      hasClientId: !!client_id,
      clientIdLength: client_id?.length || 0,
      hasClientSecret: !!client_secret,
      clientSecretLength: client_secret?.length || 0,
      grant_type,
      scope: scope || 'none',
      clientIdPreview: client_id ? `${client_id.substring(0, 8)}...` : 'none',
      clientSecretPreview: client_secret ? `${client_secret.substring(0, 8)}...` : 'none'
    });
    
    if (!client_id || !client_secret || grant_type !== 'client_credentials') {
      clearTimeout(timeoutId);
      console.log('❌ Invalid parameters provided');
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing or invalid parameters' });
    }

    console.log('🚀 Making request to OSM OAuth endpoint...');
    const tokenResponse = await axios.post('https://www.onlinescoutmanager.co.uk/oauth/token', 
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: scope || ''
      }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`
      },
      timeout: 8000 // 8 second timeout for the external request
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.log('✅ OSM OAuth success:', { 
      hasAccessToken: !!tokenResponse.data.access_token,
      tokenType: tokenResponse.data.token_type,
      expiresIn: tokenResponse.data.expires_in,
      duration: `${duration}ms`
    });

    // Return the token response directly to Swagger UI
    res.json(tokenResponse.data);
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.error('❌ OAuth proxy error details:', {
      duration: `${duration}ms`,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code,
      isTimeout: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    });
    
    if (!res.headersSent) {
      let errorResponse;
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorResponse = {
          error: 'network_timeout',
          error_description: 'Unable to connect to OSM OAuth server. This may be due to network restrictions on the hosting platform or OSM server being unavailable.',
          debug_info: {
            error_code: error.code,
            duration: `${duration}ms`,
            suggestion: 'Try again in a few minutes, or contact your hosting provider about external network access.'
          }
        };
      } else if (error.response?.data) {
        errorResponse = error.response.data;
      } else {
        errorResponse = {
          error: 'server_error',
          error_description: `Token exchange failed: ${error.message}`,
          debug_info: {
            error_code: error.code,
            duration: `${duration}ms`
          }
        };
      }
      
      res.status(error.response?.status || 408).json(errorResponse);
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Not Found' });
});

// Start server
app.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction ? 'https://osm-api-docs.onrender.com' : `http://localhost:${PORT}`;
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API docs: ${baseUrl}/api-docs`);
  console.log(`📄 Raw spec: ${baseUrl}/swagger.json`);
});