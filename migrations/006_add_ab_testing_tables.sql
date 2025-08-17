-- Migration: Add A/B Testing Tables
-- Created: 2024-01-XX
-- Description: Add tables for A/B testing functionality

-- A/B Tests table
CREATE TABLE IF NOT EXISTS ab_tests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
  traffic_allocation REAL NOT NULL DEFAULT 0.5, -- percentage of traffic to include
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- A/B Test Variants table
CREATE TABLE IF NOT EXISTS ab_test_variants (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  traffic_weight REAL NOT NULL DEFAULT 0.5, -- weight for traffic distribution
  is_control BOOLEAN NOT NULL DEFAULT FALSE,
  config TEXT, -- JSON configuration for the variant
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
);

-- A/B Test Assignments table (tracks which users see which variants)
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL, -- anonymous visitor ID or user ID
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  UNIQUE(test_id, visitor_id) -- one assignment per visitor per test
);

-- A/B Test Events table (tracks conversions and other events)
CREATE TABLE IF NOT EXISTS ab_test_events (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- conversion, click, view, etc.
  event_value REAL, -- optional numeric value (e.g., revenue)
  event_data TEXT, -- optional JSON data
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES ab_test_variants(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ab_tests_project_id ON ab_tests(project_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test_id ON ab_test_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_visitor_id ON ab_test_assignments(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_test_id ON ab_test_events(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant_id ON ab_test_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_visitor_id ON ab_test_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_type ON ab_test_events(event_type);
