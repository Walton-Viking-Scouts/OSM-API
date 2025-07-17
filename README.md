# OSM API Documentation

A clean, modern OpenAPI/Swagger documentation server built with Express.js, EJS, and Tailwind CSS.

## Features

- 🚀 **Modern UI**: Clean interface built with Tailwind CSS
- 📚 **Interactive Docs**: Full Swagger UI integration
- 📄 **Raw Spec Access**: Direct access to OpenAPI specification
- 🎨 **Responsive Design**: Works on all devices
- ⚡ **Fast Deployment**: Ready for Render.com deployment
- 🔧 **Health Checks**: Built-in health endpoint for monitoring

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd osm-api-swagger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Home: http://localhost:3000
   - API Docs: http://localhost:3000/api-docs
   - Raw Spec: http://localhost:3000/swagger.json

### Production Build

```bash
npm start
```

## Project Structure

```
├── app.js                 # Main Express application
├── package.json          # Dependencies and scripts
├── swagger.json          # OpenAPI specification
├── views/                # EJS templates
│   ├── layout.ejs        # Main layout template
│   ├── index.ejs         # Home page
│   └── 404.ejs           # 404 error page
├── public/               # Static assets
│   ├── css/
│   │   └── style.css     # Custom CSS
│   └── js/               # JavaScript files
└── README.md            # This file
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Home page with API information |
| `/api-docs` | Interactive Swagger UI documentation |
| `/swagger.json` | Raw OpenAPI specification |
| `/health` | Health check endpoint |

## Deployment

### Render.com Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create new Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

3. **Configure the service**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - **Node Version**: `18` or higher

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your app

### Environment Variables

No environment variables are required for basic operation. The app will run on:
- `PORT`: Automatically set by Render (default: 3000)

## Customization

### Updating the OpenAPI Spec

Replace the `swagger.json` file with your OpenAPI specification and restart the server.

### Styling

- **Tailwind CSS**: Utility-first CSS framework (loaded via CDN)
- **Custom CSS**: Add styles to `public/css/style.css`
- **Swagger UI**: Customize in `app.js` under `swaggerUi.setup()` options

### Templates

Edit EJS templates in the `views/` directory:
- `layout.ejs`: Main layout with navigation
- `index.ejs`: Home page content
- `404.ejs`: Error page

## Development

### Scripts

- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon

### Adding Features

1. **New routes**: Add to `app.js`
2. **New pages**: Create EJS templates in `views/`
3. **Static assets**: Add to `public/`

## Health Check

The `/health` endpoint returns:
```json
{
  "status": "OK",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the [GitHub Issues](link-to-issues)
2. Review the [Render.com docs](https://render.com/docs)
3. OpenAPI/Swagger documentation: [OpenAPI Specification](https://swagger.io/specification/)

---

Built with ❤️ using Express.js, EJS, and Tailwind CSS