# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js Express.js application that serves OpenAPI/Swagger documentation for the Online Scout Manager (OSM) API. The application provides a clean, modern web interface with interactive Swagger UI for API exploration and testing.

## Architecture

### Core Components
- **Express.js Server** (`app.js`) - Main application entry point with middleware setup
- **EJS Templates** (`views/`) - Server-side rendered standalone HTML pages
- **OAuth Integration** - Session-based OAuth 2.0 flow for OSM API authentication
- **Swagger UI Integration** - Interactive API documentation at `/api-docs`
- **Static Asset Serving** - CSS, JS, and other assets from `public/`
- **OpenAPI Specification** (`api_spec.json`) - Complete API definition with 15 endpoints

### Key Design Patterns
- **MVC-like Structure**: Routes in `app.js`, views in `views/`, static assets in `public/`
- **Standalone Templates**: Each EJS template is a complete HTML document with its own navigation
- **Session Management**: Express sessions for OAuth token storage
- **Responsive Design**: Tailwind CSS via CDN for styling
- **Health Check Pattern**: `/health` endpoint for monitoring and deployment health checks

### ⚠️ Critical Architectural Dependencies
**NEVER REMOVE OR MODIFY WITHOUT CAREFUL CONSIDERATION:**
- Session middleware configuration - Required for OAuth functionality
- Static file serving - Required for CSS, JS, and Swagger UI customizations
- Standalone template structure - Each template contains complete HTML with navigation

## Development Commands

### Essential Commands
```bash
npm install        # Install dependencies
npm start         # Start production server
npm run dev       # Start development server with nodemon
```

### Development Workflow
1. **Local Development**: Use `npm run dev` for auto-restart on file changes
2. **Testing**: Access http://localhost:3000 for homepage, http://localhost:3000/api-docs for Swagger UI
3. **Spec Updates**: Modify `swagger.json` and restart server to see changes

## Key Files and Their Purposes

### Application Core
- `app.js` - Main Express application with all routes and middleware
- `package.json` - Dependencies, scripts, and Node.js 18+ requirement
- `api_spec.json` - OpenAPI 3.0 specification (15 endpoints for OSM API)

### View Layer
- `views/index.ejs` - Homepage with complete HTML structure and navigation
- `views/oauth-setup.ejs` - OAuth configuration page with complete HTML structure
- `views/404.ejs` - Custom 404 error page with complete HTML structure
- `views/layout.ejs` - Legacy layout file (no longer used but kept for reference)

### ⚠️ Template System Architecture
**IMPORTANT**: All EJS templates are standalone HTML documents:
- Each template in `views/` contains complete HTML (`<html>`, `<head>`, `<body>` tags)
- Templates include their own navigation and styling
- No layout system is used - each template is self-contained
- When modifying templates, maintain consistent navigation and styling across all pages

### Static Assets
- `public/css/style.css` - Custom CSS including Swagger UI customizations
- `public/js/` - JavaScript files directory (currently empty)

## Critical Routes and Endpoints

### User-Facing Routes
- `/` - Homepage with API overview and navigation
- `/api-docs` - Interactive Swagger UI documentation
- `/swagger.json` - Raw OpenAPI specification JSON
- `/health` - Health check endpoint (required for Render.com deployment)
- `/oauth/setup` - OAuth configuration page
- `/oauth/authorize` - OAuth authorization redirect
- `/oauth/callback` - OAuth callback handler
- `/oauth/token-info` - Current token information (JSON endpoint)

### Route Handler Patterns
- Homepage renders dynamic content from OpenAPI spec (`apiTitle`, `apiVersion`, `apiDescription`)
- Swagger UI configured with custom CSS to hide topbar
- 404 handler renders custom error page instead of default Express 404

## Deployment Configuration

### Render.com Deployment
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check**: `/health` endpoint returns `{"status": "OK", "timestamp": "..."}`
- **Port Configuration**: Uses `process.env.PORT` or defaults to 3000

### Environment Requirements
- Node.js 18+ (specified in package.json engines)
- No additional environment variables required for basic operation
- Automatic port assignment from hosting platform

## OpenAPI Specification Details

The `api_spec.json` file contains the complete OSM API specification with:
- **15 API endpoints** covering authentication, member management, events, etc.
- **Base URL**: `https://www.onlinescoutmanager.co.uk/ext`
- **OpenAPI 3.0 format** with full request/response schemas

### Updating the API Specification
To update the API documentation:
1. Replace `api_spec.json` with new OpenAPI specification
2. Restart the application (`npm start`)
3. Changes will be reflected in both `/api-docs` and `/swagger.json` endpoints