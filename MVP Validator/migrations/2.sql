
CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  platform TEXT DEFAULT 'google',
  budget REAL,
  status TEXT DEFAULT 'pending',
  google_ads_campaign_id TEXT,
  start_date DATE,
  end_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  page_views INTEGER DEFAULT 0,
  bounce_rate REAL DEFAULT 0,
  email_signups INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost_per_acquisition REAL DEFAULT 0,
  demand_score REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
