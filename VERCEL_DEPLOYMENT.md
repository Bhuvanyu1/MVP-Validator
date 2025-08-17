# MVP Validator - Vercel Deployment Guide

## 🚀 Overview

This guide covers deploying the MVP Validator platform on Vercel with a hybrid architecture:
- **Frontend**: React app deployed on Vercel
- **Backend**: Cloudflare Workers (separate deployment)
- **Database**: Cloudflare D1 (SQLite)
- **Monitoring**: Integrated production readiness features

## 📋 Prerequisites

Before deploying, ensure you have:
- [Vercel CLI](https://vercel.com/cli) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed
- GitHub repository with your code
- Vercel account
- Cloudflare account

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel        │    │  Cloudflare      │    │  External APIs  │
│   (Frontend)    │────│  Workers         │────│  (OpenAI, etc.) │
│   React App     │    │  (Backend API)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────────────────┐
                       │  Cloudflare D1   │
                       │  (Database)      │
                       └──────────────────┘
```

## 🔧 Step 1: Deploy Backend (Cloudflare Workers)

### 1.1 Configure Wrangler

First, authenticate with Cloudflare:
```bash
wrangler login
```

### 1.2 Update wrangler.jsonc

Ensure your `wrangler.jsonc` is configured:
```json
{
  "name": "mvp-validator-worker",
  "main": "src/worker/index.ts",
  "compatibility_date": "2024-01-01",
  "node_compat": true,
  "vars": {
    "ENVIRONMENT": "production"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mvp-validator-db",
      "database_id": "your-database-id"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "your-kv-namespace-id",
      "preview_id": "your-preview-kv-namespace-id"
    }
  ]
}
```

### 1.3 Create D1 Database

```bash
# Create the database
wrangler d1 create mvp-validator-db

# Run migrations
wrangler d1 migrations apply mvp-validator-db --local
wrangler d1 migrations apply mvp-validator-db --remote
```

### 1.4 Set Environment Variables

```bash
# Set production secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put GOOGLE_ADS_DEVELOPER_TOKEN
wrangler secret put GA4_PRIVATE_KEY
wrangler secret put SENTRY_DSN
wrangler secret put MOCHA_USERS_SERVICE_API_KEY

# Set regular environment variables
wrangler secret put ENVIRONMENT --value "production"
wrangler secret put FROM_EMAIL --value "noreply@yourdomain.com"
```

### 1.5 Deploy Worker

```bash
# Deploy to production
wrangler deploy

# Note the deployed URL (e.g., https://mvp-validator-worker.your-subdomain.workers.dev)
```

## 🌐 Step 2: Deploy Frontend (Vercel)

### 2.1 Update Build Configuration

Update `package.json` scripts:
```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "build:vercel": "npm run build",
    "dev": "vite",
    "preview": "vite preview"
  }
}
```

### 2.2 Configure Environment Variables

Create a `.env.production` file (don't commit this):
```bash
# Frontend Environment Variables
VITE_API_BASE_URL=https://mvp-validator-worker.your-subdomain.workers.dev
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_ENVIRONMENT=production
VITE_SENTRY_DSN=https://...
```

### 2.3 Update Vercel Configuration

The `vercel.json` has been created with:
- Static build configuration
- API route proxying to Cloudflare Workers
- Security headers
- SPA routing support

### 2.4 Deploy to Vercel

#### Option A: GitHub Integration (Recommended)

1. **Connect Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build:vercel`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables**:
   ```
   VITE_API_BASE_URL = https://mvp-validator-worker.your-subdomain.workers.dev
   VITE_STRIPE_PUBLISHABLE_KEY = pk_live_...
   VITE_ENVIRONMENT = production
   ```

4. **Deploy**: Click "Deploy"

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add VITE_API_BASE_URL production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
vercel env add VITE_ENVIRONMENT production
```

## 🔗 Step 3: Connect Frontend and Backend

### 3.1 Update API Base URL

In your React app, ensure API calls point to your Cloudflare Worker:

```typescript
// src/config/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

export const apiClient = {
  baseURL: API_BASE_URL,
  // ... rest of your API client configuration
};
```

### 3.2 Configure CORS (if needed)

In your Cloudflare Worker (`src/worker/index.ts`), add CORS headers:

```typescript
// Add CORS middleware
app.use('*', async (c, next) => {
  // Set CORS headers
  c.res.headers.set('Access-Control-Allow-Origin', 'https://your-vercel-app.vercel.app');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 200);
  }
  
  await next();
});
```

## 🔒 Step 4: Configure Custom Domain (Optional)

### 4.1 Vercel Custom Domain

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain (e.g., `app.yourdomain.com`)
4. Configure DNS records as instructed

### 4.2 Cloudflare Workers Custom Domain

1. In Cloudflare Dashboard, go to Workers & Pages
2. Select your worker
3. Go to "Triggers" tab
4. Add custom domain (e.g., `api.yourdomain.com`)

### 4.3 Update Configuration

Update your environment variables:
```bash
VITE_API_BASE_URL=https://api.yourdomain.com
```

## 📊 Step 5: Production Monitoring Setup

### 5.1 Sentry Configuration

1. Create a Sentry project
2. Get your DSN
3. Add to both Vercel and Cloudflare Workers environment variables

### 5.2 Performance Monitoring

Access your monitoring dashboard at:
- `https://your-app.vercel.app/performance-monitor`

### 5.3 Health Checks

Set up monitoring for:
- `https://api.yourdomain.com/api/monitoring/health`
- `https://your-app.vercel.app`

## 🚀 Step 6: Deployment Checklist

### Pre-deployment
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Cloudflare Worker deployed and tested
- [ ] Frontend build successful
- [ ] API endpoints accessible
- [ ] CORS configured correctly

### Post-deployment
- [ ] Frontend loads correctly
- [ ] API calls work from frontend
- [ ] Authentication flow works
- [ ] Payment processing works (test mode first)
- [ ] Email notifications work
- [ ] Monitoring dashboard accessible
- [ ] Health checks passing

## 🔧 Troubleshooting

### Common Issues

**1. API calls failing from frontend**
- Check CORS configuration
- Verify API base URL is correct
- Check network tab in browser dev tools

**2. Environment variables not working**
- Ensure variables are prefixed with `VITE_` for frontend
- Redeploy after adding new environment variables
- Check Vercel/Cloudflare dashboard for variable values

**3. Database connection issues**
- Verify D1 database is created and bound
- Check wrangler.jsonc configuration
- Run migrations on remote database

**4. Build failures**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check build logs for specific errors

### Useful Commands

```bash
# Check Vercel deployment logs
vercel logs

# Check Cloudflare Worker logs
wrangler tail

# Test local development
npm run dev  # Frontend
wrangler dev # Backend

# Force redeploy
vercel --force
wrangler deploy --force
```

## 📈 Performance Optimization

### Frontend Optimization
- Enable Vercel Analytics
- Configure caching headers
- Optimize bundle size with code splitting
- Use Vercel Image Optimization

### Backend Optimization
- Enable Cloudflare Workers KV for caching
- Use D1 prepared statements
- Implement proper error handling
- Monitor performance metrics

## 🔐 Security Considerations

### Production Security
- Use HTTPS only
- Configure proper CORS
- Set security headers (already configured in vercel.json)
- Use environment variables for secrets
- Enable rate limiting
- Regular security audits

### Monitoring
- Set up error alerts
- Monitor API response times
- Track user authentication events
- Monitor database performance

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Vercel and Cloudflare documentation
3. Check deployment logs
4. Test in local development environment first

Your MVP Validator platform is now ready for production deployment on Vercel with Cloudflare Workers! 🎉
