# Deployment Guide

This guide covers deploying MVP Validator to Cloudflare Workers and Pages.

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed and authenticated
- Domain configured in Cloudflare (optional)

## Database Setup

1. Create a D1 database:
```bash
npx wrangler d1 create mvp-validator-prod
```

2. Update `wrangler.jsonc` with your database ID:
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mvp-validator-prod",
      "database_id": "your-database-id-here"
    }
  ]
}
```

3. Run migrations:
```bash
npx wrangler d1 migrations apply mvp-validator-prod
```

## Environment Variables

Set up secrets in Cloudflare Workers:

```bash
# Authentication
npx wrangler secret put MOCHA_USERS_SERVICE_API_URL
npx wrangler secret put MOCHA_USERS_SERVICE_API_KEY

# AI Integration
npx wrangler secret put OPENAI_API_KEY

# GitHub Integration
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

## OAuth Configuration

### Google OAuth (via Mocha)
1. Contact Mocha support to configure your domain
2. Add your production domain to allowed redirect URLs

### GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth app with:
   - Application name: "MVP Validator"
   - Homepage URL: "https://your-domain.com"
   - Authorization callback URL: "https://your-domain.com/api/github/callback"
3. Copy the Client ID and Client Secret to your Cloudflare secrets

## Build and Deploy

1. Build the application:
```bash
npm run build
```

2. Deploy to Cloudflare:
```bash
npx wrangler deploy
```

3. Verify deployment:
```bash
curl https://your-worker.your-subdomain.workers.dev/api/projects
```

## Custom Domain (Optional)

1. Add your domain to Cloudflare
2. Configure Workers route:
```bash
npx wrangler route add "your-domain.com/*" your-worker-name
```

3. Update OAuth redirect URLs to use your custom domain

## Post-Deployment Checklist

- [ ] Database migrations applied successfully
- [ ] All environment variables configured
- [ ] OAuth redirects working
- [ ] GitHub integration functional
- [ ] AI prototype generation working
- [ ] SSL certificate valid
- [ ] Performance monitoring enabled

## Monitoring

### Error Tracking
Monitor errors in the Cloudflare dashboard:
1. Go to Workers & Pages > your-worker > Logs
2. Set up log forwarding for external monitoring

### Performance
- Monitor request latency and success rates
- Set up alerts for high error rates
- Track database query performance

### Analytics
- Use Cloudflare Analytics for traffic insights
- Monitor API endpoint usage
- Track user authentication flows

## Scaling Considerations

### Database
- D1 can handle thousands of requests per second
- Consider read replicas for high-read workloads
- Monitor database size limits

### Workers
- Cloudflare Workers auto-scale globally
- Monitor CPU time and memory usage
- Consider Durable Objects for stateful operations

### AI Costs
- Monitor OpenAI API usage and costs
- Implement rate limiting for expensive operations
- Consider caching AI responses

## Troubleshooting

### Common Issues

**Authentication fails:**
- Check OAuth redirect URLs
- Verify environment variables
- Check Mocha service status

**Database errors:**
- Verify migrations applied
- Check database binding in wrangler.jsonc
- Monitor D1 dashboard for errors

**GitHub integration fails:**
- Verify OAuth app configuration
- Check GitHub API rate limits
- Validate repository permissions

**AI generation fails:**
- Check OpenAI API key validity
- Monitor API quotas and billing
- Verify request format and parameters

### Support

For deployment issues:
1. Check Cloudflare Workers logs
2. Review GitHub Issues
3. Contact support@mvp-validator.com

---

Happy deploying! 🚀
