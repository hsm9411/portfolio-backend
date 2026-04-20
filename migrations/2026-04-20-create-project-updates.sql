-- BACK-27/BACK-28: Create project_updates table (Changelog feature)
-- Run on: portfolio schema (prod), portfolio_dev schema (dev)

-- ============================================================
-- portfolio (prod)
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio.project_updates (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID         NOT NULL REFERENCES portfolio.projects(id) ON DELETE CASCADE,
  update_type  VARCHAR(20)  NOT NULL DEFAULT 'MANUAL'
                 CHECK (update_type IN ('MANUAL', 'GITHUB_PR')),
  title        VARCHAR(255) NOT NULL,
  content      TEXT         NOT NULL,
  external_url VARCHAR(255),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project_id
  ON portfolio.project_updates(project_id);

CREATE INDEX IF NOT EXISTS idx_project_updates_created_at
  ON portfolio.project_updates(created_at DESC);

-- ============================================================
-- portfolio_dev (dev)
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_dev.project_updates (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID         NOT NULL REFERENCES portfolio_dev.projects(id) ON DELETE CASCADE,
  update_type  VARCHAR(20)  NOT NULL DEFAULT 'MANUAL'
                 CHECK (update_type IN ('MANUAL', 'GITHUB_PR')),
  title        VARCHAR(255) NOT NULL,
  content      TEXT         NOT NULL,
  external_url VARCHAR(255),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_project_updates_project_id
  ON portfolio_dev.project_updates(project_id);

CREATE INDEX IF NOT EXISTS idx_dev_project_updates_created_at
  ON portfolio_dev.project_updates(created_at DESC);
