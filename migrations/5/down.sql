-- Remove payment-related columns and tables

-- Drop indexes
DROP INDEX IF EXISTS idx_payments_stripe_checkout_session;
DROP INDEX IF EXISTS idx_payments_stripe_payment_intent;
DROP INDEX IF EXISTS idx_payments_status;
DROP INDEX IF EXISTS idx_payments_user_id;
DROP INDEX IF EXISTS idx_payments_project_id;

-- Remove payment columns from projects table
ALTER TABLE projects DROP COLUMN payment_id;
ALTER TABLE projects DROP COLUMN payment_status;

-- Drop payments table
DROP TABLE IF EXISTS payments;
