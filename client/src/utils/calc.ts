// Line-item arithmetic shared by the bill and invoice forms.
// Indian GST: CGST + SGST for intra-state supply, IGST for inter-state.

function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export interface LineItemInput {
  quantity?: number | string;
  rate?: number | string;
  discount_percent?: number | string;
  gst_rate?: number | string;
}

export interface LineItemTotals {
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface DocumentTotals {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
}

/** Intra-state when both GSTINs carry the same state code; unknown values fall back to CGST/SGST. */
export function isIntraState(companyGstin?: string | null, partyGstin?: string | null): boolean {
  const companyState = String(companyGstin || '').trim().slice(0, 2);
  const partyState = String(partyGstin || '').trim().slice(0, 2);
  if (!/^\d{2}$/.test(companyState) || !/^\d{2}$/.test(partyState)) return true;
  return companyState === partyState;
}

/** qty × rate, less line discount, plus GST split by supply type. */
export function calcLine(item: LineItemInput, intraState: boolean): LineItemTotals {
  const gross = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
  const taxable = round2(gross - (gross * (Number(item.discount_percent) || 0)) / 100);
  const tax = round2((taxable * (Number(item.gst_rate) || 0)) / 100);
  if (!intraState) {
    return { taxable_amount: taxable, cgst: 0, sgst: 0, igst: tax, total: round2(taxable + tax) };
  }
  const cgst = round2(tax / 2);
  const sgst = round2(tax - cgst);
  return { taxable_amount: taxable, cgst, sgst, igst: 0, total: round2(taxable + cgst + sgst) };
}

export function sumLines(lines: LineItemTotals[]): DocumentTotals {
  const sum: DocumentTotals = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
  for (const line of lines) {
    sum.taxable += Number(line.taxable_amount) || 0;
    sum.cgst += Number(line.cgst) || 0;
    sum.sgst += Number(line.sgst) || 0;
    sum.igst += Number(line.igst) || 0;
  }
  return {
    taxable: round2(sum.taxable),
    cgst: round2(sum.cgst),
    sgst: round2(sum.sgst),
    igst: round2(sum.igst),
  };
}

/** Document total: taxable + tax + cess + round-off − discount, never below zero. */
export function grandTotal(sum: DocumentTotals, cess: number, discount: number, roundOff: number): number {
  const value =
    sum.taxable +
    sum.cgst +
    sum.sgst +
    sum.igst +
    (Number(cess) || 0) +
    (Number(roundOff) || 0) -
    (Number(discount) || 0);
  return Math.max(0, round2(value));
}
