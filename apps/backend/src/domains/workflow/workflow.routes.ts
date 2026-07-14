import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { WorkflowService as S } from './workflow.service';
import * as T from './workflow.types';

const router = Router();

function handleError(
  res: Response,
  err: any,
  msg = 'Internal server error',
): void {
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('required') ||
        err.message?.includes('Invalid') ||
        err.message?.includes('Validation') ||
        err.message?.includes('already')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || msg });
}

// ═════════════════════════════════════════════════════════════════════════
// WORKFLOW DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/definitions',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter: T.FilterParams = {
        status: req.query.status as string,
        category: req.query.category as string,
        search: req.query.search as string,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.listDefinitions(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/definitions/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const def = await S.getDefinition(req.params.id);
      if (!def) {
        res.status(404).json({ message: 'Workflow definition not found' });
        return;
      }
      res.json(def);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/definitions',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateWorkflowDto = {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        tags: req.body.tags,
        icon: req.body.icon,
        color: req.body.color,
        createdBy: req.user?.name || 'system',
      };
      if (!dto.name) {
        res.status(400).json({ message: 'name is required' });
        return;
      }
      const existing = await S.getDefinition('').catch(() => null);
      const result = await S.createDefinition(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/definitions/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, description, category, tags, icon, color, status } =
        req.body;
      const result = await S.updateDefinition(req.params.id, {
        name,
        description,
        category,
        tags,
        icon,
        color,
        status,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/definitions/:id/publish',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await S.publishDefinition(req.params.id);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/definitions/:id/archive',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await S.archiveDefinition(req.params.id);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/definitions/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.deleteDefinition(req.params.id);
      res.json({ message: 'Workflow definition deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// WORKFLOW STEPS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/definitions/:workflowId/steps',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const steps = await S.getStepsByWorkflow(req.params.workflowId);
      res.json(steps);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/definitions/:workflowId/steps',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateStepDto = {
        workflowId: req.params.workflowId,
        stepType: req.body.stepType,
        name: req.body.name,
        description: req.body.description,
        config: req.body.config,
        stepOrder: req.body.stepOrder,
        branchCondition: req.body.branchCondition,
        retryPolicy: req.body.retryPolicy,
        timeoutMs: req.body.timeoutMs,
        assignedRole: req.body.assignedRole,
        escalationStepId: req.body.escalationStepId,
        compensationStepId: req.body.compensationStepId,
      };
      if (!dto.stepType || !dto.name || dto.stepOrder === undefined) {
        res
          .status(400)
          .json({ message: 'stepType, name, and stepOrder are required' });
        return;
      }
      if (!T.VALID_STEP_TYPES.includes(dto.stepType)) {
        res.status(400).json({
          message: `Invalid stepType. Must be one of: ${T.VALID_STEP_TYPES.join(', ')}`,
        });
        return;
      }
      const result = await S.createStep(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/steps/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        description,
        config,
        stepOrder,
        branchCondition,
        retryPolicy,
        timeoutMs,
        assignedRole,
        escalationStepId,
        compensationStepId,
      } = req.body;
      const result = await S.updateStep(req.params.id, {
        name,
        description,
        config,
        stepOrder,
        branchCondition,
        retryPolicy,
        timeoutMs,
        assignedRole,
        escalationStepId,
        compensationStepId,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/steps/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.deleteStep(req.params.id);
      res.json({ message: 'Step deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/definitions/:workflowId/reorder',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { stepIds } = req.body;
      if (!stepIds || !Array.isArray(stepIds)) {
        res.status(400).json({ message: 'stepIds array is required' });
        return;
      }
      await S.reorderSteps(req.params.workflowId, stepIds);
      res.json({ message: 'Steps reordered' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// WORKFLOW INSTANCES
// ═════════════════════════════════════════════════════════════════════════

router.post(
  '/instances',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.StartWorkflowDto = {
        workflowId: req.body.workflowId,
        context: req.body.context,
        variables: req.body.variables,
        startedBy: req.user?.name || 'system',
        priority: req.body.priority,
        correlationId: req.body.correlationId,
      };
      if (!dto.workflowId) {
        res.status(400).json({ message: 'workflowId is required' });
        return;
      }
      const result = await S.startWorkflow(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/instances',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = {
        status: req.query.status as T.InstanceStatus,
        workflowId: req.query.workflowId as string,
        correlationId: req.query.correlationId as string,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.listInstances(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/instances/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const instance = await S.getInstance(req.params.id);
      if (!instance) {
        res.status(404).json({ message: 'Instance not found' });
        return;
      }
      res.json(instance);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/instances/:id/cancel',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.cancelInstance(req.params.id, req.body.reason);
      res.json({ message: 'Instance cancelled' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/instances/:id/pause',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.pauseInstance(req.params.id);
      res.json({ message: 'Instance paused' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/instances/:id/resume',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.resumeInstance(req.params.id);
      res.json({ message: 'Instance resumed' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/instances/:id/steps',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const steps = await S.getInstanceSteps(req.params.id);
      res.json(steps);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// VARIABLES
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/instances/:id/variables',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const variables = await S.getAllVariables(req.params.id);
      res.json(variables);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/instances/:id/variables',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, value, scope } = req.body;
      if (!name || value === undefined) {
        res.status(400).json({ message: 'name and value are required' });
        return;
      }
      const result = await S.setVariable(req.params.id, {
        name,
        value: String(value),
        scope,
      });
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// BUSINESS RULES
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/rules',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter: T.FilterParams = {
        status: req.query.status as string,
        category: req.query.category as string,
        domain: req.query.domain as string,
        search: req.query.search as string,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.listRules(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/rules/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rule = await S.getRule(req.params.id);
      if (!rule) {
        res.status(404).json({ message: 'Rule not found' });
        return;
      }
      res.json(rule);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/rules',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateRuleDto = {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        domain: req.body.domain,
        priority: req.body.priority,
        conditions: req.body.conditions,
        actions: req.body.actions,
        elseActions: req.body.elseActions,
        tags: req.body.tags,
        createdBy: req.user?.name || 'system',
      };
      if (!dto.name || !dto.category || !dto.conditions || !dto.actions) {
        res.status(400).json({
          message: 'name, category, conditions, and actions are required',
        });
        return;
      }
      if (!T.VALID_RULE_CATEGORIES.includes(dto.category)) {
        res.status(400).json({
          message: `Invalid category. Must be one of: ${T.VALID_RULE_CATEGORIES.join(', ')}`,
        });
        return;
      }
      const result = await S.createRule(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/rules/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        description,
        category,
        domain,
        priority,
        conditions,
        actions,
        elseActions,
        status,
        tags,
      } = req.body;
      const result = await S.updateRule(req.params.id, {
        name,
        description,
        category,
        domain,
        priority,
        conditions,
        actions,
        elseActions,
        status,
        tags,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/rules/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.deleteRule(req.params.id);
      res.json({ message: 'Rule deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/rules/:id/evaluate',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await S.evaluateSingleRule(
        req.params.id,
        req.body.context || {},
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/rules/evaluate',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { domain, context } = req.body;
      if (!domain) {
        res.status(400).json({ message: 'domain is required' });
        return;
      }
      const results = await S.evaluateRules(domain, context || {});
      res.json(results);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// APPROVAL CHAINS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/chains',
  authenticate,
  authorize('owner', 'managers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = {
        category: req.query.category as T.ApprovalCategory,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.listChains(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/chains/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chain = await S.getChain(req.params.id);
      if (!chain) {
        res.status(404).json({ message: 'Approval chain not found' });
        return;
      }
      res.json(chain);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/chains',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateChainDto = {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        levels: req.body.levels,
        timeoutHours: req.body.timeoutHours,
        autoApprove: req.body.autoApprove,
        autoReject: req.body.autoReject,
        requireAll: req.body.requireAll,
      };
      if (!dto.name || !dto.category) {
        res.status(400).json({ message: 'name and category are required' });
        return;
      }
      if (!T.VALID_APPROVAL_CATEGORIES.includes(dto.category)) {
        res.status(400).json({
          message: `Invalid category. Must be one of: ${T.VALID_APPROVAL_CATEGORIES.join(', ')}`,
        });
        return;
      }
      const result = await S.createChain(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/chains/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        description,
        category,
        levels,
        timeoutHours,
        autoApprove,
        autoReject,
        requireAll,
      } = req.body;
      const result = await S.updateChain(req.params.id, {
        name,
        description,
        category,
        levels,
        timeoutHours,
        autoApprove,
        autoReject,
        requireAll,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/chains/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.deleteChain(req.params.id);
      res.json({ message: 'Chain deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// APPROVAL CHAIN LEVELS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/chains/:chainId/levels',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const levels = await S.getChainLevels(req.params.chainId);
      res.json(levels);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/chains/:chainId/levels',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateChainLevelDto = {
        chainId: req.params.chainId,
        level: req.body.level,
        role: req.body.role,
        approverType: req.body.approverType,
        approvalType: req.body.approvalType,
        timeoutHours: req.body.timeoutHours,
        escalationTo: req.body.escalationTo,
        canDelegate: req.body.canDelegate,
      };
      if (dto.level === undefined || !dto.role || !dto.approverType) {
        res
          .status(400)
          .json({ message: 'level, role, and approverType are required' });
        return;
      }
      const result = await S.createChainLevel(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// APPROVAL REQUESTS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/approvals',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = (req.query.userId as string) || req.user?.id || '';
      const status = req.query.status as T.ApprovalStatus | undefined;
      const requests = await S.getApprovalRequestsByUser(userId, status);
      res.json(requests);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/approvals/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request = await S.getApprovalRequest(req.params.id);
      if (!request) {
        res.status(404).json({ message: 'Approval request not found' });
        return;
      }
      res.json(request);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/approvals/:id/assignments',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assignments = await S.getAssignmentsByRequest(req.params.id);
      res.json(assignments);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/approvals',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateApprovalRequestDto = {
        chainId: req.body.chainId,
        instanceId: req.body.instanceId,
        stepId: req.body.stepId,
        context: req.body.context,
        requestedBy: req.user?.name || 'system',
        requestedFrom: req.body.requestedFrom,
        priority: req.body.priority,
        expiresAt: req.body.expiresAt,
      };
      if (!dto.chainId) {
        res.status(400).json({ message: 'chainId is required' });
        return;
      }
      const result = await S.createApprovalRequest(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// APPROVAL ACTIONS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/approvals/pending',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id || '';
      const assignments = await S.getPendingAssignmentsByUser(userId);
      res.json(assignments);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/approvals/:id/approve',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      await S.approveRequest(req.params.id, req.user.id, req.body.comments);
      res.json({ message: 'Approved' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/approvals/:id/reject',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      await S.rejectRequest(req.params.id, req.user.id, req.body.comments);
      res.json({ message: 'Rejected' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/approvals/:id/delegate',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      const { toUserId, comments } = req.body;
      if (!toUserId) {
        res.status(400).json({ message: 'toUserId is required' });
        return;
      }
      await S.delegateAssignment(
        req.params.id,
        req.user.id,
        toUserId,
        comments,
      );
      res.json({ message: 'Delegated' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/notifications',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id || '';
      const filter = {
        category: req.query.category as T.NotifCategory,
        isRead:
          req.query.isRead !== undefined
            ? req.query.isRead === 'true'
            : undefined,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.getNotificationsByUser(userId, filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/notifications/unread',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const count = await S.getUnreadCount(req.user?.id || '');
      res.json({ count });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/notifications',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateNotificationDto = {
        userId: req.body.userId,
        role: req.body.role,
        type: req.body.type,
        category: req.body.category,
        title: req.body.title,
        body: req.body.body,
        data: req.body.data,
        source: req.body.source,
        sourceId: req.body.sourceId,
      };
      if (!dto.title || !dto.category) {
        res.status(400).json({ message: 'title and category are required' });
        return;
      }
      if (!T.VALID_NOTIF_CATEGORIES.includes(dto.category)) {
        res.status(400).json({
          message: `Invalid category. Must be one of: ${T.VALID_NOTIF_CATEGORIES.join(', ')}`,
        });
        return;
      }
      const result = await S.sendNotification(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/notifications/:id/read',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.markNotificationRead(req.params.id);
      res.json({ message: 'Marked as read' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/notifications/read-all',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.markAllNotificationsRead(req.user?.id || '');
      res.json({ message: 'All notifications marked as read' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/notifications/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.deleteNotification(req.params.id);
      res.json({ message: 'Notification deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// NOTIFICATION CHANNELS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/channels',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const channels = await S.getChannelsByUser(req.user?.id || '');
      res.json(channels);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/channels/:channel',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { enabled, config } = req.body;
      await S.upsertChannel(
        req.user?.id || '',
        req.params.channel as T.NotifChannel,
        enabled !== false,
        config,
      );
      res.json({ message: 'Channel updated' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// NOTIFICATION TEMPLATES
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/templates',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = await S.getTemplates({
        category: req.query.category as string,
        channel: req.query.channel as string,
      });
      res.json(templates);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/templates',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, category, channel, template, variables } = req.body;
      if (!name || !category || !channel || !template) {
        res.status(400).json({
          message: 'name, category, channel, and template are required',
        });
        return;
      }
      const result = await S.createTemplate({
        name,
        category,
        channel,
        template,
        variables,
      });
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/templates/:id/send',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, role, variables } = req.body;
      if (!userId && !role) {
        res.status(400).json({ message: 'userId or role is required' });
        return;
      }
      const result = await S.renderAndSend(
        req.params.id,
        { userId, role },
        variables || {},
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// SCHEDULED JOBS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/jobs',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = {
        status: req.query.status as T.JobStatus,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.listJobs(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/jobs/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const job = await S.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ message: 'Job not found' });
        return;
      }
      res.json(job);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/jobs',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto: T.CreateJobDto = {
        name: req.body.name,
        description: req.body.description,
        workflowId: req.body.workflowId,
        workflowInput: req.body.workflowInput,
        cronExpr: req.body.cronExpr,
        intervalSeconds: req.body.intervalSeconds,
        startAt: req.body.startAt,
        endAt: req.body.endAt,
        timezone: req.body.timezone,
        businessCalendarOnly: req.body.businessCalendarOnly,
        maxRetries: req.body.maxRetries,
        createdBy: req.user?.name || 'system',
      };
      if (!dto.name) {
        res.status(400).json({ message: 'name is required' });
        return;
      }
      if (!dto.cronExpr && !dto.intervalSeconds) {
        res
          .status(400)
          .json({ message: 'cronExpr or intervalSeconds is required' });
        return;
      }
      const result = await S.createJob(dto);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/jobs/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        description,
        workflowId,
        workflowInput,
        cronExpr,
        intervalSeconds,
        startAt,
        endAt,
        timezone,
        businessCalendarOnly,
        maxRetries,
        status,
      } = req.body;
      const result = await S.updateJob(req.params.id, {
        name,
        description,
        workflowId,
        workflowInput,
        cronExpr,
        intervalSeconds,
        startAt,
        endAt,
        timezone,
        businessCalendarOnly,
        maxRetries,
        status,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/jobs/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.deleteJob(req.params.id);
      res.json({ message: 'Job deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/jobs/:id/instances',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const instances = await S.getJobInstances(req.params.id);
      res.json(instances);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// BUSINESS CALENDAR
// ═════════════════════════════════════════════════════════════════════════

router.post(
  '/calendar',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, isHoliday, holidayName } = req.body;
      if (!date) {
        res.status(400).json({ message: 'date is required' });
        return;
      }
      await S.setBusinessDay(date, isHoliday === true, holidayName);
      res.json({ message: 'Calendar updated' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/calendar/next-business-day',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const from =
        (req.query.from as string) || new Date().toISOString().split('T')[0];
      const count = parseInt((req.query.count as string) || '1', 10);
      const days = await S.getNextBusinessDay(from, count);
      res.json(days);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/audit',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const instanceId = req.query.instanceId as string;
      const workflowId = req.query.workflowId as string;
      const limit = parseInt((req.query.limit as string) || '100', 10);
      const logs = await S.getAuditLogs(instanceId, workflowId, limit);
      res.json(logs);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// EVENT AUTOMATION
// ═════════════════════════════════════════════════════════════════════════

router.post(
  '/events',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventType, data, domain } = req.body;
      if (!eventType) {
        res.status(400).json({ message: 'eventType is required' });
        return;
      }
      await S.handleDomainEvent(eventType, data || {}, domain);
      res.json({ message: 'Event processed' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// HEALTH
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/health',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const health = await S.getHealth();
      res.json({ status: 'ok', ...health });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
