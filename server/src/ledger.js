// Ledger posting helpers for FINZI AI.
// Keeps double-entry accounting consistent: every posted bill/invoice creates
// a corresponding journal entry. Idempotent — skips if an entry already exists.

const crypto = require('crypto');

const genId = () => crypto.randomBytes(16).toString('hex');
const nowStr = () => new Date().toISOString();
const parseMoney = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

// Factory binds to the app's single SQLite connection.
module.exports = (db) => {
  // Post a bill to the general ledger: Dr Purchases + Dr Input GST / Cr Accounts Payable (+ Cr TDS Payable)
  // Idempotent: skips if a journal entry already references this bill.
  function postBillJournal(billId) {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    if (!bill || bill.status === 'draft') return null;
    const existing = db.prepare('SELECT id FROM journal_entries WHERE reference_number = ?').get(`BILL-${billId}`);
    if (existing) return null;
    const cgst = parseMoney(bill.cgst), sgst = parseMoney(bill.sgst), igst = parseMoney(bill.igst), cess = parseMoney(bill.cess);
    const taxable = parseMoney(bill.taxable_value);
    const tds = parseMoney(bill.tds_amount);
    const grandTotal = parseMoney(bill.grand_total);
    const payable = grandTotal - tds;
    if (taxable <= 0 && cgst <= 0 && sgst <= 0 && igst <= 0 && cess <= 0) return null;
    const lines = [];
    if (taxable > 0) {
      const purchaseAcct = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '510100'").get(bill.company_id);
      if (purchaseAcct) lines.push({ account_id: purchaseAcct.id, debit: taxable, credit: 0, description: `Purchases per bill ${bill.bill_number}` });
    }
    if (cgst > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '140100'").get(bill.company_id); if (a) lines.push({ account_id: a.id, debit: cgst, credit: 0, description: 'Input CGST' }); }
    if (sgst > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '140200'").get(bill.company_id); if (a) lines.push({ account_id: a.id, debit: sgst, credit: 0, description: 'Input SGST' }); }
    if (igst > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '140300'").get(bill.company_id); if (a) lines.push({ account_id: a.id, debit: igst, credit: 0, description: 'Input IGST' }); }
    if (cess > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '140100'").get(bill.company_id); if (a) lines.push({ account_id: a.id, debit: cess, credit: 0, description: 'Input Cess' }); }
    if (payable > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '210100'").get(bill.company_id); if (a) lines.push({ account_id: a.id, debit: 0, credit: payable, description: `Payable to ${bill.vendor_name}` }); }
    if (tds > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '210500'").get(bill.company_id); if (a) lines.push({ account_id: a.id, debit: 0, credit: tds, description: `TDS deducted per ${bill.tds_section || 'applicable section'}` }); }
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01 || lines.length === 0) return null;
    const ts = nowStr();
    const jeId = genId();
    db.prepare(`INSERT INTO journal_entries (id, company_id, entry_number, voucher_type, entry_date, reference_number, narration, total_debit, total_credit, status, cost_centre, created_by, created_at, updated_at) VALUES (?, ?, ?, 'PURCHASE', ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?)`).run(jeId, bill.company_id, `JV-BILL-${bill.bill_number}`, bill.invoice_date || bill.created_at, `BILL-${billId}`, `Purchase from ${bill.vendor_name} - ${bill.bill_number}`, totalDebit, totalCredit, bill.cost_centre || null, bill.created_by, ts, ts);
    for (const l of lines) {
      db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)`).run(jeId, l.account_id, l.debit, l.credit, l.description, ts);
      db.prepare('UPDATE accounts SET current_balance = current_balance + ? - ? WHERE id = ?').run(l.debit, l.credit, l.account_id);
    }
    return jeId;
  }

  // Post an invoice to the general ledger: Dr Accounts Receivable / Cr Sales Revenue + Cr Output GST
  function postInvoiceJournal(invoiceId) {
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!inv || inv.status === 'draft' || inv.status === 'cancelled') return null;
    const existing = db.prepare('SELECT id FROM journal_entries WHERE reference_number = ?').get(`INV-${invoiceId}`);
    if (existing) return null;
    const cgst = parseMoney(inv.cgst), sgst = parseMoney(inv.sgst), igst = parseMoney(inv.igst), cess = parseMoney(inv.cess);
    const taxable = parseMoney(inv.subtotal) - parseMoney(inv.discount);
    const grandTotal = parseMoney(inv.grand_total);
    if (taxable <= 0 && cgst <= 0 && sgst <= 0 && igst <= 0 && cess <= 0) return null;
    const lines = [];
    const arAcct = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '120100'").get(inv.company_id);
    if (arAcct && grandTotal > 0) lines.push({ account_id: arAcct.id, debit: grandTotal, credit: 0, description: `Receivable from ${inv.customer_name}` });
    if (taxable > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '400100'").get(inv.company_id); if (a) lines.push({ account_id: a.id, debit: 0, credit: taxable, description: `Sales per invoice ${inv.invoice_number}` }); }
    if (cgst > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '210200'").get(inv.company_id); if (a) lines.push({ account_id: a.id, debit: 0, credit: cgst, description: 'Output CGST' }); }
    if (sgst > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '210300'").get(inv.company_id); if (a) lines.push({ account_id: a.id, debit: 0, credit: sgst, description: 'Output SGST' }); }
    if (igst > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '210400'").get(inv.company_id); if (a) lines.push({ account_id: a.id, debit: 0, credit: igst, description: 'Output IGST' }); }
    if (cess > 0) { const a = db.prepare("SELECT id FROM accounts WHERE company_id = ? AND code = '210400'").get(inv.company_id); if (a) lines.push({ account_id: a.id, debit: 0, credit: cess, description: 'Output Cess' }); }
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01 || lines.length === 0) return null;
    const ts = nowStr();
    const jeId = genId();
    db.prepare(`INSERT INTO journal_entries (id, company_id, entry_number, voucher_type, entry_date, reference_number, narration, total_debit, total_credit, status, cost_centre, created_by, created_at, updated_at) VALUES (?, ?, ?, 'SALES', ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?)`).run(jeId, inv.company_id, `JV-INV-${inv.invoice_number}`, inv.invoice_date || inv.created_at, `INV-${invoiceId}`, `Sale to ${inv.customer_name} - ${inv.invoice_number}`, totalDebit, totalCredit, null, inv.created_by, ts, ts);
    for (const l of lines) {
      db.prepare(`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)`).run(jeId, l.account_id, l.debit, l.credit, l.description, ts);
      db.prepare('UPDATE accounts SET current_balance = current_balance + ? - ? WHERE id = ?').run(l.debit, l.credit, l.account_id);
    }
    return jeId;
  }

  return { postBillJournal, postInvoiceJournal };
};
