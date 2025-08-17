import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { NewProjectSchema, GitHubRepoSchema } from "@/shared/types";
import {
  authMiddleware,
  getOAuthRedirectUrl,
  exchangeCodeForSessionToken,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { setCookie, getCookie } from "hono/cookie";
import OpenAI from "openai";

const app = new Hono<{ Bindings: Env }>();

// OAuth endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  try {
    const sessionToken = await exchangeCodeForSessionToken(body.code, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Error exchanging code for session token:", error);
    return c.json({ error: "Authentication failed" }, 400);
  }
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    try {
      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Get all projects for a user
app.get("/api/projects", authMiddleware, async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    const projects = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(userId).all();

    return c.json(projects.results || []);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return c.json({ error: "Failed to fetch projects" }, 500);
  }
});

// Get a specific project
app.get("/api/projects/:id", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Also fetch related data
    const prototype = await c.env.DB.prepare(
      "SELECT * FROM prototypes WHERE project_id = ?"
    ).bind(projectId).first();

    const landingPage = await c.env.DB.prepare(
      "SELECT * FROM landing_pages WHERE project_id = ?"
    ).bind(projectId).first();

    const campaign = await c.env.DB.prepare(
      "SELECT * FROM campaigns WHERE project_id = ?"
    ).bind(projectId).first();

    const analytics = await c.env.DB.prepare(
      "SELECT * FROM analytics WHERE project_id = ?"
    ).bind(projectId).first();

    return c.json({
      project,
      prototype,
      landingPage,
      campaign,
      analytics
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return c.json({ error: "Failed to fetch project" }, 500);
  }
});

