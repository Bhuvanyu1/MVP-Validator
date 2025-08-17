# MVP Validator

Transform business ideas into validated market opportunities within 7 days using AI-powered prototypes, landing pages, and market demand analysis.

## ✨ Features

- **AI-Powered Prototypes**: Generate compelling marketing copy, features, and pricing structures using OpenAI
- **User Authentication**: Secure Google OAuth integration via Mocha's authentication service
- **GitHub Integration**: Automatically create repositories for validated projects
- **Project Management**: Track validation progress from idea to completion
- **Beautiful UI**: Modern, responsive design with Tailwind CSS and gradients
- **Real-time Updates**: Live status tracking and progress indicators

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React icons
- **Backend**: Hono (Cloudflare Workers), TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Mocha Users Service with Google OAuth
- **AI**: OpenAI GPT-4o for prototype generation
- **Deployment**: Cloudflare Workers + Pages
- **Version Control**: GitHub integration with automatic repo creation

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Cloudflare account
- Google OAuth credentials
- GitHub OAuth app
- OpenAI API key

### Environment Variables

Create these secrets in your Cloudflare Workers environment:

```env
MOCHA_USERS_SERVICE_API_URL=your_mocha_api_url
MOCHA_USERS_SERVICE_API_KEY=your_mocha_api_key
OPENAI_API_KEY=your_openai_api_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mvp-validator.git
cd mvp-validator
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx wrangler d1 create mvp-validator-db
```

4. Run migrations:
```bash
npx wrangler d1 migrations apply mvp-validator-db
```

5. Start development server:
```bash
npm run dev
```

## 📊 Database Schema

The application uses the following database tables:

- **users**: User profiles and GitHub integration
- **projects**: MVP validation projects
- **prototypes**: AI-generated marketing content
- **landing_pages**: Deployed landing page data
- **campaigns**: Marketing campaign tracking
- **analytics**: Validation metrics and scores

## 🎯 How It Works

1. **Submit Idea**: Users describe their business idea, target audience, and pricing
2. **AI Generation**: OpenAI creates compelling marketing copy and feature lists
3. **GitHub Integration**: Automatically creates repositories with project documentation
4. **Landing Pages**: Deploy validation landing pages (coming soon)
5. **Campaign Management**: Run targeted marketing campaigns (coming soon)
6. **Analytics**: Track metrics and generate demand scores (coming soon)

## 🔧 API Endpoints

### Authentication
- `GET /api/oauth/google/redirect_url` - Get Google OAuth URL
- `POST /api/sessions` - Exchange code for session token
- `GET /api/users/me` - Get current user
- `GET /api/logout` - Logout user

### Projects
- `GET /api/projects` - List user projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project
- `POST /api/projects/:id/generate-prototype` - Generate AI prototype

### GitHub Integration
- `GET /api/github/auth` - Initiate GitHub OAuth
- `GET /api/github/callback` - Handle GitHub OAuth callback
- `GET /api/github/status` - Check GitHub connection status
- `POST /api/projects/:id/github-repo` - Create repository for project
- `DELETE /api/github/disconnect` - Disconnect GitHub account

## 🎨 Design Philosophy

MVP Validator creates beautiful apps that users fall in love with at first sight. The design emphasizes:

- **Premium Feel**: High-quality gradients, shadows, and animations
- **Trust & Credibility**: Clean layouts and professional typography
- **Mobile-First**: Responsive design that works everywhere
- **Performance**: Fast loading and smooth interactions

## 🚀 Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to Cloudflare:
```bash
npx wrangler deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Live Demo](https://mvp-validator.com)
- [Documentation](https://docs.mvp-validator.com)
- [API Reference](https://api.mvp-validator.com/docs)

## 📧 Support

For support, email support@mvp-validator.com or create an issue on GitHub.

---

Built with ❤️ using Mocha, Cloudflare, and OpenAI
