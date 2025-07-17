const express = require('express');
const swaggerUi = require('swagger-ui-express');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI spec
const swaggerSpec = JSON.parse(fs.readFileSync('./api_spec.json', 'utf8'));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', './views');
app.set('layout', 'layout');
app.use(expressLayouts);

// Serve static files (CSS, JS, images)
app.use(express.static('public'));

// Serve raw spec.json at /swagger.json
app.get('/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OSM API Documentation'
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