// Create a new project
app.post("/api/projects", authMiddleware, zValidator("json", NewProjectSchema), async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  const data = c.req.valid("json");
  
  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO projects (user_id, idea_description, target_audience, price_point, business_model, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `).bind(
      userId,
      data.ideaDescription,
      data.targetAudience,
      data.pricePoint,
      data.businessModel
    ).run();

    if (!result.success) {
      return c.json({ error: "Failed to create project" }, 500);
    }

    const newProject = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return c.json(newProject, 201);
  } catch (error) {
    console.error("Error creating project:", error);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

// Generate prototype for a project
app.post("/api/projects/:id/generate-prototype", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // First verify the project exists and belongs to the user
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Use OpenAI to generate enhanced prototype content
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const businessModel = project.business_model;
    const ideaDescription = project.idea_description;
    const targetAudience = project.target_audience;
    const pricePoint = project.price_point;
    
    // Generate AI-powered content using structured outputs
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert product marketing strategist. Generate compelling marketing content for a ${businessModel} business targeting ${targetAudience} with a price point of $${pricePoint}. Create professional, conversion-focused copy that highlights value propositions and addresses customer pain points.`
        },
        {
          role: 'user',
          content: `Create marketing content for this business idea: ${ideaDescription}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_marketing_content',
            description: 'Generate comprehensive marketing content for a business idea',
            parameters: {
              type: 'object',
              properties: {
                heroCopy: {
                  type: 'string',
                  description: 'Compelling hero headline and subheading (2-3 sentences)'
                },
                features: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of 4-6 key features or benefits',
                  maxItems: 6
                },
                pricingCopy: {
                  type: 'string',
                  description: 'Pricing description that emphasizes value'
                },
                valuePropositions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of 3-4 unique value propositions',
                  maxItems: 4
                }
              },
              required: ['heroCopy', 'features', 'pricingCopy', 'valuePropositions'],
              additionalProperties: false
            },
            strict: true
          }
        }
      ]
    });

    let heroCopy = "";
    let features: string[] = [];
    let pricing = "";
    let valueProps: string[] = [];

    // Extract AI-generated content
    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (toolCall && 'function' in toolCall && toolCall.function.name === 'generate_marketing_content') {
      const content = JSON.parse(toolCall.function.arguments);
      heroCopy = content.heroCopy;
      features = content.features;
      pricing = content.pricingCopy;
      valueProps = content.valuePropositions;
    } else {
      // Fallback to template-based generation if AI fails
      switch (businessModel) {
        case "saas":
          heroCopy = `Transform your workflow with our innovative SaaS solution. ${ideaDescription}`;
          features = ["Cloud-based platform", "Real-time collaboration", "Advanced analytics", "API integration"];
          pricing = "Starting at $29/month";
          break;
        case "service":
          heroCopy = `Professional services that deliver results. ${ideaDescription}`;
          features = ["Expert consultation", "Custom solutions", "24/7 support", "Proven methodology"];
          pricing = "Starting at $99/hour";
          break;
        case "product":
          heroCopy = `Discover the product that changes everything. ${ideaDescription}`;
          features = ["Premium quality", "Fast shipping", "Money-back guarantee", "Customer support"];
          pricing = `Starting at $${pricePoint || 49}`;
          break;
        case "course":
          heroCopy = `Master new skills with our comprehensive course. ${ideaDescription}`;
          features = ["Video lessons", "Practical exercises", "Community access", "Lifetime updates"];
          pricing = `One-time payment of $${pricePoint || 199}`;
          break;
        default:
          heroCopy = `Innovative solution for your needs. ${ideaDescription}`;
          features = ["Feature 1", "Feature 2", "Feature 3", "Feature 4"];
          pricing = "Contact for pricing";
      }
      valueProps = ["Unique benefit 1", "Unique benefit 2", "Unique benefit 3"];
    }

    // Insert prototype into database
    const prototypeResult = await c.env.DB.prepare(`
      INSERT INTO prototypes (project_id, hero_copy, features_json, pricing_structure, wireframe_data)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      projectId,
      heroCopy,
      JSON.stringify(features),
      pricing,
      JSON.stringify({ valuePropositions: valueProps })
    ).run();

    if (!prototypeResult.success) {
      return c.json({ error: "Failed to create prototype" }, 500);
    }

    // Update project status
    await c.env.DB.prepare(
      "UPDATE projects SET status = 'prototype_generated', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(projectId).run();

    const prototype = await c.env.DB.prepare(
      "SELECT * FROM prototypes WHERE id = ?"
    ).bind(prototypeResult.meta.last_row_id).first();

    return c.json(prototype, 201);
  } catch (error) {
    console.error("Error generating prototype:", error);
    return c.json({ error: "Failed to generate prototype" }, 500);
  }
});

// GitHub OAuth endpoints
app.get('/api/github/auth', authMiddleware, async (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = `${new URL(c.req.url).origin}/api/github/callback`;
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user:email`;
  
  return c.json({ authUrl: githubAuthUrl });
});

app.get('/api/github/callback', authMiddleware, async (c) => {
  const code = c.req.query('code');
  const user = c.get("user");
  const userId = user?.id;
  
  if (!code) {
    return c.json({ error: 'No authorization code provided' }, 400);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: c.env.GITHUB_CLIENT_ID,
        client_secret: c.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as any;
    
    if (tokenData.error) {
      return c.json({ error: 'Failed to get access token' }, 400);
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const githubUser = await userResponse.json() as any;

    // Store GitHub info in database
    await c.env.DB.prepare(`
      UPDATE users 
      SET github_username = ?, github_access_token = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(githubUser.login, tokenData.access_token, userId).run();

    return c.json({ 
      success: true, 
      username: githubUser.login,
      message: 'GitHub account connected successfully' 
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return c.json({ error: 'Failed to connect GitHub account' }, 500);
  }
});

// Get GitHub connection status
app.get('/api/github/status', authMiddleware, async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    const userWithGithub = await c.env.DB.prepare(
      "SELECT github_username, github_access_token FROM users WHERE id = ?"
    ).bind(userId).first();

    const isConnected = !!(userWithGithub?.github_username && userWithGithub?.github_access_token);
    
    return c.json({
      connected: isConnected,
      username: userWithGithub?.github_username || null,
    });
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    return c.json({ error: 'Failed to check GitHub status' }, 500);
  }
});

