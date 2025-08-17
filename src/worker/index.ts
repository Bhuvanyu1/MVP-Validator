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
import { GoogleAdsService } from "./services/googleAds";
import { GA4AnalyticsService } from './services/ga4Analytics';
import { AdvancedAnalyticsService } from './services/advancedAnalytics';
import { ReportGenerationService } from './services/reportGeneration';
import { StripeService } from './services/stripe';
import { EmailNotificationService } from './services/emailNotifications';
import { ABTestingService } from './services/abTesting';
import { LandingPageDeploymentService } from "./services/landingPageDeployment";
import { DatabaseService } from './services/database';
import { CacheService } from './services/cache';
import { MonitoringService } from './services/monitoring';
import { SecurityService } from './services/security';

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

    // Send email notification
    try {
      const emailService = new EmailNotificationService({
        apiKey: c.env.RESEND_API_KEY,
        fromEmail: c.env.FROM_EMAIL || 'noreply@mvp-validator.com',
        fromName: 'MVP Validator'
      });

      await emailService.sendNotification({
        projectId,
        projectTitle: project.idea_description.substring(0, 50) + '...',
        userEmail: user.email,
        userName: user.name,
        eventType: 'prototype_generated',
        eventData: {
          features: features.length,
          pricing: pricing
        }
      });
    } catch (emailError) {
      console.error('Failed to send prototype notification:', emailError);
      // Don't fail the main operation if email fails
    }

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

// Generate landing page content using AI
app.post("/api/projects/:id/generate-landing-content", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  const { templateId } = await c.req.json();
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Get existing prototype data
    const prototype = await c.env.DB.prepare(
      "SELECT * FROM prototypes WHERE project_id = ?"
    ).bind(projectId).first();

    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const prompt = `Generate compelling landing page content for this business idea:

Business Model: ${project.business_model}
Idea: ${project.idea_description}
Target Audience: ${project.target_audience}
Price Point: $${project.price_point}
Template: ${templateId}

Generate:
1. A compelling hero subtitle (2-3 sentences)
2. A clear value proposition (3-4 sentences)
3. 3-5 key benefits/features
4. Social proof suggestions
5. FAQ items

Format as JSON with keys: heroSubtitle, valueProposition, benefits, socialProof, faqs`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = JSON.parse(completion.choices[0].message.content || '{}');
    
    return c.json(content);
  } catch (error) {
    console.error("Error generating landing content:", error);
    return c.json({ error: "Failed to generate landing content" }, 500);
  }
});

// Create and deploy landing page
app.post("/api/projects/:id/landing-page", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  const { templateId, content } = await c.req.json();
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Initialize deployment service
    const deploymentService = new LandingPageDeploymentService(c.env);
    
    // Generate GA4 tracking script if measurement ID is available
    let trackingScript = '';
    if (c.env.GA4_MEASUREMENT_ID) {
      trackingScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${c.env.GA4_MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${c.env.GA4_MEASUREMENT_ID}', {
    custom_map: {
      'custom_parameter_1': 'project_id'
    }
  });
  
  // Track MVP Validator specific events
  gtag('event', 'landing_page_view', {
    'project_id': '${projectId}',
    'custom_parameter_1': 'mvp_validator_landing'
  });
  
  // Track form submissions as conversions
  document.addEventListener('submit', function(e) {
    if (e.target.matches('form')) {
      gtag('event', 'conversion', {
        'project_id': '${projectId}',
        'conversion_type': 'form_submission',
        'custom_parameter_1': 'mvp_validator_conversion'
      });
    }
  });
  
  // Track button clicks
  document.addEventListener('click', function(e) {
    if (e.target.matches('button, .btn, .cta-button')) {
      gtag('event', 'user_engagement', {
        'project_id': '${projectId}',
        'engagement_type': 'button_click',
        'custom_parameter_1': 'mvp_validator_engagement'
      });
    }
  });
</script>`;
    }

    // Generate HTML content
    const template = { id: templateId, name: templateId, category: 'saas' };
    const htmlContent = deploymentService.generateHTML(template, content, trackingScript);
    
    // Deploy to Pages (simulated for now)
    const deployment = await deploymentService.deployToPages(projectId, htmlContent);
    
    if (!deployment.success) {
      return c.json({ error: "Failed to deploy landing page" }, 500);
    }

    // Create landing page record
    const landingPageResult = await c.env.DB.prepare(`
      INSERT INTO landing_pages (project_id, url, template_id, content_json, deployed_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      projectId,
      deployment.url,
      templateId,
      JSON.stringify(content)
    ).run();

    if (!landingPageResult.success) {
      return c.json({ error: "Failed to create landing page record" }, 500);
    }

    // Update project status
    await c.env.DB.prepare(
      "UPDATE projects SET status = 'campaign_launched', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(projectId).run();

    // Send email notification
    try {
      const emailService = new EmailNotificationService({
        apiKey: c.env.RESEND_API_KEY,
        fromEmail: c.env.FROM_EMAIL || 'noreply@mvp-validator.com',
        fromName: 'MVP Validator'
      });

      await emailService.sendNotification({
        projectId,
        projectTitle: project.idea_description.substring(0, 50) + '...',
        userEmail: user.email,
        userName: user.name,
        eventType: 'campaign_launched',
        eventData: {
          budget: budget,
          targetAudience: targetAudience,
          campaignId: googleAdsCampaignId
        }
      });
    } catch (emailError) {
      console.error('Failed to send campaign notification:', emailError);
      // Don't fail the main operation if email fails
    }

    return c.json({ success: true, campaignId: googleAdsCampaignId });

    // Get the created landing page
    const landingPage = await c.env.DB.prepare(
      "SELECT * FROM landing_pages WHERE id = ?"
    ).bind(landingPageResult.meta.last_row_id).first();

    return c.json({
      ...landingPage,
      message: "Landing page created successfully",
      previewUrl: deployment.url,
      trackingScript,
      hasAnalytics: !!c.env.GA4_MEASUREMENT_ID
    });
  } catch (error) {
    console.error("Error creating landing page:", error);
    return c.json({ error: "Failed to create landing page" }, 500);
  }
});

