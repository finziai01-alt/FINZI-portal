require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Database = require('better-sqlite3');

// Optional integration service layers (honestly pending when credentials absent)
const { extractDocument, isConfigured: ocrConfigured } = require('./services/ocr');
const {
  prepareGSTR3B, fileReturn, getAuthorizationUrl, exchangeCodeForToken,
  isConfigured: gstnConfigured,
} = require('./services/tax-filing');
const { sendReminder, isEmailConfigured, isSmsConfigured } = require('./services/notification');
const { generateResponse, buildDefaultSystemPrompt, isConfigured: aiConfigured } = require('./services/ai');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'finzi-ai-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || String(25 * 1024 * 1024), 10);

const dbPath = path.join(__dirname, '..', 'db', 'finzi.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Ledger posting (single shared connection)
const { postBillJournal, postInvoiceJournal } = require('./ledger')(db);

const genId = () => crypto.randomBytes(16).toString('hex');
const nowStr = () => new Date().toISOString();

function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function parseDateIN(val) {
  if (!val) return null;
  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) d = new Date(val + 'T00:00:00');
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const p = val.split('/'); d = new Date(`${p[2]}-${p[1]}-${p[0]}T00:00:00`);
  } else d = new Date(val);
  return (d && !isNaN(d.getTime())) ? d.toISOString() : null;
}
function formatMoneyIN(amount) {
  const n = Math.round(parseFloat(amount || 0) * 100) / 100;
  const neg = n < 0; const abs = Math.abs(n);
  const parts = abs.toFixed(2).split('.');
  // Indian digit grouping: last 3 digits, then groups of 2 (lakhs/crores)
  const last3 = parts[0].slice(-3);
  const rest = parts[0].slice(0, -3);
  const intPart = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return `${neg ? '-' : ''}₹${intPart}.${parts[1]}`;
}
function formatDateIN(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }
  return '';
}

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  next();
};

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user; next();
  });
}

function requirePermission(permissionName) {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') return next();
    const perms = req.user.permissions || [];
    if (!perms.includes(permissionName)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function requireCompanyAccess(req, res, next) {
  const companyId = req.query.company_id || req.body.company_id || req.params.company_id || req.user.companyId;
  if (!companyId) return res.status(400).json({ error: 'company_id is required' });
  const membership = db.prepare(
    `SELECT cm.*, u.role as user_role FROM company_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.company_id = ? AND cm.user_id = ? AND cm.status = 'active'`
  ).get(companyId, req.user.userId);
  if (!membership && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied to this company' });
  }
  req.companyId = companyId; req.membership = membership; next();
}

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => { console.log(`${new Date().toISOString()} ${req.method} ${req.path}`); next(); });

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'finzi-ai-server', timestamp: new Date().toISOString() }));

// Integration readiness, read from the server environment so the UI never claims a live service
app.get('/api/integrations/status', authenticateToken, (req, res) => {
  const isSet = (value) => {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    return !/^(your[_-]|replace|changeme|xxx|<|placeholder)/i.test(v);
  };
  res.json({
    integrations: [
      { key: 'gstn', label: 'GSTN gateway for direct filing', configured: isSet(process.env.GSTN_CLIENT_ID) && isSet(process.env.GSTN_CLIENT_SECRET) },
      { key: 'ocr', label: 'Document OCR extraction', configured: isSet(process.env.OCR_ACCESS_KEY_ID) && isSet(process.env.OCR_SECRET_ACCESS_KEY) },
      { key: 'email', label: 'Email notifications', configured: isSet(process.env.EMAIL_API_KEY) },
      { key: 'sms', label: 'SMS notifications', configured: isSet(process.env.SMS_API_KEY) || (isSet(process.env.TWILIO_ACCOUNT_SID) && isSet(process.env.TWILIO_AUTH_TOKEN)) },
      { key: 'ai', label: 'FINZI AI model providers', configured: isSet(process.env.GEMINI_API_KEY) || isSet(process.env.NVIDIA_API_KEY) },
    ],
  });
});

// ============================================================
// AUTH
// ============================================================

function getPermissionsForRole(roleId) {
  if (!roleId) return [];
  return db.prepare(`SELECT p.name FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = ?`).all(roleId).map(p => p.name);
}

app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('full_name').trim().notEmpty(),
  body('phone').optional().trim(),
  handleValidation
], (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
    const userId = genId();
    const ts = nowStr();
    db.prepare('INSERT INTO users (id, email, password_hash, phone, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, email, passwordHash, phone || null, 'user', ts, ts);
    db.prepare('INSERT INTO user_profiles (id, user_id, full_name, created_at, updated_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)').run(userId, full_name, ts, ts);
    const orgId = genId();
    db.prepare('INSERT INTO organizations (id, name, legal_name, trade_name, business_type, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(orgId, `${full_name}'s Workspace`, `${full_name}'s Workspace`, null, 'proprietorship', ts, ts, userId);
    const companyId = genId();
    db.prepare('INSERT INTO companies (id, organization_id, legal_name, trade_name, business_type, base_currency, accounting_method, gst_registration_status, is_active, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(companyId, orgId, `${full_name}'s Company`, null, 'proprietorship', 'INR', 'accrual', 'regular', 1, ts, ts, userId);
    // Seed chart of accounts for the new company
    seedChartOfAccounts(companyId, userId);
    const ownerRole = db.prepare("SELECT id FROM roles WHERE name = 'Workspace Owner' AND is_system = 1 LIMIT 1").get();
    db.prepare('INSERT INTO company_members (id, company_id, user_id, role_id, status, invited_at, joined_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)').run(companyId, userId, ownerRole ? ownerRole.id : null, 'active', ts, ts);
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
    db.prepare('INSERT INTO verification_tokens (id, user_id, token, type, expires_at, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)').run(userId, token, 'email_verification', new Date(Date.now() + 3600000).toISOString(), ts);
    db.prepare('INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)').run(userId, 'user_registered', 'users', userId, JSON.stringify({ email }), ts);

    const permissions = getPermissionsForRole(ownerRole ? ownerRole.id : '');
    const tokenPayload = { userId, email, role: 'user', userRole: 'workspace_owner', companyId, permissions };
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.status(201).json({ message: 'Registration successful.', user: { id: userId, email, full_name, phone, role: 'user' }, token: accessToken });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidation
], (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated' });
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowStr(), user.id);
    const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(user.id);
    const memberships = db.prepare(`SELECT cm.*, c.legal_name as company_name, c.trade_name, c.gstin, c.pan, c.id as company_id FROM company_members cm JOIN companies c ON c.id = cm.company_id WHERE cm.user_id = ? AND cm.status = 'active'`).all(user.id);
    if (memberships.length === 0) return res.status(403).json({ error: 'No company access. Please contact your administrator.' });
    const defaultCompany = memberships[0];
    const permissions = getPermissionsForRole(defaultCompany.role_id || '');
    const tokenPayload = { userId: user.id, email: user.email, role: user.role, userRole: defaultCompany.role_id ? (db.prepare('SELECT name FROM roles WHERE id = ?').get(defaultCompany.role_id) || { name: 'user' }).name : 'user', companyId: defaultCompany.company_id, companyName: defaultCompany.company_name, companyGstin: defaultCompany.gstin, memberships, permissions };
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ message: 'Login successful', user: { id: user.id, email: user.email, full_name: profile ? profile.full_name : null, avatar_url: profile ? profile.avatar_url : null, phone: user.phone, is_verified: user.is_verified }, token: accessToken, company: { id: defaultCompany.company_id, name: defaultCompany.company_name, legal_name: defaultCompany.company_name, trade_name: defaultCompany.trade_name, gstin: defaultCompany.gstin, pan: defaultCompany.pan }, companies: memberships.map(m => ({ id: m.company_id, name: m.company_name, legal_name: m.company_name, trade_name: m.trade_name, gstin: m.gstin, pan: m.pan, role_id: m.role_id, role_name: m.role_id ? (db.prepare('SELECT name FROM roles WHERE id = ?').get(m.role_id) || { name: 'user' }).name : 'user' })), requiresVerification: !user.is_verified });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => res.json({ message: 'Logged out successfully' }));
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, phone, is_verified, is_active, role, created_at, last_login_at FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(user.id);
  // Re-issue an access token so page refreshes keep working, and return company context
  const memberships = db.prepare(`SELECT cm.*, c.legal_name, c.trade_name, c.gstin, c.pan FROM company_members cm JOIN companies c ON c.id = cm.company_id WHERE cm.user_id = ? AND cm.status = 'active'`).all(user.id);
  if (memberships.length === 0) return res.status(403).json({ error: 'No company access. Please contact your administrator.' });
  const activeMembership = memberships.find(m => m.company_id === req.user.companyId) || memberships[0];
  const permissions = getPermissionsForRole(activeMembership.role_id || '');
  const roleName = activeMembership.role_id ? (db.prepare('SELECT name FROM roles WHERE id = ?').get(activeMembership.role_id) || { name: 'user' }).name : 'user';
  const accessToken = jwt.sign({
    userId: user.id, email: user.email, role: user.role, userRole: roleName,
    companyId: activeMembership.company_id, companyName: activeMembership.legal_name,
    companyGstin: activeMembership.gstin, memberships, permissions,
  }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const companies = memberships.map(m => ({ id: m.company_id, legal_name: m.legal_name, trade_name: m.trade_name, gstin: m.gstin, pan: m.pan, role_id: m.role_id, role_name: m.role_id ? (db.prepare('SELECT name FROM roles WHERE id = ?').get(m.role_id) || { name: 'user' }).name : 'user' }));
  const { id: _profileId, ...safeProfile } = profile || {};
  res.json({
    user: { ...user, ...safeProfile },
    token: accessToken,
    company: { id: activeMembership.company_id, name: activeMembership.legal_name, legal_name: activeMembership.legal_name, trade_name: activeMembership.trade_name, gstin: activeMembership.gstin, pan: activeMembership.pan },
    companies,
    permissions,
  });
});

app.post('/api/auth/change-password', authenticateToken, [body('current_password').notEmpty(), body('new_password').isLength({ min: 8 }), handleValidation], (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!bcrypt.compareSync(current_password, user.password_hash)) return res.status(401).json({ error: 'Current password is not correct' });
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(bcrypt.hashSync(new_password, BCRYPT_SALT_ROUNDS), nowStr(), user.id);
    db.prepare('INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)').run(req.user.userId, 'password_changed', 'users', user.id, JSON.stringify({}), nowStr());
    res.json({ message: 'Password updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Could not update the password' }); }
});

app.post('/api/auth/forgot-password', [body('email').isEmail().normalizeEmail(), handleValidation], (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) return res.status(200).json({ message: 'If the email exists, a reset link has been sent' });
    const token = jwt.sign({ userId: user.id, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
    db.prepare('INSERT INTO password_resets (id, user_id, token, expires_at, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)').run(user.id, token, new Date(Date.now() + 3600000).toISOString(), nowStr());
    res.json({ message: 'If the email exists, a reset link has been sent', resetToken: token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/api/auth/reset-password', [body('token').notEmpty(), body('password').isLength({ min: 8 }), handleValidation], (req, res) => {
  try {
    const { token, password } = req.body;
    const reset = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > ?').get(token, nowStr());
    if (!reset) return res.status(400).json({ error: 'Invalid or expired reset token' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS), reset.user_id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(nowStr(), reset.id);
    res.json({ message: 'Password reset successful' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Password reset failed' });
  }
});

app.post('/api/auth/verify-otp', [body('token').notEmpty(), body('type').isIn(['email_verification', 'phone_otp']), handleValidation], (req, res) => {
  try {
    const { token, type } = req.body;
    const vt = db.prepare('SELECT * FROM verification_tokens WHERE token = ? AND type = ? AND used_at IS NULL AND expires_at > ?').get(token, type, nowStr());
    if (!vt) return res.status(400).json({ error: 'Invalid or expired OTP' });
    db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(vt.user_id);
    db.prepare('UPDATE verification_tokens SET used_at = ? WHERE id = ?').run(nowStr(), vt.id);
    res.json({ message: 'Verification successful' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/auth/switch-company', authenticateToken, [body('company_id').notEmpty(), handleValidation], (req, res) => {
  try {
    const { company_id } = req.body;
    const membership = db.prepare(`SELECT cm.*, c.legal_name as company_name, c.gstin FROM company_members cm JOIN companies c ON c.id = cm.company_id WHERE cm.company_id = ? AND cm.user_id = ? AND cm.status = 'active'`).get(company_id, req.user.userId);
    if (!membership) return res.status(403).json({ error: 'No access to this company' });
    const permissions = getPermissionsForRole(membership.role_id || '');
    const roleName = membership.role_id ? (db.prepare('SELECT name FROM roles WHERE id = ?').get(membership.role_id) || { name: 'user' }).name : 'user';
    const tokenPayload = { userId: req.user.userId, email: req.user.email, role: req.user.role, userRole: roleName, companyId: company_id, companyName: membership.company_name, companyGstin: membership.gstin, memberships: req.user.memberships, permissions };
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token: accessToken, company: { id: company_id, name: membership.company_name, gstin: membership.gstin } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to switch company' });
  }
});

// ============================================================
// COMPANIES
// ============================================================

app.get('/api/companies', authenticateToken, (req, res) => {
  const memberships = db.prepare(`SELECT cm.*, r.name as role_name, c.legal_name, c.trade_name, c.gstin, c.pan, c.state, c.city, c.is_active, c.created_at FROM company_members cm JOIN companies c ON c.id = cm.company_id LEFT JOIN roles r ON r.id = cm.role_id WHERE cm.user_id = ? AND cm.status = 'active'`).all(req.user.userId);
  res.json({ companies: memberships });
});

app.get('/api/companies/:id', authenticateToken, requireCompanyAccess, (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json({ company });
});

app.post('/api/companies', authenticateToken, requirePermission('create_companies'), [body('legal_name').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { legal_name, trade_name, business_type, pan, gstin, tan, registered_address, state, city, pincode, contact_email, contact_phone, financial_year_start, financial_year_end } = req.body;
    const ts = nowStr();
    const orgId = genId(); const companyId = genId();
    db.prepare('INSERT INTO organizations (id, name, legal_name, trade_name, business_type, pan, gstin, tan, registered_address, state, city, pincode, contact_email, contact_phone, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(orgId, legal_name, legal_name, trade_name, business_type, pan, gstin, tan, registered_address, state, city, pincode, contact_email, contact_phone, ts, ts, req.user.userId);
    db.prepare('INSERT INTO companies (id, organization_id, legal_name, trade_name, business_type, pan, gstin, tan, registered_address, state, city, pincode, contact_email, contact_phone, financial_year_start, financial_year_end, base_currency, accounting_method, gst_registration_status, is_active, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(companyId, orgId, legal_name, trade_name, business_type, pan, gstin, tan, registered_address, state, city, pincode, contact_email, contact_phone, financial_year_start, financial_year_end, 'INR', 'accrual', 'regular', 1, ts, ts, req.user.userId);
    const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'Company Admin' AND is_system = 1 LIMIT 1").get();
    db.prepare('INSERT INTO company_members (id, company_id, user_id, role_id, status, invited_at, joined_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)').run(companyId, req.user.userId, adminRole ? adminRole.id : null, 'active', ts, ts);
    if (financial_year_start && financial_year_end) {
      const fyId = genId();
      db.prepare('INSERT INTO financial_years (id, company_id, name, start_date, end_date, is_current, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 1, ?)').run(companyId, `${new Date(financial_year_start).getFullYear()}-${new Date(financial_year_end).getFullYear()}`, financial_year_start, financial_year_end, ts);
    }
    seedChartOfAccounts(companyId, req.user.userId);
    res.status(201).json({ message: 'Company created', companyId, organizationId: orgId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create company' });
  }
});

app.put('/api/companies/:id', authenticateToken, requireCompanyAccess, requirePermission('edit_companies'), handleValidation, (req, res) => {
  const fields = ['legal_name','trade_name','business_type','pan','gstin','tan','registered_address','state','city','pincode','contact_email','contact_phone','accounting_method','gst_registration_status'];
  const updates = [], values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push('updated_at = ?'); values.push(nowStr(), req.params.id);
  db.prepare(`UPDATE companies SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ message: 'Company updated' });
});

