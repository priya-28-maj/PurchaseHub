import { ImageAnnotatorClient } from '@google-cloud/vision';
import { detectCurrencyFromText } from '../utils/currency';

export interface OcrResult {
  productName?: string;
  brand?: string;
  category?: string;
  purchaseDate?: string;
  merchant?: string;
  totalAmount?: number;
  currency?: string;
  itemCount?: number;
  notes?: string;
  parseError?: string;
  warning?: string;
  rawText: string;
}

let client: ImageAnnotatorClient | null = null;

function getClient(): ImageAnnotatorClient {
  if (!client) {
    client = new ImageAnnotatorClient();
  }
  return client;
}

export function isVisionConfigured(): boolean {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

/** Collapse "T O T A L" → "TOTAL", normalize whitespace */
function normalizeLine(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(/T\s+O\s+T\s+A\s+L/gi, 'TOTAL')
    .replace(/S\s+U\s+B\s+T\s+O\s+T\s+A\s+L/gi, 'SUBTOTAL')
    .trim();
}

const SKIP_LINE_PATTERNS = [
  /^receipt$/i, /^invoice$/i, /^thank\s*you/i, /^welcome/i,
  /^www\./i, /^http/i, /\.com/i, /\.us/i, /\.in\b/i,
  /^\d{10,}$/, /^\+?\d[\d\s\-().]{8,}$/,
  /^auth\s*#/i, /^ref\s*#/i, /^seq\s*#/i, /^aid\b/i,
  /^approved/i, /^\+\+/i, /^debit\s*card/i, /^credit\s*card/i,
  /^visa/i, /^master/i, /^change$/i, /^cash$/i,
  /^taxable\s*@/i, /^[a-z]-taxable/i, /^items?\s*$/i,
  /^survey/i, /^chance\s+to\s+win/i, /^sign\s*up/i,
  /^pin\s*:/i, /^tel/i, /^phone/i, /^email/i,
  /^qty$/i, /^quantity$/i, /^sr\.?\s*no/i,
  /^description$/i, /^amount$/i, /^code\s*:/i,
  /^warranty/i, /^years?$/i,
  /^debit$/i, /^credit$/i,
];

const TOTAL_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /grand\s*total/i, weight: 100 },
  { pattern: /amount\s*due/i, weight: 98 },
  { pattern: /total\s*due/i, weight: 96 },
  { pattern: /you\s*paid/i, weight: 95 },
  { pattern: /total\s*amount/i, weight: 94 },
  { pattern: /amount\s*paid/i, weight: 93 },
  { pattern: /net\s*amount/i, weight: 90 },
  { pattern: /net\s*pay/i, weight: 89 },
  { pattern: /invoice\s*total/i, weight: 88 },
  { pattern: /payable/i, weight: 87 },
  { pattern: /\btotal\b/i, weight: 75 },
];

const SUBTOTAL_PATTERNS = /sub\s*total|subtotal|before\s*tax|pre\s*tax/i;
const EXCLUDE_AMOUNT_PATTERNS = /sub\s*total|subtotal|taxable\s*@|^[a-z]-taxable|discount|savings|tip\b|change\s+due|balance\s+fwd/i;

const MERCHANT_FROM_URL: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /aldi/i, name: 'ALDI' },
  { pattern: /walmart/i, name: 'Walmart' },
  { pattern: /amazon/i, name: 'Amazon' },
  { pattern: /target/i, name: 'Target' },
  { pattern: /costco/i, name: 'Costco' },
  { pattern: /flipkart/i, name: 'Flipkart' },
  { pattern: /bigbasket/i, name: 'BigBasket' },
  { pattern: /reliance/i, name: 'Reliance' },
  { pattern: /dmart/i, name: 'DMart' },
  { pattern: /cvs/i, name: 'CVS' },
  { pattern: /kroger/i, name: 'Kroger' },
  { pattern: /best\s*buy/i, name: 'Best Buy' },
  { pattern: /home\s*depot/i, name: 'Home Depot' },
  { pattern: /ikea/i, name: 'IKEA' },
  { pattern: /apple\.com/i, name: 'Apple' },
  { pattern: /walgreens/i, name: 'Walgreens' },
  { pattern: /lowes/i, name: "Lowe's" },
  { pattern: /nike/i, name: 'Nike' },
  { pattern: /adidas/i, name: 'Adidas' },
];