// Handle landing page contact form submissions
app.post("/api/landing-page/contact", async (c) => {
  const { name, email, message, projectId } = await c.req.json();
  
  try {
    // Store contact submission in database
    const contactResult = await c.env.DB.prepare(`
      INSERT INTO contact_submissions (project_id, name, email, message, submitted_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(projectId, name, email, message || '').run();

    if (!contactResult.success) {
      return c.json({ error: "Failed to save contact submission" }, 500);
    }

    // Track conversion event if GA4 is configured
    if (c.env.GA4_MEASUREMENT_ID) {
      const ga4Service = new GA4AnalyticsService(c.env);
      // Note: In a real implementation, you'd track this conversion
      console.log(`Contact form submission tracked for project ${projectId}`);
    }

    return c.json({ 
      success: true, 
      message: "Thank you for your interest! We'll be in touch soon." 
    });
  } catch (error) {
    console.error("Error handling contact form:", error);
    return c.json({ error: "Failed to process contact form" }, 500);
  }
});

// Save campaign settings
app.post("/api/projects/:id/campaign/settings", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  const { budget, platform, adCopy, targeting } = await c.req.json();
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Update or create campaign settings
    const campaignResult = await c.env.DB.prepare(`
      INSERT OR REPLACE INTO campaigns 
      (project_id, budget, platform, ad_copy, targeting, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      projectId, 
      budget, 
      platform, 
      JSON.stringify(adCopy), 
      JSON.stringify(targeting)
    ).run();

    if (!campaignResult.success) {
      return c.json({ error: "Failed to save campaign settings" }, 500);
    }

    // Get the updated campaign
    const campaign = await c.env.DB.prepare(
      "SELECT * FROM campaigns WHERE project_id = ?"
    ).bind(projectId).first();

    return c.json({
      ...campaign,
      adCopy: campaign.ad_copy ? JSON.parse(campaign.ad_copy) : null,
      targeting: campaign.targeting ? JSON.parse(campaign.targeting) : null,
      message: "Campaign settings saved successfully"
    });
  } catch (error) {
    console.error("Error saving campaign settings:", error);
    return c.json({ error: "Failed to save campaign settings" }, 500);
  }
});

// Billing Dashboard - Get user billing information
app.get("/api/billing/dashboard", authMiddleware, async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // Get user's subscription info
    const subscription = await c.env.DB.prepare(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due') ORDER BY created_at DESC LIMIT 1"
    ).bind(userId).first();

    // Get payment methods (simulated - in real app would call Stripe API)
    const paymentMethods = [];
    if (subscription) {
      paymentMethods.push({
        id: 'pm_1234567890',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025
        },
        isDefault: true
      });
    }

    // Get recent invoices/payments
    const payments = await c.env.DB.prepare(
      "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10"
    ).bind(userId).all();

    const invoices = payments.results.map((payment: any) => ({
      id: payment.stripe_payment_intent_id || payment.id,
      number: `INV-${payment.id.toString().padStart(6, '0')}`,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency || 'usd',
      created: payment.created_at,
      paidAt: payment.status === 'succeeded' ? payment.created_at : null,
      hostedInvoiceUrl: `#invoice-${payment.id}`,
      invoicePdf: `#invoice-${payment.id}.pdf`
    }));

    // Simulate upcoming invoice if subscription is active
    let upcomingInvoice = null;
    if (subscription && subscription.status === 'active') {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      
      upcomingInvoice = {
        id: 'upcoming',
        amount: 2999, // $29.99
        currency: 'usd',
        created: nextBillingDate.toISOString()
      };
    }

    return c.json({
      subscription: subscription ? {
        id: subscription.stripe_subscription_id || subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        plan: {
          id: 'mvp_validator_pro',
          name: 'MVP Validator Pro',
          amount: 2999,
          currency: 'usd',
          interval: 'month'
        }
      } : null,
      paymentMethods,
      invoices,
      upcomingInvoice
    });
  } catch (error) {
    console.error("Error fetching billing dashboard:", error);
    return c.json({ error: "Failed to fetch billing information" }, 500);
  }
});

// Cancel subscription
app.post("/api/billing/subscription/cancel", authMiddleware, async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // Update subscription to cancel at period end
    const result = await c.env.DB.prepare(
      "UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'active'"
    ).bind(userId).run();

    if (!result.success) {
      return c.json({ error: "Failed to cancel subscription" }, 500);
    }

    // In a real app, you would call Stripe API here:
    // await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

    return c.json({ success: true, message: "Subscription will be canceled at the end of the current period" });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return c.json({ error: "Failed to cancel subscription" }, 500);
  }
});

// Reactivate subscription
app.post("/api/billing/subscription/reactivate", authMiddleware, async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // Update subscription to not cancel at period end
    const result = await c.env.DB.prepare(
      "UPDATE subscriptions SET cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'active'"
    ).bind(userId).run();

    if (!result.success) {
      return c.json({ error: "Failed to reactivate subscription" }, 500);
    }

    // In a real app, you would call Stripe API here:
    // await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });

    return c.json({ success: true, message: "Subscription reactivated successfully" });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return c.json({ error: "Failed to reactivate subscription" }, 500);
  }
});

// Update payment method (redirect to Stripe Customer Portal)
app.post("/api/billing/payment-method/update", authMiddleware, async (c) => {
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // In a real app, you would create a Stripe Customer Portal session:
    // const session = await stripe.billingPortal.sessions.create({
    //   customer: user.stripe_customer_id,
    //   return_url: `${process.env.FRONTEND_URL}/billing`
    // });
    // return c.json({ url: session.url });

    // For now, simulate the portal URL
    const portalUrl = `https://billing.stripe.com/p/session/test_portal_${userId}`;
    
    return c.json({ 
      success: true, 
      url: portalUrl,
      message: "Redirecting to payment management portal" 
    });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return c.json({ error: "Failed to create billing portal session" }, 500);
  }
});

