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

// Redirect api-docs to root (static file)
app.get('/api-docs', (req, res) => {
  console.log('API docs accessed, redirecting to root');
  res.redirect('/');
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

// Catch-all for debugging
app.use('*', (req, res) => {
  console.log(`Route not found: ${req.method} ${req.path}`);
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