const MERCHANT_CATEGORY: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /best\s*buy|apple|micro\s*center|b&h/i, category: 'Electronics' },
  { pattern: /home\s*depot|lowe'?s|ikea|bed\s*bath/i, category: 'Home & Garden' },
  { pattern: /cvs|walgreens|ulta|sephora/i, category: 'Health & Beauty' },
  { pattern: /nike|adidas|zara|h&m|gap|old\s*navy/i, category: 'Clothing' },
  { pattern: /autozone|o'?reilly|advance\s*auto/i, category: 'Automotive' },
  { pattern: /dick'?s|rei|decathlon/i, category: 'Sports & Outdoors' },
  { pattern: /ashley|rooms\s*to\s*go|wayfair/i, category: 'Furniture' },
  { pattern: /sears\s*appliance|appliance/i, category: 'Appliances' },
];

const EXCLUDE_DATE_CONTEXT = /expir|valid\s*(?:till|until|thru)|best\s*before|warranty/i;

function normalizeLines(rawText: string): string[] {
  return rawText.split('\n').map((l) => normalizeLine(l.trim())).filter(Boolean);
}

function isUsReceipt(rawText: string): boolean {
  return /\$|USD|AM\s*\/\s*PM|PM\s+\d|DEBIT\s*CARD|CREDIT\s*CARD/i.test(rawText);
}

function shouldSkipLine(line: string): boolean {
  if (line.length < 2) return true;
  return SKIP_LINE_PATTERNS.some((p) => p.test(line));
}

function extractAmountFromLine(line: string): number | null {
  const dollarMatch = line.match(/\$\s*([\d,]+\.\d{2})/);
  if (dollarMatch) {
    const val = parseFloat(dollarMatch[1].replace(/,/g, ''));
    if (!isNaN(val)) return val;
  }

  const amounts = [...line.matchAll(/([\d,]+\.\d{2})/g)];
  if (amounts.length > 0) {
    const val = parseFloat(amounts[amounts.length - 1][1].replace(/,/g, ''));
    if (!isNaN(val)) return val;
  }

  return null;
}

function parseAmount(lines: string[], rawText: string): number | undefined {
  let best: { amount: number; score: number } | null = null;

  lines.forEach((line, index) => {
    const normalized = normalizeLine(line);
    if (EXCLUDE_AMOUNT_PATTERNS.test(normalized)) return;
    if (SUBTOTAL_PATTERNS.test(normalized) && !/grand|amount\s*due/i.test(normalized)) return;

    for (const { pattern, weight } of TOTAL_KEYWORDS) {
      if (pattern.test(normalized)) {
        const amount = extractAmountFromLine(normalized);
        if (amount !== null && amount > 0) {
          const score = weight + index * 0.1;
          if (!best || score > best.score) best = { amount, score };
        }
      }
    }
  });

  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
    const line = lines[i];
    if (/^(debit|credit)\b/i.test(line) && !/card/i.test(line)) {
      const amount = extractAmountFromLine(line);
      if (amount !== null && amount > 0) {
        const score = 97 + i * 0.1;
        if (!best || score > best.score) best = { amount, score };
      }
    }
  }

  if (best) return best.amount;

  const multilinePatterns = [
    /amount\s*due[:\s]*\n?\s*\$?\s*([\d,]+\.\d{2})/i,
    /total[:\s]*\n?\s*\$?\s*([\d,]+\.\d{2})/i,
    /\$\s*([\d,]+\.\d{2})\s*$/m,
  ];
  for (const pattern of multilinePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) return val;
    }
  }

  const tailStart = Math.floor(lines.length * 0.55);
  const tailAmounts: number[] = [];
  for (const line of lines.slice(tailStart)) {
    if (EXCLUDE_AMOUNT_PATTERNS.test(line) || SUBTOTAL_PATTERNS.test(line)) continue;
    const amount = extractAmountFromLine(line);
    if (amount !== null && amount > 0) tailAmounts.push(amount);
  }
  if (tailAmounts.length > 0) return Math.max(...tailAmounts);

  return undefined;
}

