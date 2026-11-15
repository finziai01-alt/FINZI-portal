const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../db/finzi.db');
const migrationsDir = path.join(__dirname, '../..', 'migrations');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Track applied migrations so re-runs never re-execute a file (idempotent).
const migrationsTableExisted = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get() !== undefined;
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))`);
const appliedFiles = new Set(db.prepare('SELECT filename FROM schema_migrations').all().map(r => r.filename));

// If this database was created by the previous runner (tables exist, no tracking table),
// mark all current migrations as already applied so history is preserved.
const legacyDb = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get() !== undefined && !migrationsTableExisted;
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
if (legacyDb) {
  const markApplied = db.prepare('INSERT OR IGNORE INTO schema_migrations (filename) VALUES (?)');
  for (const file of migrationFiles) markApplied.run(file);
  // Refresh the in-memory set so marked files are skipped below
  for (const f of migrationFiles) appliedFiles.add(f);
  console.log(`Legacy database detected — marked ${migrationFiles.length} existing migrations as applied`);
}

let success = 0, failed = 0;
for (const file of migrationFiles) {
  if (appliedFiles.has(file)) continue;
  const schema = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    try {
      db.exec(stmt);
      success++;
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('near "syntax"')) {
        console.error(`Failed in ${file}:`, stmt.substring(0, 80), err.message);
        failed++;
      }
    }
  }
  if (failed === 0) db.prepare('INSERT OR IGNORE INTO schema_migrations (filename) VALUES (?)').run(file);
}
console.log(`Migration complete: ${success} statements executed, ${failed} failures (${migrationFiles.length} files, ${appliedFiles.size} already applied)`);

const NOW = () => new Date().toISOString();

seedDefaultData(db);
db.close();

function seedDefaultData(db) {
  const roles = [
    { name: 'Super Admin', description: 'Full system access across all companies', level: 0, is_system: 1 },
    { name: 'Workspace Owner', description: 'Owns the workspace, full access', level: 1, is_system: 1 },
    { name: 'Company Admin', description: 'Admin access within a company', level: 2, is_system: 1 },
    { name: 'Accountant', description: 'Full accounting module access', level: 3, is_system: 1 },
    { name: 'Finance Staff', description: 'Limited finance operations access', level: 4, is_system: 1 },
    { name: 'CA Firm Admin', description: 'CA firm admin managing multiple clients', level: 2, is_system: 1 },
    { name: 'Auditor', description: 'Audit module access', level: 3, is_system: 1 },
    { name: 'Reviewer', description: 'Review and approve audit work', level: 3, is_system: 1 },
    { name: 'Client User', description: 'Client portal access', level: 5, is_system: 1 }
  ];

  const insertRole = db.prepare('INSERT OR IGNORE INTO roles (id, name, description, level, is_system, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)');
  for (const r of roles) insertRole.run(r.name, r.description, r.level, r.is_system, NOW());

  const permissions = [
    { name: 'view_dashboard', resource: 'dashboard', action: 'view' },
    { name: 'view_companies', resource: 'companies', action: 'view' },
    { name: 'create_companies', resource: 'companies', action: 'create' },
    { name: 'edit_companies', resource: 'companies', action: 'edit' },
    { name: 'delete_companies', resource: 'companies', action: 'delete' },
    { name: 'view_clients', resource: 'clients', action: 'view' },
    { name: 'create_clients', resource: 'clients', action: 'create' },
    { name: 'edit_clients', resource: 'clients', action: 'edit' },
    { name: 'view_bills', resource: 'bills', action: 'view' },
    { name: 'create_bills', resource: 'bills', action: 'create' },
    { name: 'edit_bills', resource: 'bills', action: 'edit' },
    { name: 'delete_bills', resource: 'bills', action: 'delete' },
    { name: 'record_payment_bills', resource: 'bills', action: 'record_payment' },
    { name: 'view_invoices', resource: 'invoices', action: 'view' },
    { name: 'create_invoices', resource: 'invoices', action: 'create' },
    { name: 'edit_invoices', resource: 'invoices', action: 'edit' },
    { name: 'delete_invoices', resource: 'invoices', action: 'delete' },
    { name: 'record_receipt_invoices', resource: 'invoices', action: 'record_receipt' },
    { name: 'view_vendors', resource: 'vendors', action: 'view' },
    { name: 'create_vendors', resource: 'vendors', action: 'create' },
    { name: 'edit_vendors', resource: 'vendors', action: 'edit' },
    { name: 'delete_vendors', resource: 'vendors', action: 'delete' },
    { name: 'view_customers', resource: 'customers', action: 'view' },
    { name: 'create_customers', resource: 'customers', action: 'create' },
    { name: 'edit_customers', resource: 'customers', action: 'edit' },
    { name: 'delete_customers', resource: 'customers', action: 'delete' },
    { name: 'view_ledger', resource: 'ledger', action: 'view' },
    { name: 'create_account', resource: 'ledger', action: 'create_account' },
    { name: 'edit_account', resource: 'ledger', action: 'edit_account' },
    { name: 'create_journal_entry', resource: 'ledger', action: 'create' },
    { name: 'post_journal_entry', resource: 'ledger', action: 'post' },
    { name: 'view_banking', resource: 'banking', action: 'view' },
    { name: 'manage_bank_accounts', resource: 'banking', action: 'manage_accounts' },
    { name: 'reconcile_bank', resource: 'banking', action: 'reconcile' },
    { name: 'import_bank_statement', resource: 'banking', action: 'import_statement' },
    { name: 'view_tax', resource: 'tax', action: 'view' },
    { name: 'prepare_tax', resource: 'tax', action: 'prepare' },
    { name: 'file_tax', resource: 'tax', action: 'file' },
    { name: 'view_reports', resource: 'reports', action: 'view' },
    { name: 'export_reports', resource: 'reports', action: 'export' },
    { name: 'view_audit', resource: 'audit', action: 'view' },
    { name: 'create_audit_engagement', resource: 'audit', action: 'create' },
    { name: 'sign_off_audit', resource: 'audit', action: 'sign_off' },
    { name: 'use_ai_assistant', resource: 'ai', action: 'use' },
    { name: 'approve_ai_action', resource: 'ai', action: 'approve' },
    { name: 'view_settings', resource: 'settings', action: 'view' },
    { name: 'manage_users', resource: 'settings', action: 'manage_users' },
    { name: 'manage_roles', resource: 'settings', action: 'manage_roles' },
    { name: 'upload_documents', resource: 'documents', action: 'upload' },
    { name: 'view_documents', resource: 'documents', action: 'view' },
    { name: 'view_reminders', resource: 'reminders', action: 'view' },
    { name: 'create_reminders', resource: 'reminders', action: 'create' },
    { name: 'view_automations', resource: 'automations', action: 'view' },
    { name: 'manage_automations', resource: 'automations', action: 'manage' }
  ];

  const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (id, name, resource, action, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)');
  for (const p of permissions) insertPerm.run(p.name, p.resource, p.action, p.description, NOW());

  const allPerms = db.prepare('SELECT id FROM permissions').all();
  const insertRP = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id, granted_at) VALUES (?, ?, ?)');

  const grantTo = (roleNames) => {
    for (const name of roleNames) {
      const role = db.prepare('SELECT id FROM roles WHERE name = ? AND is_system = 1').get(name);
      if (!role) continue;
      for (const p of allPerms) insertRP.run(role.id, p.id, NOW());
    }
  };
  const grantOnly = (roleName, permNames) => {
    const role = db.prepare('SELECT id FROM roles WHERE name = ? AND is_system = 1').get(roleName);
    if (!role) return;
    for (const pName of permNames) {
      const perm = db.prepare('SELECT id FROM permissions WHERE name = ?').get(pName);
      if (perm) insertRP.run(role.id, perm.id, NOW());
    }
  };

  // Full-access roles
  grantTo(['Super Admin', 'Workspace Owner', 'Company Admin', 'CA Firm Admin']);

  // Accountant: everything accounting/tax/reporting, no user or role management
  grantOnly('Accountant', [
    'view_dashboard', 'view_companies', 'view_clients',
    'view_bills', 'create_bills', 'edit_bills', 'delete_bills', 'record_payment_bills',
    'view_invoices', 'create_invoices', 'edit_invoices', 'delete_invoices', 'record_receipt_invoices',
    'view_vendors', 'create_vendors', 'edit_vendors', 'delete_vendors',
    'view_customers', 'create_customers', 'edit_customers', 'delete_customers',
    'view_ledger', 'create_account', 'edit_account', 'create_journal_entry', 'post_journal_entry',
    'view_banking', 'manage_bank_accounts', 'reconcile_bank', 'import_bank_statement',
    'view_tax', 'prepare_tax', 'view_reports', 'export_reports',
    'use_ai_assistant', 'upload_documents', 'view_documents',
    'view_reminders', 'create_reminders', 'view_automations', 'manage_automations', 'view_settings'
  ]);

  // Finance Staff: data entry only
  grantOnly('Finance Staff', [
    'view_dashboard',
    'view_bills', 'create_bills', 'edit_bills', 'record_payment_bills',
    'view_invoices', 'create_invoices', 'edit_invoices',
    'view_vendors', 'create_vendors', 'view_customers', 'create_customers',
    'view_ledger', 'create_journal_entry',
    'view_banking', 'view_reports',
    'use_ai_assistant', 'upload_documents', 'view_documents',
    'view_reminders', 'create_reminders'
  ]);

  // Auditor: audit + read-only accounting
  grantOnly('Auditor', [
    'view_dashboard', 'view_companies', 'view_clients',
    'view_bills', 'view_invoices', 'view_vendors', 'view_customers', 'view_ledger',
    'view_banking', 'view_tax', 'view_reports',
    'view_audit', 'create_audit_engagement',
    'view_documents', 'use_ai_assistant', 'view_reminders', 'view_automations', 'view_settings'
  ]);

  // Reviewer: audit review + approvals
  grantOnly('Reviewer', [
    'view_dashboard', 'view_companies', 'view_clients',
    'view_bills', 'view_invoices', 'view_ledger', 'view_banking', 'view_reports',
    'view_audit', 'create_audit_engagement', 'sign_off_audit',
    'view_documents', 'use_ai_assistant', 'approve_ai_action', 'view_reminders', 'view_automations', 'view_settings'
  ]);

  // Client User: portal read access
  grantOnly('Client User', [
    'view_dashboard', 'view_bills', 'view_invoices', 'view_reports', 'view_reminders'
  ]);

  console.log('Default roles and permissions seeded.');
}