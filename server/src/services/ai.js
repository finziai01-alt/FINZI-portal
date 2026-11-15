// External AI / LLM Service Layer
// ==========================================================================
// No external AI service is configured by default. FINZI AI runs as a
// rules-based assistant answering from direct queries against stored data.
// To enable a real LLM, set AI_PROVIDER plus credentials in .env, then
// implement the provider adapter below.
//
// Supported providers (placeholders):
//   AI_PROVIDER: openai | anthropic | azure_openai | none

const AI_PROVIDER = process.env.AI_PROVIDER || 'none';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || '';
const AI_BASE_URL = process.env.AI_BASE_URL || '';

function isConfigured() {
  return AI_PROVIDER !== 'none' && Boolean(AI_API_KEY && AI_MODEL);
}

/**
 * Generate a response from an external LLM, grounded in the user's books data.
 * Returns { success, text, references, suggestedActions, error, pending }.
 */
async function generateResponse({ conversationHistory, companyData, systemPrompt }) {
  if (!isConfigured()) {
    return {
      pending: true,
      text: null,
      references: [],
      suggestedActions: [],
      error: null,
      message: 'External AI not configured. Set AI_PROVIDER and AI_API_KEY in .env to enable LLM-powered responses.',
    };
  }

  try {
    const system = systemPrompt || buildDefaultSystemPrompt(companyData);
    const messages = [
      { role: 'system', content: system },
      ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    ];

    switch (AI_PROVIDER) {
      case 'openai': {
        const response = await fetch(`${AI_BASE_URL || 'https://api.openai.com'}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AI_API_KEY}`,
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages,
            temperature: 0.3,
            max_tokens: 500,
          }),
        });
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          return { pending: false, text: null, references: [], suggestedActions: [], error: `OpenAI API error: ${response.status} ${errText}` };
        }
        const result = await response.json();
        const text = result.choices[0].message.content;
        return { pending: false, text, references: [], suggestedActions: [], error: null };
      }
      case 'anthropic': {
        const response = await fetch(`${AI_BASE_URL || 'https://api.anthropic.com'}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': AI_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: AI_MODEL,
            max_tokens: 500,
            system,
            messages: conversationHistory.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          return { pending: false, text: null, references: [], suggestedActions: [], error: `Anthropic API error: ${response.status} ${errText}` };
        }
        const result = await response.json();
        const text = result.content[0].text;
        return { pending: false, text, references: [], suggestedActions: [], error: null };
      }
      case 'azure_openai': {
        // Implement Azure OpenAI adapter here when credentials are provided.
        return { pending: true, text: null, references: [], suggestedActions: [], error: null, message: 'Azure OpenAI adapter not yet implemented.' };
      }
      default:
        return { pending: true, text: null, references: [], suggestedActions: [], error: null, message: `Unknown AI provider: ${AI_PROVIDER}` };
    }
  } catch (err) {
    console.error('AI response generation failed:', err.message);
    return { pending: false, text: null, references: [], suggestedActions: [], error: err.message || 'AI response generation failed' };
  }
}

/**
 * Build a system prompt that grounds the LLM in the user's actual books data
 * and enforces the approval-workflow constraint (no silent posting).
 */
function buildDefaultSystemPrompt(companyData) {
  return `You are FINZI AI, an accounting assistant for ${companyData.companyName || 'an Indian business'} (GSTIN: ${companyData.gstin || '—'}).

Rules:
1. Answer using ONLY the company data provided in the conversation context. Do not fabricate figures.
2. All amounts are in Indian Rupees (₹). Dates use DD/MM/YYYY format.
3. You may SUGGEST accounting actions (record payment, post journal entry, file tax), but you MUST NOT execute them. Every suggested action requires explicit human approval via the approval-request workflow.
4. If asked to perform an action, respond with a suggested action object and tell the user to review it in "Pending AI Approvals".
5. Be concise and professional. Use Indian accounting terminology (GSTIN, PAN, ITC, CGST/SGST/IGST, TDS, lakhs/crores).`;
}

module.exports = { generateResponse, isConfigured, AI_PROVIDER, AI_MODEL, buildDefaultSystemPrompt };
