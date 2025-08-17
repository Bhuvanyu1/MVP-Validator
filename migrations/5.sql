-- Add payments table for tracking Stripe transactions
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_customer_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, canceled
  payment_method TEXT, -- card, bank_transfer, etc.
  description TEXT,
  metadata TEXT, -- JSON string for additional data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Add payment status to projects table
ALTER TABLE projects ADD COLUMN payment_status TEXT DEFAULT 'unpaid'; -- unpaid, paid, refunded
ALTER TABLE projects ADD COLUMN payment_id INTEGER REFERENCES payments(id);

-- Create index for efficient queries
CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_stripe_checkout_session ON payments(stripe_checkout_session_id);
