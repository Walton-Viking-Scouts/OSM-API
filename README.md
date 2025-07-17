# Online Scout Manager API Documentation

This repository contains the OpenAPI 3.0 specification for the Online Scout Manager (OSM) API.

## Files

- `osm-api-swagger.yaml` - The main OpenAPI specification file
- Contains sanitized example data for public consumption

## API Overview

The OSM API provides endpoints for:
- User authentication
- Member management
- Programme activities
- Event management
- Badge tracking
- Scout group administration

## Base URL

```
https://www.onlinescoutmanager.co.uk/ext
```

## Authentication

This API uses **OAuth 2.0** for authorization. OAuth is a standard mechanism that allows users to enter their password in one system without having to give it to third party software.

### Getting Started

1. **Download an OAuth client library** for your programming language
2. Follow the library's documentation using the URLs and flows below

### OAuth Flows

- **Authorization Code Flow**: Use if your application will be used by other people
- **Client Credentials Flow**: Use if you are the only user (uses the user account that created the application)

### OAuth URLs

| Purpose | URL | Description |
|---------|-----|-------------|
| **Authorization** | `https://www.onlinescoutmanager.co.uk/oauth/authorize` | For authorization code flow - users click this link to log in and authorize your app |
| **Access Token** | `https://www.onlinescoutmanager.co.uk/oauth/token` | Exchange authorization code for access token and refresh token |
| **Resource Owner** | `https://www.onlinescoutmanager.co.uk/oauth/resource` | Get user's full name, email, and accessible sections |

### Implementation Steps

1. **Authorization Code Flow**:
   - Direct users to the authorization URL
   - After login, OSM redirects to your specified Redirect URL
   - Exchange the authorization code for tokens using the token URL
   - Store access token and refresh token in your database

2. **Client Credentials Flow**:
   - Direct token request to the token URL with client credentials
   - Store the returned access token

3. **Access User Information**:
   - Use the resource owner URL to get user details and permissions

## Using the API

The OSM API is unsupported and undocumented, but your application can perform any action that you can do on the website since your browser uses the same API.

### Discovery Method

1. **Use your browser's developer console** to watch network requests when performing actions you want to automate
2. **Pay attention to request methods** - note whether requests are GET or POST
3. **Use your OAuth client library** to create authenticated requests to the discovered URLs
4. **Authentication header** - Your OAuth library will set a 'Bearer token' in the authorization header

### Rate Limits

Monitor these standard rate limit headers to prevent your application from being blocked:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Number of requests per hour per authenticated user |
| `X-RateLimit-Remaining` | Remaining requests before being blocked |
| `X-RateLimit-Reset` | Seconds until rate limit resets |

- **HTTP 429 status** will be sent if you exceed the limit
- **Retry-After header** indicates seconds until you can use the API again
- **Implement your own rate limits**, especially for unauthenticated user actions

### Best Practices

#### Response Handling
- **Always check responses** and abort if they're not as expected
- **Invalid requests** will result in your application being blocked

#### Monitor Headers
- **`X-Deprecated`** - Features with this header will be removed after the specified date
- **`X-Blocked`** - Your application has been blocked due to invalid data or unauthorized access
- **Continuing after being blocked** will result in a permanent block

#### Data Validation
- **Sanitize and validate** all input data before sending to OSM
- **Invalid data** will result in your application being blocked
- **Verify users are not bots** if allowing unauthenticated access

## Usage

You can use this specification with:
- Swagger UI
- Postman
- OpenAPI generators
- Any OpenAPI-compatible tool

## Live Demo

🚀 **Try it live at: [Your Render.com URL]**

### How to Use the Live Demo

1. **Visit the deployment URL** (will be available after deployment)
2. **Get OAuth credentials** from [OSM](https://www.onlinescoutmanager.co.uk)
3. **Enter your credentials** in the OAuth Configuration form
4. **Click "Configure OAuth & Authorize"**
5. **Use the "Authorize" button** in Swagger UI to get your access token
6. **Test the API endpoints** with real OAuth authentication

## Local Development

### Prerequisites
- Node.js 16+ 
- npm

### Setup
```bash
git clone <your-repo-url>
cd OSM-API
npm install
npm start
```

Visit `http://localhost:3000/api-docs`

### Deployment to Render.com

1. **Connect your GitHub repo** to Render.com
2. **Create a new Web Service**
3. **Use the included `render.yaml`** for automatic configuration
4. **Deploy** - Render will automatically build and deploy

## Note

This specification was generated from API traffic analysis and contains representative example data. All sensitive information has been sanitized for public use.