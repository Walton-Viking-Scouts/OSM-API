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

// Serve Swagger UI as simple HTML page
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
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function() {
          SwaggerUIBundle({
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