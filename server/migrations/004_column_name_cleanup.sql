-- FINZI AI: column name cleanup
-- The original schema used double quotes around column names that are SQL keywords,
-- producing malformed columns. Rename them to clean, unambiguous names.
-- These tables were empty at migration time, so a rebuild is safe.

-- ai_messages has a column literally named "references" - rebuild with message_references
CREATE TABLE IF NOT EXISTS ai_messages_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  message_references TEXT,
  suggested_actions TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

INSERT INTO ai_messages_new (id, conversation_id, role, content, message_type, message_references, suggested_actions, created_at)
  SELECT id, conversation_id, role, content, message_type, "references", suggested_actions, created_at FROM ai_messages;

DROP TABLE ai_messages;

ALTER TABLE ai_messages_new RENAME TO ai_messages;

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);

-- working_papers has a column literally named "evidence_" - rebuild with evidence_references
CREATE TABLE IF NOT EXISTS working_papers_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  engagement_id TEXT NOT NULL,
  wp_number TEXT NOT NULL,
  audit_area TEXT NOT NULL,
  objective TEXT,
  procedure TEXT,
  evidence_references TEXT,
  auditor_conclusion TEXT,
  reviewer_comments TEXT,
  approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
  version INTEGER DEFAULT 1,
  prepared_by TEXT,
  prepared_at TEXT DEFAULT (datetime('now')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  FOREIGN KEY (engagement_id) REFERENCES audit_engagements(id) ON DELETE CASCADE
);

INSERT INTO working_papers_new (id, engagement_id, wp_number, audit_area, objective, procedure, evidence_references, auditor_conclusion, reviewer_comments, approval_status, version, prepared_by, prepared_at, reviewed_by, reviewed_at, approved_by, approved_at)
  SELECT id, engagement_id, wp_number, audit_area, objective, procedure, evidence_, auditor_conclusion, reviewer_comments, approval_status, version, prepared_by, prepared_at, reviewed_by, reviewed_at, approved_by, approved_at FROM working_papers;

DROP TABLE working_papers;

ALTER TABLE working_papers_new RENAME TO working_papers;