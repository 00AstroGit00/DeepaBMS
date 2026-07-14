import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { AiGateway } from './ai.gateway';
import { CopilotService } from './ai.copilot';
import { ForecastService } from './ai.forecast';
import { AnomalyService } from './ai.anomaly';
import { RecommendationService } from './ai.recommendations';
import { ContextService } from './ai.context';
import { NlpService } from './ai.nlp';
import { SafetyService } from './ai.safety';
import { AiRepository } from './ai.repository';
import * as T from './ai.types';

const router = Router();

// ── Role permission presets ────────────────────────────────────────────

const R_OWN = ['owner'];
const R_OM = ['owner', 'manager'];
const R_OMA = ['owner', 'manager', 'accountant'];
const R_ALL = [
  'owner',
  'manager',
  'accountant',
  'restaurant',
  'bar',
  'hotel',
  'inventory',
];

// ── Helpers ───────────────────────────────────────────────────────────

function handleError(
  res: Response,
  err: any,
  msg = 'Internal server error',
): void {
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('Invalid') ||
        err.message?.includes('required') ||
        err.message?.includes('Validation')
      ? 400
      : 500;
  res.status(status).json({ success: false, message: err.message || msg });
}

function now(): string {
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════════════════
// CHAT & QUERY ROUTES
// ═══════════════════════════════════════════════════════════════════════

router.post(
  '/chat',
  authenticate,
  authorize(...R_OM),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text, conversationId, context } = req.body;
      if (!text) {
        res.status(400).json({ success: false, message: 'text is required' });
        return;
      }
      const aiReq: T.AiRequest = {
        text,
        userId: req.user?.id || 'unknown',
        role: req.user?.role || 'staff',
        conversationId,
        context,
      };
      const data = await AiGateway.processQuery(aiReq);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/query',
  authenticate,
  authorize(...R_OMA),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text, domains, timeRange } = req.body;
      if (!text) {
        res.status(400).json({ success: false, message: 'text is required' });
        return;
      }
      const nlpResult = await NlpService.parseQuery(
        text,
        req.user?.id || 'unknown',
        req.user?.role || 'staff',
      );
      const copilotQuery: T.CopilotQuery = {
        text,
        domains: domains || undefined,
        timeRange,
        userId: req.user?.id || 'unknown',
        role: req.user?.role || 'staff',
      };
      const data = await CopilotService.answerQuery(copilotQuery);
      res.json({ success: true, data, nlp: nlpResult });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/recommendations',
  authenticate,
  authorize(...R_OM),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const domain = (req.query.domain as T.BusinessDomain) || 'inventory';
      const focus = req.query.focus as string | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      if (!T.VALID_DOMAINS.includes(domain)) {
        res.status(400).json({
          success: false,
          message: `Invalid domain. Must be one of: ${T.VALID_DOMAINS.join(', ')}`,
        });
        return;
      }
      const request: T.RecommendationRequest = { domain, focus, limit };
      const data = await RecommendationService.generateRecommendations(request);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// FORECAST
// ═══════════════════════════════════════════════════════════════════════