function normalizeDateString(raw: string, usFormat = false): string | undefined {
  const trimmed = raw.trim().split(/\s+/)[0];

  const slash = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    let year = parseInt(slash[3], 10);
    if (year < 100) year += year > 50 ? 1900 : 2000;

    let month: number, day: number;
    if (usFormat) {
      month = a;
      day = b;
    } else if (a > 12) {
      day = a; month = b;
    } else if (b > 12) {
      month = a; day = b;
    } else {
      day = a; month = b;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  const iso = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  const named = raw.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i);
  if (named) {
    const d = new Date(named[1]);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  return undefined;
}

function parseDate(lines: string[], rawText: string): string | undefined {
  const usFormat = isUsReceipt(rawText);

  const dateTimeMatch = rawText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+\d{1,2}:\d{2}/);
  if (dateTimeMatch) {
    const normalized = normalizeDateString(dateTimeMatch[1], usFormat);
    if (normalized) return normalized;
  }

  for (const line of lines) {
    if (EXCLUDE_DATE_CONTEXT.test(line)) continue;
    const match = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (match) {
      const normalized = normalizeDateString(match[1], usFormat);
      if (normalized) return normalized;
    }
  }

  return undefined;
}

function parseMerchantFromUrl(rawText: string): string | undefined {
  for (const { pattern, name } of MERCHANT_FROM_URL) {
    if (pattern.test(rawText)) return name;
  }
  return undefined;
}

