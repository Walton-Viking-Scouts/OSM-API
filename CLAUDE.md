# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js project that serves OpenAPI documentation for the Online Scout Manager (OSM) API. The application hosts a Swagger UI interface with OAuth authentication capabilities, allowing users to test API endpoints with real OAuth credentials.

## Architecture

- **Server**: Express.js server (`server.js`) that serves Swagger UI
- **Documentation**: OpenAPI 3.0 specification stored in `api_spec.json`
- **Deployment**: Configured for Render.com via `render.yaml`

## Development Commands

### Running the Application
```bash
npm start          # Start the server (production)
npm run dev        # Start the server (development - same as start)
```

### Development Setup
```bash
npm install        # Install dependencies
```


## Key Files

- `server.js` - Main Express server with Swagger UI setup and OAuth configuration
- `api_spec.json` - OpenAPI 3.0 specification file
- `render.yaml` - Render.com deployment configuration

## Server Configuration

The server runs on port 3000 by default (configurable via PORT environment variable). It includes:
- OAuth credential input form in the Swagger UI
- CORS support for API testing
- Custom styling for improved UX
- Debug routes at `/debug` and `/health`

## OAuth Integration

The application provides a custom OAuth configuration interface that:
- Allows users to input OAuth credentials directly in the browser
- Configures Swagger UI with OAuth 2.0 authentication
- Supports both Authorization Code and Client Credentials flows
- Targets OSM API endpoints at `https://www.onlinescoutmanager.co.uk/ext`


## Deployment

Configured for Render.com with:
- Automatic builds on git push
- Node.js environment
- Production environment variables
- Port configuration from Render