// OCR / Document Extraction Service Layer
// ==========================================================================
// No real OCR service is configured by default. This module defines the
// integration contract. To enable real OCR, set OCR_PROVIDER=aws_textract
// (or azure_form_recognizer / google_document_ai) plus the corresponding
// credentials in .env, then implement the provider adapter below.

const OCR_PROVIDER = process.env.OCR_PROVIDER || 'none'; // none | aws_textract | azure_form_recognizer | google_document_ai
const OCR_REGION = process.env.OCR_REGION || 'ap-south-1';
const OCR_ACCESS_KEY = process.env.OCR_ACCESS_KEY_ID || '';
const OCR_SECRET_KEY = process.env.OCR_SECRET_ACCESS_KEY || '';
const OCR_ENDPOINT = process.env.OCR_ENDPOINT || '';

function isConfigured() {
  return OCR_PROVIDER !== 'none' && Boolean(OCR_ACCESS_KEY && OCR_SECRET_KEY);
}

/**
 * Extract fields from an uploaded document.
 * Returns { success, data, error, pending }
 * When no provider is configured, returns pending=true so the UI can show
 * "OCR pending integration — enter fields manually."
 */
async function extractDocument({ filePath, mimeType, documentId }) {
  if (!isConfigured()) {
    return {
      pending: true,
      message: 'OCR integration not configured. Set OCR_PROVIDER and credentials in .env to enable automatic extraction.',
      data: null,
    };
  }

  try {
    switch (OCR_PROVIDER) {
      case 'aws_textract': {
        const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
        const client = new TextractClient({
          region: OCR_REGION,
          credentials: { accessKeyId: OCR_ACCESS_KEY, secretAccessKey: OCR_SECRET_KEY },
        });
        const fs = require('fs');
        const documentBytes = fs.readFileSync(filePath);
        const command = new AnalyzeDocumentCommand({
          Document: { Bytes: documentBytes },
          FeatureTypes: ['FORMS', 'TABLES'],
        });
        const response = await client.send(command);
        // Map Textract blocks to FINZI extraction fields
        const fields = mapTextractToFields(response.Blocks);
        return { pending: false, data: fields, error: null };
      }
      case 'azure_form_recognizer': {
        // Implement Azure Form Recognizer adapter here when credentials are provided.
        return { pending: true, message: 'Azure Form Recognizer adapter not yet implemented.', data: null };
      }
      case 'google_document_ai': {
        // Implement Google Document AI adapter here when credentials are provided.
        return { pending: true, message: 'Google Document AI adapter not yet implemented.', data: null };
      }
      default:
        return { pending: true, message: `Unknown OCR provider: ${OCR_PROVIDER}`, data: null };
    }
  } catch (err) {
    console.error('OCR extraction failed:', err.message);
    return { pending: false, data: null, error: err.message || 'OCR extraction failed' };
  }
}

/**
 * Map AWS Textract blocks to FINZI document extraction fields.
 * This is a best-effort mapping; the user should review extracted fields.
 */
function mapTextractToFields(blocks) {
  const keyMap = {};
  const valueMap = {};
  const blockMap = {};

  blocks.forEach((block) => {
    blockMap[block.Id] = block;
    if (block.BlockType === 'KEY_VALUE_SET') {
      if (block.EntityTypes.includes('KEY')) keyMap[block.Id] = block;
      else valueMap[block.Id] = block;
    }
  });

  const findValueBlock = (keyBlock) => {
    for (const relationship of keyBlock.Relationships || []) {
      if (relationship.Type === 'VALUE') {
        for (const valueId of relationship.Ids) {
          return blockMap[valueId];
        }
      }
    }
    return null;
  };

  const getText = (block) => {
    let text = '';
    if (!block) return text;
    for (const relationship of block.Relationships || []) {
      if (relationship.Type === 'CHILD') {
        for (const childId of relationship.Ids) {
          const word = blockMap[childId];
          if (word && word.BlockType === 'WORD') text += word.Text + ' ';
          if (word && word.BlockType === 'SELECTION_ELEMENT' && word.SelectionStatus === 'SELECTED') text += 'X ';
        }
      }
    }
    return text.trim();
  };

  const extracted = {};
  for (const keyId of Object.keys(keyMap)) {
    const keyBlock = keyMap[keyId];
    const valueBlock = findValueBlock(keyBlock);
    const keyText = getText(keyBlock).replace(/:/g, '').trim();
    const valueText = getText(valueBlock).trim();
    if (keyText && valueText) extracted[keyText] = valueText;
  }

  // Normalize into FINZI schema fields
  return {
    vendor_name: extracted['Vendor'] || extracted['Supplier'] || null,
    vendor_gstin: extracted['GSTIN'] || extracted['GST No'] || null,
    invoice_number: extracted['Invoice No'] || extracted['Invoice Number'] || null,
    invoice_date: extracted['Invoice Date'] || null,
    taxable_value: parseMoney(extracted['Taxable Value'] || extracted['Subtotal']),
    cgst: parseMoney(extracted['CGST']),
    sgst: parseMoney(extracted['SGST']),
    igst: parseMoney(extracted['IGST']),
    grand_total: parseMoney(extracted['Total'] || extracted['Grand Total']),
    confidence_score: null, // Textract does not return a single document-level confidence
    missing_fields: [],
  };
}

function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

module.exports = { extractDocument, isConfigured, OCR_PROVIDER };