// GA4 Analytics Dashboard - Get comprehensive analytics data
app.get("/api/projects/:id/analytics/ga4", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  const timeRange = c.req.query("timeRange") || '24h';
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Get basic analytics data
    const analytics = await c.env.DB.prepare(
      "SELECT * FROM analytics WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(projectId).first();

    // Generate realistic GA4 analytics data based on time range
    const now = new Date();
    const getTimeRangeHours = (range: string) => {
      switch (range) {
        case '1h': return 1;
        case '24h': return 24;
        case '7d': return 168;
        case '30d': return 720;
        default: return 24;
      }
    };

    const hours = getTimeRangeHours(timeRange);
    const baseMultiplier = Math.max(1, hours / 24);
    
    // Simulate realistic metrics based on project maturity
    const projectAge = project.created_at ? 
      Math.floor((now.getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 1;
    const maturityMultiplier = Math.min(5, Math.max(0.1, projectAge / 10));
    
    const baseUsers = Math.floor((analytics?.page_views || 50) * maturityMultiplier);
    const activeUsers = Math.floor(baseUsers * 0.1 * (timeRange === '1h' ? 0.2 : 1));
    const pageViews = Math.floor(baseUsers * baseMultiplier * 1.3);
    const conversions = Math.floor(pageViews * 0.03); // 3% conversion rate
    const newUsers = Math.floor(activeUsers * 0.6);
    const avgSessionDuration = 120 + Math.floor(Math.random() * 180); // 2-5 minutes
    const bounceRate = 45 + Math.floor(Math.random() * 30); // 45-75%

    // Real-time metrics
    const realTimeMetrics = {
      activeUsers,
      pageViews,
      conversions,
      bounceRate,
      avgSessionDuration,
      newUsers
    };

    // Traffic sources with realistic distribution
    const trafficSources = [
      {
        source: 'Google',
        medium: 'organic',
        users: Math.floor(baseUsers * 0.4),
        sessions: Math.floor(baseUsers * 0.4 * 1.2),
        conversions: Math.floor(conversions * 0.5),
        percentage: 40
      },
      {
        source: 'Direct',
        medium: '(none)',
        users: Math.floor(baseUsers * 0.25),
        sessions: Math.floor(baseUsers * 0.25 * 1.1),
        conversions: Math.floor(conversions * 0.3),
        percentage: 25
      },
      {
        source: 'Facebook',
        medium: 'social',
        users: Math.floor(baseUsers * 0.2),
        sessions: Math.floor(baseUsers * 0.2 * 1.3),
        conversions: Math.floor(conversions * 0.15),
        percentage: 20
      },
      {
        source: 'Google Ads',
        medium: 'cpc',
        users: Math.floor(baseUsers * 0.15),
        sessions: Math.floor(baseUsers * 0.15 * 1.4),
        conversions: Math.floor(conversions * 0.05),
        percentage: 15
      }
    ];

    // Device categories
    const deviceCategories = [
      {
        category: 'mobile',
        users: Math.floor(baseUsers * 0.6),
        sessions: Math.floor(baseUsers * 0.6 * 1.2),
        percentage: 60
      },
      {
        category: 'desktop',
        users: Math.floor(baseUsers * 0.3),
        sessions: Math.floor(baseUsers * 0.3 * 1.1),
        percentage: 30
      },
      {
        category: 'tablet',
        users: Math.floor(baseUsers * 0.1),
        sessions: Math.floor(baseUsers * 0.1 * 1.3),
        percentage: 10
      }
    ];

    // Geographic data
    const geographicData = [
      {
        country: 'United States',
        users: Math.floor(baseUsers * 0.4),
        sessions: Math.floor(baseUsers * 0.4 * 1.2),
        conversions: Math.floor(conversions * 0.5)
      },
      {
        country: 'India',
        users: Math.floor(baseUsers * 0.2),
        sessions: Math.floor(baseUsers * 0.2 * 1.1),
        conversions: Math.floor(conversions * 0.2)
      },
      {
        country: 'United Kingdom',
        users: Math.floor(baseUsers * 0.15),
        sessions: Math.floor(baseUsers * 0.15 * 1.3),
        conversions: Math.floor(conversions * 0.15)
      },
      {
        country: 'Canada',
        users: Math.floor(baseUsers * 0.1),
        sessions: Math.floor(baseUsers * 0.1 * 1.2),
        conversions: Math.floor(conversions * 0.1)
      },
      {
        country: 'Germany',
        users: Math.floor(baseUsers * 0.08),
        sessions: Math.floor(baseUsers * 0.08 * 1.1),
        conversions: Math.floor(conversions * 0.05)
      }
    ];

    // Conversion goals
    const conversionGoals = [
      {
        name: 'Email Signup',
        completions: Math.floor(conversions * 0.7),
        conversionRate: 2.1,
        value: Math.floor(conversions * 0.7 * 5.50),
        trend: 'up' as const,
        change: 12.5
      },
      {
        name: 'Contact Form',
        completions: Math.floor(conversions * 0.2),
        conversionRate: 0.8,
        value: Math.floor(conversions * 0.2 * 25.00),
        trend: 'stable' as const,
        change: -1.2
      },
      {
        name: 'Demo Request',
        completions: Math.floor(conversions * 0.1),
        conversionRate: 0.3,
        value: Math.floor(conversions * 0.1 * 100.00),
        trend: 'down' as const,
        change: -8.3
      }
    ];

    // Time series data (simplified for now)
    const timeSeriesData = [];
    const dataPoints = Math.min(24, hours);
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)).toISOString();
      timeSeriesData.unshift({
        timestamp,
        users: Math.floor(baseUsers / dataPoints * (0.8 + Math.random() * 0.4)),
        pageViews: Math.floor(pageViews / dataPoints * (0.8 + Math.random() * 0.4)),
        conversions: Math.floor(conversions / dataPoints * (0.5 + Math.random() * 1.0))
      });
    }

    return c.json({
      realTimeMetrics,
      trafficSources,
      deviceCategories,
      geographicData,
      conversionGoals,
      timeSeriesData,
      lastUpdated: now.toISOString()
    });
  } catch (error) {
    console.error("Error fetching GA4 analytics:", error);
    return c.json({ error: "Failed to fetch analytics data" }, 500);
  }
});

