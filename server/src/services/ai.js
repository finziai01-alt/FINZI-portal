// External AI / LLM Service Layer
// ==========================================================================
// FINZI AI runs as a rules-based assistant answering from direct queries
// against stored data. To enable a real LLM, set AI_PROVIDER plus
// credentials in .env.
//
// Provider priority (auto-fallback):
//   1. Google Gemini (AI_PROVIDER=google_gemini, GEMINI_API_KEY)
//   2. NVIDIA Nemotron 3.5 Super VL 120B A12B (AI_PROVIDER=nvidia_nemotron, NVIDIA_API_KEY)
//   3. NVIDIA GLM 5.3 Flash (AI_PROVIDER=nvidia_glm, NVIDIA_API_KEY)
//   4. NVIDIA Nemotron Voice Chat (AI_PROVIDER=nvidia_nemotron_voice, NVIDIA_API_KEY)
//
// If ALL providers fail, the UI shows: "Server Busy hold just a minute"
// (no raw error is surfaced to the user).

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_NEMOTRON_MODEL = process.env.NVIDIA_NEMOTRON_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b';
const NVIDIA_GLM_MODEL = process.env.NVIDIA_GLM_MODEL || 'nvidia/glm-5.3-flash';
const NVIDIA_VOICE_MODEL = process.env.NVIDIA_VOICE_MODEL || 'nvidia/nemotron-voice-chat';

const USER_FRIENDLY_BUSY_MESSAGE =
  "Server Busy hold just a minute";

function isConfigured() {
  return Boolean(GEMINI_API_KEY || NVIDIA_API_KEY);
}

function buildDefaultSystemPrompt(companyData) {
  return `You are FINZI AI, an accounting assistant for ${companyData.companyName || 'an Indian business'} (GSTIN: ${companyData.gstin || '—'}).

Rules:
1. Answer using ONLY the company data provided in the conversation context. Do not fabricate figures.
2. All amounts are in Indian Rupees (₹). Dates use DD/MM/YYYY format.
3. You may SUGGEST accounting actions (record payment, post journal entry, file tax), but you MUST NOT execute them. Every suggested action requires explicit human approval via the approval-request workflow.
4. If asked to perform an action, respond with a suggested action object and tell the user to review it in "Pending AI Approvals".
5. Be concise and professional. Use Indian accounting terminology (GSTIN, PAN, ITC, CGST/SGST/IGST, TDS, lakhs/crores).`;
}

/* ------------------------------------------------------------------ */
/* Google Gemini adapter                                              */
/* ------------------------------------------------------------------ */
async function callGemini({ system, messages }) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const history = messages.filter((m) => m.role !== 'system');
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
    }
  );
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, references: [], suggestedActions: [] };
}

/* ------------------------------------------------------------------ */
/* NVIDIA NIM adapter                                                 */
/* ------------------------------------------------------------------ */
async function callNvidia({ system, messages, model }) {
  if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY not set');
  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`NVIDIA API error: ${response.status} ${errText}`);
  }
  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || '';
  return { text, references: [], suggestedActions: [] };
}

/**
 * Generate a response from an external LLM with automatic provider fallback.
 * Returns { text, references, suggestedActions, error, pending, message }.
 */
async function generateResponse({ conversationHistory, companyData, systemPrompt }) {
  const system = systemPrompt || buildDefaultSystemPrompt(companyData);
  const messages = conversationHistory.map((m) => ({ role: m.role, content: m.content }));

  const providers = [
    { name: 'google_gemini', fn: () => callGemini({ system, messages }) },
    { name: 'nvidia_nemotron', fn: () => callNvidia({ system, messages, model: NVIDIA_NEMOTRON_MODEL }) },
    { name: 'nvidia_glm', fn: () => callNvidia({ system, messages, model: NVIDIA_GLM_MODEL }) },
    { name: 'nvidia_nemotron_voice', fn: () => callNvidia({ system, messages, model: NVIDIA_VOICE_MODEL }) },
  ];

  let lastError = null;
  for (const provider of providers) {
    try {
      const result = await provider.fn();
      return {
        pending: false,
        text: result.text,
        references: result.references || [],
        suggestedActions: result.suggestedActions || [],
        error: null,
        message: null,
        provider: provider.name,
      };
    } catch (err) {
      console.error(`${provider.name} failed:`, err.message);
      lastError = err.message;
    }
  }

  // All providers failed — show friendly busy message, never raw error
  return {
    pending: false,
    text: USER_FRIENDLY_BUSY_MESSAGE,
    references: [],
    suggestedActions: [],
    error: null,
    message: lastError || 'All AI providers unavailable',
    provider: null,
  };
}

module.exports = { generateResponse, buildDefaultSystemPrompt, isConfigured };
