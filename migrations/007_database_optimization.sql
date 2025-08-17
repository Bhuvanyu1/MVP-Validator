-- Database Optimization Migration for MVP Validator
-- Adds indexes, constraints, and performance optimizations

-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_projects_user_id_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

CREATE INDEX IF NOT EXISTS idx_prototypes_project_id ON prototypes(project_id);
CREATE INDEX IF NOT EXISTS idx_prototypes_created_at ON prototypes(created_at);

CREATE INDEX IF NOT EXISTS idx_landing_pages_project_id ON landing_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_created_at ON landing_pages(created_at);

CREATE INDEX IF NOT EXISTS idx_campaigns_project_id ON campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_google_ads_id ON campaigns(google_ads_campaign_id);

CREATE INDEX IF NOT EXISTS idx_analytics_project_id ON analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);

-- A/B Testing indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_project_id_status ON ab_tests(project_id, status);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_assignment_id ON ab_test_events(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_timestamp ON ab_test_events(timestamp);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_projects_user_status_updated ON projects(user_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_analytics_project_type_timestamp ON analytics(project_id, event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_campaigns_project_status_created ON campaigns(project_id, status, created_at);

-- Add constraints for data integrity
ALTER TABLE projects ADD CONSTRAINT chk_projects_status 
  CHECK (status IN ('draft', 'prototype_generated', 'landing_page_created', 'campaign_launched', 'completed'));

ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_status 
  CHECK (status IN ('draft', 'active', 'paused', 'completed'));

ALTER TABLE landing_pages ADD CONSTRAINT chk_landing_pages_status 
  CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE ab_tests ADD CONSTRAINT chk_ab_tests_status 
  CHECK (status IN ('draft', 'active', 'paused', 'completed'));

-- Add check constraints for data validation
ALTER TABLE projects ADD CONSTRAINT chk_projects_price_point 
  CHECK (price_point >= 0);

ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_budget 
  CHECK (budget >= 0);

-- Optimize table statistics (SQLite specific)
ANALYZE projects;
ANALYZE prototypes;
ANALYZE landing_pages;
ANALYZE campaigns;
ANALYZE analytics;
ANALYZE ab_tests;
ANALYZE ab_test_variants;
ANALYZE ab_test_assignments;
ANALYZE ab_test_events;