// GA4 Real-time Events Endpoint
app.post("/api/projects/:id/analytics/ga4/events", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  const { eventName, eventParams } = await c.req.json();
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // In a real implementation, this would send events to GA4
    // For now, we'll log the event and potentially store it
    console.log(`GA4 Event: ${eventName}`, eventParams);

    // Store event in database for internal tracking
    await c.env.DB.prepare(`
      INSERT INTO analytics_events (project_id, event_name, event_params, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(projectId, eventName, JSON.stringify(eventParams)).run();

    return c.json({ 
      success: true, 
      message: "Event tracked successfully",
      eventName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error tracking GA4 event:", error);
    return c.json({ error: "Failed to track event" }, 500);
  }
});

// Get landing page for a project
app.get("/api/projects/:id/landing-page", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const landingPage = await c.env.DB.prepare(
      "SELECT * FROM landing_pages WHERE project_id = ?"
    ).bind(projectId).first();

    if (!landingPage) {
      return c.json({ error: "Landing page not found" }, 404);
    }

    return c.json(landingPage);
  } catch (error) {
    console.error("Error fetching landing page:", error);
    return c.json({ error: "Failed to fetch landing page" }, 500);
  }
});

// Launch campaign for a project
app.post("/api/projects/:id/launch-campaign", authMiddleware, async (c) => {
  try {
    const projectId = c.req.param("id");
    const { budget, platform } = await c.req.json();

    // Get project and prototype data for campaign creation
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ?"
    ).bind(projectId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Get landing page URL
    const landingPage = await c.env.DB.prepare(
      "SELECT * FROM landing_pages WHERE project_id = ?"
    ).bind(projectId).first();

    if (!landingPage) {
      return c.json({ error: "Landing page required before launching campaign" }, 400);
    }

    // Get prototype data for ad copy
    const prototype = await c.env.DB.prepare(
      "SELECT * FROM prototypes WHERE project_id = ?"
    ).bind(projectId).first();

    let googleAdsCampaignId = null;
    let estimatedReach = Math.floor(Math.random() * 50000) + 10000;

    // Initialize Google Ads service if credentials are available
    if (c.env.GOOGLE_ADS_CLIENT_ID && c.env.GOOGLE_ADS_CLIENT_SECRET && 
        c.env.GOOGLE_ADS_REFRESH_TOKEN && c.env.GOOGLE_ADS_DEVELOPER_TOKEN && 
        c.env.GOOGLE_ADS_CUSTOMER_ID && platform === 'google') {
      
      try {
        const googleAdsService = new GoogleAdsService({
          clientId: c.env.GOOGLE_ADS_CLIENT_ID,
          clientSecret: c.env.GOOGLE_ADS_CLIENT_SECRET,
          refreshToken: c.env.GOOGLE_ADS_REFRESH_TOKEN,
          developerToken: c.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          customerId: c.env.GOOGLE_ADS_CUSTOMER_ID,
        });

        // Generate targeting keywords
        const keywords = GoogleAdsService.generateKeywords(
          project.idea_description,
          project.target_audience
        );

        // Generate ad copy from prototype data
        const heroCopy = prototype?.content ? 
          JSON.parse(prototype.content).hero?.title || project.idea_description :
          project.idea_description;
        
        const valueProposition = prototype?.content ? 
          JSON.parse(prototype.content).features?.[0]?.description || project.idea_description :
          project.idea_description;

        const adCopy = GoogleAdsService.generateAdCopy(heroCopy, valueProposition);

        // Create Google Ads campaign
        googleAdsCampaignId = await googleAdsService.createCampaign({
          name: `MVP Validator - ${project.business_model} - ${Date.now()}`,
          budget: budget,
          targetingKeywords: keywords,
          landingPageUrl: landingPage.url,
          adCopy: adCopy,
        });

        estimatedReach = Math.floor(keywords.length * budget * 100); // Rough estimation
      } catch (googleAdsError) {
        console.error("Google Ads API error:", googleAdsError);
        // Continue with simulated campaign if Google Ads fails
      }
    }

    // Create campaign record
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days later

    const campaignResult = await c.env.DB.prepare(`
      INSERT INTO campaigns (project_id, platform, budget, status, start_date, end_date, google_ads_campaign_id, created_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?, datetime('now'))
    `).bind(projectId, platform, budget, startDate, endDate, googleAdsCampaignId).run();

    // Update project status
    await c.env.DB.prepare(
      "UPDATE projects SET status = 'campaign_launched' WHERE id = ?"
    ).bind(projectId).run();

    const campaignId = campaignResult.meta.last_row_id;

    return c.json({
      success: true,
      campaignId,
      googleAdsCampaignId,
      message: googleAdsCampaignId ? "Campaign launched on Google Ads" : "Campaign launched (simulated)",
      landingPageUrl: landingPage.url,
      estimatedReach,
      platform,
    });
  } catch (error) {
    console.error("Error launching campaign:", error);
    return c.json({ error: "Failed to launch campaign" }, 500);
  }
});

// Get campaign for a project
app.get("/api/projects/:id/campaign", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const campaign = await c.env.DB.prepare(
      "SELECT * FROM campaigns WHERE project_id = ?"
    ).bind(projectId).first();

    if (!campaign) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    let metrics = {
      impressions: Math.floor(Math.random() * 10000) + 1000,
      clicks: Math.floor(Math.random() * 500) + 50,
      conversions: Math.floor(Math.random() * 20) + 2,
      spend: Math.random() * campaign.budget * 0.8,
      ctr: 0,
      cpa: 0,
      conversionRate: 0
    };

    // Fetch real metrics from Google Ads API if available
    if (campaign.google_ads_campaign_id && 
        c.env.GOOGLE_ADS_CLIENT_ID && c.env.GOOGLE_ADS_CLIENT_SECRET && 
        c.env.GOOGLE_ADS_REFRESH_TOKEN && c.env.GOOGLE_ADS_DEVELOPER_TOKEN && 
        c.env.GOOGLE_ADS_CUSTOMER_ID) {
      
      try {
        const googleAdsService = new GoogleAdsService({
          clientId: c.env.GOOGLE_ADS_CLIENT_ID,
          clientSecret: c.env.GOOGLE_ADS_CLIENT_SECRET,
          refreshToken: c.env.GOOGLE_ADS_REFRESH_TOKEN,
          developerToken: c.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          customerId: c.env.GOOGLE_ADS_CUSTOMER_ID,
        });

        // Get date range for metrics
        const startDate = new Date(campaign.start_date).toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];

        // Fetch real metrics from Google Ads
        const realMetrics = await googleAdsService.getCampaignMetrics(
          campaign.google_ads_campaign_id,
          startDate,
          endDate
        );

        metrics = realMetrics;
      } catch (googleAdsError) {
        console.error("Error fetching Google Ads metrics:", googleAdsError);
        // Fall back to simulated metrics if API fails
      }
    }
    
    // Calculate derived metrics
    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    metrics.cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
    metrics.conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;

    // Calculate demand validation score (0-100)
    const demandScore = Math.min(100, Math.max(0, 
      (metrics.ctr * 10) + 
      (metrics.conversionRate * 5) + 
      (metrics.impressions / 100) + 
      (metrics.clicks / 10)
    ));

    return c.json({
      ...campaign,
      metrics: {
        ...metrics,
        demandScore: Math.round(demandScore)
      },
      isRealData: !!campaign.google_ads_campaign_id
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return c.json({ error: "Failed to fetch campaign" }, 500);
  }
});

// Pause campaign
app.post("/api/projects/:id/pause-campaign", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const campaign = await c.env.DB.prepare(
      "SELECT * FROM campaigns WHERE project_id = ?"
    ).bind(projectId).first();

    if (!campaign) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    // Pause Google Ads campaign if it exists
    if (campaign.google_ads_campaign_id && 
        c.env.GOOGLE_ADS_CLIENT_ID && c.env.GOOGLE_ADS_CLIENT_SECRET && 
        c.env.GOOGLE_ADS_REFRESH_TOKEN && c.env.GOOGLE_ADS_DEVELOPER_TOKEN && 
        c.env.GOOGLE_ADS_CUSTOMER_ID) {
      
      try {
        const googleAdsService = new GoogleAdsService({
          clientId: c.env.GOOGLE_ADS_CLIENT_ID,
          clientSecret: c.env.GOOGLE_ADS_CLIENT_SECRET,
          refreshToken: c.env.GOOGLE_ADS_REFRESH_TOKEN,
          developerToken: c.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          customerId: c.env.GOOGLE_ADS_CUSTOMER_ID,
        });

        await googleAdsService.pauseCampaign(campaign.google_ads_campaign_id);
      } catch (googleAdsError) {
        console.error("Error pausing Google Ads campaign:", googleAdsError);
        // Continue with local pause even if Google Ads fails
      }
    }

    // Update campaign status in database
    await c.env.DB.prepare(
      "UPDATE campaigns SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE project_id = ?"
    ).bind(projectId).run();

    const updatedCampaign = await c.env.DB.prepare(
      "SELECT * FROM campaigns WHERE project_id = ?"
    ).bind(projectId).first();

    return c.json({
      ...updatedCampaign,
      message: campaign.google_ads_campaign_id ? 
        "Campaign paused on Google Ads" : 
        "Campaign paused (simulated)"
    });
  } catch (error) {
    console.error("Error pausing campaign:", error);
    return c.json({ error: "Failed to pause campaign" }, 500);
  }
});

// Get landing page analytics
app.get("/api/projects/:id/landing-page/analytics", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const landingPage = await c.env.DB.prepare(
      "SELECT * FROM landing_pages WHERE project_id = ?"
    ).bind(projectId).first();

    if (!landingPage) {
      return c.json({ error: "Landing page not found" }, 404);
    }

    let analytics = null;

    // Initialize GA4 service if credentials are available
    if (c.env.GA4_MEASUREMENT_ID && c.env.GA4_API_SECRET && c.env.GA4_PROPERTY_ID) {
      try {
        const ga4Service = new GA4AnalyticsService({
          measurementId: c.env.GA4_MEASUREMENT_ID,
          apiSecret: c.env.GA4_API_SECRET,
          propertyId: c.env.GA4_PROPERTY_ID,
        });

        // Get analytics for the last 30 days
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        analytics = await ga4Service.getLandingPageAnalytics(
          projectId,
          landingPage.url,
          startDate,
          endDate
        );
      } catch (ga4Error) {
        console.error("GA4 Analytics error:", ga4Error);
        // Continue with simulated analytics if GA4 fails
      }
    }

    // If no real analytics available, use simulated data
    if (!analytics) {
      analytics = {
        pageViews: Math.floor(Math.random() * 5000) + 1000,
        uniqueVisitors: Math.floor(Math.random() * 3000) + 500,
        bounceRate: Math.random() * 40 + 30,
        avgSessionDuration: Math.random() * 180 + 60,
        conversions: Math.floor(Math.random() * 100) + 10,
        conversionRate: Math.random() * 5 + 1,
        topSources: [
          { source: 'google', sessions: Math.floor(Math.random() * 1000) + 500 },
          { source: 'facebook', sessions: Math.floor(Math.random() * 800) + 300 },
          { source: 'direct', sessions: Math.floor(Math.random() * 600) + 200 },
        ],
        deviceBreakdown: [
          { device: 'desktop', sessions: Math.floor(Math.random() * 1500) + 800 },
          { device: 'mobile', sessions: Math.floor(Math.random() * 1200) + 600 },
          { device: 'tablet', sessions: Math.floor(Math.random() * 300) + 100 },
        ],
        geographicData: [
          { country: 'United States', sessions: Math.floor(Math.random() * 1000) + 500 },
          { country: 'United Kingdom', sessions: Math.floor(Math.random() * 400) + 200 },
          { country: 'Canada', sessions: Math.floor(Math.random() * 300) + 150 },
        ],
      };
    }

    return c.json({
      landingPage,
      analytics,
      isRealData: !!(c.env.GA4_MEASUREMENT_ID && c.env.GA4_API_SECRET && c.env.GA4_PROPERTY_ID)
    });
  } catch (error) {
    console.error("Error fetching landing page analytics:", error);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

// Get campaign analytics from GA4
app.get("/api/projects/:id/campaign/analytics", authMiddleware, async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const userId = user?.id;
  
  try {
    // Verify project ownership
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    ).bind(projectId, userId).first();

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const campaign = await c.env.DB.prepare(
      "SELECT * FROM campaigns WHERE project_id = ?"
    ).bind(projectId).first();

    if (!campaign) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    let analytics = null;

    // Initialize GA4 service if credentials are available
    if (c.env.GA4_MEASUREMENT_ID && c.env.GA4_API_SECRET && c.env.GA4_PROPERTY_ID) {
      try {
        const ga4Service = new GA4AnalyticsService({
          measurementId: c.env.GA4_MEASUREMENT_ID,
          apiSecret: c.env.GA4_API_SECRET,
          propertyId: c.env.GA4_PROPERTY_ID,
        });

        // Get analytics for campaign duration
        const startDate = new Date(campaign.start_date).toISOString().split('T')[0];
        const endDate = campaign.end_date ? 
          new Date(campaign.end_date).toISOString().split('T')[0] :
          new Date().toISOString().split('T')[0];

        analytics = await ga4Service.getCampaignAnalytics(
          projectId,
          campaign.id.toString(),
          startDate,
          endDate
        );
      } catch (ga4Error) {
        console.error("GA4 Campaign Analytics error:", ga4Error);
        // Continue with simulated analytics if GA4 fails
      }
    }

    // If no real analytics available, use simulated data
    if (!analytics) {
      const sessions = Math.floor(Math.random() * 2000) + 500;
      const conversions = Math.floor(Math.random() * 50) + 10;
      
      analytics = {
        sessions,
        pageViews: sessions * (Math.random() * 2 + 1),
        conversions,
        revenue: conversions * (Math.random() * 50 + 25),
        costPerAcquisition: Math.random() * 30 + 10,
        returnOnAdSpend: Math.random() * 3 + 1,
        conversionPaths: [
          { path: 'google/cpc', conversions: Math.floor(conversions * 0.6) },
          { path: 'facebook/cpc', conversions: Math.floor(conversions * 0.25) },
          { path: 'linkedin/cpc', conversions: Math.floor(conversions * 0.15) },
        ],
      };
    }

    return c.json({
      campaign,
      analytics,
      isRealData: !!(c.env.GA4_MEASUREMENT_ID && c.env.GA4_API_SECRET && c.env.GA4_PROPERTY_ID)
    });
  } catch (error) {
    console.error("Error fetching campaign analytics:", error);
    return c.json({ error: "Failed to fetch campaign analytics" }, 500);
  }
});

// Track custom events for GA4 analytics
app.post("/api/projects/:id/track-event", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { eventName, eventParameters } = body;

    // Initialize GA4 service
    const ga4Service = new GA4AnalyticsService({
      measurementId: c.env.GA4_MEASUREMENT_ID || '',
      apiSecret: c.env.GA4_API_SECRET || '',
      propertyId: c.env.GA4_PROPERTY_ID || '',
    });

    // Track the event
    const result = await ga4Service.trackEvent(eventName, {
      project_id: id,
      ...eventParameters,
    });

    if (result.success) {
      return c.json({ success: true, message: 'Event tracked successfully' });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }
  } catch (error) {
    console.error('Error tracking event:', error);
    return c.json({ error: 'Failed to track event' }, 500);
  }
});

// Stripe Payment Endpoints

// Create payment intent for validation service
app.post("/api/projects/:id/payment/create-intent", async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get project details
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Check if payment already exists
    const existingPayment = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE project_id = ? AND status = "succeeded"'
    ).bind(id).first();

    if (existingPayment) {
      return c.json({ error: 'Project already paid for' }, 400);
    }

    // Initialize Stripe service
    const stripeService = new StripeService({
      secretKey: c.env.STRIPE_SECRET_KEY || '',
      publishableKey: c.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: c.env.STRIPE_WEBHOOK_SECRET || '',
    });

    // Create payment intent
    const validationService = StripeService.getValidationServiceDetails();
    const paymentResult = await stripeService.createPaymentIntent({
      amount: validationService.price,
      currency: validationService.currency,
      description: `${validationService.name} - ${project.idea_description}`,
      metadata: {
        project_id: id,
        user_id: user.id,
        service_type: 'validation',
      },
    });

    if (!paymentResult.success) {
      return c.json({ error: paymentResult.error }, 400);
    }

    // Store payment record
    await c.env.DB.prepare(`
      INSERT INTO payments (project_id, user_id, stripe_payment_intent_id, amount, currency, status, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.id,
      paymentResult.paymentIntentId,
      validationService.price,
      validationService.currency,
      'pending',
      validationService.description,
      JSON.stringify({ service_type: 'validation' })
    ).run();

    return c.json({
      success: true,
      clientSecret: paymentResult.clientSecret,
      paymentIntentId: paymentResult.paymentIntentId,
      amount: validationService.price,
      currency: validationService.currency,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return c.json({ error: 'Failed to create payment intent' }, 500);
  }
});

// Create checkout session for validation service
app.post("/api/projects/:id/payment/create-checkout", async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get project details
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Check if payment already exists
    const existingPayment = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE project_id = ? AND status = "succeeded"'
    ).bind(id).first();

    if (existingPayment) {
      return c.json({ error: 'Project already paid for' }, 400);
    }

    // Initialize Stripe service
    const stripeService = new StripeService({
      secretKey: c.env.STRIPE_SECRET_KEY || '',
      publishableKey: c.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: c.env.STRIPE_WEBHOOK_SECRET || '',
    });

    // Create checkout session
    const validationService = StripeService.getValidationServiceDetails();
    const checkoutResult = await stripeService.createCheckoutSession({
      productName: validationService.name,
      productDescription: validationService.description,
      amount: validationService.price,
      currency: validationService.currency,
      successUrl: `${c.req.header('origin')}/projects/${id}?payment=success`,
      cancelUrl: `${c.req.header('origin')}/projects/${id}?payment=canceled`,
      customerEmail: user.email,
      metadata: {
        project_id: id,
        user_id: user.id,
        service_type: 'validation',
      },
    });

    if (!checkoutResult.success) {
      return c.json({ error: checkoutResult.error }, 400);
    }

    // Store payment record
    await c.env.DB.prepare(`
      INSERT INTO payments (project_id, user_id, stripe_checkout_session_id, amount, currency, status, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.id,
      checkoutResult.sessionId,
      validationService.price,
      validationService.currency,
      'pending',
      validationService.description,
      JSON.stringify({ service_type: 'validation' })
    ).run();

    return c.json({
      success: true,
      sessionId: checkoutResult.sessionId,
      url: checkoutResult.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }
});

// Get payment status for a project
app.get("/api/projects/:id/payment/status", async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get project details
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Get payment records
    const payments = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE project_id = ? ORDER BY created_at DESC'
    ).bind(id).all();

    const latestPayment = payments.results[0];
    
    return c.json({
      success: true,
      paymentStatus: project.payment_status || 'unpaid',
      payments: payments.results.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.payment_method,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
      })),
      latestPayment: latestPayment ? {
        id: latestPayment.id,
        status: latestPayment.status,
        amount: latestPayment.amount,
        currency: latestPayment.currency,
        createdAt: latestPayment.created_at,
      } : null,
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    return c.json({ error: 'Failed to get payment status' }, 500);
  }
});

// Stripe webhook handler
app.post("/api/webhooks/stripe", async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'No signature provided' }, 400);
    }

    const body = await c.req.text();
    const stripeService = new StripeService(c.env);
    
    // Verify webhook signature
    if (!stripeService.verifyWebhookSignature(body, signature)) {
      return c.json({ error: 'Invalid signature' }, 400);
    }

    // Parse the event
    const event = JSON.parse(body);
    
    // Process the webhook event
    await stripeService.processWebhookEvent(event.type, event.data.object);
    
    return c.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// Helper function to handle successful payment intent
async function handlePaymentIntentSucceeded(c: any, paymentIntent: any) {
  const projectId = paymentIntent.metadata?.project_id;
  if (!projectId) return;

  // Update payment status
  await c.env.DB.prepare(
    'UPDATE payments SET status = "succeeded", payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_intent_id = ?'
  ).bind(paymentIntent.charges?.data[0]?.payment_method_details?.type || 'card', paymentIntent.id).run();

  // Update project payment status
  await c.env.DB.prepare(
    'UPDATE projects SET payment_status = "paid", updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(projectId).run();
}

// Helper function to handle completed checkout session
async function handleCheckoutSessionCompleted(c: any, session: any) {
  const projectId = session.metadata?.project_id;
  if (!projectId) return;

  // Update payment status
  await c.env.DB.prepare(
    'UPDATE payments SET status = "succeeded", updated_at = CURRENT_TIMESTAMP WHERE stripe_checkout_session_id = ?'
  ).bind(session.id).run();

  // Update project payment status
  await c.env.DB.prepare(
    'UPDATE projects SET payment_status = "paid", updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(projectId).run();
}

// Helper function to handle failed payment intent
async function handlePaymentIntentFailed(c: any, paymentIntent: any) {
  const projectId = paymentIntent.metadata?.project_id;
  if (!projectId) return;

  // Update payment status
  await c.env.DB.prepare(
    'UPDATE payments SET status = "failed", updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_intent_id = ?'
  ).bind(paymentIntent.id).run();
}

// Email notification endpoints
app.post('/api/notifications/send', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { projectId, eventType, eventData } = await c.req.json();

    // Get project details
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Initialize email service
    const emailService = new EmailNotificationService({
      apiKey: c.env.RESEND_API_KEY,
      fromEmail: c.env.FROM_EMAIL || 'noreply@mvp-validator.com',
      fromName: 'MVP Validator'
    });

    // Send notification
    const success = await emailService.sendNotification({
      projectId,
      projectTitle: project.idea_description.substring(0, 50) + '...',
      userEmail: user.email,
      userName: user.name,
      eventType,
      eventData
    });

    return c.json({ success });
  } catch (error) {
    console.error('Error sending notification:', error);
    return c.json({ error: 'Failed to send notification' }, 500);
  }
});

// Bulk email notifications endpoint
app.post('/api/notifications/bulk', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { notifications } = await c.req.json();

    // Initialize email service
    const emailService = new EmailNotificationService({
      apiKey: c.env.RESEND_API_KEY,
      fromEmail: c.env.FROM_EMAIL || 'noreply@mvp-validator.com',
      fromName: 'MVP Validator'
    });

    // Send bulk notifications
    const results = await emailService.sendBulkNotifications(notifications);

    return c.json(results);
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return c.json({ error: 'Failed to send bulk notifications' }, 500);
  }
});

// Custom email endpoint
app.post('/api/notifications/custom', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { recipients, subject, htmlContent, textContent } = await c.req.json();

    // Initialize email service
    const emailService = new EmailNotificationService({
      apiKey: c.env.RESEND_API_KEY,
      fromEmail: c.env.FROM_EMAIL || 'noreply@mvp-validator.com',
      fromName: 'MVP Validator'
    });

    // Send custom email
    const success = await emailService.sendCustomEmail(
      recipients,
      subject,
      htmlContent,
      textContent
    );

    return c.json({ success });
  } catch (error) {
    console.error('Error sending custom email:', error);
    return c.json({ error: 'Failed to send custom email' }, 500);
  }
});

// A/B Testing endpoints
app.get('/api/projects/:id/ab-tests', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const projectId = c.req.param('id');
    
    // Verify project ownership
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const abTestingService = new ABTestingService(c.env);
    const tests = await abTestingService.getProjectABTests(projectId);

    return c.json({ tests });
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    return c.json({ error: 'Failed to fetch A/B tests' }, 500);
  }
});

app.post('/api/projects/:id/ab-tests', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const projectId = c.req.param('id');
    const testData = await c.req.json();
    
    // Verify project ownership
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const abTestingService = new ABTestingService(c.env);
    const test = await abTestingService.createABTest({
      ...testData,
      projectId
    });

    return c.json({ test });
  } catch (error) {
    console.error('Error creating A/B test:', error);
    return c.json({ error: 'Failed to create A/B test' }, 500);
  }
});

app.post('/api/ab-tests/:id/start', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const testId = c.req.param('id');
    const abTestingService = new ABTestingService(c.env);
    
    // Verify test ownership through project
    const test = await abTestingService.getABTest(testId);
    if (!test) {
      return c.json({ error: 'Test not found' }, 404);
    }

    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(test.projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await abTestingService.startTest(testId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error starting A/B test:', error);
    return c.json({ error: 'Failed to start A/B test' }, 500);
  }
});

app.post('/api/ab-tests/:id/pause', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const testId = c.req.param('id');
    const abTestingService = new ABTestingService(c.env);
    
    // Verify test ownership
    const test = await abTestingService.getABTest(testId);
    if (!test) {
      return c.json({ error: 'Test not found' }, 404);
    }

    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(test.projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await abTestingService.pauseTest(testId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error pausing A/B test:', error);
    return c.json({ error: 'Failed to pause A/B test' }, 500);
  }
});

app.post('/api/ab-tests/:id/stop', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const testId = c.req.param('id');
    const abTestingService = new ABTestingService(c.env);
    
    // Verify test ownership
    const test = await abTestingService.getABTest(testId);
    if (!test) {
      return c.json({ error: 'Test not found' }, 404);
    }

    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(test.projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await abTestingService.stopTest(testId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error stopping A/B test:', error);
    return c.json({ error: 'Failed to stop A/B test' }, 500);
  }
});

app.get('/api/ab-tests/:id/results', async (c) => {
  try {
    const user = await getUserFromContext(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const testId = c.req.param('id');
    const abTestingService = new ABTestingService(c.env);
    
    // Verify test ownership
    const test = await abTestingService.getABTest(testId);
    if (!test) {
      return c.json({ error: 'Test not found' }, 404);
    }

    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(test.projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const results = await abTestingService.calculateResults(testId);
    return c.json({ results });
  } catch (error) {
    console.error('Error calculating A/B test results:', error);
    return c.json({ error: 'Failed to calculate results' }, 500);
  }
});

// Report Generation endpoints
app.post('/api/projects/:id/reports/generate', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('id');
    const { timeRange, config } = await c.req.json();

    // Verify project ownership
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const reportService = new ReportGenerationService(c.env);
    const report = await reportService.generateValidationReport(projectId, timeRange, config);

    // Send email notification for report generation
    try {
      const emailService = new EmailNotificationService({
        apiKey: c.env.RESEND_API_KEY,
        fromEmail: c.env.FROM_EMAIL || 'noreply@mvp-validator.com',
        fromName: 'MVP Validator'
      });

      await emailService.sendNotification({
        projectId,
        projectTitle: project.idea_description.substring(0, 50) + '...',
        userEmail: user.email,
        userName: user.name,
        eventType: 'report_ready',
        eventData: {
          validationScore: report.executiveSummary.validationScore,
          marketViability: report.executiveSummary.marketViability,
          timeRange: timeRange
        }
      });
    } catch (emailError) {
      console.error('Failed to send report notification:', emailError);
      // Don't fail the main operation if email fails
    }

    return c.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    return c.json({ error: 'Failed to generate report' }, 500);
  }
});

app.post('/api/projects/:id/reports/download', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('id');
    const { reportData, format, config } = await c.req.json();

    // Verify project ownership
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(projectId, user.id).first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const reportService = new ReportGenerationService(c.env);
    
    if (format === 'pdf') {
      const pdfBuffer = await reportService.exportToPDF(reportData, config);
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="validation-report-${projectId}.pdf"`
        }
      });
    } else if (format === 'html') {
      const htmlContent = reportService.generateHTMLReport(reportData, config);
      return new Response(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="validation-report-${projectId}.html"`
        }
      });
    } else {
      return c.json({ error: 'Unsupported format' }, 400);
    }
  } catch (error) {
    console.error('Error downloading report:', error);
    return c.json({ error: 'Failed to download report' }, 500);
  }
});

// Initialize monitoring services
const initializeServices = (env: Env) => {
  const databaseService = new DatabaseService(env);
  const cacheService = new CacheService(env);
  const monitoringService = new MonitoringService(env);
  const securityService = new SecurityService(env);
  
  // Initialize Sentry if configured
  monitoringService.initSentry();
  
  return { databaseService, cacheService, monitoringService, securityService };
};

// Monitoring and Performance API Endpoints
app.get('/api/monitoring/health', async (c) => {
  try {
    const { monitoringService } = initializeServices(c.env);
    const healthCheck = monitoringService.getHealthCheck();
    return c.json(healthCheck);
  } catch (error) {
    console.error('Health check error:', error);
    return c.json({ 
      status: 'unhealthy', 
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

app.get('/api/monitoring/cache-stats', async (c) => {
  try {
    const { cacheService } = initializeServices(c.env);
    const cacheStats = cacheService.getCacheStats();
    return c.json(cacheStats);
  } catch (error) {
    console.error('Cache stats error:', error);
    return c.json({ error: 'Failed to get cache statistics' }, 500);
  }
});

app.get('/api/monitoring/security-stats', async (c) => {
  try {
    const { securityService } = initializeServices(c.env);
    const securityStats = securityService.getSecurityStats();
    return c.json(securityStats);
  } catch (error) {
    console.error('Security stats error:', error);
    return c.json({ error: 'Failed to get security statistics' }, 500);
  }
});

app.get('/api/monitoring/performance', async (c) => {
  try {
    const { monitoringService } = initializeServices(c.env);
    const performanceStats = monitoringService.getPerformanceStats();
    return c.json(performanceStats);
  } catch (error) {
    console.error('Performance stats error:', error);
    return c.json({ error: 'Failed to get performance statistics' }, 500);
  }
});

// Database optimization endpoint
app.post('/api/monitoring/optimize-db', authMiddleware, async (c) => {
  try {
    const { databaseService } = initializeServices(c.env);
    
    // Run database optimization queries
    await databaseService.executeWrite('ANALYZE projects');
    await databaseService.executeWrite('ANALYZE analytics');
    await databaseService.executeWrite('ANALYZE campaigns');
    
    return c.json({ message: 'Database optimization completed' });
  } catch (error) {
    console.error('Database optimization error:', error);
    return c.json({ error: 'Failed to optimize database' }, 500);
  }
});

// Cache management endpoints
app.post('/api/monitoring/clear-cache', authMiddleware, async (c) => {
  try {
    const { cacheService } = initializeServices(c.env);
    await cacheService.clearAll();
    return c.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Clear cache error:', error);
    return c.json({ error: 'Failed to clear cache' }, 500);
  }
});

// Security management endpoints
app.post('/api/monitoring/clear-security-data', authMiddleware, async (c) => {
  try {
    const { securityService } = initializeServices(c.env);
    securityService.clearSecurityData();
    return c.json({ message: 'Security data cleared successfully' });
  } catch (error) {
    console.error('Clear security data error:', error);
    return c.json({ error: 'Failed to clear security data' }, 500);
  }
});

export default app;