// ============================================================
// USERS / TEAM
// ============================================================
app.get('/api/users', authenticateToken, requireCompanyAccess, (req, res) => {
  const users = db.prepare(`SELECT u.id, u.email, u.phone, u.is_active, u.created_at, u.last_login_at, up.full_name, up.designation, up.department, up.employee_id, up.avatar_url, cm.role_id, cm.status as membership_status FROM users u JOIN company_members cm ON cm.user_id = u.id LEFT JOIN user_profiles up ON up.user_id = u.id WHERE cm.company_id = ?`).all(req.companyId);
  res.json({ users });
});
app.get('/api/roles', authenticateToken, (req, res) => {
  const roles = db.prepare('SELECT * FROM roles WHERE is_system = 1 ORDER BY level').all();
  res.json({ roles });
});

// ============================================================
// DASHBOARD
// ============================================================
app.get('/api/dashboard/summary', authenticateToken, requireCompanyAccess, (req, res) => {
  const companyId = req.companyId;
  const bills = db.prepare('SELECT * FROM bills WHERE company_id = ?').all(companyId);
  const invoices = db.prepare('SELECT * FROM invoices WHERE company_id = ?').all(companyId);
  const bankAccounts = db.prepare('SELECT * FROM bank_accounts WHERE company_id = ? AND is_active = 1').all(companyId);
  const totalReceivables = invoices.reduce((s, inv) => s + parseFloat(inv.balance_due || 0), 0);
  const totalPayables = bills.reduce((s, bill) => s + parseFloat(bill.balance_due || 0), 0);
  const totalBankBalance = bankAccounts.reduce((s, ba) => s + parseFloat(ba.book_balance || 0), 0);

  // Revenue and expenses come from the posted ledger, so the dashboard agrees with the
  // P&L report: output GST is a liability and input GST is an asset, not income or expense.
  const pl = profitLossFromMovements(accountMovements(companyId));
  const totalRevenue = pl.totalIncome;
  const totalExpenses = pl.totalExpenses;
  const netProfit = pl.netProfit;
  const activities = db.prepare(`SELECT al.*, u.email, up.full_name FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id LEFT JOIN user_profiles up ON up.user_id = u.id WHERE al.company_id = ? ORDER BY al.created_at DESC LIMIT 10`).all(companyId);

  // Real period-over-period change: current calendar month vs previous calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const inPeriod = (iso, from, to) => { const d = new Date(iso); return d >= from && d < to; };
  const pctChange = (cur, prev) => prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100;
  const fmtChange = (p) => p === null ? null : `${p >= 0 ? '+' : ''}${p.toFixed(1)}% vs last month`;

  // Monthly series for the last 6 calendar months, read from posted journal entry lines
  const monthBuckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.toLocaleString('en-IN', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`,
      revenue: 0,
      expenses: 0,
    });
  }
  const bucketFor = (key) => monthBuckets.find((b) => b.key === key);
  const monthlyRows = db.prepare(`
    SELECT strftime('%Y-%m', je.entry_date) AS month,
           a.account_group AS grp,
           SUM(jel.debit_amount) AS debit,
           SUM(jel.credit_amount) AS credit
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN accounts a ON a.id = jel.account_id
    WHERE je.company_id = ? AND je.status = 'posted' AND a.account_group IN ('income','expense')
    GROUP BY month, grp
  `).all(companyId);
  for (const row of monthlyRows) {
    const b = bucketFor(row.month);
    if (!b) continue;
    const debit = parseFloat(row.debit || 0);
    const credit = parseFloat(row.credit || 0);
    if (row.grp === 'income') b.revenue += credit - debit;
    else b.expenses += debit - credit;
  }
  const monthly = monthBuckets.map((b) => ({ label: b.label, revenue: b.revenue, expenses: b.expenses, net: b.revenue - b.expenses }));

  const revThis = monthly[monthly.length - 1].revenue;
  const revPrev = monthly[monthly.length - 2].revenue;
  const expThis = monthly[monthly.length - 1].expenses;
  const expPrev = monthly[monthly.length - 2].expenses;

  const recvThis = invoices.filter(i => inPeriod(i.invoice_date || i.created_at, monthStart, now)).reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);
  const recvPrev = invoices.filter(i => inPeriod(i.invoice_date || i.created_at, prevMonthStart, prevMonthEnd)).reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);
  const payThis = bills.filter(b => inPeriod(b.invoice_date || b.created_at, monthStart, now)).reduce((s, b) => s + parseFloat(b.balance_due || 0), 0);
  const payPrev = bills.filter(b => inPeriod(b.invoice_date || b.created_at, prevMonthStart, prevMonthEnd)).reduce((s, b) => s + parseFloat(b.balance_due || 0), 0);

  res.json({
    kpis: [
      { label: 'Total receivables', value: formatMoneyIN(totalReceivables), change: fmtChange(pctChange(recvThis, recvPrev)), trend: 'up' },
      { label: 'Total payables', value: formatMoneyIN(totalPayables), change: fmtChange(pctChange(payThis, payPrev)), trend: 'down' },
      { label: 'Cash and bank balance', value: formatMoneyIN(totalBankBalance), change: null, trend: 'up' },
      { label: 'Total revenue', value: formatMoneyIN(totalRevenue), change: fmtChange(pctChange(revThis, revPrev)), trend: 'up' },
      { label: 'Total expenses', value: formatMoneyIN(totalExpenses), change: fmtChange(pctChange(expThis, expPrev)), trend: 'up' },
      { label: 'Net profit', value: formatMoneyIN(netProfit), change: null, trend: netProfit >= 0 ? 'up' : 'down', margin: totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : null }
    ],
    monthly,
    receivables: invoices.filter(i => i.balance_due > 0).map(i => ({ id: i.id, invoice_number: i.invoice_number, customer_name: i.customer_name, amount: parseFloat(i.balance_due), due_date: i.due_date, status: i.status })),
    payables: bills.filter(b => b.balance_due > 0).map(b => ({ id: b.id, bill_number: b.bill_number, vendor_name: b.vendor_name, amount: parseFloat(b.balance_due), due_date: b.due_date, status: b.status })),
    recent_activity: activities.map(a => ({ id: a.id, actor: a.full_name || a.email, action: a.action, entity: a.entity_type, time: a.created_at })),
    overdue_count: bills.filter(b => b.status === 'overdue').length + invoices.filter(i => i.status === 'overdue').length,
    alerts: []
  });
});

// ============================================================
// BILLS & EXPENSES
// ============================================================

app.get('/api/bills', authenticateToken, requireCompanyAccess, (req, res) => {
  const { status, vendor_id, search, page = 1, limit = 50 } = req.query;
  let sql = `SELECT b.*, v.name as vendor_name FROM bills b LEFT JOIN vendors v ON v.id = b.vendor_id WHERE b.company_id = ?`;
  const params = [req.companyId];
  if (status) { sql += ` AND b.status = ?`; params.push(status); }
  if (vendor_id) { sql += ` AND b.vendor_id = ?`; params.push(vendor_id); }
  if (search) { sql += ` AND (b.bill_number LIKE ? OR b.vendor_name LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  const bills = db.prepare(sql).all(...params);
  res.json({ bills });
});

app.get('/api/bills/:id', authenticateToken, requireCompanyAccess, (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(req.params.id);
  res.json({ bill: { ...bill, items } });
});

app.post('/api/bills', authenticateToken, requireCompanyAccess, requirePermission('create_bills'), [
  body('bill_number').trim().notEmpty(),
  body('vendor_name').trim().notEmpty(),
  handleValidation
], (req, res) => {
  try {
    const { bill_number, vendor_id, vendor_name, vendor_gstin, invoice_number, invoice_date, due_date, purchase_account, cost_centre, taxable_value, cgst, sgst, igst, cess, discount, round_off, grand_total, tds_amount, tds_section, net_payable, payment_terms, notes, status = 'draft', ocr_status = 'manual' } = req.body;
    const ts = nowStr();
    const amountPaid = 0;
    const balanceDue = parseMoney(grand_total) - amountPaid;
    const billId = genId();
    db.prepare(
      `INSERT INTO bills (id, company_id, bill_number, vendor_id, vendor_name, vendor_gstin, invoice_number, invoice_date, due_date, purchase_account, cost_centre, taxable_value, cgst, sgst, igst, cess, discount, round_off, grand_total, tds_amount, tds_section, net_payable, amount_paid, balance_due, status, payment_terms, notes, ocr_status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(billId, req.companyId, bill_number, vendor_id || null, vendor_name, vendor_gstin || null, invoice_number || null, parseDateIN(invoice_date) || null, parseDateIN(due_date) || null, purchase_account || null, cost_centre || null, parseMoney(taxable_value), parseMoney(cgst), parseMoney(sgst), parseMoney(igst), parseMoney(cess), parseMoney(discount), parseMoney(round_off), parseMoney(grand_total), parseMoney(tds_amount), tds_section || null, parseMoney(net_payable) || parseMoney(grand_total), amountPaid, balanceDue, status, payment_terms || null, notes || null, ocr_status, req.user.userId, ts, ts);
    const items = req.body.items || [];
    for (const item of items) {
      db.prepare(`INSERT INTO bill_items (id, bill_id, description, hsn_sac, quantity, unit, rate, discount_percent, taxable_amount, gst_rate, cgst, sgst, igst, total, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(billId, item.description, item.hsn_sac || null, parseMoney(item.quantity) || 1, item.unit || null, parseMoney(item.rate), parseMoney(item.discount_percent) || 0, parseMoney(item.taxable_amount), parseMoney(item.gst_rate) || 0, parseMoney(item.cgst), parseMoney(item.sgst), parseMoney(item.igst), parseMoney(item.total), ts);
    }
    db.prepare('INSERT INTO activity_logs (id, company_id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)').run(req.companyId, req.user.userId, 'bill_created', 'bills', billId, JSON.stringify({ bill_number }), ts);
    const jeId = postBillJournal(billId);
    res.status(201).json({ message: 'Bill created', billId, journal_entry_id: jeId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create bill' });
  }
});

app.put('/api/bills/:id', authenticateToken, requireCompanyAccess, requirePermission('edit_bills'), handleValidation, (req, res) => {
  try {
    if (!db.prepare('SELECT id FROM bills WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId)) return res.status(404).json({ error: 'Bill not found' });
    const fields = ['vendor_name','vendor_gstin','invoice_number','invoice_date','due_date','purchase_account','cost_centre','taxable_value','cgst','sgst','igst','cess','discount','round_off','grand_total','tds_amount','tds_section','net_payable','payment_terms','notes','status'];
    const updates = [], values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        let val = req.body[f];
        if (['invoice_date','due_date'].includes(f)) val = parseDateIN(val) || null;
        if (typeof val === 'number' || (val !== null && val !== undefined && !isNaN(parseFloat(val)) && !['vendor_name','invoice_number','purchase_account','cost_centre','tds_section','payment_terms','notes','status'].includes(f))) val = parseMoney(val);
        updates.push(`${f} = ?`); values.push(val);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    if (req.body.grand_total !== undefined) {
      const current = db.prepare('SELECT amount_paid FROM bills WHERE id = ?').get(req.params.id);
      const newBalance = parseMoney(req.body.grand_total) - parseFloat(current.amount_paid || 0);
      updates.push('balance_due = ?'); values.push(newBalance);
      if (newBalance <= 0) { updates.push('status = ?'); values.push('paid'); }
    }
    updates.push('updated_at = ?'); values.push(nowStr(), req.params.id);
    db.prepare(`UPDATE bills SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const jeId = postBillJournal(req.params.id);
    res.json({ message: 'Bill updated', journal_entry_id: jeId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update bill' });
  }
});

app.delete('/api/bills/:id', authenticateToken, requireCompanyAccess, requirePermission('delete_bills'), (req, res) => {
  const bill = db.prepare('SELECT id, status FROM bills WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  if (bill.status !== 'draft') return res.status(400).json({ error: 'Only draft bills can be deleted' });
  db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(req.params.id);
  db.prepare('DELETE FROM bills WHERE id = ?').run(req.params.id);
  res.json({ message: 'Bill deleted' });
});

// Duplicate a bill into a new draft (real copy, never a silent financial post)
app.post('/api/bills/:id/duplicate', authenticateToken, requireCompanyAccess, requirePermission('create_bills'), (req, res) => {
  try {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id);
    const ts = nowStr();
    const newBillId = genId();
    const billNumber = `${bill.bill_number}-COPY-${Date.now().toString().slice(-5)}`;
    db.prepare(`INSERT INTO bills (id, company_id, bill_number, vendor_id, vendor_name, vendor_gstin, invoice_number, invoice_date, due_date, purchase_account, cost_centre, taxable_value, cgst, sgst, igst, cess, discount, round_off, grand_total, tds_amount, tds_section, net_payable, amount_paid, balance_due, status, payment_terms, notes, ocr_status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'draft', ?, ?, 'manual', ?, ?, ?)`).run(newBillId, req.companyId, billNumber, bill.vendor_id, bill.vendor_name, bill.vendor_gstin, bill.invoice_number, bill.invoice_date, bill.due_date, bill.purchase_account, bill.cost_centre, bill.taxable_value, bill.cgst, bill.sgst, bill.igst, bill.cess, bill.discount, bill.round_off, bill.grand_total, bill.tds_amount, bill.tds_section, bill.net_payable, bill.grand_total, bill.payment_terms, bill.notes, req.user.userId, ts, ts);
    for (const item of items) {
      db.prepare(`INSERT INTO bill_items (id, bill_id, description, hsn_sac, quantity, unit, rate, discount_percent, taxable_amount, gst_rate, cgst, sgst, igst, total, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(newBillId, item.description, item.hsn_sac, item.quantity, item.unit, item.rate, item.discount_percent, item.taxable_amount, item.gst_rate, item.cgst, item.sgst, item.igst, item.total, ts);
    }
    res.status(201).json({ message: 'Bill duplicated as draft', billId: newBillId, bill_number: billNumber });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to duplicate bill' });
  }
});
app.post('/api/bills/:id/payment', authenticateToken, requireCompanyAccess, requirePermission('record_payment_bills'), [body('amount').isNumeric(), handleValidation], (req, res) => {
  try {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const amount = parseMoney(req.body.amount);
    const balanceDue = parseFloat(bill.balance_due || 0);
    if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (amount > balanceDue) return res.status(400).json({ error: 'Amount exceeds balance due' });
    // Validate the bank account belongs to this company when provided
    let bankAccount = null;
    if (req.body.bank_account_id) {
      bankAccount = db.prepare('SELECT * FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1').get(req.body.bank_account_id, req.companyId);
      if (!bankAccount) return res.status(400).json({ error: 'Invalid bank account for this company' });
    }
    const ts = nowStr();
    const paymentId = genId();
    const paymentNumber = `PAY-${Date.now()}`;
    const paymentDate = parseDateIN(req.body.payment_date) || ts;
    db.prepare(`INSERT INTO payments (id, company_id, payment_number, payment_date, payment_type, party_type, party_id, party_name, amount, payment_method, bank_account_id, reference_number, utr_number, narration, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(paymentId, req.companyId, paymentNumber, paymentDate, 'vendor_payment', 'vendor', bill.vendor_id || null, bill.vendor_name, amount, req.body.payment_method || null, bankAccount ? bankAccount.id : null, req.body.reference_number || null, req.body.utr_number || null, `Payment against bill ${bill.bill_number}`, 'completed', req.user.userId, ts, ts);
    const newAmountPaid = parseFloat(bill.amount_paid || 0) + amount;
    const newBalance = balanceDue - amount;
    let newStatus = bill.status;
    if (newBalance <= 0) newStatus = 'paid'; else if (newAmountPaid > 0) newStatus = 'partially_paid';
    db.prepare('UPDATE bills SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ? WHERE id = ?').run(newAmountPaid, newBalance, newStatus, ts, req.params.id);
    db.prepare(`INSERT INTO payment_allocations (id, payment_id, bill_id, amount, allocated_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)`).run(paymentId, req.params.id, amount, ts);
    // Double-entry journal entry: Debit Accounts Payable, Credit Bank/Cash
    const payableAcct = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '210100'").get(req.companyId);
    let creditAcct = null;
    if (bankAccount) {
      creditAcct = db.prepare('SELECT id FROM accounts WHERE company_id = ? AND name = ?').get(req.companyId, bankAccount.bank_name)
        || db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '110200'").get(req.companyId);
    } else {
      creditAcct = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '110100'").get(req.companyId);
    }
    if (payableAcct && creditAcct) {
      const jeId = genId();
      db.prepare(`INSERT INTO journal_entries (id, company_id, entry_number, voucher_type, entry_date, reference_number, narration, total_debit, total_credit, status, cost_centre, created_by, created_at, updated_at) VALUES (?, ?, ?, 'PAYMENT', ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?)`).run(jeId, req.companyId, `JV-${paymentNumber}`, paymentDate, paymentNumber, `Payment to ${bill.vendor_name} - ${bill.bill_number}`, amount, amount, null, req.user.userId, ts, ts);
      db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, 0, ?, ?)`).run(jeId, payableAcct.id, amount, 'Accounts Payable debited', ts);
      db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, 0, ?, ?, ?)`).run(jeId, creditAcct.id, amount, bankAccount ? `Paid via ${bankAccount.bank_name}` : 'Paid via cash', ts);
      db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(amount, payableAcct.id);
      db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(amount, creditAcct.id);
      if (bankAccount) db.prepare('UPDATE bank_accounts SET book_balance = book_balance - ? WHERE id = ?').run(amount, bankAccount.id);
    }
    db.prepare('INSERT INTO activity_logs (id, company_id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)').run(req.companyId, req.user.userId, 'bill_payment_recorded', 'bills', req.params.id, JSON.stringify({ amount, payment_number: paymentNumber }), ts);
    res.status(201).json({ message: 'Payment recorded', paymentId, newStatus, newBalance });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to record payment' });
  }
});

// ============================================================
// VENDORS
// ============================================================
app.get('/api/vendors', authenticateToken, requireCompanyAccess, (req, res) => {
  const vendors = db.prepare('SELECT * FROM vendors WHERE company_id = ? AND is_active = 1 ORDER BY name').all(req.companyId);
  res.json({ vendors });
});
app.get('/api/vendors/:id', authenticateToken, requireCompanyAccess, (req, res) => {
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  res.json({ vendor });
});
app.post('/api/vendors', authenticateToken, requireCompanyAccess, requirePermission('create_vendors'), [body('name').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { name, trade_name, gstin, pan, address, city, state, pincode, contact_email, contact_phone, category, payment_terms, is_msme } = req.body;
    const ts = nowStr(); const vendorId = genId();
    db.prepare(`INSERT INTO vendors (id, company_id, name, trade_name, gstin, pan, address, city, state, pincode, contact_email, contact_phone, category, payment_terms, is_msme, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(vendorId, req.companyId, name, trade_name || null, gstin || null, pan || null, address || null, city || null, state || null, pincode || null, contact_email || null, contact_phone || null, category || null, payment_terms || null, is_msme ? 1 : 0, req.user.userId, ts, ts);
    res.status(201).json({ message: 'Vendor created', vendorId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create vendor' });
  }
});
app.put('/api/vendors/:id', authenticateToken, requireCompanyAccess, requirePermission('edit_vendors'), handleValidation, (req, res) => {
  const vendor = db.prepare('SELECT id FROM vendors WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const fields = ['name', 'trade_name', 'gstin', 'pan', 'address', 'city', 'state', 'pincode', 'contact_email', 'contact_phone', 'category', 'payment_terms'];
  const updates = [], values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (req.body.is_msme !== undefined) { updates.push('is_msme = ?'); values.push(req.body.is_msme ? 1 : 0); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push('updated_at = ?'); values.push(nowStr(), req.params.id);
  db.prepare(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ message: 'Vendor updated' });
});
app.delete('/api/vendors/:id', authenticateToken, requireCompanyAccess, requirePermission('delete_vendors'), (req, res) => {
  const vendor = db.prepare('SELECT id FROM vendors WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const usage = db.prepare('SELECT COUNT(*) as count FROM bills WHERE vendor_id = ?').get(req.params.id);
  if (usage.count > 0) return res.status(400).json({ error: 'Cannot delete vendor with existing bills' });
  db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Vendor deleted' });
});

// ============================================================
// INVOICES
// ============================================================
app.get('/api/invoices', authenticateToken, requireCompanyAccess, (req, res) => {
  const { status, customer_id, search, page = 1, limit = 50 } = req.query;
  let sql = `SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.company_id = ?`;
  const params = [req.companyId];
  if (status) { sql += ` AND i.status = ?`; params.push(status); }
  if (customer_id) { sql += ` AND i.customer_id = ?`; params.push(customer_id); }
  if (search) { sql += ` AND (i.invoice_number LIKE ? OR i.customer_name LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  sql += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  const invoices = db.prepare(sql).all(...params);
  res.json({ invoices });
});

app.get('/api/invoices/:id', authenticateToken, requireCompanyAccess, (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  res.json({ invoice: { ...invoice, items } });
});

app.post('/api/invoices', authenticateToken, requireCompanyAccess, requirePermission('create_invoices'), [
  body('invoice_number').trim().notEmpty(),
  body('customer_name').trim().notEmpty(),
  handleValidation
], (req, res) => {
  try {
    const { invoice_number, customer_id, customer_name, customer_gstin, invoice_date, due_date, place_of_supply, po_reference, subtotal, discount, cgst, sgst, igst, cess, round_off, grand_total, tds_deductible, tds_section, net_expected_inflow, payment_terms, bank_details, upi_id, notes, terms_conditions, status = 'draft' } = req.body;
    const ts = nowStr();
    const amountReceived = 0;
    const balanceDue = parseMoney(grand_total) - amountReceived;
    const invoiceId = genId();
    db.prepare(
      `INSERT INTO invoices (id, company_id, invoice_number, customer_id, customer_name, customer_gstin, invoice_date, due_date, place_of_supply, po_reference, subtotal, discount, cgst, sgst, igst, cess, round_off, grand_total, tds_deductible, tds_section, net_expected_inflow, amount_received, balance_due, status, payment_terms, bank_details, upi_id, notes, terms_conditions, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(invoiceId, req.companyId, invoice_number, customer_id || null, customer_name, customer_gstin || null, parseDateIN(invoice_date) || null, parseDateIN(due_date) || null, place_of_supply || null, po_reference || null, parseMoney(subtotal), parseMoney(discount), parseMoney(cgst), parseMoney(sgst), parseMoney(igst), parseMoney(cess), parseMoney(round_off), parseMoney(grand_total), parseMoney(tds_deductible), tds_section || null, parseMoney(net_expected_inflow) || parseMoney(grand_total), amountReceived, balanceDue, status, payment_terms || null, bank_details || null, upi_id || null, notes || null, terms_conditions || null, req.user.userId, ts, ts);
    const items = req.body.items || [];
    for (const item of items) {
      db.prepare(`INSERT INTO invoice_items (id, invoice_id, description, hsn_sac, quantity, unit, rate, discount_percent, taxable_amount, gst_rate, cgst, sgst, igst, total, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(invoiceId, item.description, item.hsn_sac || null, parseMoney(item.quantity) || 1, item.unit || null, parseMoney(item.rate), parseMoney(item.discount_percent) || 0, parseMoney(item.taxable_amount), parseMoney(item.gst_rate) || 0, parseMoney(item.cgst), parseMoney(item.sgst), parseMoney(item.igst), parseMoney(item.total), ts);
    }
    const jeId = postInvoiceJournal(invoiceId);
    res.status(201).json({ message: 'Invoice created', invoiceId, journal_entry_id: jeId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create invoice' });
  }
});

app.put('/api/invoices/:id', authenticateToken, requireCompanyAccess, requirePermission('edit_invoices'), handleValidation, (req, res) => {
  try {
    if (!db.prepare('SELECT id FROM invoices WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId)) return res.status(404).json({ error: 'Invoice not found' });
    const fields = ['customer_name','customer_gstin','invoice_date','due_date','place_of_supply','subtotal','discount','cgst','sgst','igst','cess','round_off','grand_total','tds_deductible','tds_section','net_expected_inflow','payment_terms','bank_details','upi_id','notes','terms_conditions','status'];
    const updates = [], values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        let val = req.body[f];
        if (['invoice_date','due_date'].includes(f)) val = parseDateIN(val) || null;
        if (typeof val === 'number' || (val !== null && val !== undefined && !isNaN(parseFloat(val)) && !['customer_name','customer_gstin','place_of_supply','tds_section','payment_terms','bank_details','upi_id','notes','terms_conditions','status'].includes(f))) val = parseMoney(val);
        updates.push(`${f} = ?`); values.push(val);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    if (req.body.grand_total !== undefined) {
      const current = db.prepare('SELECT amount_received FROM invoices WHERE id = ?').get(req.params.id);
      const newBalance = parseMoney(req.body.grand_total) - parseFloat(current.amount_received || 0);
      updates.push('balance_due = ?'); values.push(newBalance);
      if (newBalance <= 0) { updates.push('status = ?'); values.push('paid'); }
    }
    updates.push('updated_at = ?'); values.push(nowStr(), req.params.id);
    db.prepare(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const jeId = postInvoiceJournal(req.params.id);
    res.json({ message: 'Invoice updated', journal_entry_id: jeId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// ============================================================
// CUSTOMERS
// ============================================================
app.get('/api/customers', authenticateToken, requireCompanyAccess, (req, res) => {
  const customers = db.prepare('SELECT * FROM customers WHERE company_id = ? AND is_active = 1 ORDER BY name').all(req.companyId);
  res.json({ customers });
});
app.get('/api/customers/:id', authenticateToken, requireCompanyAccess, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json({ customer });
});
app.post('/api/customers', authenticateToken, requireCompanyAccess, requirePermission('create_customers'), [body('name').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { name, trade_name, gstin, pan, address, city, state, pincode, contact_email, contact_phone, category, payment_terms } = req.body;
    const ts = nowStr(); const customerId = genId();
    db.prepare(`INSERT INTO customers (id, company_id, name, trade_name, gstin, pan, address, city, state, pincode, contact_email, contact_phone, category, payment_terms, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(customerId, req.companyId, name, trade_name || null, gstin || null, pan || null, address || null, city || null, state || null, pincode || null, contact_email || null, contact_phone || null, category || null, payment_terms || null, req.user.userId, ts, ts);
    res.status(201).json({ message: 'Customer created', customerId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create customer' });
  }
});
app.put('/api/customers/:id', authenticateToken, requireCompanyAccess, requirePermission('edit_customers'), handleValidation, (req, res) => {
  const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const fields = ['name', 'trade_name', 'gstin', 'pan', 'address', 'city', 'state', 'pincode', 'contact_email', 'contact_phone', 'category', 'payment_terms'];
  const updates = [], values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push('updated_at = ?'); values.push(nowStr(), req.params.id);
  db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ message: 'Customer updated' });
});
app.delete('/api/customers/:id', authenticateToken, requireCompanyAccess, requirePermission('delete_customers'), (req, res) => {
  const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const usage = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?').get(req.params.id);
  if (usage.count > 0) return res.status(400).json({ error: 'Cannot delete customer with existing invoices' });
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Customer deleted' });
});

// Record a customer receipt against an invoice (mirror of bill payment)
app.post('/api/invoices/:id/receipt', authenticateToken, requireCompanyAccess, requirePermission('record_receipt_invoices'), [body('amount').isNumeric(), handleValidation], (req, res) => {
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const amount = parseMoney(req.body.amount);
    const balanceDue = parseFloat(invoice.balance_due || 0);
    if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (amount > balanceDue) return res.status(400).json({ error: 'Amount exceeds balance due' });
    let bankAccount = null;
    if (req.body.bank_account_id) {
      bankAccount = db.prepare('SELECT * FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1').get(req.body.bank_account_id, req.companyId);
      if (!bankAccount) return res.status(400).json({ error: 'Invalid bank account for this company' });
    }
    const ts = nowStr();
    const paymentId = genId();
    const receiptNumber = `RCT-${Date.now()}`;
    const paymentDate = parseDateIN(req.body.payment_date) || ts;
    db.prepare(`INSERT INTO payments (id, company_id, payment_number, payment_date, payment_type, party_type, party_id, party_name, amount, payment_method, bank_account_id, reference_number, utr_number, narration, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(paymentId, req.companyId, receiptNumber, paymentDate, 'customer_receipt', 'customer', invoice.customer_id || null, invoice.customer_name, amount, req.body.payment_method || null, bankAccount ? bankAccount.id : null, req.body.reference_number || null, req.body.utr_number || null, `Receipt against invoice ${invoice.invoice_number}`, 'completed', req.user.userId, ts, ts);
    const newReceived = parseFloat(invoice.amount_received || 0) + amount;
    const newBalance = balanceDue - amount;
    const newStatus = newBalance <= 0 ? 'paid' : (newReceived > 0 ? 'partially_paid' : invoice.status);
    db.prepare('UPDATE invoices SET amount_received = ?, balance_due = ?, status = ?, updated_at = ? WHERE id = ?').run(newReceived, newBalance, newStatus, ts, req.params.id);
    db.prepare(`INSERT INTO payment_allocations (id, payment_id, invoice_id, amount, allocated_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)`).run(paymentId, req.params.id, amount, ts);
    // Double-entry: Debit Bank/Cash, Credit Accounts Receivable
    const receivableAcct = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '120100'").get(req.companyId);
    const debitAcct = bankAccount
      ? (db.prepare('SELECT id FROM accounts WHERE company_id = ? AND name = ?').get(req.companyId, bankAccount.bank_name) || db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '110200'").get(req.companyId))
      : db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '110100'").get(req.companyId);
    if (receivableAcct && debitAcct) {
      const jeId = genId();
      db.prepare(`INSERT INTO journal_entries (id, company_id, entry_number, voucher_type, entry_date, reference_number, narration, total_debit, total_credit, status, cost_centre, created_by, created_at, updated_at) VALUES (?, ?, ?, 'RECEIPT', ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?)`).run(jeId, req.companyId, `JV-${receiptNumber}`, paymentDate, receiptNumber, `Receipt from ${invoice.customer_name} - ${invoice.invoice_number}`, amount, amount, null, req.user.userId, ts, ts);
      db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, 0, ?, ?)`).run(jeId, debitAcct.id, amount, bankAccount ? `Received via ${bankAccount.bank_name}` : 'Received in cash', ts);
      db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, 0, ?, ?, ?)`).run(jeId, receivableAcct.id, amount, 'Accounts Receivable credited', ts);
      db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(amount, debitAcct.id);
      db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(amount, receivableAcct.id);
      if (bankAccount) db.prepare('UPDATE bank_accounts SET book_balance = book_balance + ? WHERE id = ?').run(amount, bankAccount.id);
    }
    db.prepare('INSERT INTO activity_logs (id, company_id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)').run(req.companyId, req.user.userId, 'invoice_receipt_recorded', 'invoices', req.params.id, JSON.stringify({ amount, receipt_number: receiptNumber }), ts);
    res.status(201).json({ message: 'Receipt recorded', paymentId, newStatus, newBalance });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to record receipt' });
  }
});

// ============================================================
// LEDGER & JOURNAL ENTRIES
// ============================================================
app.get('/api/accounts', authenticateToken, requireCompanyAccess, (req, res) => {
  const accounts = db.prepare('SELECT * FROM accounts WHERE company_id = ? AND is_active = 1 ORDER BY code').all(req.companyId);
  res.json({ accounts });
});
app.get('/api/accounts/:id', authenticateToken, requireCompanyAccess, (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json({ account });
});
app.post('/api/accounts', authenticateToken, requireCompanyAccess, requirePermission('create_account'), [body('code').trim().notEmpty(), body('name').trim().notEmpty(), body('account_group').isIn(['assets','liabilities','equity','income','expense']), handleValidation], (req, res) => {
  try {
    const { code, name, account_group, account_type, parent_id, opening_balance } = req.body;
    const ts = nowStr(); const accountId = genId();
    db.prepare(`INSERT INTO accounts (id, company_id, code, name, account_group, account_type, parent_id, opening_balance, current_balance, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(accountId, req.companyId, code, name, account_group, account_type || account_group, parent_id || null, parseMoney(opening_balance), parseMoney(opening_balance), req.user.userId, ts, ts);
    res.status(201).json({ message: 'Account created', accountId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create account' });
  }
});
app.put('/api/accounts/:id', authenticateToken, requireCompanyAccess, requirePermission('edit_account'), handleValidation, (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const fields = ['name', 'account_type', 'parent_id', 'is_active'];
  const updates = [], values = [];
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); } }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push('updated_at = ?'); values.push(nowStr(), req.params.id);
  db.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ message: 'Account updated' });
});

app.get('/api/journal-entries', authenticateToken, requireCompanyAccess, (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  let sql = `SELECT * FROM journal_entries WHERE company_id = ?`; const params = [req.companyId];
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY entry_date DESC, created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  const entries = db.prepare(sql).all(...params);
  res.json({ journal_entries: entries });
});
app.get('/api/journal-entries/:id', authenticateToken, requireCompanyAccess, (req, res) => {
  const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
  const lines = db.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?').all(req.params.id);
  res.json({ journal_entry: { ...entry, lines } });
});
app.post('/api/journal-entries', authenticateToken, requireCompanyAccess, requirePermission('create_journal_entry'), [
  body('entry_date').notEmpty(), body('narration').trim().notEmpty(), body('lines').isArray({ min: 2 }), handleValidation
], (req, res) => {
  try {
    const { entry_date, voucher_type = 'JV', reference_number, narration, cost_centre, lines } = req.body;
    const ts = nowStr();
    // Resolve account codes to IDs and verify every account belongs to this company (tenant isolation)
    const resolvedLines = [];
    for (const l of lines) {
      let acctId = l.account_id;
      const hasDebit = parseMoney(l.debit_amount) > 0;
      const hasCredit = parseMoney(l.credit_amount) > 0;
      if (!hasDebit && !hasCredit) return res.status(400).json({ error: 'Each line must have a debit or credit amount' });
      if (hasDebit && hasCredit) return res.status(400).json({ error: 'A line cannot have both a debit and a credit amount' });
      // If it looks like an account code (numeric starting with 1-5), look up the ID
      if (acctId && /^[1-5]\d{5,}$/.test(String(acctId))) {
        const acct = db.prepare('SELECT id FROM accounts WHERE company_id = ? AND code = ?').get(req.companyId, String(acctId));
        if (!acct) return res.status(400).json({ error: `Account code ${acctId} not found in this company` });
        acctId = acct.id;
      }
      const owned = acctId ? db.prepare('SELECT id FROM accounts WHERE id = ? AND company_id = ? AND is_active = 1').get(acctId, req.companyId) : null;
      if (!owned) return res.status(400).json({ error: 'Invalid account — not found in this company' });
      resolvedLines.push({ account_id: owned.id, debit_amount: parseMoney(l.debit_amount), credit_amount: parseMoney(l.credit_amount), description: l.description || null, cost_centre: l.cost_centre || null });
    }
    let totalDebit = 0, totalCredit = 0;
    const parsedLines = resolvedLines;
    for (const l of parsedLines) { totalDebit += l.debit_amount; totalCredit += l.credit_amount; }
    if (Math.abs(totalDebit - totalCredit) > 0.01) return res.status(400).json({ error: `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}` });
    const entryId = genId(); const entryNumber = `JV-${Date.now()}`;
    db.prepare(`INSERT INTO journal_entries (id, company_id, entry_number, voucher_type, entry_date, reference_number, narration, total_debit, total_credit, status, cost_centre, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?)`).run(entryId, req.companyId, entryNumber, voucher_type, parseDateIN(entry_date) || ts, reference_number || null, narration, totalDebit, totalCredit, cost_centre || null, req.user.userId, ts, ts);
    for (const l of parsedLines) {
      db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, cost_centre, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)`).run(entryId, l.account_id, l.debit_amount, l.credit_amount, l.description, l.cost_centre, ts);
      if (l.debit_amount > 0) db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(l.debit_amount, l.account_id);
      if (l.credit_amount > 0) db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(l.credit_amount, l.account_id);
    }
    res.status(201).json({ message: 'Journal entry posted', entryId, entryNumber });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to post journal entry' }); }
});
app.get('/api/trial-balance', authenticateToken, requireCompanyAccess, (req, res) => {
  // Trial balance is aggregated from posted journal entry lines (not account groups),
  // so debit and credit totals always reflect the actual double-entry ledger.
  const rows = db.prepare(`
    SELECT a.code, a.name, a.account_group,
           COALESCE(SUM(jel.debit_amount), 0) AS total_debit,
           COALESCE(SUM(jel.credit_amount), 0) AS total_credit
    FROM accounts a
    LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
    WHERE a.company_id = ? AND a.is_active = 1
    GROUP BY a.id, a.code, a.name, a.account_group
    ORDER BY a.code
  `).all(req.companyId);
  let totalDebit = 0, totalCredit = 0;
  const tb = rows.map(r => {
    const debit = parseFloat(r.total_debit || 0);
    const credit = parseFloat(r.total_credit || 0);
    totalDebit += debit; totalCredit += credit;
    return { code: r.code, name: r.name, group: r.account_group, debit, credit };
  });
  res.json({ trial_balance: tb, total_debit: totalDebit, total_credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
});

// ============================================================
// BANKING
// ============================================================
app.get('/api/bank-accounts', authenticateToken, requireCompanyAccess, (req, res) => {
  const accounts = db.prepare('SELECT * FROM bank_accounts WHERE company_id = ? AND is_active = 1 ORDER BY bank_name').all(req.companyId);
  res.json({ bank_accounts: accounts });
});
app.post('/api/bank-accounts', authenticateToken, requireCompanyAccess, requirePermission('manage_bank_accounts'), [body('bank_name').trim().notEmpty(), body('account_number_masked').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { bank_name, account_nickname, account_number_masked, account_type, ifsc_code, opening_balance } = req.body;
    const ts = nowStr(); const id = genId();
    const opening = parseMoney(opening_balance);
    db.prepare(`INSERT INTO bank_accounts (id, company_id, bank_name, account_nickname, account_number_masked, account_type, ifsc_code, book_balance, bank_balance, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.companyId, bank_name, account_nickname || null, account_number_masked, account_type || 'current', ifsc_code || null, opening, opening, req.user.userId, ts, ts);
    // If an opening balance is given, record it in the ledger as an opening entry
    // (Dr Bank / Cr Owner's Capital) so books and bank agree.
    if (opening > 0) {
      const bankLedger = db.prepare('SELECT id FROM accounts WHERE company_id = ? AND name = ?').get(req.companyId, bank_name)
        || db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '110200'").get(req.companyId);
      const capital = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '300100'").get(req.companyId);
      if (bankLedger && capital) {
        const jeId = genId();
        db.prepare(`INSERT INTO journal_entries (id, company_id, entry_number, voucher_type, entry_date, reference_number, narration, total_debit, total_credit, status, cost_centre, created_by, created_at, updated_at) VALUES (?, ?, ?, 'OPENING', ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?)`).run(jeId, req.companyId, `JV-OPEN-${Date.now()}`, ts, `BANK-${id}`, `Opening balance for ${bank_name} (${account_number_masked})`, opening, opening, null, req.user.userId, ts, ts);
        db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, 0, ?, ?)`).run(jeId, bankLedger.id, opening, 'Opening bank balance', ts);
        db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, 0, ?, ?, ?)`).run(jeId, capital.id, opening, "Owner's Capital", ts);
        db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(opening, bankLedger.id);
        db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(opening, capital.id);
      }
    }
    db.prepare('INSERT INTO activity_logs (id, company_id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)').run(req.companyId, req.user.userId, 'bank_account_added', 'bank_accounts', id, JSON.stringify({ bank_name }), ts);
    res.status(201).json({ message: 'Bank account added', id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to add bank account' });
  }
});
app.get('/api/bank-transactions', authenticateToken, requireCompanyAccess, (req, res) => {
  const { bank_account_id, status, page = 1, limit = 50 } = req.query;
  let sql = `SELECT bt.*, ba.bank_name FROM bank_transactions bt JOIN bank_accounts ba ON ba.id = bt.bank_account_id WHERE ba.company_id = ?`; const params = [req.companyId];
  if (bank_account_id) { sql += ` AND bt.bank_account_id = ?`; params.push(bank_account_id); }
  if (status) { sql += ` AND bt.match_status = ?`; params.push(status); }
  sql += ` ORDER BY bt.transaction_date DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  const transactions = db.prepare(sql).all(...params);
  res.json({ bank_transactions: transactions });
});
app.post('/api/bank-transactions/:id/match', authenticateToken, requireCompanyAccess, requirePermission('reconcile_bank'), [body('matched_record_type').isIn(['bill','invoice','payment','journal_entry']), body('matched_record_id').notEmpty(), handleValidation], (req, res) => {
  try {
    const tx = db.prepare(`SELECT bt.*, ba.company_id FROM bank_transactions bt JOIN bank_accounts ba ON ba.id = bt.bank_account_id WHERE bt.id = ? AND ba.company_id = ?`).get(req.params.id, req.companyId);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    db.prepare(`UPDATE bank_transactions SET match_status = 'matched', matched_record_type = ?, matched_record_id = ?, reconciled_at = ?, reconciled_by = ? WHERE id = ?`).run(req.body.matched_record_type, req.body.matched_record_id, nowStr(), req.user.userId, req.params.id);
    res.json({ message: 'Transaction matched' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to match transaction' });
  }
});
app.post('/api/bank-statements/import', authenticateToken, requireCompanyAccess, requirePermission('import_bank_statement'), (req, res) => {
  try {
    const { bank_account_id, transactions } = req.body;
    if (!bank_account_id || !Array.isArray(transactions)) return res.status(400).json({ error: 'Invalid data' });
    const ts = nowStr(); const stmtId = genId();
    db.prepare(`INSERT INTO bank_statements (id, bank_account_id, file_name, file_path, import_status, total_transactions, imported_by, imported_at, created_at) VALUES (?, ?, ?, ?, 'imported', ?, ?, ?, ?)`).run(stmtId, bank_account_id, 'manual_import.csv', '/uploads/manual_import.csv', transactions.length, req.user.userId, ts, ts);
    let runningBalance = parseFloat(db.prepare('SELECT book_balance FROM bank_accounts WHERE id = ?').get(bank_account_id).book_balance || 0);
    for (const t of transactions) {
      runningBalance += (parseMoney(t.credit) || 0) - (parseMoney(t.debit) || 0);
      db.prepare(`INSERT INTO bank_transactions (id, bank_account_id, bank_statement_id, transaction_date, value_date, description, reference, debit, credit, running_balance, match_status, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unmatched', ?)`).run(bank_account_id, stmtId, parseDateIN(t.transaction_date) || ts, parseDateIN(t.value_date) || null, t.description || '', t.reference || null, parseMoney(t.debit), parseMoney(t.credit), runningBalance, ts);
    }
    res.status(201).json({ message: 'Statement imported', statementId: stmtId, imported: transactions.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to import statement' });
  }
});

// ============================================================
// DOCUMENTS & OCR
// ============================================================
const upload = multer({ dest: path.join(__dirname, '..', 'uploads'), limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = ['.pdf','.jpg','.jpeg','.png','.doc','.docx']; const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) return cb(new Error('Unsupported file type')); cb(null, true);
}});
app.post('/api/documents/upload', authenticateToken, requireCompanyAccess, requirePermission('upload_documents'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileHash = crypto.createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');
    const docId = genId(); const ext = path.extname(req.file.originalname); const newName = `${docId}${ext}`;
    const newPath = path.join(__dirname, '..', 'uploads', newName);
    fs.renameSync(req.file.path, newPath);
    const ts = nowStr();
    db.prepare(`INSERT INTO documents (id, company_id, file_name, file_path, file_type, file_size, mime_type, uploaded_by, sha256_hash, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(docId, req.companyId, req.file.originalname, newPath, ext.replace('.',''), req.file.size, req.file.mimetype, req.user.userId, fileHash, ts);

    // Auto-extract via OCR when a provider is configured; otherwise mark pending.
    let ocrResult = { pending: true, message: 'OCR extraction is pending integration. Use manual review to enter extracted fields.' };
    if (ocrConfigured()) {
      ocrResult = await extractDocument({ filePath: newPath, mimeType: req.file.mimetype, documentId: docId }).catch((err) => ({
        pending: false, data: null, error: err.message || 'OCR extraction failed',
      }));
    }
    const extractionStatus = ocrResult.pending ? 'pending' : (ocrResult.error ? 'failed' : 'completed');
    const confidence = ocrResult.data && ocrResult.data.confidence_score ? ocrResult.data.confidence_score : 0;
    db.prepare(`INSERT INTO document_extractions (id, document_id, extraction_status, vendor_name, vendor_gstin, invoice_number, invoice_date, taxable_value, cgst, sgst, igst, cess, grand_total, confidence_score, missing_fields, created_at, updated_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      docId,
      extractionStatus,
      ocrResult.data ? ocrResult.data.vendor_name : null,
      ocrResult.data ? ocrResult.data.vendor_gstin : null,
      ocrResult.data ? ocrResult.data.invoice_number : null,
      ocrResult.data ? ocrResult.data.invoice_date : null,
      ocrResult.data ? ocrResult.data.taxable_value : 0,
      ocrResult.data ? ocrResult.data.cgst : 0,
      ocrResult.data ? ocrResult.data.sgst : 0,
      ocrResult.data ? ocrResult.data.igst : 0,
      ocrResult.data ? ocrResult.data.cess : 0,
      ocrResult.data ? ocrResult.data.grand_total : 0,
      confidence,
      ocrResult.data ? JSON.stringify(ocrResult.data.missing_fields || []) : null,
      ts, ts,
    );

    db.prepare('INSERT INTO activity_logs (id, company_id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)').run(req.companyId, req.user.userId, 'document_uploaded', 'documents', docId, JSON.stringify({ file_name: req.file.originalname }), ts);
    res.status(201).json({
      message: 'Document uploaded',
      documentId: docId,
      fileName: req.file.originalname,
      ocrStatus: extractionStatus,
      ocrConfigured: ocrConfigured(),
      note: ocrResult.message || (ocrConfigured() ? 'OCR extraction completed. Review extracted fields before posting.' : 'OCR integration not configured. Set OCR_PROVIDER and credentials in .env to enable automatic extraction.'),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to upload document' });
  }
});
app.get('/api/documents', authenticateToken, requireCompanyAccess, (req, res) => {
  const documents = db.prepare(`SELECT d.*, de.extraction_status, de.confidence_score, de.is_verified FROM documents d LEFT JOIN document_extractions de ON de.document_id = d.id WHERE d.company_id = ? ORDER BY d.uploaded_at DESC`).all(req.companyId);
  res.json({ documents });
});
app.get('/api/documents/:id/download', authenticateToken, requireCompanyAccess, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!fs.existsSync(doc.file_path)) return res.status(404).json({ error: 'File not found' });
  res.download(doc.file_path, doc.file_name);
});
app.get('/api/document-extractions/:documentId', authenticateToken, requireCompanyAccess, (req, res) => {
  const extraction = db.prepare('SELECT * FROM document_extractions WHERE document_id = ?').get(req.params.documentId);
  if (!extraction) return res.status(404).json({ error: 'Extraction not found' });
  res.json({ extraction });
});
app.post('/api/documents/:id/verify', authenticateToken, requireCompanyAccess, requirePermission('upload_documents'), (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const ts = nowStr();
    db.prepare(`UPDATE document_extractions SET is_verified = 1, extraction_status = 'manual_review', validated_by = ?, validated_at = ?, updated_at = ? WHERE document_id = ?`).run(req.user.userId, ts, ts, req.params.id);
    res.json({ message: 'Document marked verified' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to verify document' });
  }
});
app.delete('/api/documents/:id', authenticateToken, requireCompanyAccess, requirePermission('upload_documents'), (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  try { if (doc.file_path && fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path); } catch {}
  db.prepare('DELETE FROM document_extractions WHERE document_id = ?').run(req.params.id);
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Document deleted' });
});
app.put('/api/document-extractions/:documentId', authenticateToken, requireCompanyAccess, handleValidation, (req, res) => {
  try {
    const { vendor_name, vendor_gstin, invoice_number, invoice_date, due_date, taxable_value, cgst, sgst, igst, cess, discount, round_off, grand_total, confidence_score, missing_fields, notes } = req.body;
    const ts = nowStr();
    db.prepare(`UPDATE document_extractions SET vendor_name = ?, vendor_gstin = ?, invoice_number = ?, invoice_date = ?, due_date = ?, taxable_value = ?, cgst = ?, sgst = ?, igst = ?, cess = ?, discount = ?, round_off = ?, grand_total = ?, confidence_score = ?, missing_fields = ?, notes = ?, extraction_status = 'manual_review', updated_at = ? WHERE document_id = ?`).run(vendor_name || null, vendor_gstin || null, invoice_number || null, parseDateIN(invoice_date) || null, parseDateIN(due_date) || null, parseMoney(taxable_value), parseMoney(cgst), parseMoney(sgst), parseMoney(igst), parseMoney(cess), parseMoney(discount), parseMoney(round_off), parseMoney(grand_total), parseFloat(confidence_score) || 0, missing_fields ? JSON.stringify(missing_fields) : null, notes || null, ts, req.params.documentId);
    res.json({ message: 'Extraction updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update extraction' });
  }
});

// ============================================================
// TAX & COMPLIANCE
// ============================================================

// Period helper: ?period=YYYY-MM (calendar month) or ?from=&to= (ISO dates). Defaults to all-time.
function periodFilter(req) {
  const { period, from, to } = req.query;
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const start = new Date(`${period}-01T00:00:00`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { from: start.toISOString(), to: end.toISOString(), label: period };
  }
  if (from && to) return { from: parseDateIN(from), to: parseDateIN(to), label: `${from} to ${to}` };
  return null;
}
function inPeriodiso(iso, p) { if (!p || !iso) return true; const d = new Date(iso); return d >= new Date(p.from) && d < new Date(p.to); }

app.get('/api/tax/dashboard', authenticateToken, requireCompanyAccess, (req, res) => {
  const p = periodFilter(req);
  const bills = db.prepare("SELECT * FROM bills WHERE company_id = ? AND status != 'draft'").all(req.companyId).filter(b => inPeriodiso(b.invoice_date || b.created_at, p));
  const invoices = db.prepare("SELECT * FROM invoices WHERE company_id = ? AND status != 'draft'").all(req.companyId).filter(i => inPeriodiso(i.invoice_date || i.created_at, p));
  let outputTax = 0, inputTax = 0, tdsDeductedFromVendors = 0, tdsDeductedFromCustomers = 0;
  for (const inv of invoices) { outputTax += parseFloat(inv.cgst || 0) + parseFloat(inv.sgst || 0) + parseFloat(inv.igst || 0) + parseFloat(inv.cess || 0); tdsDeductedFromCustomers += parseFloat(inv.tds_deductible || 0); }
  for (const bill of bills) { inputTax += parseFloat(bill.cgst || 0) + parseFloat(bill.sgst || 0) + parseFloat(bill.igst || 0) + parseFloat(bill.cess || 0); tdsDeductedFromVendors += parseFloat(bill.tds_amount || 0); }
  const taxRecords = db.prepare('SELECT * FROM tax_records WHERE company_id = ? ORDER BY tax_period DESC LIMIT 6').all(req.companyId);
  res.json({
    period: p ? p.label : 'All time',
    gst_liability: Math.max(0, outputTax - inputTax),
    output_tax: outputTax,
    itc_available: inputTax,
    tds_payable: tdsDeductedFromVendors,
    tds_receivable: tdsDeductedFromCustomers,
    returns_filed: taxRecords.filter(r => r.filing_status === 'filed').length,
    tax_records: taxRecords,
    note: 'Figures are prepared from books of accounts. Filing on the GST portal is a separate, manual action.',
  });
});

app.get('/api/tax/gstr3b', authenticateToken, requireCompanyAccess, (req, res) => {
  const p = periodFilter(req);
  const bills = db.prepare("SELECT * FROM bills WHERE company_id = ? AND status != 'draft'").all(req.companyId).filter(b => inPeriodiso(b.invoice_date || b.created_at, p));
  const invoices = db.prepare("SELECT * FROM invoices WHERE company_id = ? AND status != 'draft'").all(req.companyId).filter(i => inPeriodiso(i.invoice_date || i.created_at, p));
  let outputTax = 0, taxableValueOut = 0, igstOut = 0, cgstSgstOut = 0;
  for (const inv of invoices) {
    const tax = parseFloat(inv.cgst || 0) + parseFloat(inv.sgst || 0) + parseFloat(inv.igst || 0) + parseFloat(inv.cess || 0);
    outputTax += tax; igstOut += parseFloat(inv.igst || 0) + parseFloat(inv.cess || 0); cgstSgstOut += parseFloat(inv.cgst || 0) + parseFloat(inv.sgst || 0);
    taxableValueOut += parseFloat(inv.grand_total || 0) - tax;
  }
  let inputTax = 0, taxableValueIn = 0, igstIn = 0, cgstSgstIn = 0;
  for (const bill of bills) {
    const tax = parseFloat(bill.cgst || 0) + parseFloat(bill.sgst || 0) + parseFloat(bill.igst || 0) + parseFloat(bill.cess || 0);
    inputTax += tax; igstIn += parseFloat(bill.igst || 0) + parseFloat(bill.cess || 0); cgstSgstIn += parseFloat(bill.cgst || 0) + parseFloat(bill.sgst || 0);
    taxableValueIn += parseFloat(bill.grand_total || 0) - tax;
  }
  const record = db.prepare('SELECT * FROM tax_records WHERE company_id = ? AND tax_type = ? AND tax_period = ?').get(req.companyId, 'gst', p ? p.label : 'all');
  res.json({
    gstr3b: {
      period: p ? p.label : 'All time',
      taxable_value_outward: taxableValueOut,
      output_tax: outputTax,
      output_igst: igstOut,
      output_cgst_sgst: cgstSgstOut,
      taxable_value_inward: taxableValueIn,
      input_tax_credit: inputTax,
      input_igst: igstIn,
      input_cgst_sgst: cgstSgstIn,
      net_tax_payable: Math.max(0, outputTax - inputTax),
      filing_status: record ? record.filing_status : 'not_started',
      preparation_status: 'draft_prepared_from_books',
    },
    note: 'Prepared (draft) from stored billing data. This is preparation only — not a filed return. Actual filing is done on the GST portal by an authorised person.',
  });
});

app.get('/api/tax/gstr2b-reconciliation', authenticateToken, requireCompanyAccess, (req, res) => {
  // GSTR-2B auto-drafted ITC data is only available after GST portal download (pending integration).
  // We report books data honestly and mark 2B columns as unavailable — never fabricated.
  const bills = db.prepare("SELECT * FROM bills WHERE company_id = ? AND status != 'draft' ORDER BY created_at DESC LIMIT 50").all(req.companyId);
  const reconciliation = bills.map(b => {
    const booksGst = parseFloat(b.cgst || 0) + parseFloat(b.sgst || 0) + parseFloat(b.igst || 0) + parseFloat(b.cess || 0);
    return {
      bill_number: b.bill_number,
      vendor_name: b.vendor_name,
      vendor_gstin: b.vendor_gstin,
      invoice_date: b.invoice_date,
      books_taxable: parseFloat(b.taxable_value || 0),
      books_gst: booksGst,
      gstr2b_taxable: null,
      gstr2b_gst: null,
      variance: null,
      status: 'awaiting_gstr2b',
    };
  });
  res.json({
    reconciliation,
    matched_count: 0,
    unmatched_count: reconciliation.length,
    itc_difference: 0,
    status: 'pending_integration',
    note: 'GSTR-2B download from the GST portal is pending integration. ITC shown in books cannot be reconciled against GSTR-2B until that data is imported.',
  });
});

// Tax filing workflow: preparation -> review -> filed (kept strictly separate from portal filing)
app.post('/api/tax/records', authenticateToken, requireCompanyAccess, requirePermission('prepare_tax'), [
  body('tax_type').isIn(['gst', 'tds']),
  body('tax_period').trim().notEmpty(),
  body('filing_status').isIn(['not_started', 'in_progress', 'ready_for_review', 'reviewed', 'filed', 'attention_required']),
  handleValidation,
], (req, res) => {
  try {
    const { tax_type, tax_period, filing_status, notes, itc_eligible, itc_blocked } = req.body;
    const ts = nowStr();
    const existing = db.prepare('SELECT * FROM tax_records WHERE company_id = ? AND tax_type = ? AND tax_period = ?').get(req.companyId, tax_type, tax_period);
    if (existing) {
      const updates = ['filing_status = ?', 'updated_at = ?']; const values = [filing_status, ts];
      if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
      if (itc_eligible !== undefined) { updates.push('itc_eligible = ?'); values.push(parseMoney(itc_eligible)); }
      if (itc_blocked !== undefined) { updates.push('itc_blocked = ?'); values.push(parseMoney(itc_blocked)); }
      if (filing_status === 'ready_for_review') { updates.push('prepared_by = ?', 'prepared_at = ?'); values.push(req.user.userId, ts); }
      if (filing_status === 'reviewed') { updates.push('reviewed_by = ?', 'reviewed_at = ?'); values.push(req.user.userId, ts); }
      if (filing_status === 'filed') { updates.push('filed_by = ?', 'filed_at = ?'); values.push(req.user.userId, ts); }
      values.push(existing.id);
      db.prepare(`UPDATE tax_records SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      return res.json({ message: 'Tax record updated', id: existing.id, filing_status });
    }
    const id = genId();
    db.prepare(`INSERT INTO tax_records (id, company_id, tax_type, tax_period, filing_status, notes, itc_eligible, itc_blocked, prepared_by, prepared_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.companyId, tax_type, tax_period, filing_status, notes || null, parseMoney(itc_eligible), parseMoney(itc_blocked), filing_status !== 'not_started' ? req.user.userId : null, filing_status !== 'not_started' ? ts : null, ts, ts);
    res.status(201).json({ message: 'Tax record created', id, filing_status });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save tax record' });
  }
});

// ============================================================
// GST PORTAL FILING (integration — pending until credentials configured)
// ============================================================
app.get('/api/tax/gstn/auth-url', authenticateToken, requireCompanyAccess, (req, res) => {
  if (!gstnConfigured()) {
    return res.json({
      gstn_configured: false,
      authUrl: null,
      message: 'GST portal integration not configured. Set GSTN_ENABLED=true and OAuth credentials in .env.',
    });
  }
  const state = req.user.userId + ':' + req.companyId;
  const authUrl = getAuthorizationUrl(state);
  res.json({ gstn_configured: true, authUrl, message: 'Open this URL to authorize FINZI AI on the GST portal.' });
});

app.post('/api/tax/gstn/callback', authenticateToken, requireCompanyAccess, [body('code').notEmpty(), handleValidation], async (req, res) => {
  if (!gstnConfigured()) {
    return res.status(400).json({ error: 'GST portal integration not configured' });
  }
  const result = await exchangeCodeForToken(req.body.code);
  if (result.pending || result.error) {
    return res.status(400).json({ error: result.error || 'Token exchange failed' });
  }
  res.json({ message: 'GST portal authorized. Access token received (store securely in production).' });
});

app.post('/api/tax/gstn/file', authenticateToken, requireCompanyAccess, requirePermission('file_tax'), [
  body('tax_period').trim().notEmpty(),
  body('access_token').notEmpty(),
  handleValidation,
], async (req, res) => {
  if (!gstnConfigured()) {
    return res.status(400).json({ error: 'GST portal integration not configured' });
  }
  const { tax_period, access_token } = req.body;
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.companyId);
  const gstr3b = db.prepare('SELECT * FROM tax_records WHERE company_id = ? AND tax_type = ? AND tax_period = ?').get(req.companyId, 'gst', tax_period);
  if (!gstr3b || gstr3b.filing_status !== 'reviewed') {
    return res.status(400).json({ error: 'GSTR-3B must be reviewed before filing' });
  }
  const payload = {
    gstin: company.gstin,
    period: tax_period,
    taxable_value_outward: parseFloat(gstr3b.output_tax || 0),
    output_tax: parseFloat(gstr3b.output_tax || 0),
    taxable_value_inward: parseFloat(gstr3b.input_tax_credit || 0),
    input_tax_credit: parseFloat(gstr3b.input_tax_credit || 0),
    net_tax_payable: parseFloat(gstr3b.net_tax_payable || 0),
  };
  const result = await fileReturn({ returnType: 'gstr3b', period: tax_period, payload, accessToken: access_token });
  if (result.pending || result.error) {
    return res.status(400).json({ error: result.error || 'Filing not configured' });
  }
  db.prepare(`UPDATE tax_records SET filing_status = 'filed', filed_by = ?, filed_at = ?, acknowledgement_number = ? WHERE id = ?`).run(req.user.userId, nowStr(), result.acknowledgementNumber, gstr3b.id);
  res.json({ message: 'GSTR-3B filed on GST portal', acknowledgementNumber: result.acknowledgementNumber, filingDate: result.filingDate });
});

// ============================================================
// FINANCIAL REPORTS
// ============================================================

// Reports are generated from stored accounting data only. Periods use the same ?period=YYYY-MM ?from=&to= filter as tax.
function reportPeriodLabel(req) {
  const p = periodFilter(req);
  if (p) return p.label;
  const fy = db.prepare('SELECT name FROM financial_years WHERE company_id = ? AND is_current = 1').get(req.companyId);
  return fy ? `FY ${fy.name}` : 'All time';
}

// Balance (debit-positive) from posted journal lines, plus opening balance
function accountMovements(companyId) {
  return db.prepare(`
    SELECT a.id, a.code, a.name, a.account_group,
           a.opening_balance,
           COALESCE(SUM(CASE WHEN je.status = 'posted' THEN jel.debit_amount ELSE 0 END), 0) AS total_debit,
           COALESCE(SUM(CASE WHEN je.status = 'posted' THEN jel.credit_amount ELSE 0 END), 0) AS total_credit
    FROM accounts a
    LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE a.company_id = ? AND a.is_active = 1
    GROUP BY a.id, a.code, a.name, a.account_group, a.opening_balance
    ORDER BY a.code
  `).all(companyId).map(r => {
    const debit = parseFloat(r.opening_balance || 0) + parseFloat(r.total_debit || 0);
    const credit = parseFloat(r.total_credit || 0);
    return { code: r.code, name: r.name, group: r.account_group, debit_balance: debit - credit, debit, credit, opening_balance: parseFloat(r.opening_balance || 0) };
  });
}

// Compute P&L totals from account movements. Income = credit balance, expense = debit balance.
function profitLossFromMovements(movements) {
  const incomeDetail = movements.filter(a => a.group === 'income').map(a => ({ code: a.code, name: a.name, amount: Math.max(0, a.credit - a.debit) }));
  const expenseDetail = movements.filter(a => a.group === 'expense').map(a => ({ code: a.code, name: a.name, amount: Math.max(0, a.debit_balance) }));
  const totalIncome = incomeDetail.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenseDetail.reduce((s, e) => s + e.amount, 0);
  return { incomeDetail, expenseDetail, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
}

app.get('/api/reports/profit-loss', authenticateToken, requireCompanyAccess, (req, res) => {
  const pl = profitLossFromMovements(accountMovements(req.companyId));
  res.json({
    report_type: 'profit_loss',
    period: reportPeriodLabel(req),
    income: pl.incomeDetail,
    expenses: pl.expenseDetail,
    total_income: pl.totalIncome,
    total_expenses: pl.totalExpenses,
    net_profit: pl.netProfit,
    summary: { 'Total Income': pl.totalIncome, 'Total Expenses': pl.totalExpenses, 'Net Profit': pl.netProfit, 'Profit Margin %': pl.totalIncome > 0 ? (pl.netProfit / pl.totalIncome) * 100 : 0 },
    items: [...pl.incomeDetail.map(i => ({ name: `${i.code} ${i.name}`, amount: i.amount, group: 'Income' })), ...pl.expenseDetail.map(e => ({ name: `${e.code} ${e.name}`, amount: e.amount, group: 'Expense' }))],
    generated_at: nowStr(),
  });
});

app.get('/api/reports/balance-sheet', authenticateToken, requireCompanyAccess, (req, res) => {
  const movements = accountMovements(req.companyId);
  const pl = profitLossFromMovements(movements);
  const assets = movements.filter(a => a.group === 'assets').map(a => ({ code: a.code, name: a.name, amount: Math.max(0, a.debit_balance) }));
  const liabilities = movements.filter(a => a.group === 'liabilities').map(a => ({ code: a.code, name: a.name, amount: Math.max(0, -a.debit_balance) }));
  const equity = movements.filter(a => a.group === 'equity').map(a => ({ code: a.code, name: a.name, amount: Math.max(0, -a.debit_balance) }));
  // Close current-year profit/(loss) into retained earnings for balance-sheet presentation.
  const currentYearPnl = pl.netProfit;
  equity.push({ code: 'P&L', name: 'Current Year Profit/(Loss)', amount: currentYearPnl });
  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
  const totalLiab = liabilities.reduce((s, a) => s + a.amount, 0);
  const totalEquity = equity.reduce((s, a) => s + a.amount, 0);
  const totalLiabEquity = totalLiab + totalEquity;
  res.json({
    report_type: 'balance_sheet',
    period: reportPeriodLabel(req),
    assets, liabilities, equity,
    total_assets: totalAssets,
    total_liabilities: totalLiab,
    total_equity: totalEquity,
    total_liabilities_equity: totalLiabEquity,
    balanced: Math.abs(totalAssets - totalLiabEquity) < 0.01,
    summary: { 'Total Assets': totalAssets, 'Total Liabilities': totalLiab, 'Total Equity': totalEquity, 'Balanced': Math.abs(totalAssets - totalLiabEquity) < 0.01 ? 'Yes' : 'No' },
    items: [...assets.map(a => ({ name: `${a.code} ${a.name}`, amount: a.amount, group: 'Assets' })), ...liabilities.map(a => ({ name: `${a.code} ${a.name}`, amount: a.amount, group: 'Liabilities' })), ...equity.map(a => ({ name: `${a.code} ${a.name}`, amount: a.amount, group: 'Equity' }))],
    generated_at: nowStr(),
  });
});

app.get('/api/reports/cash-flow', authenticateToken, requireCompanyAccess, (req, res) => {
  // Computed from recorded payments (receipts in, vendor payments out) within the period.
  const p = periodFilter(req);
  const payments = db.prepare("SELECT * FROM payments WHERE company_id = ? AND status = 'completed'").all(req.companyId).filter(pay => inPeriodiso(pay.payment_date, p));
  const receipts = payments.filter(p => p.payment_type === 'customer_receipt').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const vendorPayments = payments.filter(p => p.payment_type === 'vendor_payment').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const operating = receipts - vendorPayments;
  const bankAccounts = db.prepare('SELECT * FROM bank_accounts WHERE company_id = ? AND is_active = 1').all(req.companyId);
  const totalBank = bankAccounts.reduce((s, a) => s + parseFloat(a.book_balance || 0), 0);
  res.json({
    report_type: 'cash_flow',
    period: p ? p.label : 'All time',
    operating_cash_flow: operating,
    investing_cash_flow: 0,
    financing_cash_flow: 0,
    net_cash_flow: operating,
    cash_balance: totalBank,
    summary: { 'Operating Cash Flow': operating, 'Investing Cash Flow': 0, 'Financing Cash Flow': 0, 'Net Cash Flow': operating, 'Cash & Bank Balance': totalBank },
    items: [
      { name: 'Customer receipts', amount: receipts, group: 'Operating' },
      { name: 'Vendor payments', amount: -vendorPayments, group: 'Operating' },
    ],
    note: 'Investing and financing activities are zero because no such transactions are recorded in the stored data for this period.',
    generated_at: nowStr(),
  });
});

const AGE_BUCKETS = ['0-30', '31-60', '61-90', '90+'];
function bucketFor(daysOverdue) {
  if (daysOverdue > 90) return '90+';
  if (daysOverdue > 60) return '61-90';
  if (daysOverdue > 30) return '31-60';
  return '0-30';
}
app.get('/api/reports/receivables-ageing', authenticateToken, requireCompanyAccess, (req, res) => {
  const invoices = db.prepare('SELECT * FROM invoices WHERE company_id = ? AND balance_due > 0').all(req.companyId);
  const now = new Date(); const buckets = { '0-30': [], '31-60': [], '61-90': [], '90+': [] }; let total = 0;
  for (const inv of invoices) {
    const due = new Date(inv.due_date); const days = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
    buckets[bucketFor(days)].push({ ...inv, days_overdue: Math.max(0, days) }); total += parseFloat(inv.balance_due || 0);
  }
  const summary = { 'Total Outstanding': total };
  for (const b of AGE_BUCKETS) summary[`Bucket ${b} days`] = buckets[b].reduce((s, r) => s + parseFloat(r.balance_due || 0), 0);
  res.json({
    ageing: buckets,
    total_outstanding: total,
    summary,
    items: Object.entries(buckets).flatMap(([bucket, rows]) => rows.map(r => ({ name: `${r.invoice_number} — ${r.customer_name} (${bucket} days)`, amount: parseFloat(r.balance_due || 0), group: bucket }))),
  });
});
app.get('/api/reports/payables-ageing', authenticateToken, requireCompanyAccess, (req, res) => {
  const bills = db.prepare('SELECT * FROM bills WHERE company_id = ? AND balance_due > 0').all(req.companyId);
  const now = new Date(); const buckets = { '0-30': [], '31-60': [], '61-90': [], '90+': [] }; let total = 0;
  for (const bill of bills) {
    const due = new Date(bill.due_date); const days = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
    buckets[bucketFor(days)].push({ ...bill, days_overdue: Math.max(0, days) }); total += parseFloat(bill.balance_due || 0);
  }
  const summary = { 'Total Outstanding': total };
  for (const b of AGE_BUCKETS) summary[`Bucket ${b} days`] = buckets[b].reduce((s, r) => s + parseFloat(r.balance_due || 0), 0);
  res.json({
    ageing: buckets,
    total_outstanding: total,
    summary,
    items: Object.entries(buckets).flatMap(([bucket, rows]) => rows.map(r => ({ name: `${r.bill_number} — ${r.vendor_name} (${bucket} days)`, amount: parseFloat(r.balance_due || 0), group: bucket }))),
  });
});

// ============================================================
// AUDIT MANAGEMENT
// ============================================================

// Multi-tenant scoping for the audit module: engagements belong to clients,
// and clients belong to the organizations the authenticated user is a member of.
function getUserOrgIds(userId) {
  return db.prepare(`SELECT DISTINCT c.organization_id FROM company_members cm JOIN companies c ON c.id = cm.company_id WHERE cm.user_id = ? AND cm.status = 'active'`).all(userId).map(r => r.organization_id);
}
// Engagement IDs owned by the user's organizations. Child audit records
// (evidence, working papers, observations) are scoped through their engagement.
function getUserEngagementIds(userId) {
  const orgIds = getUserOrgIds(userId);
  if (orgIds.length === 0) return [];
  const placeholders = orgIds.map(() => '?').join(',');
  return db.prepare(`SELECT ae.id FROM audit_engagements ae JOIN clients c ON c.id = ae.client_id WHERE c.firm_id IN (${placeholders})`).all(...orgIds).map(r => r.id);
}
app.get('/api/audit/engagements', authenticateToken, (req, res) => {
  const orgIds = getUserOrgIds(req.user.userId);
  if (orgIds.length === 0) return res.json({ audit_engagements: [] });
  const placeholders = orgIds.map(() => '?').join(',');
  const engagements = db.prepare(`SELECT ae.*, c.legal_name as client_name FROM audit_engagements ae JOIN clients c ON c.id = ae.client_id WHERE c.firm_id IN (${placeholders}) ORDER BY ae.created_at DESC`).all(...orgIds);
  res.json({ audit_engagements: engagements });
});
app.post('/api/audit/engagements', authenticateToken, requirePermission('create_audit_engagement'), [body('client_id').notEmpty(), body('engagement_name').trim().notEmpty(), body('audit_type').notEmpty(), body('audit_period_start').notEmpty(), body('audit_period_end').notEmpty(), body('lead_auditor_id').notEmpty(), handleValidation], (req, res) => {
  try {
    const { client_id, engagement_name, audit_type, audit_period_start, audit_period_end, lead_auditor_id, notes } = req.body;
    // Verify the client belongs to one of the user's organizations
    const orgIds = getUserOrgIds(req.user.userId);
    const client = db.prepare(`SELECT * FROM clients WHERE id = ?`).get(client_id);
    if (!client || !orgIds.includes(client.firm_id)) return res.status(403).json({ error: 'Client not found in your organization' });
    const ts = nowStr(); const engagementId = genId(); const engagementNumber = `AUD-${Date.now()}`;
    db.prepare(`INSERT INTO audit_engagements (id, client_id, engagement_id, engagement_name, audit_type, audit_period_start, audit_period_end, status, lead_auditor_id, notes, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'planning', ?, ?, ?, ?, ?)`).run(engagementId, client_id, engagementNumber, engagement_name, audit_type, parseDateIN(audit_period_start), parseDateIN(audit_period_end), lead_auditor_id, notes || null, ts, ts, req.user.userId);
    res.status(201).json({ message: 'Audit engagement created', engagementId, engagementNumber });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create engagement' });
  }
});
app.get('/api/audit/engagements/:id', authenticateToken, (req, res) => {
  const engagement = db.prepare('SELECT * FROM audit_engagements WHERE id = ?').get(req.params.id);
  if (!engagement || !getUserEngagementIds(req.user.userId).includes(engagement.id)) return res.status(404).json({ error: 'Engagement not found' });
  res.json({ audit_engagement: engagement });
});
app.get('/api/audit/evidence', authenticateToken, (req, res) => {
  const allowed = getUserEngagementIds(req.user.userId);
  const { engagement_id } = req.query;
  if (engagement_id) {
    if (!allowed.includes(engagement_id)) return res.json({ audit_evidence: [] });
    return res.json({ audit_evidence: db.prepare('SELECT * FROM audit_evidence WHERE engagement_id = ? ORDER BY upload_date DESC').all(engagement_id) });
  }
  if (allowed.length === 0) return res.json({ audit_evidence: [] });
  const placeholders = allowed.map(() => '?').join(',');
  const evidence = db.prepare(`SELECT * FROM audit_evidence WHERE engagement_id IN (${placeholders}) ORDER BY upload_date DESC`).all(...allowed);
  res.json({ audit_evidence: evidence });
});
app.post('/api/audit/evidence', authenticateToken, upload.single('file'), [body('engagement_id').notEmpty(), body('document_name').trim().notEmpty(), body('category').notEmpty(), handleValidation], (req, res) => {
  try {
    const { engagement_id, document_name, category, source, linked_wp_area } = req.body;
    // Security check: engagement must belong to one of the user's organizations
    if (!getUserEngagementIds(req.user.userId).includes(engagement_id)) return res.status(403).json({ error: 'Engagement not found in your organization' });
    const ts = nowStr(); const evidenceId = genId(); const evidenceNumber = `EVD-${Date.now()}`;
    let filePath = null, fileHash = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${evidenceId}${ext}`;
      filePath = path.join(UPLOAD_DIR, fileName);
      fs.renameSync(req.file.path, filePath);
      fileHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    }
    db.prepare(`INSERT INTO audit_evidence (id, engagement_id, evidence_id, document_name, category, source, uploaded_by, linked_wp_area, file_path, sha256_hash, upload_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(evidenceId, engagement_id, evidenceNumber, document_name, category, source || null, req.user.userId, linked_wp_area || null, filePath, fileHash, ts, ts);
    res.status(201).json({ message: 'Evidence uploaded', evidenceId, evidenceNumber });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to upload evidence' });
  }
});
app.put('/api/audit/evidence/:id', authenticateToken, [body('verification_status').isIn(['pending', 'auditor_verified', 'under_review', 'discrepancy_flagged']), handleValidation], (req, res) => {
  const ev = db.prepare('SELECT * FROM audit_evidence WHERE id = ?').get(req.params.id);
  if (!ev || !getUserEngagementIds(req.user.userId).includes(ev.engagement_id)) return res.status(404).json({ error: 'Evidence not found' });
  db.prepare('UPDATE audit_evidence SET verification_status = ? WHERE id = ?').run(req.body.verification_status, req.params.id);
  res.json({ message: 'Evidence status updated' });
});
app.get('/api/audit/working-papers', authenticateToken, (req, res) => {
  const allowed = getUserEngagementIds(req.user.userId);
  const { engagement_id } = req.query;
  if (engagement_id) {
    if (!allowed.includes(engagement_id)) return res.json({ working_papers: [] });
    return res.json({ working_papers: db.prepare('SELECT * FROM working_papers WHERE engagement_id = ? ORDER BY wp_number').all(engagement_id) });
  }
  if (allowed.length === 0) return res.json({ working_papers: [] });
  const placeholders = allowed.map(() => '?').join(',');
  const papers = db.prepare(`SELECT * FROM working_papers WHERE engagement_id IN (${placeholders}) ORDER BY wp_number`).all(...allowed);
  res.json({ working_papers: papers });
});
app.post('/api/audit/working-papers', authenticateToken, [body('engagement_id').notEmpty(), body('wp_number').trim().notEmpty(), body('audit_area').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { engagement_id, wp_number, audit_area, objective, procedure, evidence_references, auditor_conclusion } = req.body;
    if (!getUserEngagementIds(req.user.userId).includes(engagement_id)) return res.status(403).json({ error: 'Engagement not found in your organization' });
    const ts = nowStr(); const id = genId();
    db.prepare(`INSERT INTO working_papers (id, engagement_id, wp_number, audit_area, objective, procedure, evidence_references, auditor_conclusion, approval_status, version, prepared_by, prepared_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)`).run(id, engagement_id, wp_number, audit_area, objective || null, procedure || null, evidence_references || null, auditor_conclusion || null, req.user.userId, ts);
    res.status(201).json({ message: 'Working paper created', id, wp_number });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create working paper' });
  }
});
app.put('/api/audit/working-papers/:id', authenticateToken, [body('approval_status').isIn(['draft', 'submitted', 'reviewed', 'approved', 'rejected']), handleValidation], (req, res) => {
  const wp = db.prepare('SELECT * FROM working_papers WHERE id = ?').get(req.params.id);
  if (!wp || !getUserEngagementIds(req.user.userId).includes(wp.engagement_id)) return res.status(404).json({ error: 'Working paper not found' });
  const status = req.body.approval_status;
  const ts = nowStr();
  const updates = { approval_status: status };
  if (status === 'reviewed') { updates.reviewed_by = req.user.userId; updates.reviewed_at = ts; }
  if (status === 'approved') { updates.approved_by = req.user.userId; updates.approved_at = ts; }
  const sets = Object.entries(updates).map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE working_papers SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  res.json({ message: 'Working paper updated', approval_status: status });
});
app.get('/api/audit/observations', authenticateToken, (req, res) => {
  const allowed = getUserEngagementIds(req.user.userId);
  const { engagement_id } = req.query;
  if (engagement_id) {
    if (!allowed.includes(engagement_id)) return res.json({ audit_observations: [] });
    return res.json({ audit_observations: db.prepare('SELECT * FROM audit_observations WHERE engagement_id = ? ORDER BY created_at DESC').all(engagement_id) });
  }
  if (allowed.length === 0) return res.json({ audit_observations: [] });
  const placeholders = allowed.map(() => '?').join(',');
  const observations = db.prepare(`SELECT * FROM audit_observations WHERE engagement_id IN (${placeholders}) ORDER BY created_at DESC`).all(...allowed);
  res.json({ audit_observations: observations });
});
app.post('/api/audit/observations', authenticateToken, [
  body('engagement_id').notEmpty(), body('title').trim().notEmpty(),
  body('observation_type').isIn(['ai_suggestion', 'auditor_finding', 'reviewer_comment', 'approved_conclusion']),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  handleValidation,
], (req, res) => {
  try {
    const { engagement_id, title, description, observation_type, severity, amount_involved, sa_reference } = req.body;
    if (!getUserEngagementIds(req.user.userId).includes(engagement_id)) return res.status(403).json({ error: 'Engagement not found in your organization' });
    const ts = nowStr(); const id = genId(); const observationNumber = `OBS-${Date.now()}`;
    db.prepare(`INSERT INTO audit_observations (id, engagement_id, observation_id, title, description, observation_type, severity, amount_involved, sa_reference, auditor_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, engagement_id, observationNumber, title, description || null, observation_type, severity, parseMoney(amount_involved) || 0, sa_reference || null, req.user.userId, ts, ts);
    res.status(201).json({ message: 'Observation recorded', id, observation_id: observationNumber });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to record observation' });
  }
});
app.put('/api/audit/observations/:id', authenticateToken, [body('status').isIn(['open', 'in_review', 'responded', 'resolved', 'closed']), handleValidation], (req, res) => {
  const obs = db.prepare('SELECT * FROM audit_observations WHERE id = ?').get(req.params.id);
  if (!obs || !getUserEngagementIds(req.user.userId).includes(obs.engagement_id)) return res.status(404).json({ error: 'Observation not found' });
  const updates = { status: req.body.status, updated_at: nowStr() };
  if (req.body.manager_response !== undefined) updates.manager_response = req.body.manager_response;
  if (req.body.approved_conclusion !== undefined) updates.approved_conclusion = req.body.approved_conclusion;
  const sets = Object.entries(updates).map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE audit_observations SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  res.json({ message: 'Observation updated', status: req.body.status });
});

// ============================================================
// CLIENTS (CA firm client management)
// ============================================================
app.get('/api/clients', authenticateToken, (req, res) => {
  const orgIds = getUserOrgIds(req.user.userId);
  if (orgIds.length === 0) return res.json({ clients: [] });
  const placeholders = orgIds.map(() => '?').join(',');
  const clients = db.prepare(`SELECT * FROM clients WHERE firm_id IN (${placeholders}) ORDER BY legal_name`).all(...orgIds);
  res.json({ clients });
});
app.post('/api/clients', authenticateToken, requirePermission('create_clients'), [body('legal_name').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { legal_name, trade_name, business_type, pan, gstin, tan, registered_address, state, city, pincode, contact_email, contact_phone, engagement_type, retainer_fee } = req.body;
    const orgIds = getUserOrgIds(req.user.userId);
    if (orgIds.length === 0) return res.status(400).json({ error: 'No organization found for your account' });
    const ts = nowStr(); const id = genId();
    db.prepare(`INSERT INTO clients (id, firm_id, legal_name, trade_name, business_type, pan, gstin, tan, registered_address, state, city, pincode, contact_email, contact_phone, engagement_type, retainer_fee, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, orgIds[0], legal_name, trade_name || null, business_type || null, pan || null, gstin || null, tan || null, registered_address || null, state || null, city || null, pincode || null, contact_email || null, contact_phone || null, engagement_type || null, parseMoney(retainer_fee), req.user.userId, ts, ts);
    res.status(201).json({ message: 'Client created', clientId: id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create client' });
  }
});

// ============================================================
// FINZI AI (DEMO MODE)
// ============================================================
app.get('/api/ai/conversations', authenticateToken, requireCompanyAccess, (req, res) => {
  const conversations = db.prepare(`SELECT * FROM ai_conversations WHERE user_id = ? AND company_id = ? ORDER BY updated_at DESC`).all(req.user.userId, req.companyId);
  res.json({ conversations });
});
app.post('/api/ai/conversations', authenticateToken, requireCompanyAccess, [body('title').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { title, context_type = 'general', context_id, financial_year } = req.body;
    const ts = nowStr(); const id = genId();
    db.prepare(`INSERT INTO ai_conversations (id, user_id, company_id, title, context_type, context_id, financial_year, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.user.userId, req.companyId, title, context_type, context_id || null, financial_year || null, ts, ts);
    res.status(201).json({ conversationId: id, title });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create conversation' });
  }
});
app.get('/api/ai/messages/:conversationId', authenticateToken, requireCompanyAccess, (req, res) => {
  const conv = db.prepare('SELECT id FROM ai_conversations WHERE id = ? AND company_id = ? AND user_id = ?').get(req.params.conversationId, req.companyId, req.user.userId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const messages = db.prepare(`SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC`).all(req.params.conversationId);
  res.json({ messages });
});
app.post('/api/ai/message', authenticateToken, requireCompanyAccess, [body('conversation_id').notEmpty(), body('content').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { conversation_id, content } = req.body;
    const conv = db.prepare('SELECT * FROM ai_conversations WHERE id = ? AND company_id = ?').get(conversation_id, req.companyId);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const ts = nowStr();
    const userMsgId = genId();
    db.prepare(`INSERT INTO ai_messages (id, conversation_id, role, content, message_type, created_at) VALUES (?, ?, 'user', ?, 'text', ?)`).run(userMsgId, conversation_id, content, ts);

    (async () => {
      let aiResult;
      if (aiConfigured()) {
        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.companyId);
        const companyData = { companyName: company.legal_name, gstin: company.gstin };
        const messages = db.prepare(`SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC`).all(conversation_id);
        const conversationHistory = messages.map((m) => ({ role: m.role, content: m.content }));
        const systemPrompt = buildDefaultSystemPrompt(companyData);
        aiResult = await generateResponse({ conversationHistory, companyData, systemPrompt });
      } else {
        const demoResponse = generateDemoAIResponse(content, req.companyId);
        aiResult = {
          pending: false,
          text: demoResponse.text,
          references: demoResponse.references,
          suggestedActions: demoResponse.suggestedActions,
          error: null,
          message: null,
          demo_mode: true,
        };
      }

      const assistantMsgId = genId();
      db.prepare(`INSERT INTO ai_messages (id, conversation_id, role, content, message_type, message_references, suggested_actions, created_at) VALUES (?, ?, 'assistant', ?, 'text', ?, ?, ?)`).run(assistantMsgId, conversation_id, aiResult.text, JSON.stringify(aiResult.references || []), JSON.stringify(aiResult.suggestedActions || []), ts);
      db.prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ?').run(ts, conversation_id);

      res.json({
        user_message: { id: userMsgId, role: 'user', content, created_at: ts },
        assistant_message: {
          id: assistantMsgId,
          role: 'assistant',
          content: aiResult.text,
          references: aiResult.references || [],
          suggested_actions: aiResult.suggestedActions || [],
          demo_mode: aiResult.demo_mode || false,
          ai_pending: aiResult.pending || false,
          ai_error: aiResult.error || null,
          created_at: ts,
        },
      });
    })().catch((err) => {
      console.error('AI message failed:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to process message' });
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to process message' });
  }
});
function generateDemoAIResponse(content, companyId) {
  const lower = content.toLowerCase();
  let text = '', references = [], suggestedActions = [];
  if (lower.includes('overdue bill')) {
    const bills = db.prepare("SELECT * FROM bills WHERE company_id = ? AND status = 'overdue'").all(companyId);
    text = `I found ${bills.length} overdue bill(s) in your company records. `;
    if (bills.length > 0) {
      text += bills.map(b => `- ${b.bill_number}: ${b.vendor_name} - ${formatMoneyIN(parseFloat(b.balance_due || 0))} (Due: ${formatDateIN(b.due_date)})`).join('\n');
      references = bills.map(b => ({ type: 'bill', id: b.id, number: b.bill_number }));
      suggestedActions = [{ type: 'record_payment', description: 'Record payment for overdue bills' }];
    } else { text += 'No overdue bills found. All bills are current.'; }
  } else if (lower.includes('expense') && lower.includes('summar')) {
    const bills = db.prepare("SELECT * FROM bills WHERE company_id = ? AND status != 'draft'").all(companyId);
    const total = bills.reduce((s, b) => s + parseFloat(b.grand_total || 0), 0);
    text = `This month's expenses total ${formatMoneyIN(total)} across ${bills.length} bills.`;
    suggestedActions = [{ type: 'view_reports', description: 'View expense summary report' }];
  } else if (lower.includes('unreconciled') || lower.includes('bank')) {
    const tx = db.prepare(`SELECT bt.* FROM bank_transactions bt JOIN bank_accounts ba ON ba.id = bt.bank_account_id WHERE ba.company_id = ? AND bt.match_status = 'unmatched'`).all(companyId);
    text = `I found ${tx.length} unreconciled bank transaction(s) requiring review.`;
    references = tx.map(t => ({ type: 'bank_transaction', id: t.id, description: t.description }));
    suggestedActions = [{ type: 'reconcile', description: 'Go to bank reconciliation workspace' }];
  } else if (lower.includes('outstanding') || lower.includes('receivable')) {
    const invoices = db.prepare('SELECT * FROM invoices WHERE company_id = ? AND balance_due > 0').all(companyId);
    const total = invoices.reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);
    text = `Total outstanding customer payments: ${formatMoneyIN(total)} across ${invoices.length} invoices.`;
    references = invoices.map(i => ({ type: 'invoice', id: i.id, number: i.invoice_number }));
    suggestedActions = [{ type: 'send_reminder', description: 'Send payment reminders to customers' }];
  } else if (lower.includes('unusual') || lower.includes('anomaly')) {
    text = `I've scanned your transactions and found no unusual patterns requiring immediate attention.`;
    suggestedActions = [{ type: 'view_audit_logs', description: 'Review recent activity logs' }];
  } else {
    text = `I'm FINZI AI, a rules-based accounting assistant running on your stored data. No external AI service is configured, so I answer using direct queries against your books. I can help with overdue bills, expense summaries, bank reconciliation, outstanding payments and anomaly checks. Any action I suggest must be approved by you before anything is recorded. Try: "Show me all overdue bills."`;
    suggestedActions = [{ type: 'suggestion', description: 'Show all overdue bills' }, { type: 'suggestion', description: 'Summarize this month\'s expenses' }, { type: 'suggestion', description: 'Find unreconciled bank transactions' }];
  }
  return { text, references, suggestedActions };
}
app.post('/api/ai/approval-requests', authenticateToken, requireCompanyAccess, requirePermission('use_ai_assistant'), [body('description').trim().notEmpty(), handleValidation], (req, res) => {
  try {
    const { description, proposed_changes, source_document_id, debit_account, credit_account, amount } = req.body;
    const ts = nowStr(); const id = genId();
    db.prepare(`INSERT INTO approval_requests (id, company_id, request_type, description, proposed_changes, source_document_id, debit_account, credit_account, amount, status, requested_by, created_at) VALUES (?, ?, 'ai_action', ?, ?, ?, ?, ?, ?, 'pending', 'ai_system', ?)`).run(id, req.companyId, description, proposed_changes ? JSON.stringify(proposed_changes) : null, source_document_id || null, debit_account || null, credit_account || null, parseMoney(amount) || 0, ts);
    res.status(201).json({ message: 'Approval request created', approvalId: id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create approval request' });
  }
});
app.get('/api/ai/approval-requests', authenticateToken, requireCompanyAccess, (req, res) => {
  const requests = db.prepare('SELECT * FROM approval_requests WHERE company_id = ? ORDER BY created_at DESC').all(req.companyId);
  res.json({ approval_requests: requests });
});
app.post('/api/ai/approval-requests/:id/decision', authenticateToken, requireCompanyAccess, requirePermission('approve_ai_action'), [body('decision').isIn(['approve','reject','edit']), handleValidation], (req, res) => {
  try {
    const { decision } = req.body;
    const request = db.prepare('SELECT * FROM approval_requests WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Already decided' });
    const newStatus = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'edited';
    db.prepare('UPDATE approval_requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?').run(newStatus, req.user.userId, nowStr(), req.params.id);
    res.json({ message: `Approval request ${newStatus}` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to process decision' });
  }
});

// ============================================================
// REMINDERS
// ============================================================
app.get('/api/reminders', authenticateToken, requireCompanyAccess, (req, res) => {
  const { status, category, priority } = req.query;
  let sql = `SELECT r.*, u.full_name as assigned_name FROM reminders r LEFT JOIN user_profiles u ON u.user_id = r.assigned_to WHERE r.company_id = ?`; const params = [req.companyId];
  if (status) { sql += ` AND r.status = ?`; params.push(status); }
  if (category) { sql += ` AND r.category = ?`; params.push(category); }
  if (priority) { sql += ` AND r.priority = ?`; params.push(priority); }
  sql += ` ORDER BY r.due_date ASC`;
  const reminders = db.prepare(sql).all(...params);
  res.json({ reminders });
});
app.post('/api/reminders', authenticateToken, requireCompanyAccess, requirePermission('create_reminders'), [body('title').trim().notEmpty(), body('category').notEmpty(), body('due_date').notEmpty(), handleValidation], async (req, res) => {
  try {
    const { title, description, category, related_document_id, due_date, assigned_to, priority = 'medium', scope = 'personal', notification_method = 'in_app', contact_email, contact_phone } = req.body;
    const ts = nowStr(); const id = genId();
    db.prepare(`INSERT INTO reminders (id, company_id, title, description, category, related_document_id, due_date, assigned_to, priority, status, notification_method, scope, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`).run(id, req.companyId, title, description || null, category, related_document_id || null, parseDateIN(due_date), assigned_to || null, priority, notification_method, scope, req.user.userId, ts, ts);
    db.prepare('INSERT INTO activity_logs (id, company_id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)').run(req.companyId, req.user.userId, 'reminder_created', 'reminders', id, JSON.stringify({ title, due_date }), ts);

    // Fire email/SMS notification when a provider is configured and a channel is requested.
    let notificationResults = { email: null, sms: null, note: 'No external notification provider configured. Delivered in-app only.' };
    if (notification_method === 'email' || notification_method === 'both') {
      const isEmailCfg = isEmailConfigured();
      if (isEmailCfg && contact_email) {
        notificationResults.email = await sendEmail({
          to: contact_email,
          subject: `FINZI Reminder: ${title}`,
          html: `<p>${description || ''}</p><p>Due: ${due_date}</p><p>Priority: ${priority}</p>`,
          text: `${title}\n${description || ''}\nDue: ${due_date}\nPriority: ${priority}`,
        });
      } else if (!isEmailCfg) {
        notificationResults.email = { pending: true, message: 'Email provider not configured' };
      }
    }
    if (notification_method === 'sms' || notification_method === 'both') {
      const isSmsCfg = isSmsConfigured();
      if (isSmsCfg && contact_phone) {
        notificationResults.sms = await sendSms({ to: contact_phone, body: `FINZI Reminder: ${title}. Due ${due_date}. ${description || ''}` });
      } else if (!isSmsCfg) {
        notificationResults.sms = { pending: true, message: 'SMS provider not configured' };
      }
    }

    res.status(201).json({ message: 'Reminder created', reminderId: id, notifications: notificationResults });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create reminder' });
  }
});
app.put('/api/reminders/:id', authenticateToken, requireCompanyAccess, requirePermission('create_reminders'), [body('status').isIn(['pending', 'completed', 'snoozed', 'overdue']), handleValidation], (req, res) => {
  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  const status = req.body.status;
  const ts = nowStr();
  const updates = { status, updated_at: ts };
  if (status === 'completed') updates.completed_at = ts;
  if (req.body.due_date !== undefined) updates.due_date = parseDateIN(req.body.due_date);
  const sets = Object.entries(updates).map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE reminders SET ${sets} WHERE id = ?`).run(...Object.values(updates).map(v => v === undefined ? null : v), req.params.id);
  res.json({ message: `Reminder marked ${status}`, status });
});
app.delete('/api/reminders/:id', authenticateToken, requireCompanyAccess, requirePermission('create_reminders'), (req, res) => {
  const reminder = db.prepare('SELECT id FROM reminders WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
  res.json({ message: 'Reminder deleted' });
});

// ============================================================
// AUTOMATION WORKFLOWS
// ============================================================
app.get('/api/automations', authenticateToken, requireCompanyAccess, (req, res) => {
  const workflows = db.prepare('SELECT * FROM automation_workflows WHERE company_id = ? ORDER BY created_at DESC').all(req.companyId);
  res.json({ workflows, note: 'Executed by scheduled jobs on the server. No workflow silently posts financial records — anything that touches books requires approval.' });
});
app.post('/api/automations', authenticateToken, requireCompanyAccess, requirePermission('manage_automations'), [body('name').trim().notEmpty(), body('category').notEmpty(), handleValidation], (req, res) => {
  try {
    const { name, category, trigger_condition, workflow_steps } = req.body;
    const ts = nowStr(); const id = genId();
    db.prepare(`INSERT INTO automation_workflows (id, company_id, name, category, trigger_condition, workflow_steps, status, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`).run(id, req.companyId, name, category, trigger_condition ? JSON.stringify(trigger_condition) : null, workflow_steps ? JSON.stringify(workflow_steps) : null, req.user.userId, ts, ts);
    res.status(201).json({ message: 'Automation created', id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create automation' });
  }
});
app.put('/api/automations/:id', authenticateToken, requireCompanyAccess, requirePermission('manage_automations'), [body('status').isIn(['active', 'paused', 'disabled']), handleValidation], (req, res) => {
  const wf = db.prepare('SELECT id FROM automation_workflows WHERE id = ? AND company_id = ?').get(req.params.id, req.companyId);
  if (!wf) return res.status(404).json({ error: 'Automation not found' });
  db.prepare('UPDATE automation_workflows SET status = ?, updated_at = ? WHERE id = ?').run(req.body.status, nowStr(), req.params.id);
  res.json({ message: 'Automation updated', status: req.body.status });
});

// ============================================================
// NOTIFICATIONS
// ============================================================
app.get('/api/notifications', authenticateToken, (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.userId);
  res.json({ notifications });
});
app.post('/api/notifications/:id/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND user_id = ?').run(nowStr(), req.params.id, req.user.userId);
  res.json({ message: 'Marked as read' });
});

// ============================================================
// ACTIVITY LOGS
// ============================================================
app.get('/api/activity-logs', authenticateToken, requireCompanyAccess, (req, res) => {
  const logs = db.prepare(`SELECT al.*, u.email, up.full_name FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id LEFT JOIN user_profiles up ON up.user_id = u.id WHERE al.company_id = ? ORDER BY al.created_at DESC LIMIT 100`).all(req.companyId);
  res.json({ activity_logs: logs });
});

// ============================================================
// SETTINGS
// ============================================================
app.get('/api/settings', authenticateToken, requireCompanyAccess, (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.companyId);
  const kv = db.prepare('SELECT setting_key, setting_value FROM company_settings WHERE company_id = ?').all(req.companyId);
  const preferences = {};
  for (const row of kv) preferences[row.setting_key] = row.setting_value;
  res.json({ settings: { company, modules: ['billing', 'invoicing', 'ledger', 'banking', 'tax', 'audit', 'ai'], preferences } });
});
app.put('/api/settings', authenticateToken, requireCompanyAccess, requirePermission('edit_companies'), [
  body('company').optional().isObject(),
  body('preferences').optional().isObject(),
  handleValidation,
], (req, res) => {
  try {
    const ts = nowStr();
    if (req.body.company) {
      const fields = ['legal_name', 'trade_name', 'business_type', 'pan', 'gstin', 'tan', 'registered_address', 'state', 'city', 'pincode', 'contact_email', 'contact_phone', 'accounting_method', 'gst_registration_status'];
      const updates = [], values = [];
      for (const f of fields) { if (req.body.company[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body.company[f]); } }
      if (updates.length > 0) {
        updates.push('updated_at = ?'); values.push(ts, req.companyId);
        db.prepare(`UPDATE companies SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
    }
    if (req.body.preferences && typeof req.body.preferences === 'object') {
      const upsert = db.prepare(`INSERT INTO company_settings (id, company_id, setting_key, setting_value, updated_at, updated_by) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?) ON CONFLICT(company_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`);
      for (const [key, value] of Object.entries(req.body.preferences)) {
        upsert.run(req.companyId, key, value === null || value === undefined ? null : String(value), ts, req.user.userId);
      }
    }
    db.prepare('INSERT INTO activity_logs (id, company_id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)').run(req.companyId, req.user.userId, 'settings_updated', 'companies', req.companyId, JSON.stringify({ fields: Object.keys(req.body.company || {}), preferences: Object.keys(req.body.preferences || {}) }), ts);
    res.json({ message: 'Settings saved' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ============================================================
// TEAM MANAGEMENT
// ============================================================
app.get('/api/companies/:id/members', authenticateToken, requireCompanyAccess, (req, res) => {
  const members = db.prepare(`SELECT cm.*, u.email, u.is_active, up.full_name, r.name as role_name, r.level as role_level FROM company_members cm JOIN users u ON u.id = cm.user_id LEFT JOIN user_profiles up ON up.user_id = u.id LEFT JOIN roles r ON r.id = cm.role_id WHERE cm.company_id = ? ORDER BY cm.joined_at DESC`).all(req.companyId);
  res.json({ members });
});
app.post('/api/companies/:id/members', authenticateToken, requireCompanyAccess, requirePermission('manage_users'), [
  body('email').isEmail().normalizeEmail(),
  body('role_id').notEmpty(),
  handleValidation,
], (req, res) => {
  try {
    const { email, role_id } = req.body;
    const role = db.prepare("SELECT * FROM roles WHERE id = ? AND is_system = 1").get(role_id);
    if (!role) return res.status(400).json({ error: 'Invalid role' });
    // Inviting an existing account. New-user invite links are pending integration (no email service configured).
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'No account found with this email. Ask them to register first — email invitations are pending integration.' });
    const existing = db.prepare('SELECT id FROM company_members WHERE company_id = ? AND user_id = ?').get(req.companyId, user.id);
    if (existing) return res.status(409).json({ error: 'User is already a member' });
    const ts = nowStr();
    db.prepare(`INSERT INTO company_members (id, company_id, user_id, role_id, invited_by, status, invited_at, joined_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 'active', ?, ?)`).run(req.companyId, user.id, role_id, req.user.userId, ts, ts);
    db.prepare('INSERT INTO activity_logs (id, company_id, user_id, action, entity_type, entity_id, details, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)').run(req.companyId, req.user.userId, 'member_added', 'company_members', user.id, JSON.stringify({ email, role: role.name }), ts);
    res.status(201).json({ message: 'Member added' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to add member' });
  }
});
app.put('/api/companies/:id/members/:userId', authenticateToken, requireCompanyAccess, requirePermission('manage_users'), [body('role_id').notEmpty(), handleValidation], (req, res) => {
  const member = db.prepare('SELECT * FROM company_members WHERE company_id = ? AND user_id = ?').get(req.companyId, req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  const role = db.prepare("SELECT id FROM roles WHERE id = ? AND is_system = 1").get(req.body.role_id);
  if (!role) return res.status(400).json({ error: 'Invalid role' });
  if (req.params.userId === req.user.userId) return res.status(400).json({ error: 'You cannot change your own role' });
  db.prepare('UPDATE company_members SET role_id = ? WHERE company_id = ? AND user_id = ?').run(req.body.role_id, req.companyId, req.params.userId);
  res.json({ message: 'Member role updated' });
});
app.delete('/api/companies/:id/members/:userId', authenticateToken, requireCompanyAccess, requirePermission('manage_users'), (req, res) => {
  if (req.params.userId === req.user.userId) return res.status(400).json({ error: 'You cannot remove yourself' });
  const member = db.prepare('SELECT id FROM company_members WHERE company_id = ? AND user_id = ?').get(req.companyId, req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  db.prepare('DELETE FROM company_members WHERE company_id = ? AND user_id = ?').run(req.companyId, req.params.userId);
  res.json({ message: 'Member removed' });
});
app.get('/api/roles/:id/permissions', authenticateToken, (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: 'Role not found' });
  const permissions = db.prepare(`SELECT p.id, p.name, p.resource, p.action FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = ?`).all(req.params.id);
  res.json({ role, permissions });
});
app.get('/api/permissions', authenticateToken, (req, res) => {
  const permissions = db.prepare('SELECT id, name, resource, action, description FROM permissions ORDER BY resource, action').all();
  res.json({ permissions });
});

// ============================================================
// FILE SERVE
// ============================================================
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message || 'Internal server error' }); });

function seedChartOfAccounts(companyId, userId) {
  const ts = nowStr();
  const defaultAccounts = [
    { code: '110100', name: 'Cash on Hand', group: 'assets', type: 'Asset', opening: 0 },
    { code: '110200', name: 'HDFC Bank Current Account', group: 'assets', type: 'Asset', opening: 0 },
    { code: '110300', name: 'ICICI Bank Savings Account', group: 'assets', type: 'Asset', opening: 0 },
    { code: '120100', name: 'Accounts Receivable', group: 'assets', type: 'Asset', opening: 0 },
    { code: '130100', name: 'Inventory', group: 'assets', type: 'Asset', opening: 0 },
    { code: '140100', name: 'Input CGST', group: 'assets', type: 'Asset', opening: 0 },
    { code: '140200', name: 'Input SGST', group: 'assets', type: 'Asset', opening: 0 },
    { code: '140300', name: 'Input IGST', group: 'assets', type: 'Asset', opening: 0 },
    { code: '210100', name: 'Accounts Payable', group: 'liabilities', type: 'Liability', opening: 0 },
    { code: '210200', name: 'Output CGST', group: 'liabilities', type: 'Liability', opening: 0 },
    { code: '210300', name: 'Output SGST', group: 'liabilities', type: 'Liability', opening: 0 },
    { code: '210400', name: 'Output IGST', group: 'liabilities', type: 'Liability', opening: 0 },
    { code: '210500', name: 'TDS Payable', group: 'liabilities', type: 'Liability', opening: 0 },
    { code: '300100', name: "Owner's Capital", group: 'equity', type: 'Equity', opening: 0 },
    { code: '300200', name: 'Retained Earnings', group: 'equity', type: 'Equity', opening: 0 },
    { code: '400100', name: 'Sales Revenue', group: 'income', type: 'Income', opening: 0 },
    { code: '400200', name: 'Other Income', group: 'income', type: 'Income', opening: 0 },
    { code: '510100', name: 'Purchase Expenses', group: 'expense', type: 'Expense', opening: 0 },
    { code: '510200', name: 'Raw Materials', group: 'expense', type: 'Expense', opening: 0 },
    { code: '520100', name: 'Employee Benefits', group: 'expense', type: 'Expense', opening: 0 },
    { code: '530100', name: 'Rent Expense', group: 'expense', type: 'Expense', opening: 0 },
    { code: '540100', name: 'Utilities', group: 'expense', type: 'Expense', opening: 0 },
    { code: '550100', name: 'Marketing Expense', group: 'expense', type: 'Expense', opening: 0 },
    { code: '560100', name: 'Depreciation', group: 'expense', type: 'Expense', opening: 0 },
    { code: '570100', name: 'Bank Charges', group: 'expense', type: 'Expense', opening: 0 }
  ];
  const insertAccount = db.prepare(`INSERT INTO accounts (id, company_id, code, name, account_group, account_type, opening_balance, current_balance, created_by, created_at, updated_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const acc of defaultAccounts) insertAccount.run(companyId, acc.code, acc.name, acc.group, acc.type, acc.opening, acc.opening, userId, ts, ts);
}

app.listen(PORT, () => console.log(`FINZI AI Server running on port ${PORT}`));
module.exports = app;
