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
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Help with cross-site requests
  },
  // Use default MemoryStore only in development
  // In production, this warning can be safely ignored for single-instance deployments
  // For multi-instance deployments, consider using connect-redis or similar
  name: 'osm-api-session'
}));

// Parse URL-encoded bodies and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
    requestInterceptor: (req) => {
      // This will be handled by client-side JavaScript
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
  const { client_id, client_secret, scopes } = req.body;
  
  if (!client_id || !client_secret) {
    return res.redirect('/oauth/setup?error=Client ID and Secret are required');
  }

  // Store OAuth configuration in session
  req.session.oauthConfig = {
    clientId: client_id,
    clientSecret: client_secret,
    scopes: Array.isArray(scopes) ? scopes : (scopes ? [scopes] : [])
  };

  res.redirect('/oauth/setup?success=Configuration saved successfully');
});

// OAuth direct token exchange using client credentials flow
app.get('/oauth/token', async (req, res) => {
  if (!req.session.oauthConfig) {
    return res.redirect('/oauth/setup?error=Please configure OAuth settings first');
  }

  const { clientId, clientSecret, scopes } = req.session.oauthConfig;

  try {
    // Direct token exchange using client credentials flow
    const tokenResponse = await axios.post('https://www.onlinescoutmanager.co.uk/oauth/token', {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes.join(' ')
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
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

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Not Found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API docs: http://localhost:${PORT}/api-docs`);
  console.log(`📄 Raw spec: http://localhost:${PORT}/swagger.json`);
});