// Create GitHub repository for a project
app.post('/api/projects/:id/github-repo', authMiddleware, zValidator("json", GitHubRepoSchema), async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  const repoData = c.req.valid("json");
  
  try {
    // Get user's GitHub access token
    const userWithGithub = await c.env.DB.prepare(
      "SELECT github_username, github_access_token FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!userWithGithub?.github_access_token) {
      return c.json({ error: 'GitHub account not connected' }, 400);
    }

    // Verify project belongs to user
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Create repository on GitHub
    const repoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userWithGithub.github_access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoData.name,
        description: repoData.description || `MVP validation project: ${project.idea_description}`,
        private: repoData.private,
        auto_init: true,
        gitignore_template: 'Node',
        license_template: 'mit',
      }),
    });

    if (!repoResponse.ok) {
      const errorData = await repoResponse.json() as any;
      return c.json({ error: errorData.message || 'Failed to create repository' }, 400);
    }

    const repo = await repoResponse.json() as any;

    // Update project with GitHub repo info
    await c.env.DB.prepare(`
      UPDATE projects 
      SET github_repo_url = ?, github_repo_name = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(repo.html_url, repo.full_name, projectId).run();

    // Create initial project structure in the repository
    await createInitialProjectStructure(repo.full_name, userWithGithub.github_access_token, project);

    return c.json({
      repoUrl: repo.html_url,
      repoName: repo.full_name,
      message: 'Repository created successfully',
    });
  } catch (error) {
    console.error('Error creating GitHub repository:', error);
    return c.json({ error: 'Failed to create repository' }, 500);
  }
});

// Disconnect GitHub account
app.delete('/api/github/disconnect', authMiddleware, async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    await c.env.DB.prepare(`
      UPDATE users 
      SET github_username = NULL, github_access_token = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(userId).run();

    return c.json({ success: true, message: 'GitHub account disconnected' });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    return c.json({ error: 'Failed to disconnect GitHub account' }, 500);
  }
});

// Helper function to create initial project structure
async function createInitialProjectStructure(repoName: string, accessToken: string, project: any) {
  const files = [
    {
      path: 'README.md',
      content: `# ${project.idea_description}\n\n## Project Overview\n\n**Business Model:** ${project.business_model}\n**Target Audience:** ${project.target_audience}\n**Price Point:** $${project.price_point}\n\n## MVP Validation\n\nThis repository contains the MVP validation project created through MVP Validator.\n\n## Getting Started\n\n1. Clone this repository\n2. Review the project documentation\n3. Start building your MVP\n\n## Next Steps\n\n- [ ] Set up development environment\n- [ ] Create basic project structure\n- [ ] Implement core features\n- [ ] Deploy and test\n\nGenerated by [MVP Validator](https://mvp-validator.com)`
    },
    {
      path: 'docs/project-brief.md',
      content: `# Project Brief\n\n## Idea Description\n${project.idea_description}\n\n## Target Audience\n${project.target_audience}\n\n## Business Model\n${project.business_model}\n\n## Price Point\n$${project.price_point}\n\n## Status\n${project.status}\n\n## Created\n${project.created_at}`
    },
    {
      path: '.gitignore',
      content: `# Dependencies\nnode_modules/\n\n# Environment variables\n.env\n.env.local\n\n# Build output\ndist/\nbuild/\n\n# IDE\n.vscode/\n.idea/\n\n# OS\n.DS_Store\nThumbs.db`
    }
  ];

  for (const file of files) {
    try {
      await fetch(`https://api.github.com/repos/${repoName}/contents/${file.path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add ${file.path}`,
          content: btoa(file.content),
        }),
      });
    } catch (error) {
      console.error(`Error creating file ${file.path}:`, error);
    }
  }
}

export default app;
