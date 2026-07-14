import * as T from './ai.types';

// ── Intent Keyword Maps ───────────────────────────────────────────────

const INTENT_KEYWORDS: Record<T.NlpIntent, string[]> = {
  revenue_query: ['revenue', 'sales', 'income', 'earning', 'earned'],
  profit_query: [
    'profit',
    'margin',
    'pnl',
    'bottom line',
    'net profit',
    'gross profit',
  ],
  stock_query: [
    'stock',
    'inventory',
    'shortage',
    'low stock',
    'reorder',
    'stock level',
  ],
  occupancy_query: [
    'occupancy',
    'rooms',
    'booked',
    'vacant',
    'room',
    'occupancy rate',
  ],
  payroll_query: ['payroll', 'salary', 'wages', 'employee cost', 'staff cost'],
  cash_flow_query: [
    'cash',
    'cashflow',
    'cash flow',
    'balance',
    'cash position',
  ],
  supplier_query: [
    'supplier',
    'vendor',
    'outstanding',
    'delayed',
    'payment pending',
  ],
  approval_query: ['approval', 'pending', 'approve', 'needs approval'],
  general_query: [],
  unknown: [],
};

// ── Date Patterns ─────────────────────────────────────────────────────

const DATE_PATTERNS = [
  { pattern: /today|current/i, value: 'today' },
  { pattern: /yesterday/i, value: 'yesterday' },
  { pattern: /this\s+week/i, value: 'this_week' },
  { pattern: /this\s+month/i, value: 'this_month' },
  { pattern: /last\s+week/i, value: 'last_week' },
  { pattern: /last\s+month/i, value: 'last_month' },
  { pattern: /this\s+(financial\s+)?year/i, value: 'this_year' },
];

// ── Numeric extraction pattern ────────────────────────────────────────

const AMOUNT_PATTERN = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i;
const NUMBER_PATTERN = /(\d[\d,]*)/g;

// ── NLP Service ───────────────────────────────────────────────────────

export const NlpService = {
  async parseQuery(
    text: string,
    _userId: string,
    _role: string,
  ): Promise<T.NlpResult> {
    const { intent, confidence } = this.extractIntent(text);
    const entities = this.extractEntities(text);
    const mappedQuery = this.mapToQuery(intent, entities);

    return {
      intent,
      entities,
      confidence,
      mappedQuery,
      sql: undefined,
      explanation: this.generateExplanation(intent, mappedQuery),
    };
  },

  extractIntent(text: string): { intent: T.NlpIntent; confidence: number } {
    const lower = text.toLowerCase().trim();

    // Check for exact phrase matches first (higher confidence)
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (intent === 'general_query' || intent === 'unknown') continue;
      for (const keyword of keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          // Count how many keywords match for this intent
          const matches = (INTENT_KEYWORDS[intent as T.NlpIntent] || []).filter(
            (kw) => lower.includes(kw.toLowerCase()),
          ).length;
          const total = INTENT_KEYWORDS[intent as T.NlpIntent].length;
          const confidence =
            total > 0 ? Math.min(0.5 + matches / total, 0.95) : 0.5;

          // Check if another intent has more matches
          let bestIntent = intent as T.NlpIntent;
          let bestConfidence = confidence;
          for (const [otherIntent, otherKeywords] of Object.entries(
            INTENT_KEYWORDS,
          )) {
            if (otherIntent === intent) continue;
            const otherMatches = otherKeywords.filter((kw) =>
              lower.includes(kw.toLowerCase()),
            ).length;
            const otherTotal = otherKeywords.length;
            const otherConfidence =
              otherTotal > 0
                ? Math.min(0.5 + otherMatches / otherTotal, 0.95)
                : 0.5;
            if (otherConfidence > bestConfidence) {
              bestIntent = otherIntent as T.NlpIntent;
              bestConfidence = otherConfidence;
            }
          }

          if (bestConfidence >= 0.5) {
            return { intent: bestIntent, confidence: round2(bestConfidence) };
          }
        }
      }
    }

    return { intent: 'general_query', confidence: 0.5 };
  },

  extractEntities(text: string): T.NlpEntity[] {
    const entities: T.NlpEntity[] = [];

    // Check for date references
    for (const dp of DATE_PATTERNS) {
      if (dp.pattern.test(text)) {
        entities.push({
          type: 'date',
          value: dp.value,
          confidence: 0.9,
        });
      }
    }

    // Check for amounts
    const amountMatch = text.match(AMOUNT_PATTERN);
    if (amountMatch) {
      const numericValue = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!isNaN(numericValue)) {
        entities.push({
          type: 'amount',
          value: String(numericValue),
          confidence: 0.95,
        });
      }
    }

    // Check for plain numbers (could be amounts)
    const numberMatches = text.match(NUMBER_PATTERN);
    if (numberMatches) {
      for (const nm of numberMatches) {
        const num = parseInt(nm.replace(/,/g, ''), 10);
        if (!isNaN(num) && num > 0 && num < 1000000) {
          entities.push({
            type: 'number',
            value: String(num),
            confidence: 0.7,
          });
        }
      }
    }

    // Check for product names (capitalized words that might be items)
    const productPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
    const productMatches = text.match(productPattern);
    if (productMatches) {
      for (const pm of productMatches) {
        if (!['Today', 'Yesterday', 'This', 'Last', 'Next'].includes(pm)) {
          entities.push({
            type: 'product',
            value: pm,
            confidence: 0.5,
          });
        }
      }
    }

    return entities;
  },

  mapToQuery(intent: T.NlpIntent, _entities: T.NlpEntity[]): string {
    switch (intent) {
      case 'revenue_query':
        return "What is today's revenue breakdown?";
      case 'profit_query':
        return "What is today's profit?";
      case 'stock_query':
        return 'What are the current stock shortages?';
      case 'occupancy_query':
        return 'What is the current room occupancy rate?';
      case 'payroll_query':
        return 'What are the current payroll costs?';
      case 'cash_flow_query':
        return 'What is the current cash position?';
      case 'supplier_query':
        return 'What are the outstanding supplier payments?';
      case 'approval_query':
        return 'What items are pending approval?';
      case 'general_query':
      case 'unknown':
      default:
        return `Query: ${_entities.length > 0 ? 'Filtered' : 'General'} business data request`;
    }
  },

  generateExplanation(intent: T.NlpIntent, mappedQuery: string): string {
    return `Classified as "${intent}" intent. Mapped to: ${mappedQuery}`;
  },
};

const round2 = (n: number): number => Math.round(n * 100) / 100;
