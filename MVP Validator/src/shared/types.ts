import z from "zod";

// Business model options
export const BusinessModelSchema = z.enum(['saas', 'service', 'product', 'course']);
export type BusinessModel = z.infer<typeof BusinessModelSchema>;

// Project status options
export const ProjectStatusSchema = z.enum(['draft', 'prototype_generated', 'landing_page_created', 'campaign_launched', 'completed']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// New project schema for validation
export const NewProjectSchema = z.object({
  ideaDescription: z.string().min(10).max(500),
  targetAudience: z.string().min(5).max(200),
  pricePoint: z.number().min(0).max(10000),
  businessModel: BusinessModelSchema,
});
export type NewProject = z.infer<typeof NewProjectSchema>;

// Project schema
export const ProjectSchema = z.object({
  id: z.number(),
  userId: z.string(),
  ideaDescription: z.string(),
  targetAudience: z.string().nullable(),
  pricePoint: z.number().nullable(),
  businessModel: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  github_repo_url: z.string().nullable(),
  github_repo_name: z.string().nullable(),
});
export type Project = z.infer<typeof ProjectSchema>;

// Prototype schema
export const PrototypeSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  heroCopy: z.string().nullable(),
  featuresJson: z.string().nullable(),
  pricingStructure: z.string().nullable(),
  wireframeData: z.string().nullable(),
  generatedAt: z.string(),
});
export type Prototype = z.infer<typeof PrototypeSchema>;

// Landing page schema
export const LandingPageSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  url: z.string().nullable(),
  templateId: z.string().nullable(),
  contentJson: z.string().nullable(),
  deployedAt: z.string().nullable(),
  analyticsId: z.string().nullable(),
});
export type LandingPage = z.infer<typeof LandingPageSchema>;

// Campaign schema
export const CampaignSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  platform: z.string(),
  budget: z.number().nullable(),
  status: z.string(),
  googleAdsCampaignId: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

// Analytics schema
export const AnalyticsSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  pageViews: z.number(),
  bounceRate: z.number(),
  emailSignups: z.number(),
  conversions: z.number(),
  costPerAcquisition: z.number(),
  demandScore: z.number(),
});
export type Analytics = z.infer<typeof AnalyticsSchema>;

// GitHub integration schemas
export const GitHubRepoSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  private: z.boolean().default(false),
});
export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

export const GitHubConnectionSchema = z.object({
  username: z.string(),
  accessToken: z.string(),
});
export type GitHubConnection = z.infer<typeof GitHubConnectionSchema>;