router.post(
  '/forecast',
  authenticate,
  authorize(...R_OMA),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { domain, metric, periods, method } = req.body;
      if (!domain || !metric || !periods || !method) {
        res.status(400).json({
          success: false,
          message: 'domain, metric, periods, and method are required',
        });
        return;
      }
      if (!T.VALID_DOMAINS.includes(domain)) {
        res.status(400).json({
          success: false,
          message: `Invalid domain. Must be one of: ${T.VALID_DOMAINS.join(', ')}`,
        });
        return;
      }
      if (!['sma', 'linear', 'exponential'].includes(method)) {
        res.status(400).json({
          success: false,
          message: 'method must be sma, linear, or exponential',
        });
        return;
      }
      const request: T.ForecastRequest = {
        domain,
        metric,
        periods: parseInt(periods, 10),
        method,
      };
      const data = await ForecastService.generateForecast(request);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════════

router.post(
  '/anomalies',
  authenticate,
  authorize(...R_OM),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { domains, timeRange, sensitivity } = req.body;
      if (!domains || !timeRange) {
        res.status(400).json({
          success: false,
          message: 'domains and timeRange are required',
        });
        return;
      }
      const sens = sensitivity || 3;
      if (sens < 1 || sens > 5) {
        res.status(400).json({
          success: false,
          message: 'sensitivity must be between 1 and 5',
        });
        return;
      }
      const request: T.AnomalyRequest = {
        domains,
        timeRange,
        sensitivity: sens as 1 | 2 | 3 | 4 | 5,
      };
      const data = await AnomalyService.detectAnomalies(request);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// EXPLAIN
// ═══════════════════════════════════════════════════════════════════════

router.post(
  '/explain',
  authenticate,
  authorize(...R_OM),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text, context } = req.body;
      if (!text) {
        res.status(400).json({ success: false, message: 'text is required' });
        return;
      }
      // Use NLP to explain what the system would do with this input
      const nlpResult = await NlpService.parseQuery(
        text,
        req.user?.id || 'unknown',
        req.user?.role || 'staff',
      );
      const explanation = {
        intent: nlpResult.intent,
        confidence: nlpResult.confidence,
        entities: nlpResult.entities,
        mappedQuery: nlpResult.mappedQuery,
        explanation: nlpResult.explanation,
        contextUsed: context || null,
        timestamp: now(),
      };
      res.json({ success: true, data: explanation });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// SAFETY CHECK
// ═══════════════════════════════════════════════════════════════════════

router.post(
  '/safety-check',
  authenticate,
  authorize(...R_ALL),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        res.status(400).json({ success: false, message: 'text is required' });
        return;
      }
      const result = await SafetyService.validatePrompt(
        text,
        req.user?.id || 'unknown',
        req.user?.role || 'staff',
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// CONVERSATION HISTORY
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/history',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 50;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : 0;
      const data = await AiRepository.listConversations(
        req.user?.id || '',
        limit,
        offset,
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/history/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await AiRepository.getConversation(req.params.id);
      if (!data) {
        res
          .status(404)
          .json({ success: false, message: 'Conversation not found' });
        return;
      }
      if (data.userId !== req.user?.id && req.user?.role !== 'owner') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/history/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conv = await AiRepository.getConversation(req.params.id);
      if (!conv) {
        res
          .status(404)
          .json({ success: false, message: 'Conversation not found' });
        return;
      }
      if (conv.userId !== req.user?.id && req.user?.role !== 'owner') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
      await AiRepository.deleteConversation(req.params.id);
      res.json({ success: true, message: 'Conversation deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/audit',
  authenticate,
  authorize(...R_OWN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 50;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : 0;
      const userId = req.query.userId as string | undefined;
      const data = await AiRepository.getAuditEntries(userId, limit, offset);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/templates',
  authenticate,
  authorize(...R_OM),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const intent = req.query.intent as T.PromptIntent | undefined;
      const data = await AiRepository.listPromptTemplates(intent);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/templates/:id',
  authenticate,
  authorize(...R_OM),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await AiRepository.getPromptTemplate(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════

router.post(
  '/context',
  authenticate,
  authorize(...R_OMA),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { domains } = req.body;
      if (!domains || !Array.isArray(domains) || !domains.length) {
        res.status(400).json({
          success: false,
          message: 'domains array is required',
        });
        return;
      }
      const data = await ContextService.buildContext(domains);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// NLP
// ═══════════════════════════════════════════════════════════════════════

router.post(
  '/nlp/parse',
  authenticate,
  authorize(...R_ALL),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        res.status(400).json({ success: false, message: 'text is required' });
        return;
      }
      const data = await NlpService.parseQuery(
        text,
        req.user?.id || 'unknown',
        req.user?.role || 'staff',
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// BUSINESS HEALTH
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/health',
  authenticate,
  authorize(...R_OM),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await CopilotService.getBusinessHealth();
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// AI SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/system/health',
  authenticate,
  authorize(...R_OM),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const repoHealth = await AiRepository.getAnalyticsHealth();
      res.json({
        success: true,
        data: {
          status: repoHealth.isHealthy ? 'healthy' : 'degraded',
          repository: repoHealth,
          services: {
            safety: true,
            context: true,
            copilot: true,
            forecast: true,
            anomaly: true,
            recommendations: true,
            nlp: true,
          },
          timestamp: now(),
        },
      });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════

router.post(
  '/cache/clear',
  authenticate,
  authorize(...R_OWN),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      await AiRepository.clearContextCache();
      res.json({
        success: true,
        message: 'AI context cache cleared',
      });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
