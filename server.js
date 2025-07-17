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

// Load swagger spec
const specPath = path.join(__dirname, 'api_spec.json');
console.log('Loading swagger spec from:', specPath);
console.log('File exists:', fs.existsSync(specPath));
console.log('Current working directory:', process.cwd());
console.log('Files in directory:', fs.readdirSync(__dirname).filter(f => f.endsWith('.json')));

const swaggerSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
console.log('Swagger spec loaded successfully');

// Simplified Swagger UI options for debugging
const swaggerOptions = {
  explorer: true
};

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

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

// Catch-all for debugging
app.use('*', (req, res) => {
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