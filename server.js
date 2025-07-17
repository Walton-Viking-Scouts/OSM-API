const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Load swagger spec from public directory
const specPath = path.join(__dirname, 'public/swagger/spec.json');
console.log('Loading swagger spec from:', specPath);
console.log('File exists:', fs.existsSync(specPath));

const swaggerSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
console.log('Swagger spec loaded successfully');

// Simplified Swagger UI options for debugging
const swaggerOptions = {
  explorer: true
};

// Serve Swagger UI as simple HTML page with OAuth configuration
app.get('/api-docs', (req, res) => {
  console.log('Serving Swagger UI HTML page');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OSM API Documentation</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
        .oauth-config {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px;
          max-width: 600px;
        }
        .oauth-config h3 {
          margin-top: 0;
          color: #495057;
        }
        .oauth-config input {
          width: 100%;
          padding: 10px;
          margin: 8px 0;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
        }
        .oauth-config button {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 10px;
        }
        .oauth-config button:hover {
          background: #0056b3;
        }
        .oauth-config p {
          margin: 10px 0;
          color: #6c757d;
        }
      </style>
    </head>
    <body>
      <div class="oauth-config">
        <h3>🔐 OAuth Configuration</h3>
        <p><strong>Step 1:</strong> Get your OAuth credentials from <a href="https://www.onlinescoutmanager.co.uk" target="_blank">OSM Developer Portal</a></p>
        <input type="text" id="clientId" placeholder="Enter your OAuth Client ID" />
        <input type="password" id="clientSecret" placeholder="Enter your OAuth Client Secret" />
        <button onclick="getAccessToken()">Get Access Token</button>
        <div id="tokenResult" style="margin-top: 15px;"></div>
        <p><small>Your credentials are only used in your browser and not stored on our servers.</small></p>
      </div>
      
      <div id="swagger-ui"></div>
      
      <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
      <script>
        let swaggerUI;
        
        window.onload = function() {
          swaggerUI = SwaggerUIBundle({
            url: '/swagger/spec.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.presets.standalone
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout"
          });
        }
        
        async function getAccessToken() {
          const clientId = document.getElementById('clientId').value;
          const clientSecret = document.getElementById('clientSecret').value;
          const resultDiv = document.getElementById('tokenResult');
          
          if (!clientId || !clientSecret) {
            resultDiv.innerHTML = '<p style="color: red;">Please enter both Client ID and Client Secret</p>';
            return;
          }
          
          try {
            resultDiv.innerHTML = '<p>Getting access token...</p>';
            
            const response = await fetch('/oauth/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials'
              })
            });
            
            const data = await response.json();
            
            if (response.ok && data.access_token) {
              resultDiv.innerHTML = \`
                <p style="color: green;">✅ Access token obtained successfully!</p>
                <p><strong>Token:</strong> <code style="background: #f8f9fa; padding: 5px; border-radius: 3px;">\${data.access_token}</code></p>
                <p>Use the "Authorize" button in Swagger UI below to authenticate your requests.</p>
              \`;
              
              // Pre-configure Swagger UI with the token
              if (swaggerUI) {
                swaggerUI.preauthorizeApiKey('bearerAuth', data.access_token);
              }
            } else {
              resultDiv.innerHTML = \`<p style="color: red;">❌ Error: \${data.error || 'Failed to get access token'}</p>\`;
            }
          } catch (error) {
            resultDiv.innerHTML = \`<p style="color: red;">❌ Error: \${error.message}</p>\`;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Root redirect
app.get('/', (req, res) => {
  console.log('Root route accessed, redirecting to /api-docs');
  res.redirect('/api-docs');
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check accessed');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint accessed');
  res.send('<h1>Test page works!</h1><p>Server is running correctly.</p><p><a href="/api-docs">Go to API docs</a></p>');
});

// OAuth token endpoint - proxy to OSM
app.post('/oauth/token', async (req, res) => {
  console.log('OAuth token request received');
  
  try {
    const { client_id, client_secret, grant_type } = req.body;
    
    if (!client_id || !client_secret) {
      return res.status(400).json({ error: 'client_id and client_secret are required' });
    }
    
    // Make request to OSM OAuth token endpoint
    const response = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: grant_type || 'client_credentials'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('OAuth token obtained successfully');
      res.json(data);
    } else {
      console.error('OAuth token error:', data);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('OAuth token request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug route to see what's happening
app.get('/debug', (req, res) => {
  res.json({ 
    message: 'Server is running',
    routes: ['/health', '/api-docs', '/debug', '/'],
    swaggerSpecLoaded: !!swaggerSpec,
    swaggerSpecSize: JSON.stringify(swaggerSpec).length
  });
});

// Fallback for any api-docs related requests
app.use('/api-docs*', (req, res) => {
  console.log(`Fallback api-docs route hit: ${req.method} ${req.path} ${req.url}`);
  res.status(404).send(`<h1>API Docs Route Not Found</h1><p>Path: ${req.path}</p><p>URL: ${req.url}</p><p><a href="/test">Test page</a></p>`);
});

// Catch-all for debugging
app.use('*', (req, res) => {
  console.log(`Catch-all route hit: ${req.method} ${req.path} ${req.url}`);
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.originalUrl,
    method: req.method 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OSM API Documentation server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}/api-docs`);
});