// GST / TDS Portal Filing Service Layer
// ==========================================================================
// No real GSTN / e-filing integration is configured by default. Filing on the
// GST portal is a separate, manual action performed by an authorised person
// (or their GST practitioner) using their own credentials.
//
// This module defines the integration contract. To enable real filing, set
// GSTN_ENABLED=true plus GSTN_CLIENT_ID, GSTN_CLIENT_SECRET, GSTN_REDIRECT_URI
// (OAuth2) or GSP credentials, then implement the provider adapter below.

const GSTN_ENABLED = process.env.GSTN_ENABLED === 'true';
const GSTN_CLIENT_ID = process.env.GSTN_CLIENT_ID || '';
const GSTN_CLIENT_SECRET = process.env.GSTN_CLIENT_SECRET || '';
const GSTN_REDIRECT_URI = process.env.GSTN_REDIRECT_URI || '';
const GSTN_BASE_URL = process.env.GSTN_BASE_URL || 'https://gst.gov.in';

function isConfigured() {
  return GSTN_ENABLED && Boolean(GSTN_CLIENT_ID && GSTN_CLIENT_SECRET);
}

/**
 * Prepare a GSTR-3B return payload from books data.
 * Returns { success, payload, pending, message }.
 */
function prepareGSTR3B({ companyId, period, gstr3bData }) {
  if (!isConfigured()) {
    return {
      pending: true,
      message: 'GST portal integration not configured. Set GSTN_ENABLED=true and OAuth credentials in .env to enable filing.',
      payload: null,
    };
  }
  return {
    pending: false,
    payload: {
      gstin: gstr3bData.gstin,
      period,
      taxable_value_outward: gstr3bData.taxable_value_outward,
      output_tax: gstr3bData.output_tax,
      taxable_value_inward: gstr3bData.taxable_value_inward,
      input_tax_credit: gstr3bData.input_tax_credit,
      net_tax_payable: gstr3bData.net_tax_payable,
      late_fee: gstr3bData.late_fee || 0,
    },
    error: null,
  };
}

/**
 * Submit a prepared return to the GST portal (OAuth2 protected).
 * Returns { success, acknowledgementNumber, filingDate, error, pending }.
 */
async function fileReturn({ returnType, period, payload, accessToken }) {
  if (!isConfigured()) {
    return {
      pending: true,
      message: 'GST portal integration not configured. Filing must be done manually on the GST portal.',
      acknowledgementNumber: null,
      filingDate: null,
      error: null,
    };
  }

  try {
    const endpoint = `${GSTN_BASE_URL}/api/v1/returns/${returnType}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ period, ...payload }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        pending: false,
        acknowledgementNumber: null,
        filingDate: null,
        error: `GST portal returned ${response.status}: ${errText}`,
      };
    }
    const result = await response.json();
    return {
      pending: false,
      acknowledgementNumber: result.acknowledgement_number || result.arn || null,
      filingDate: result.filing_date || new Date().toISOString(),
      error: null,
    };
  } catch (err) {
    console.error('GST filing failed:', err.message);
    return {
      pending: false,
      acknowledgementNumber: null,
      filingDate: null,
      error: err.message || 'GST portal filing failed',
    };
  }
}

/**
 * Generate the GST portal OAuth2 authorization URL for the user to consent.
 * The user completes this flow in a browser; the app receives an authorization
 * code which is exchanged for an access token.
 */
function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: GSTN_CLIENT_ID,
    redirect_uri: GSTN_REDIRECT_URI,
    response_type: 'code',
    scope: 'gstr3b_file gstr1_file profile_read',
    state,
  });
  return `${GSTN_BASE_URL}/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 */
async function exchangeCodeForToken(code) {
  if (!isConfigured()) {
    return { pending: true, accessToken: null, error: 'GST portal integration not configured' };
  }
  try {
    const response = await fetch(`${GSTN_BASE_URL}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: GSTN_REDIRECT_URI,
        client_id: GSTN_CLIENT_ID,
        client_secret: GSTN_CLIENT_SECRET,
      }),
    });
    if (!response.ok) {
      return { pending: false, accessToken: null, error: 'Token exchange failed' };
    }
    const result = await response.json();
    return { pending: false, accessToken: result.access_token, error: null };
  } catch (err) {
    return { pending: false, accessToken: null, error: err.message || 'Token exchange failed' };
  }
}

module.exports = {
  prepareGSTR3B,
  fileReturn,
  getAuthorizationUrl,
  exchangeCodeForToken,
  isConfigured,
  GSTN_ENABLED,
};
