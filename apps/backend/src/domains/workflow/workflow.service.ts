import * as T from './workflow.types';
import { WorkflowRepository as R } from './workflow.repository';
import { incCounter } from '../../middleware/metrics';

function now(): string {
  return new Date().toISOString();
}

// ── Expression evaluator ─────────────────────────────────────────────────

function evaluateExpression(
  expression: string,
  ctx: T.ExpressionContext,
): boolean {
  try {
    const vars = ctx.variables || {};
    const varEntries = Object.entries(vars).map(
      ([k, v]) =>
        `const ${k.replace(/[^a-zA-Z0-9_]/g, '_')} = ${JSON.stringify(v)};`,
    );
    const instance = ctx.instance || {};
    const contextEntries = [
      `const __now = "${ctx.now}";`,
      `const __role = "${ctx.user?.role || ''}";`,
      `const __userId = "${ctx.user?.id || ''}";`,
      `const __domain = "${ctx.domain || ''}";`,
      `const __status = "${(instance as any).status || 'running'}";`,
    ];
    const fn = new Function(
      ...Object.keys(vars).map((k) => k.replace(/[^a-zA-Z0-9_]/g, '_')),
      `"use strict"; ${varEntries.join('\n')} ${contextEntries.join('\n')} return Boolean(${expression});`,
    );
    return fn(...Object.values(vars));
  } catch {
    return false;
  }
}

function evaluateRuleCondition(
  condition: string,
  ctx: Record<string, any>,
): boolean {
  try {
    const entries = Object.entries(ctx).map(
      ([k, v]) =>
        `const ${k.replace(/[^a-zA-Z0-9_]/g, '_')} = ${JSON.stringify(v)};`,
    );
    const fn = new Function(
      ...Object.keys(ctx).map((k) => k.replace(/[^a-zA-Z0-9_]/g, '_')),
      `"use strict"; ${entries.join('\n')} return Boolean(${condition});`,
    );
    return fn(...Object.values(ctx));
  } catch {
    return false;
  }
}

function executeRuleAction(
  action: string,
  ctx: Record<string, any>,
): Record<string, any> {
  try {
    const entries = Object.entries(ctx).map(
      ([k, v]) =>
        `const ${k.replace(/[^a-zA-Z0-9_]/g, '_')} = ${JSON.stringify(v)};`,
    );
    const fn = new Function(
      ...Object.keys(ctx).map((k) => k.replace(/[^a-zA-Z0-9_]/g, '_')),
      `"use strict"; ${entries.join('\n')} return (${action});`,
    );
    const result = fn(...Object.values(ctx));
    return { result, success: true };
  } catch (err: any) {
    return { result: null, success: false, error: err.message };
  }
}

function parseCronExpr(expr: string): {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
} | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  };
}

function cronMatches(
  cron: {
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
  },
  date: Date,
): boolean {
  const fieldMatch = (pattern: string, value: number): boolean => {
    if (pattern === '*') return true;
    const parts = pattern.split(',');
    for (const part of parts) {
      if (part.includes('/')) {
        const [, step] = part.split('/');
        if (value % parseInt(step, 10) === 0) return true;
      } else if (part.includes('-')) {
        const [lo, hi] = part.split('-').map(Number);
        if (value >= lo && value <= hi) return true;
      } else if (parseInt(part, 10) === value) {
        return true;
      }
    }
    return false;
  };
  return (
    fieldMatch(cron.minute, date.getMinutes()) &&
    fieldMatch(cron.hour, date.getHours()) &&
    fieldMatch(cron.dayOfMonth, date.getDate()) &&
    fieldMatch(cron.month, date.getMonth() + 1) &&
    fieldMatch(cron.dayOfWeek, date.getDay())
  );
}

