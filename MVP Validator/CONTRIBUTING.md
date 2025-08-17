# Contributing to MVP Validator

Thank you for your interest in contributing to MVP Validator! This document provides guidelines and information for contributors.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Set up your development environment (see README.md)
5. Create a new branch for your feature: `git checkout -b feature/your-feature-name`

## 📋 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code style and formatting
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep functions small and focused

### React Components

- Use functional components with hooks
- Extract reusable UI patterns into separate components
- Keep components under 100 lines when possible
- Use proper TypeScript types for all props
- Follow the established folder structure:
  - `/src/react-app/components` - Reusable UI components
  - `/src/react-app/pages` - Page-level components
  - `/src/react-app/hooks` - Custom React hooks

### Backend Development

- Use Hono for API routes
- Validate all inputs with Zod schemas
- Handle errors gracefully with proper status codes
- Use the authMiddleware for protected endpoints
- Keep database operations simple (avoid complex queries)

### Database Guidelines

- Use migrations for all schema changes
- Avoid foreign key constraints, unique constraints, and triggers
- Keep validation logic in the application layer
- Use proper column naming conventions:
  - `id` - Primary key (autoincrement integer)
  - `created_at` - Timestamp columns
  - `is_` or `has_` - Boolean columns
  - `_date` - Date columns

### UI/UX Guidelines

- Follow the established design system
- Use Tailwind CSS classes consistently
- Implement smooth animations and transitions
- Ensure mobile responsiveness
- Use Lucide React for icons
- Maintain the premium, trustworthy feel

## 🧪 Testing

- Test your changes locally before submitting
- Ensure the build passes: `npm run build`
- Check for TypeScript errors: `npx tsc --noEmit`
- Test API endpoints with curl or Postman
- Verify database migrations work correctly

## 📝 Pull Request Process

1. Update documentation if needed
2. Add or update tests for new functionality
3. Ensure your code follows the style guidelines
4. Write a clear pull request description
5. Link any related issues
6. Request review from maintainers

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] All tests pass

## Screenshots (if applicable)
Include screenshots for UI changes
```

## 🐛 Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, OS, etc.)
- Screenshots or console logs if applicable

## 💡 Feature Requests

For feature requests:

- Explain the use case and problem it solves
- Describe the proposed solution
- Consider alternative approaches
- Include mockups or examples if helpful

## 🔧 Development Setup

### Environment Variables

You'll need these environment variables for local development:

```env
MOCHA_USERS_SERVICE_API_URL=your_api_url
MOCHA_USERS_SERVICE_API_KEY=your_api_key
OPENAI_API_KEY=your_openai_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret
```

### Local Database

For local development, you can use a local SQLite database:

```bash
# Create local database
npx wrangler d1 create mvp-validator-local --local

# Run migrations
npx wrangler d1 migrations apply mvp-validator-local --local
```

## 📚 Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤔 Questions?

If you have questions about contributing:

1. Check existing issues and discussions
2. Create a new issue with the "question" label
3. Join our community Discord (coming soon)
4. Email the maintainers

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to MVP Validator! 🚀