function parseMerchant(lines: string[], rawText: string): string | undefined {
  const fromUrl = parseMerchantFromUrl(rawText);
  if (fromUrl) return fromUrl;

  for (const line of lines.slice(0, 10)) {
    if (shouldSkipLine(line)) continue;
    const trimmed = line.trim();
    if (!/[a-zA-Z]{2,}/.test(trimmed)) continue;
    if (trimmed.length > 50) continue;
    if (/^\d/.test(trimmed)) continue;
    if (/store\s*#|lane|register|cashier/i.test(trimmed)) continue;

    if (/^[A-Z][A-Z\s&'.-]{2,}$/.test(trimmed) && trimmed.length <= 30) {
      return trimmed;
    }

    if (/^[A-Za-z]/.test(trimmed)) return trimmed;
  }

  return undefined;
}

function inferCategory(merchant?: string, rawText?: string): string {
  const haystack = `${merchant || ''} ${rawText || ''}`.toLowerCase();
  for (const { pattern, category } of MERCHANT_CATEGORY) {
    if (pattern.test(haystack)) return category;
  }
  return 'Other';
}

function parseItemCount(lines: string[], rawText: string): number | undefined {
  const match = rawText.match(/(\d+)\s*items?\b/i);
  if (match) return parseInt(match[1], 10);

  const itemLines = parseLineItems(lines);
  if (itemLines.length > 1) return itemLines.length;

  return undefined;
}

interface LineItem {
  name: string;
  price: number;
}

function parseLineItems(lines: string[]): LineItem[] {
  const items: LineItem[] = [];

  for (const line of lines) {
    if (shouldSkipLine(line)) continue;
    if (SUBTOTAL_PATTERNS.test(line) || EXCLUDE_AMOUNT_PATTERNS.test(line)) continue;
    if (/total|amount\s*due|debit|credit|approved|auth|change/i.test(line)) continue;

    const itemMatch = line.match(/^(.+?)\s+([\d,]+\.\d{2})(?:\s+[A-Z]{1,3})?$/i);
    if (itemMatch) {
      const name = itemMatch[1].replace(/\s+\d+\s*[@xX×]\s*/g, ' ').trim();
      const price = parseFloat(itemMatch[2].replace(/,/g, ''));
      if (name.length >= 2 && name.length <= 80 && !isNaN(price) && price > 0 && price < 100000) {
        if (!/^(tax|total|sub|discount|savings)/i.test(name)) {
          items.push({ name, price });
        }
      }
      continue;
    }

    const qtyMatch = line.match(/^(\d+)\s*[@xX×]\s+(.+?)\s+([\d,]+\.\d{2})/i);
    if (qtyMatch) {
      items.push({
        name: qtyMatch[2].trim(),
        price: parseFloat(qtyMatch[3].replace(/,/g, '')),
      });
    }
  }

  return items;
}

function parseProductName(lines: string[], merchant?: string, itemCount?: number): string | undefined {
  const items = parseLineItems(lines);

  if (items.length === 0) {
    if (merchant && itemCount && itemCount > 1) {
      return `${merchant} purchase (${itemCount} items)`;
    }
    return merchant ? `${merchant} purchase` : undefined;
  }

  if (items.length === 1) return items[0].name;

  const sorted = [...items].sort((a, b) => b.price - a.price);
  const main = sorted[0].name;
  const count = itemCount || items.length;

  if (count > 1) {
    return `${main} (+${count - 1} more items)`;
  }

  return main;
}

function buildNotes(itemCount?: number, merchant?: string): string | undefined {
  if (itemCount && itemCount > 1) {
    return `Receipt from ${merchant || 'store'} — ${itemCount} items`;
  }
  return undefined;
}

export async function extractRawText(imageBuffer: Buffer): Promise<string> {
  try {
    const visionClient = getClient();
    const [result] = await visionClient.textDetection({ image: { content: imageBuffer } });
    const text = result.textAnnotations?.[0]?.description || '';
    if (!text) console.warn('Vision OCR returned no text');
    return text;
  } catch (err) {
    console.error('Google Vision OCR failed:', err instanceof Error ? err.message : err);
    return '';
  }
}

function parseReceiptText(rawText: string): Omit<OcrResult, 'rawText'> {
  const lines = normalizeLines(rawText);
  const merchant = parseMerchant(lines, rawText);
  const itemCount = parseItemCount(lines, rawText);
  const totalAmount = parseAmount(lines, rawText);
  const purchaseDate = parseDate(lines, rawText);
  const productName = parseProductName(lines, merchant, itemCount);
  const currency = detectCurrencyFromText(rawText);
  const category = inferCategory(merchant, rawText);
  const notes = buildNotes(itemCount, merchant);

  return {
    merchant,
    totalAmount,
    purchaseDate,
    productName,
    brand: merchant?.split(' ')[0],
    category,
    currency,
    itemCount,
    notes,
  };
}

export async function extractReceiptData(imageBuffer: Buffer): Promise<OcrResult> {
  try {
    if (!isVisionConfigured()) {
      return {
        rawText: '',
        parseError: 'Google Vision not configured. Set GOOGLE_APPLICATION_CREDENTIALS in backend/.env',
      };
    }

    const rawText = await extractRawText(imageBuffer);

    if (!rawText.trim()) {
      return {
        rawText: '',
        parseError: 'No text found on receipt. Try a clearer, flatter photo with good lighting.',
      };
    }

    const parsed = parseReceiptText(rawText);
    const missingFields: string[] = [];
    if (!parsed.totalAmount) missingFields.push('total');
    if (!parsed.purchaseDate) missingFields.push('date');
    if (!parsed.merchant) missingFields.push('store');

    return {
      rawText,
      ...parsed,
      warning: missingFields.length > 0
        ? `Could not detect: ${missingFields.join(', ')}. Please verify before saving.`
        : undefined,
    };
  } catch (error) {
    console.error('OCR error:', error);
    return {
      rawText: '',
      parseError: error instanceof Error ? error.message : 'OCR failed',
    };
  }
}
