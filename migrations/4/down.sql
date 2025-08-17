-- Remove Google Ads integration fields from campaigns table
ALTER TABLE campaigns DROP COLUMN google_ads_campaign_id;
