
ALTER TABLE projects ADD COLUMN github_repo_url TEXT;
ALTER TABLE projects ADD COLUMN github_repo_name TEXT;
ALTER TABLE users ADD COLUMN github_username TEXT;
ALTER TABLE users ADD COLUMN github_access_token TEXT;
