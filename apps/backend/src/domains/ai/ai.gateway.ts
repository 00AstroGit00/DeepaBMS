import * as T from './ai.types';
import { SafetyService } from './ai.safety';
import { ContextService } from './ai.context';
import { CopilotService } from './ai.copilot';
import { NlpService } from './ai.nlp';
import { AiRepository } from './ai.repository';

// ── Intent-to-handler mapping ─────────────────────────────────────────

const INTENT_PROMPTS: Record<string, string> = {
  revenue_query:
    'You are analyzing revenue data for a hotel business. Provide a concise summary of the current revenue situation.',
  profit_query:
    'You are analyzing profit data for a hotel business. Summarize the current profitability.',
  stock_query:
    'You are analyzing inventory and stock levels. Summarize stock status and shortages.',
  occupancy_query:
    'You are analyzing room occupancy for a hotel. Summarize current occupancy rates.',
  payroll_query:
    'You are analyzing payroll data. Summarize current payroll costs.',
  cash_flow_query:
    'You are analyzing cash flow data. Summarize the current cash position.',
  supplier_query:
    'You are analyzing supplier and vendor data. Summarize outstanding payments and supplier status.',
  approval_query:
    'You are analyzing pending approval items. List pending approvals requiring action.',
  general_query:
    'You are an AI assistant for a hotel business management system. Answer the query based on available data.',
  forecast:
    'You are generating forecasts based on historical data. Explain the forecast methodology and results.',
  anomaly:
    'You are detecting anomalies in business data. Identify unusual patterns and explain their significance.',
  recommend:
    'You are generating business recommendations. Provide actionable suggestions based on data analysis.',
};

// ── AI Gateway ────────────────────────────────────────────────────────

export const AiGateway = {
  async processQuery(req: T.AiRequest): Promise<T.AiResponse> {
    const startTime = Date.now();

    // 1. Safety check
    const safety = await SafetyService.validatePrompt(
      req.text,
      req.userId,
      req.role,
    );

    if (!safety.passed) {
      const auditEntry: Omit<T.AiAuditEntry, 'id' | 'createdAt'> = {
        userId: req.userId,
        action: 'chat_query_blocked',
        model: 'rule-based',
        prompt: req.text,
        response: safety.blockedReason || 'Blocked by safety check',
        tokens: 0,
        duration: Date.now() - startTime,
        safetyChecks: safety.checks,
      };
      await AiRepository.createAuditEntry(auditEntry);

      return {
        answer: safety.blockedReason || 'Query blocked by safety checks.',
        citations: [],
        confidence: 1,
        requiresApproval: safety.requiresConfirmation,
        suggestedActions: [],
        modelUsed: 'rule-based',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // 2. Create or update conversation
    let conversationId = req.conversationId;
    if (!conversationId) {
      const conv = await AiRepository.createConversation(
        req.userId,
        req.text.slice(0, 100),
        { source: 'gateway' },
      );
      conversationId = conv.id;
    }

    // 3. Store user message
    await AiRepository.addMessage(conversationId, 'user', req.text);

    // 4. Parse intent via NLP
    const nlpResult = await NlpService.parseQuery(
      req.text,
      req.userId,
      req.role,
    );

    // 5. Select model (always rule-based for offline)
    const model = this.selectModel(nlpResult.intent, req.context);

    // 6. Build context from relevant domains
    const domainsToQuery = this.resolveDomains(nlpResult.intent);
    const context = await ContextService.buildContext(domainsToQuery);

    // 7. Route to appropriate handler
    const handlerResult = await this.routeToHandler(
      nlpResult.intent,
      nlpResult,
      context,
      req,
    );

    // 8. Format response
    const response = this.formatResponse(
      handlerResult.answer,
      handlerResult.citations,
      model,
      Date.now() - startTime,
    );

    // 9. Store assistant message
    await AiRepository.addMessage(conversationId, 'assistant', response.answer);

    // 10. Audit log
    await AiRepository.createAuditEntry({
      userId: req.userId,
      action: 'chat_query',
      model,
      prompt: req.text,
      response: response.answer,
      tokens: Math.ceil(req.text.length / 4),
      duration: Date.now() - startTime,
      safetyChecks: safety.checks,
    });

    return { ...response, conversationId };
  },

  selectModel(_intent: T.NlpIntent, _context?: any): T.AiModelType {
    return 'rule-based';
  },

  resolveDomains(intent: T.NlpIntent): T.BusinessDomain[] {
    switch (intent) {
      case 'revenue_query':
        return ['revenue', 'rooms', 'restaurant', 'bar'];
      case 'profit_query':
        return ['revenue', 'accounting', 'payroll'];
      case 'stock_query':
        return ['inventory', 'purchasing', 'liquor'];
      case 'occupancy_query':
        return ['rooms', 'revenue'];
      case 'payroll_query':
        return ['payroll', 'hr', 'attendance'];
      case 'cash_flow_query':
        return ['cash', 'accounting', 'revenue'];
      case 'supplier_query':
        return ['supplier', 'purchasing', 'accounting'];
      case 'approval_query':
        return ['workflow', 'purchasing'];
      default:
        return T.VALID_DOMAINS.slice(0, 5);
    }
  },

  async routeToHandler(
    intent: T.NlpIntent,
    nlpResult: T.NlpResult,
    context: T.ContextResponse,
    req: T.AiRequest,
  ): Promise<{ answer: string; citations: T.Citation[] }> {
    switch (intent) {
      case 'stock_query':
      case 'occupancy_query':
      case 'payroll_query':
      case 'cash_flow_query':
      case 'supplier_query':
      case 'approval_query':
      case 'revenue_query':
      case 'profit_query':
      case 'general_query': {
        const copilotQuery: T.CopilotQuery = {
          text: req.text,
          domains: context.contexts.map((c) => c.domain),
          userId: req.userId,
          role: req.role,
        };
        const copilotResult = await CopilotService.answerQuery(copilotQuery);
        return {
          answer: copilotResult.answer,
          citations: copilotResult.citations,
        };
      }
      default:
        return {
          answer:
            'I understand your query. Based on the available data, I can provide insights into revenue, occupancy, inventory, and other business metrics. Please ask a more specific question.',
          citations: [],
        };
    }
  },

  getPromptTemplate(intent: string): string {
    return INTENT_PROMPTS[intent] || INTENT_PROMPTS.general_query;
  },

  formatResponse(
    answer: string,
    citations: T.Citation[],
    modelUsed: T.AiModelType,
    processingTimeMs: number,
  ): Omit<T.AiResponse, 'conversationId'> {
    return {
      answer,
      citations,
      confidence: citations.length > 0 ? 0.85 : 0.5,
      requiresApproval: false,
      suggestedActions: citations.map((c) => ({
        type: 'view_report',
        params: { domain: c.domain, metric: c.metric },
        description: `View ${c.metric} report for ${c.domain}`,
      })),
      modelUsed,
      processingTimeMs,
    };
  },
};
