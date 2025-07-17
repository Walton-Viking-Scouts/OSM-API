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

// Load swagger spec
console.log('Loading swagger spec from:', path.join(__dirname, 'api_spec.json'));
const swaggerSpec = JSON.parse(fs.readFileSync(path.join(__dirname, 'api_spec.json'), 'utf8'));
console.log('Swagger spec loaded successfully');

// Custom Swagger UI options
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .oauth-input-container {
      background: #fafafa;
      border: 1px solid #d4d4d4;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .oauth-input-container h3 {
      margin-top: 0;
      color: #3b4151;
    }
    .oauth-input-container input {
      width: 100%;
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #d4d4d4;
      border-radius: 4px;
      font-size: 14px;
    }
    .oauth-input-container button {
      background: #4990e2;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    .oauth-input-container button:hover {
      background: #357abd;
    }
  `,
  customJs: `
    window.onload = function() {
      // Add OAuth configuration form
      const topbar = document.querySelector('.swagger-ui .information-container');
      if (topbar) {
        const oauthForm = document.createElement('div');
        oauthForm.className = 'oauth-input-container';
        oauthForm.innerHTML = \`
          <h3>🔐 OAuth Configuration</h3>
          <p><strong>Step 1:</strong> Get your OAuth credentials from <a href="https://www.onlinescoutmanager.co.uk" target="_blank">OSM</a></p>
          <input type="text" id="clientId" placeholder="Enter your OAuth Client ID" />
          <input type="password" id="clientSecret" placeholder="Enter your OAuth Client Secret" />
          <button onclick="configureOAuth()">Configure OAuth & Authorize</button>
          <p><small>Your credentials are only used in your browser and not stored on our servers.</small></p>
        \`;
        topbar.appendChild(oauthForm);
      }
      
      // OAuth configuration function
      window.configureOAuth = function() {
        const clientId = document.getElementById('clientId').value;
        const clientSecret = document.getElementById('clientSecret').value;
        
        if (!clientId || !clientSecret) {
          alert('Please enter both Client ID and Client Secret');
          return;
        }
        
        // Configure OAuth in Swagger UI
        const ui = window.ui;
        if (ui) {
          ui.preauthorizeApiKey('oAuth2ClientCredentials', {
            clientId: clientId,
            clientSecret: clientSecret
          });
          
          // Show success message
          alert('OAuth configured successfully! You can now use the "Authorize" button to get your access token.');
        }
      };
    };
  `
};

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

// Catch-all for debugging
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.originalUrl,
    method: req.method 
  });
});

app.listen(PORT, () => {
  console.log(`OSM API Documentation server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}/api-docs`);
});