function getNextCronTime(
  cron: {
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
  },
  from: Date,
): Date {
  const next = new Date(from);
  next.setSeconds(0, 0);
  for (let i = 0; i < 525600; i++) {
    next.setMinutes(next.getMinutes() + 1);
    if (cronMatches(cron, next)) return next;
  }
  return new Date(from.getTime() + 86400000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryPolicy(policyStr: string | null): T.RetryPolicy {
  if (!policyStr) return T.DEFAULT_RETRY_POLICY;
  try {
    return { ...T.DEFAULT_RETRY_POLICY, ...JSON.parse(policyStr) };
  } catch {
    return T.DEFAULT_RETRY_POLICY;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// WORKFLOW ENGINE
// ═════════════════════════════════════════════════════════════════════════

export const WorkflowService = {
  // ── Definition Management ──────────────────────────────────────────────

  async createDefinition(
    dto: T.CreateWorkflowDto,
  ): Promise<T.WorkflowDefinition> {
    return R.createDefinition(dto);
  },

  async getDefinition(id: string): Promise<T.WorkflowDefinition | null> {
    return R.findDefinitionById(id);
  },

  async listDefinitions(
    filter?: T.FilterParams,
  ): Promise<T.PaginatedResult<T.WorkflowDefinition>> {
    return R.findAllDefinitions(filter);
  },

  async updateDefinition(
    id: string,
    changes: T.UpdateWorkflowDto,
  ): Promise<T.WorkflowDefinition> {
    return R.updateDefinition(id, changes);
  },

  async publishDefinition(id: string): Promise<T.WorkflowDefinition> {
    await R.publishDefinition(id);
    return R.findDefinitionById(id) as Promise<T.WorkflowDefinition>;
  },

  async archiveDefinition(id: string): Promise<T.WorkflowDefinition> {
    await R.archiveDefinition(id);
    return R.findDefinitionById(id) as Promise<T.WorkflowDefinition>;
  },

  async deleteDefinition(id: string): Promise<void> {
    await R.deleteDefinition(id);
  },

  // ── Step Management ────────────────────────────────────────────────────

  async createStep(dto: T.CreateStepDto): Promise<T.WorkflowStep> {
    return R.createStep(dto);
  },

  async getStep(id: string): Promise<T.WorkflowStep | null> {
    return R.findStepById(id);
  },

  async getStepsByWorkflow(workflowId: string): Promise<T.WorkflowStep[]> {
    return R.findStepsByWorkflow(workflowId);
  },

  async updateStep(
    id: string,
    changes: T.UpdateStepDto,
  ): Promise<T.WorkflowStep> {
    return R.updateStep(id, changes);
  },

  async deleteStep(id: string): Promise<void> {
    await R.deleteStep(id);
  },

  async reorderSteps(workflowId: string, stepIds: string[]): Promise<void> {
    await R.updateStepsOrder(workflowId, stepIds);
  },

  // ── Workflow Execution ─────────────────────────────────────────────────

  async startWorkflow(dto: T.StartWorkflowDto): Promise<T.WorkflowInstance> {
    const instance = await R.createInstance(dto);
    await R.logAudit({
      instanceId: instance.id,
      workflowId: dto.workflowId,
      action: 'workflow.started',
      actor: dto.startedBy || 'system',
      details: { dto },
    });
    await R.updateInstanceStatus(instance.id, 'running');
    const steps = await R.findStepsByWorkflow(dto.workflowId);
    if (steps.length > 0) {
      await R.createInstanceStepsBulk(steps, instance.id);
    }
    this.executeWorkflow(instance.id).catch((err) => {
      console.error(
        `[workflow] Async execution error for instance ${instance.id}:`,
        err.message,
      );
    });
    return R.findInstanceById(instance.id) as Promise<T.WorkflowInstance>;
  },

  async executeWorkflow(instanceId: string): Promise<void> {
    const instance = await R.findInstanceById(instanceId);
    if (!instance) throw new Error(`Instance not found: ${instanceId}`);
    if (instance.status !== 'running') return;
    const steps = await R.findInstanceStepsByInstance(instanceId);
    const defSteps = await R.findStepsByWorkflow(instance.workflowId);
    const stepMap = new Map(defSteps.map((s) => [s.id, s]));

    await this.executeStepsSequential(instance, steps, stepMap);
  },

  async executeStepsSequential(
    instance: T.WorkflowInstance,
    steps: T.WorkflowInstanceStep[],
    stepMap: Map<string, T.WorkflowStep>,
  ): Promise<void> {
    for (const step of steps) {
      if (instance.status !== 'running') break;
      const defStep = stepMap.get(step.stepId);
      if (!defStep) continue;
      await this.executeStep(instance, step, defStep, steps, stepMap);
    }
  },

  async executeStep(
    instance: T.WorkflowInstance,
    step: T.WorkflowInstanceStep,
    defStep: T.WorkflowStep,
    allSteps: T.WorkflowInstanceStep[],
    stepMap: Map<string, T.WorkflowStep>,
  ): Promise<void> {
    if (step.status === 'completed') return;
    await R.updateInstanceStepStatus(step.id, 'running');

    try {
      switch (defStep.stepType) {
        case 'start': {
          await R.updateInstanceStepStatus(step.id, 'completed', {
            started: true,
          });
          await R.logAudit({
            instanceId: instance.id,
            action: 'step.start',
            actor: 'engine',
            details: { stepId: step.id, stepName: step.stepName },
          });
          break;
        }
        case 'end': {
          await R.updateInstanceStepStatus(step.id, 'completed', {
            finished: true,
          });
          await R.updateInstanceStatus(instance.id, 'completed');
          await R.logAudit({
            instanceId: instance.id,
            action: 'workflow.completed',
            actor: 'engine',
          });
          break;
        }
        case 'task': {
          const retryPolicy = getRetryPolicy(defStep.retryPolicy);
          let lastError: string | null = null;
          for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
            try {
              const variables = await R.getAllVariables(instance.id);
              const varMap: Record<string, any> = {};
              for (const v of variables) varMap[v.name] = v.value;
              const ctx: T.ExpressionContext = {
                variables: varMap,
                instance,
                step,
                now: now(),
                domain: defStep.config?.domain,
              };
              const output = defStep.config?.action
                ? executeRuleAction(defStep.config.action, ctx)
                : { executed: true };
              await R.updateInstanceStepStatus(
                step.id,
                'completed',
                output as Record<string, any>,
              );
              await R.logAudit({
                instanceId: instance.id,
                action: 'step.completed',
                actor: 'engine',
                details: { stepId: step.id, stepName: step.stepName, output },
              });
              lastError = null;
              break;
            } catch (err: any) {
              lastError = err.message;
              if (attempt < retryPolicy.maxRetries) {
                await R.updateInstanceStepStatus(
                  step.id,
                  'retrying',
                  undefined,
                  err.message,
                );
                await delay(
                  retryPolicy.backoffMs *
                    Math.pow(retryPolicy.backoffMultiplier, attempt),
                );
              }
            }
          }
          if (lastError) {
            await R.updateInstanceStepStatus(
              step.id,
              'failed',
              undefined,
              lastError,
            );
            await R.updateInstanceStatus(instance.id, 'failed', lastError);
            await R.logAudit({
              instanceId: instance.id,
              action: 'step.failed',
              actor: 'engine',
              details: { stepId: step.id, error: lastError },
            });
            // Execute compensation if defined
            if (defStep.compensationStepId) {
              const compStep = stepMap.get(defStep.compensationStepId);
              if (compStep) {
                await this.executeStep(
                  instance,
                  allSteps.find(
                    (s) => s.stepId === defStep.compensationStepId,
                  )!,
                  compStep,
                  allSteps,
                  stepMap,
                );
              }
            }
          }
          break;
        }
        case 'condition': {
          const variables = await R.getAllVariables(instance.id);
          const varMap: Record<string, any> = {};
          for (const v of variables) varMap[v.name] = v.value;
          const ctx: T.ExpressionContext = {
            variables: varMap,
            instance,
            step,
            now: now(),
          };
          const condition =
            defStep.branchCondition || defStep.config?.condition || 'true';
          const result = evaluateExpression(condition, ctx);
          const output = { condition, result };
          await R.updateInstanceStepStatus(step.id, 'completed', output);
          await R.setVariable(instance.id, {
            name: `__condition_${defStep.stepOrder}`,
            value: String(result),
            scope: 'local',
          });
          break;
        }
        case 'parallel': {
          const parallelSteps = defStep.config?.steps || [];
          await Promise.all(
            parallelSteps.map(async (psId: string) => {
              const ps = allSteps.find((s) => s.stepId === psId);
              const pd = stepMap.get(psId);
              if (ps && pd) {
                await R.updateInstanceStepStatus(ps.id, 'running');
                await this.executeStep(instance, ps, pd, allSteps, stepMap);
              }
            }),
          );
          await R.updateInstanceStepStatus(step.id, 'completed', {
            parallelDone: true,
          });
          break;
        }
        case 'timer': {
          const delayMs = defStep.config?.delayMs || defStep.timeoutMs || 0;
          if (delayMs > 0) {
            await delay(delayMs);
          }
          await R.updateInstanceStepStatus(step.id, 'completed', {
            delayed: true,
          });
          break;
        }
        case 'delay': {
          const delayValue = defStep.config?.duration || defStep.timeoutMs || 0;
          if (delayValue > 0) {
            const triggerAt = new Date(Date.now() + delayValue).toISOString();
            await R.createTimer({
              instanceId: instance.id,
              stepId: defStep.id,
              triggerAt,
              action: { stepId: step.id, type: 'resume' },
            });
          }
          await R.updateInstanceStepStatus(step.id, 'waiting');
          break;
        }
        case 'notification': {
          const notifConfig = defStep.config || {};
          await R.createNotification({
            userId: notifConfig.userId,
            role: notifConfig.role,
            type: notifConfig.type || 'in_app',
            category: notifConfig.category || 'info',
            title: notifConfig.title || step.stepName,
            body: notifConfig.body || '',
            data: { instanceId: instance.id, stepId: step.id },
            source: 'workflow',
            sourceId: instance.id,
          });
          await R.updateInstanceStepStatus(step.id, 'completed', {
            notified: true,
          });
          break;
        }
        case 'approval': {
          const chainId = defStep.config?.chainId;
          if (chainId) {
            const chain = await R.findChainById(chainId);
            if (chain) {
              await this.createApprovalRequest({
                chainId,
                instanceId: instance.id,
                stepId: step.id,
                context: defStep.config,
                requestedBy:
                  defStep.config?.requestedBy || instance.startedBy || 'system',
                priority: instance.priority,
              });
            }
          }
          await R.updateInstanceStepStatus(step.id, 'waiting', {
            pendingApproval: true,
          });
          break;
        }
        case 'escalation': {
          const escalationStep = defStep.escalationStepId
            ? stepMap.get(defStep.escalationStepId)
            : null;
          if (escalationStep) {
            const escalStep = allSteps.find(
              (s) => s.stepId === defStep.escalationStepId,
            );
            if (escalStep) {
              await R.updateInstanceStepStatus(escalStep.id, 'running');
              await this.executeStep(
                instance,
                escalStep,
                escalationStep,
                allSteps,
                stepMap,
              );
            }
          }
          await R.updateInstanceStepStatus(step.id, 'completed', {
            escalated: true,
          });
          break;
        }
        case 'compensation': {
          await R.updateInstanceStepStatus(step.id, 'completed', {
            compensated: true,
          });
          break;
        }
        case 'rollback': {
          await R.updateInstanceStatus(
            instance.id,
            'failed',
            'Rolled back by workflow',
          );
          await R.updateInstanceStepStatus(step.id, 'completed', {
            rolledBack: true,
          });
          break;
        }
        case 'sub_workflow': {
          const subWorkflowId = defStep.config?.workflowId;
          if (subWorkflowId) {
            const subInstance = await this.startWorkflow({
              workflowId: subWorkflowId,
              context: { ...instance.context, parentInstanceId: instance.id },
              variables: { ...instance.variables, parentStepId: step.id },
              startedBy: instance.startedBy || undefined,
              correlationId: instance.correlationId || undefined,
              parentInstanceId: instance.id,
            });
            await R.setVariable(instance.id, {
              name: `__sub_instance_${defStep.stepOrder}`,
              value: subInstance.id,
              scope: 'local',
            });
          }
          await R.updateInstanceStepStatus(step.id, 'completed', {
            subWorkflowStarted: true,
          });
          break;
        }
        case 'script': {
          const script = defStep.config?.script || '';
          const variables = await R.getAllVariables(instance.id);
          const varMap: Record<string, any> = {};
          for (const v of variables) varMap[v.name] = v.value;
          const ctx: T.ExpressionContext = {
            variables: varMap,
            instance,
            step,
            now: now(),
          };
          const result = executeRuleAction(script, ctx);
          if (result.success) {
            await R.updateInstanceStepStatus(step.id, 'completed', {
              scriptResult: result.result,
            });
          } else {
            throw new Error(`Script execution failed: ${result.error}`);
          }
          break;
        }
        default: {
          await R.updateInstanceStepStatus(step.id, 'completed', {
            defaultExec: true,
          });
        }
      }
    } catch (err: any) {
      await R.updateInstanceStepStatus(
        step.id,
        'failed',
        undefined,
        err.message,
      );
      await R.updateInstanceStatus(instance.id, 'failed', err.message);
      await R.logAudit({
        instanceId: instance.id,
        action: 'step.error',
        actor: 'engine',
        details: { stepId: step.id, error: err.message },
      });
    }
  },

  // ── Instance Management ────────────────────────────────────────────────

  async getInstance(id: string): Promise<T.WorkflowInstance | null> {
    return R.findInstanceById(id);
  },

  async listInstances(filter?: {
    status?: T.InstanceStatus;
    workflowId?: string;
    correlationId?: string;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.WorkflowInstance>> {
    return R.findAllInstances(filter);
  },

  async cancelInstance(id: string, reason?: string): Promise<void> {
    await R.updateInstanceStatus(
      id,
      'cancelled',
      reason || 'Manually cancelled',
    );
    await R.logAudit({
      instanceId: id,
      action: 'workflow.cancelled',
      actor: 'user',
      details: { reason },
    });
  },

  async pauseInstance(id: string): Promise<void> {
    await R.updateInstanceStatus(id, 'paused');
    await R.logAudit({
      instanceId: id,
      action: 'workflow.paused',
      actor: 'user',
    });
  },

  async resumeInstance(id: string): Promise<void> {
    await R.updateInstanceStatus(id, 'running');
    await R.logAudit({
      instanceId: id,
      action: 'workflow.resumed',
      actor: 'user',
    });
    this.executeWorkflow(id).catch((err) => {
      console.error(
        `[workflow] Resume execution error for ${id}:`,
        err.message,
      );
    });
  },

  async getInstanceSteps(
    instanceId: string,
  ): Promise<T.WorkflowInstanceStep[]> {
    return R.findInstanceStepsByInstance(instanceId);
  },

  // ── Variables ──────────────────────────────────────────────────────────

  async setVariable(
    instanceId: string,
    dto: T.SetVariableDto,
  ): Promise<T.WorkflowVariable> {
    return R.setVariable(instanceId, dto);
  },

  async getVariable(
    instanceId: string,
    name: string,
  ): Promise<T.WorkflowVariable | null> {
    return R.getVariable(instanceId, name);
  },

  async getAllVariables(instanceId: string): Promise<T.WorkflowVariable[]> {
    return R.getAllVariables(instanceId);
  },

  // ── Timers ─────────────────────────────────────────────────────────────

  async processPendingTimers(): Promise<number> {
    const timers = await R.getPendingTimers(now());
    let processed = 0;
    for (const timer of timers) {
      try {
        await R.updateTimerStatus(timer.id, 'triggered');
        const action = timer.action;
        if (action.type === 'resume' && action.stepId && timer.instanceId) {
          const instance = await R.findInstanceById(timer.instanceId);
          if (instance && instance.status === 'running') {
            const steps = await R.findInstanceStepsByInstance(timer.instanceId);
            const step = steps.find((s) => s.id === action.stepId);
            if (step) {
              await R.updateInstanceStepStatus(step.id, 'running');
              const defSteps = await R.findStepsByWorkflow(instance.workflowId);
              const stepMap = new Map(defSteps.map((s) => [s.id, s]));
              const defStep = stepMap.get(step.stepId);
              if (defStep) {
                await this.executeStep(instance, step, defStep, steps, stepMap);
              }
            }
          }
        }
        processed++;
      } catch (err: any) {
        console.error(`[workflow] Timer processing error:`, err.message);
      }
    }
    return processed;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // BUSINESS RULES ENGINE
  // ═════════════════════════════════════════════════════════════════════════

  async createRule(dto: T.CreateRuleDto): Promise<T.BusinessRule> {
    return R.createRule(dto);
  },

  async getRule(id: string): Promise<T.BusinessRule | null> {
    return R.findRuleById(id);
  },

  async listRules(
    filter?: T.FilterParams,
  ): Promise<T.PaginatedResult<T.BusinessRule>> {
    return R.findAllRules(filter);
  },

  async updateRule(
    id: string,
    changes: T.UpdateRuleDto,
  ): Promise<T.BusinessRule> {
    return R.updateRule(id, changes);
  },

  async deleteRule(id: string): Promise<void> {
    await R.deleteRule(id);
  },

  async evaluateRules(
    domain: string,
    context: Record<string, any>,
  ): Promise<T.RuleEvaluation[]> {
    const results: T.RuleEvaluation[] = [];
    const rules = await R.findRulesByDomain(domain);
    for (const rule of rules) {
      const startTime = Date.now();
      try {
        const matched = evaluateRuleCondition(rule.conditions, {
          ...context,
          __domain: domain,
          __now: now(),
        });
        const output = matched
          ? executeRuleAction(rule.actions, context)
          : rule.elseActions
            ? executeRuleAction(rule.elseActions, context)
            : { matched: false };
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched,
          output,
          executionTimeMs: Date.now() - startTime,
        });
      } catch (err: any) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: false,
          output: { error: err.message },
          executionTimeMs: Date.now() - startTime,
        });
      }
    }
    return results;
  },

  async evaluateSingleRule(
    ruleId: string,
    context: Record<string, any>,
  ): Promise<T.RuleEvaluation> {
    const rule = await R.findRuleById(ruleId);
    if (!rule) throw new Error(`Rule not found: ${ruleId}`);
    const startTime = Date.now();
    const matched = evaluateRuleCondition(rule.conditions, {
      ...context,
      __now: now(),
    });
    const output = matched
      ? executeRuleAction(rule.actions, context)
      : rule.elseActions
        ? executeRuleAction(rule.elseActions, context)
        : { matched: false };
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched,
      output,
      executionTimeMs: Date.now() - startTime,
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // APPROVAL ENGINE
  // ═════════════════════════════════════════════════════════════════════════

  async createChain(dto: T.CreateChainDto): Promise<T.ApprovalChain> {
    return R.createChain(dto);
  },

  async getChain(id: string): Promise<T.ApprovalChain | null> {
    return R.findChainById(id);
  },

  async listChains(filter?: {
    category?: T.ApprovalCategory;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.ApprovalChain>> {
    return R.findAllChains(filter);
  },

  async updateChain(
    id: string,
    changes: Partial<T.CreateChainDto>,
  ): Promise<T.ApprovalChain> {
    return R.updateChain(id, changes);
  },

  async deleteChain(id: string): Promise<void> {
    await R.deleteChain(id);
  },

  async createChainLevel(
    dto: T.CreateChainLevelDto,
  ): Promise<T.ApprovalChainLevel> {
    return R.createChainLevel(dto);
  },

  async getChainLevels(chainId: string): Promise<T.ApprovalChainLevel[]> {
    return R.findLevelsByChain(chainId);
  },

  async createApprovalRequest(
    dto: T.CreateApprovalRequestDto,
  ): Promise<T.ApprovalRequest> {
    const request = await R.createApprovalRequest(dto);
    const levels = await R.findLevelsByChain(dto.chainId);
    const assignments: {
      requestId: string;
      level: number;
      assignedTo: string;
    }[] = [];
    for (const level of levels) {
      const assignedTo =
        level.approverType === 'custom'
          ? dto.requestedFrom || dto.requestedBy
          : level.role;
      assignments.push({
        requestId: request.id,
        level: level.level,
        assignedTo,
      });
    }
    await R.createAssignmentsBulk(assignments);
    await R.logAudit({
      instanceId: dto.instanceId,
      action: 'approval.created',
      actor: dto.requestedBy,
      details: {
        requestId: request.id,
        chainId: dto.chainId,
        levels: levels.length,
      },
    });
    return R.findApprovalRequestById(request.id) as Promise<T.ApprovalRequest>;
  },

  async getApprovalRequest(id: string): Promise<T.ApprovalRequest | null> {
    return R.findApprovalRequestById(id);
  },

  async getApprovalRequestsByUser(
    userId: string,
    status?: T.ApprovalStatus,
  ): Promise<T.ApprovalRequest[]> {
    return R.findApprovalRequestsByUser(userId, status);
  },

  async getApprovalRequestsByInstance(
    instanceId: string,
  ): Promise<T.ApprovalRequest[]> {
    return R.findApprovalRequestsByInstance(instanceId);
  },

  async approveRequest(
    assignmentId: string,
    userId: string,
    comments?: string,
  ): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) throw new Error(`Assignment not found: ${assignmentId}`);
    if (assignment.status !== 'pending')
      throw new Error(`Assignment already ${assignment.status}`);
    const request = await R.findApprovalRequestById(assignment.requestId);
    if (!request)
      throw new Error(`Approval request not found: ${assignment.requestId}`);
    await R.updateAssignmentStatus(assignmentId, 'approved', comments);
    const allAssignments = await R.findAssignmentsByRequest(request.id);
    const chain = await R.findChainById(request.chainId);
    const pendingSameLevel = allAssignments.filter(
      (a) => a.level === assignment.level && a.status === 'pending',
    );
    if (pendingSameLevel.length === 0 || !chain?.requireAll) {
      const nextLevelAssignments = allAssignments.filter(
        (a) => a.level > assignment.level && a.status === 'pending',
      );
      if (nextLevelAssignments.length === 0) {
        await R.updateApprovalRequestStatus(request.id, 'approved', comments);
        await R.logAudit({
          instanceId: request.instanceId || undefined,
          action: 'approval.approved',
          actor: userId,
          details: { requestId: request.id },
        });
        if (request.instanceId && request.stepId) {
          const instance = await R.findInstanceById(request.instanceId);
          if (instance && instance.status === 'running') {
            const step = (
              await R.findInstanceStepsByInstance(request.instanceId)
            ).find((s) => s.id === request.stepId);
            if (step) {
              await R.updateInstanceStepStatus(step.id, 'completed', {
                approved: true,
              });
              await R.logAudit({
                instanceId: request.instanceId,
                action: 'step.resumed',
                actor: userId,
                details: { stepId: step.id, reason: 'Approval granted' },
              });
            }
          }
        }
      } else {
        // Escalate to next level - create notification
        for (const na of nextLevelAssignments) {
          await R.createNotification({
            userId: na.assignedTo,
            category: 'approval',
            title: `Approval required at level ${na.level}`,
            body: `Request ${request.id} needs your approval`,
            source: 'approval',
            sourceId: request.id,
          });
        }
      }
    }
  },

  async rejectRequest(
    assignmentId: string,
    userId: string,
    comments?: string,
  ): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) throw new Error(`Assignment not found: ${assignmentId}`);
    if (assignment.status !== 'pending')
      throw new Error(`Assignment already ${assignment.status}`);
    await R.updateAssignmentStatus(assignmentId, 'rejected', comments);
    const request = await R.findApprovalRequestById(assignment.requestId);
    if (request) {
      await R.updateApprovalRequestStatus(request.id, 'rejected', comments);
      await R.logAudit({
        instanceId: request.instanceId || undefined,
        action: 'approval.rejected',
        actor: userId,
        details: { requestId: request.id, comments },
      });
    }
  },

  async delegateAssignment(
    assignmentId: string,
    fromUserId: string,
    toUserId: string,
    comments?: string,
  ): Promise<void> {
    const assignment = await this.getAssignment(assignmentId);
    if (!assignment) throw new Error(`Assignment not found: ${assignmentId}`);
    if (assignment.status !== 'pending')
      throw new Error(`Assignment already ${assignment.status}`);
    await R.updateAssignmentStatus(
      assignmentId,
      'delegated',
      comments,
      toUserId,
    );
    const newId = await R.createAssignment({
      requestId: assignment.requestId,
      level: assignment.level,
      assignedTo: toUserId,
    });
    await R.logAudit({
      action: 'approval.delegated',
      actor: fromUserId,
      details: { assignmentId, fromUserId, toUserId },
    });
  },

  async getAssignment(id: string): Promise<T.ApprovalAssignment | null> {
    return R.findAssignmentsByRequest('').then(() => null);
  },

  async getAssignmentsByRequest(
    requestId: string,
  ): Promise<T.ApprovalAssignment[]> {
    return R.findAssignmentsByRequest(requestId);
  },

  async getPendingAssignmentsByUser(
    userId: string,
  ): Promise<T.ApprovalAssignment[]> {
    return R.findPendingAssignmentsByUser(userId);
  },

  async processExpiredApprovals(): Promise<number> {
    const expired = await R.getExpiredApprovals();
    for (const req of expired) {
      await R.updateApprovalRequestStatus(req.id, 'expired', 'Auto-expired');
      await R.logAudit({
        instanceId: req.instanceId || undefined,
        action: 'approval.expired',
        actor: 'system',
        details: { requestId: req.id },
      });
    }
    return expired.length;
  },

  async processAutoApprovals(): Promise<number> {
    const pending = await R.getPendingApprovalsForAutoAction();
    let processed = 0;
    for (const req of pending) {
      const chain = await R.findChainById(req.chainId);
      if (!chain) continue;
      if (chain.autoApprove) {
        await R.updateApprovalRequestStatus(
          req.id,
          'approved',
          'Auto-approved',
        );
        await R.logAudit({
          instanceId: req.instanceId || undefined,
          action: 'approval.auto_approved',
          actor: 'system',
          details: { requestId: req.id },
        });
        processed++;
      } else if (chain.autoReject) {
        await R.updateApprovalRequestStatus(
          req.id,
          'rejected',
          'Auto-rejected',
        );
        processed++;
      }
    }
    return processed;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // NOTIFICATION PLATFORM
  // ═════════════════════════════════════════════════════════════════════════

  async sendNotification(
    dto: T.CreateNotificationDto,
  ): Promise<T.Notification> {
    return R.createNotification(dto);
  },

  async sendNotificationsBulk(
    dtos: T.CreateNotificationDto[],
  ): Promise<T.Notification[]> {
    return R.createNotificationsBulk(dtos);
  },

  async getNotification(id: string): Promise<T.Notification | null> {
    return R.findNotificationById(id);
  },

  async getNotificationsByUser(
    userId: string,
    filter?: {
      category?: T.NotifCategory;
      isRead?: boolean;
      offset?: number;
      limit?: number;
    },
  ): Promise<T.PaginatedResult<T.Notification>> {
    return R.findNotificationsByUser(userId, filter);
  },

  async getNotificationsByRole(
    role: string,
    filter?: { category?: T.NotifCategory; limit?: number },
  ): Promise<T.Notification[]> {
    return R.findNotificationsByRole(role, filter);
  },

  async getUnreadCount(userId: string): Promise<number> {
    return R.getUnreadCount(userId);
  },

  async markNotificationRead(id: string): Promise<void> {
    await R.markNotificationRead(id);
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await R.markAllNotificationsRead(userId);
  },

  async archiveNotification(id: string): Promise<void> {
    await R.archiveNotification(id);
  },

  async deleteNotification(id: string): Promise<void> {
    await R.deleteNotification(id);
  },

  async upsertChannel(
    userId: string,
    channel: T.NotifChannel,
    enabled: boolean,
    config?: Record<string, any>,
  ): Promise<void> {
    await R.upsertChannel(userId, channel, enabled, config);
  },

  async getChannelsByUser(userId: string): Promise<T.NotificationChannel[]> {
    return R.getChannelsByUser(userId);
  },

  async createTemplate(dto: {
    name: string;
    category: string;
    channel: string;
    template: string;
    variables?: string[];
  }): Promise<T.NotificationTemplate> {
    return R.createTemplate(dto);
  },

  async getTemplates(filter?: {
    category?: string;
    channel?: string;
  }): Promise<T.NotificationTemplate[]> {
    return R.findTemplates(filter);
  },

  async renderAndSend(
    templateId: string,
    recipient: { userId?: string; role?: string },
    variables: Record<string, any>,
  ): Promise<T.Notification | null> {
    const templates = await R.findTemplates({});
    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);
    let body = template.template;
    for (const [key, value] of Object.entries(variables)) {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
    return R.createNotification({
      userId: recipient.userId,
      role: recipient.role,
      type: template.channel as T.NotifType,
      category: template.category as T.NotifCategory,
      title: body.split('\n')[0] || template.name,
      body,
      data: variables,
      channel: template.channel,
    });
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SCHEDULER
  // ═════════════════════════════════════════════════════════════════════════

  async createJob(dto: T.CreateJobDto): Promise<T.ScheduledJob> {
    const job = await R.createJob(dto);
    const nextRun = await this.calculateNextRun(job);
    if (nextRun) {
      await R.updateJob(job.id, { nextRunAt: nextRun });
    }
    return R.findJobById(job.id) as Promise<T.ScheduledJob>;
  },

  async getJob(id: string): Promise<T.ScheduledJob | null> {
    return R.findJobById(id);
  },

  async listJobs(filter?: {
    status?: T.JobStatus;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.ScheduledJob>> {
    return R.findAllJobs(filter);
  },

  async updateJob(
    id: string,
    changes: Partial<T.CreateJobDto & { status?: T.JobStatus }>,
  ): Promise<T.ScheduledJob> {
    const job = await R.findJobById(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    if (
      changes.cronExpr !== undefined ||
      changes.intervalSeconds !== undefined
    ) {
      const updated = { ...job, ...changes } as T.ScheduledJob;
      const nextRun = await this.calculateNextRun(updated);
      return R.updateJob(id, { ...changes, nextRunAt: nextRun || undefined });
    }
    return R.updateJob(id, changes);
  },

  async deleteJob(id: string): Promise<void> {
    await R.deleteJob(id);
  },

  async calculateNextRun(job: T.ScheduledJob): Promise<string | null> {
    if (!job.cronExpr && !job.intervalSeconds) return null;
    const nowDate = new Date();
    if (job.startAt && new Date(job.startAt) > nowDate) return job.startAt;
    if (job.intervalSeconds) {
      const lastRun = job.lastRunAt ? new Date(job.lastRunAt) : nowDate;
      const next = new Date(lastRun.getTime() + job.intervalSeconds * 1000);
      return next.toISOString();
    }
    if (job.cronExpr) {
      const parsed = parseCronExpr(job.cronExpr);
      if (!parsed) return null;
      const startFrom = job.lastRunAt ? new Date(job.lastRunAt) : nowDate;
      const next = getNextCronTime(parsed, startFrom);
      return next.toISOString();
    }
    return null;
  },

  async processDueJobs(): Promise<number> {
    const dueJobs = await R.getDueJobs();
    let processed = 0;
    for (const job of dueJobs) {
      try {
        if (job.businessCalendarOnly) {
          const today = new Date().toISOString().split('T')[0];
          if (!(await R.isBusinessDay(today))) continue;
        }
        const instance = await R.createJobInstance(job.id, now());
        await R.updateJobInstanceStatus(instance.id, 'running');
        if (job.workflowId) {
          const wfInstance = await this.startWorkflow({
            workflowId: job.workflowId,
            context: { ...job.workflowInput, scheduledJobId: job.id },
            variables: { scheduledJobId: job.id, scheduledJobName: job.name },
            startedBy: job.createdBy || 'scheduler',
            correlationId: `job-${job.id}`,
          });
          await R.updateJobInstanceStatus(
            instance.id,
            'completed',
            undefined,
            wfInstance.id,
          );
        } else {
          await R.updateJobInstanceStatus(instance.id, 'completed');
        }
        const nextRun = await this.calculateNextRun({
          ...job,
          lastRunAt: now(),
        });
        await R.updateJob(job.id, {
          lastRunAt: now(),
          nextRunAt: nextRun || undefined,
        });
        processed++;
      } catch (err: any) {
        console.error(
          `[scheduler] Job execution error for ${job.id}:`,
          err.message,
        );
        const failedInstances = await R.findJobInstancesByJob(job.id, 1);
        if (failedInstances.length > 0) {
          await R.updateJobInstanceStatus(
            failedInstances[0].id,
            'failed',
            err.message,
          );
        }
      }
    }
    return processed;
  },

  async getJobInstances(
    jobId: string,
    limit = 50,
  ): Promise<T.ScheduledJobInstance[]> {
    return R.findJobInstancesByJob(jobId, limit);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // BUSINESS CALENDAR
  // ═════════════════════════════════════════════════════════════════════════

  async setBusinessDay(
    date: string,
    isHoliday: boolean,
    holidayName?: string,
  ): Promise<void> {
    await R.setBusinessDay(date, isHoliday, holidayName);
  },

  async isBusinessDay(date: string): Promise<boolean> {
    return R.isBusinessDay(date);
  },

  async getNextBusinessDay(from: string, count = 1): Promise<string[]> {
    return R.getNextBusinessDay(from, count);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // AUDIT
  // ═════════════════════════════════════════════════════════════════════════

  async getAuditLogs(
    instanceId?: string,
    workflowId?: string,
    limit = 100,
  ): Promise<T.WorkflowAuditEntry[]> {
    return R.findAuditLogs(instanceId, workflowId, limit);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // EVENT AUTOMATION
  // ═════════════════════════════════════════════════════════════════════════

  async handleDomainEvent(
    eventType: string,
    data: Record<string, any>,
    domain?: string,
  ): Promise<void> {
    await R.logAudit({
      action: `event.${eventType}`,
      actor: 'system',
      details: { eventType, data, domain },
    });
    const rules = await R.findRulesByDomain(domain || 'general');
    const matchingRules = rules.filter((r) => {
      try {
        const condition = JSON.parse(r.conditions);
        return condition.eventType === eventType || condition.eventType === '*';
      } catch {
        return false;
      }
    });
    for (const rule of matchingRules) {
      await this.evaluateSingleRule(rule.id, {
        eventType,
        ...data,
        __domain: domain,
        __now: now(),
      });
    }
    for (const [, pipelines] of Object.entries(T.DEFAULT_PIPELINES)) {
      if (
        (pipelines as T.AutomationPipeline).eventType === eventType &&
        (pipelines as T.AutomationPipeline).workflowId
      ) {
        await this.startWorkflow({
          workflowId: (pipelines as T.AutomationPipeline).workflowId,
          context: data,
          variables: {
            eventType,
            sourceDomain: (pipelines as T.AutomationPipeline).fromDomain,
          },
          startedBy: 'event_automation',
          correlationId: `event-${eventType}-${Date.now()}`,
        }).catch((err) => {
          console.error(
            `[event] Failed to start pipeline workflow:`,
            err.message,
          );
        });
      }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // HEALTH
  // ═════════════════════════════════════════════════════════════════════════

  async getHealth() {
    return R.getHealth();
  },
};

// ── M2-3: Workflow Scheduler lifecycle ────────────────────────────────────
// Previously `processDueJobs` existed but was never invoked. The scheduler now
// runs it on an interval, guarded against overlapping ticks, with metrics and
// graceful shutdown.

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let schedulerRunning = false;

export function startWorkflowScheduler(intervalMs = 30000): void {
  if (schedulerTimer) return;
  console.log('[scheduler] starting workflow scheduler');
  schedulerTimer = setInterval(async () => {
    if (schedulerRunning) return;
    schedulerRunning = true;
    try {
      const processed = await WorkflowService.processDueJobs();
      if (processed > 0) {
        incCounter(
          'deepa_workflow_jobs_processed',
          {},
          processed,
          'Workflow jobs processed by scheduler',
        );
      }
    } catch (err: any) {
      console.error('[scheduler] tick failed:', err.message);
    } finally {
      schedulerRunning = false;
    }
  }, intervalMs);
  if (typeof schedulerTimer.unref === 'function') schedulerTimer.unref();
}

export function stopWorkflowScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[scheduler] stopped');
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerTimer !== null;
}
