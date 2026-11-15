-- FINZI AI: additional migration
-- Key/value settings store per company (notification preferences, UI preferences, etc.)
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company ON company_settings(company_id);