import { query, run } from '../../db';
import * as T from './workflow.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

// ═════════════════════════════════════════════════════════════════════════
// WORKFLOW DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════

export const WorkflowRepository = {
  async createDefinition(
    dto: T.CreateWorkflowDto,
  ): Promise<T.WorkflowDefinition> {
    const id = uid('wf');
    await run(
      `INSERT INTO workflow_definitions (id, name, description, category, tags, icon, color, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.description || null,
        dto.category || 'general',
        JSON.stringify(dto.tags || []),
        dto.icon || null,
        dto.color || null,
        dto.createdBy || 'system',
      ],
    );
    return this.findDefinitionById(id) as Promise<T.WorkflowDefinition>;
  },

  async findDefinitionById(id: string): Promise<T.WorkflowDefinition | null> {
    const rows = await query(
      'SELECT * FROM workflow_definitions WHERE id = ?',
      [id],
    );
    return rows.length ? this.mapDefinition(rows[0]) : null;
  },

  async findDefinitionByName(
    name: string,
  ): Promise<T.WorkflowDefinition | null> {
    const rows = await query(
      'SELECT * FROM workflow_definitions WHERE name = ?',
      [name],
    );
    return rows.length ? this.mapDefinition(rows[0]) : null;
  },

  async findAllDefinitions(
    filter?: T.FilterParams,
  ): Promise<T.PaginatedResult<T.WorkflowDefinition>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter?.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM workflow_definitions ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM workflow_definitions ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapDefinition(r)),
      total,
      offset,
      limit,
    };
  },

  async updateDefinition(
    id: string,
    changes: T.UpdateWorkflowDto,
  ): Promise<T.WorkflowDefinition> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description);
    }
    if (changes.category !== undefined) {
      sets.push('category = ?');
      params.push(changes.category);
    }
    if (changes.tags !== undefined) {
      sets.push('tags = ?');
      params.push(JSON.stringify(changes.tags));
    }
    if (changes.icon !== undefined) {
      sets.push('icon = ?');
      params.push(changes.icon);
    }
    if (changes.color !== undefined) {
      sets.push('color = ?');
      params.push(changes.color);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }
    if (params.length === 1)
      return this.findDefinitionById(id) as Promise<T.WorkflowDefinition>;
    params.push(id);
    await run(
      `UPDATE workflow_definitions SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findDefinitionById(id) as Promise<T.WorkflowDefinition>;
  },

  async publishDefinition(id: string): Promise<void> {
    const def = await this.findDefinitionById(id);
    if (!def) throw new Error('Workflow definition not found');
    if (def.status === 'published')
      throw new Error('Workflow is already published');
    const steps = await this.findStepsByWorkflow(id);
    if (steps.length === 0)
      throw new Error('Cannot publish workflow with no steps');
    const hasStart = steps.some((s) => s.stepType === 'start');
    const hasEnd = steps.some((s) => s.stepType === 'end');
    if (!hasStart || !hasEnd)
      throw new Error('Workflow must have at least one start and one end step');
    await run(
      `UPDATE workflow_definitions SET status = ?, version = version + 1, updated_at = ? WHERE id = ?`,
      ['published', now(), id],
    );
  },

  async archiveDefinition(id: string): Promise<void> {
    await run(
      `UPDATE workflow_definitions SET status = ?, updated_at = ? WHERE id = ?`,
      ['archived', now(), id],
    );
  },

  async deleteDefinition(id: string): Promise<void> {
    await run('DELETE FROM workflow_definitions WHERE id = ?', [id]);
  },

  mapDefinition(row: any): T.WorkflowDefinition {
    return {
      id: row.id,
      name: row.name,
      description: row.description || null,
      version: row.version || 1,
      status: row.status,
      category: row.category || 'general',
      tags: JSON.parse(row.tags || '[]'),
      icon: row.icon || null,
      color: row.color || null,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // WORKFLOW STEPS
  // ═════════════════════════════════════════════════════════════════════

  async createStep(dto: T.CreateStepDto): Promise<T.WorkflowStep> {
    const id = uid('wfs');
    await run(
      `INSERT INTO workflow_steps (id, workflow_id, step_type, name, description, config, step_order,
        branch_condition, retry_policy, timeout_ms, assigned_role, escalation_step_id, compensation_step_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.workflowId,
        dto.stepType,
        dto.name,
        dto.description || null,
        JSON.stringify(dto.config || {}),
        dto.stepOrder,
        dto.branchCondition || null,
        dto.retryPolicy || null,
        dto.timeoutMs || null,
        dto.assignedRole || null,
        dto.escalationStepId || null,
        dto.compensationStepId || null,
      ],
    );
    return this.findStepById(id) as Promise<T.WorkflowStep>;
  },

  async findStepById(id: string): Promise<T.WorkflowStep | null> {
    const rows = await query('SELECT * FROM workflow_steps WHERE id = ?', [id]);
    return rows.length ? this.mapStep(rows[0]) : null;
  },

  async findStepsByWorkflow(workflowId: string): Promise<T.WorkflowStep[]> {
    const rows = await query(
      'SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC',
      [workflowId],
    );
    return rows.map((r: any) => this.mapStep(r));
  },

  async updateStep(
    id: string,
    changes: T.UpdateStepDto,
  ): Promise<T.WorkflowStep> {
    const sets: string[] = [];
    const params: any[] = [];
    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description);
    }
    if (changes.config !== undefined) {
      sets.push('config = ?');
      params.push(JSON.stringify(changes.config));
    }
    if (changes.stepOrder !== undefined) {
      sets.push('step_order = ?');
      params.push(changes.stepOrder);
    }
    if (changes.branchCondition !== undefined) {
      sets.push('branch_condition = ?');
      params.push(changes.branchCondition);
    }
    if (changes.retryPolicy !== undefined) {
      sets.push('retry_policy = ?');
      params.push(changes.retryPolicy);
    }
    if (changes.timeoutMs !== undefined) {
      sets.push('timeout_ms = ?');
      params.push(changes.timeoutMs);
    }
    if (changes.assignedRole !== undefined) {
      sets.push('assigned_role = ?');
      params.push(changes.assignedRole);
    }
    if (changes.escalationStepId !== undefined) {
      sets.push('escalation_step_id = ?');
      params.push(changes.escalationStepId);
    }
    if (changes.compensationStepId !== undefined) {
      sets.push('compensation_step_id = ?');
      params.push(changes.compensationStepId);
    }
    if (sets.length === 0)
      return this.findStepById(id) as Promise<T.WorkflowStep>;
    params.push(id);
    await run(
      `UPDATE workflow_steps SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findStepById(id) as Promise<T.WorkflowStep>;
  },

  async deleteStep(id: string): Promise<void> {
    await run('DELETE FROM workflow_steps WHERE id = ?', [id]);
  },

  async updateStepsOrder(workflowId: string, stepIds: string[]): Promise<void> {
    for (let i = 0; i < stepIds.length; i++) {
      await run(
        'UPDATE workflow_steps SET step_order = ? WHERE id = ? AND workflow_id = ?',
        [i, stepIds[i], workflowId],
      );
    }
  },

  mapStep(row: any): T.WorkflowStep {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      stepType: row.step_type,
      name: row.name,
      description: row.description || null,
      config: JSON.parse(row.config || '{}'),
      stepOrder: row.step_order,
      branchCondition: row.branch_condition || null,
      retryPolicy: row.retry_policy || null,
      timeoutMs: row.timeout_ms || null,
      assignedRole: row.assigned_role || null,
      escalationStepId: row.escalation_step_id || null,
      compensationStepId: row.compensation_step_id || null,
      createdAt: row.created_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // WORKFLOW INSTANCES
  // ═════════════════════════════════════════════════════════════════════

  async createInstance(dto: T.StartWorkflowDto): Promise<T.WorkflowInstance> {
    const id = uid('wfi');
    const def = await this.findDefinitionById(dto.workflowId);
    if (!def)
      throw new Error(`Workflow definition not found: ${dto.workflowId}`);
    await run(
      `INSERT INTO workflow_instances (id, workflow_id, workflow_version, status, context, variables,
        started_by, priority, correlation_id, parent_instance_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.workflowId,
        def.version,
        'pending',
        JSON.stringify(dto.context || {}),
        JSON.stringify(dto.variables || {}),
        dto.startedBy || null,
        dto.priority || 0,
        dto.correlationId || null,
        dto.parentInstanceId || null,
      ],
    );
    return this.findInstanceById(id) as Promise<T.WorkflowInstance>;
  },

  async findInstanceById(id: string): Promise<T.WorkflowInstance | null> {
    const rows = await query('SELECT * FROM workflow_instances WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapInstance(rows[0]) : null;
  },

  async findAllInstances(filter?: {
    status?: T.InstanceStatus;
    workflowId?: string;
    correlationId?: string;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.WorkflowInstance>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.workflowId) {
      conditions.push('workflow_id = ?');
      params.push(filter.workflowId);
    }
    if (filter?.correlationId) {
      conditions.push('correlation_id = ?');
      params.push(filter.correlationId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM workflow_instances ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM workflow_instances ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapInstance(r)),
      total,
      offset,
      limit,
    };
  },

  async updateInstanceStatus(
    id: string,
    status: T.InstanceStatus,
    errorMessage?: string,
  ): Promise<void> {
    const sets = [
      'status = ?',
      ...(status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled' ||
      status === 'timed_out'
        ? ['completed_at = ?']
        : []),
    ];
    const params: any[] = [
      status,
      ...(status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled' ||
      status === 'timed_out'
        ? [now()]
        : []),
    ];
    if (status === 'running' && !errorMessage) {
      sets.push('started_at = ?');
      params.push(now());
    }
    if (errorMessage) {
      sets.push('error_message = ?');
      params.push(errorMessage);
    }
    if (sets.length === 1) return;
    params.push(id);
    await run(
      `UPDATE workflow_instances SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async getActiveInstanceCount(): Promise<number> {
    const rows = await query(
      "SELECT COUNT(*) as count FROM workflow_instances WHERE status IN ('pending','running','paused')",
    );
    return rows[0].count;
  },

  async getPendingHighPriorityInstances(): Promise<T.WorkflowInstance[]> {
    const rows = await query(
      "SELECT * FROM workflow_instances WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 100",
    );
    return rows.map((r: any) => this.mapInstance(r));
  },

  mapInstance(row: any): T.WorkflowInstance {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      workflowVersion: row.workflow_version,
      status: row.status,
      context: JSON.parse(row.context || '{}'),
      variables: JSON.parse(row.variables || '{}'),
      startedBy: row.started_by || null,
      startedAt: row.started_at || null,
      completedAt: row.completed_at || null,
      errorMessage: row.error_message || null,
      priority: row.priority || 0,
      correlationId: row.correlation_id || null,
      parentInstanceId: row.parent_instance_id || null,
      createdAt: row.created_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // WORKFLOW INSTANCE STEPS
  // ═════════════════════════════════════════════════════════════════════

  async createInstanceStep(
    step: T.WorkflowStep,
    instanceId: string,
  ): Promise<T.WorkflowInstanceStep> {
    const id = uid('wfis');
    await run(
      `INSERT INTO workflow_instance_steps (id, instance_id, step_id, step_name, step_type, input, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        instanceId,
        step.id,
        step.name,
        step.stepType,
        JSON.stringify(step.config),
        'pending',
      ],
    );
    return this.findInstanceStepById(id) as Promise<T.WorkflowInstanceStep>;
  },

  async createInstanceStepsBulk(
    steps: T.WorkflowStep[],
    instanceId: string,
  ): Promise<T.WorkflowInstanceStep[]> {
    const results: T.WorkflowInstanceStep[] = [];
    for (const step of steps) {
      results.push(await this.createInstanceStep(step, instanceId));
    }
    return results;
  },

  async findInstanceStepById(
    id: string,
  ): Promise<T.WorkflowInstanceStep | null> {
    const rows = await query(
      'SELECT * FROM workflow_instance_steps WHERE id = ?',
      [id],
    );
    return rows.length ? this.mapInstanceStep(rows[0]) : null;
  },

  async findInstanceStepsByInstance(
    instanceId: string,
  ): Promise<T.WorkflowInstanceStep[]> {
    const rows = await query(
      'SELECT * FROM workflow_instance_steps WHERE instance_id = ? ORDER BY started_at ASC',
      [instanceId],
    );
    return rows.map((r: any) => this.mapInstanceStep(r));
  },

  async findPendingInstanceSteps(
    instanceId: string,
  ): Promise<T.WorkflowInstanceStep[]> {
    const rows = await query(
      "SELECT * FROM workflow_instance_steps WHERE instance_id = ? AND status IN ('pending','waiting','retrying') ORDER BY started_at ASC",
      [instanceId],
    );
    return rows.map((r: any) => this.mapInstanceStep(r));
  },

  async updateInstanceStepStatus(
    id: string,
    status: T.StepStatus,
    output?: Record<string, any>,
    errorMessage?: string,
  ): Promise<void> {
    const sets: string[] = ['status = ?'];
    const params: any[] = [status];
    if (status === 'completed' || status === 'failed') {
      sets.push('completed_at = ?');
      params.push(now());
    }
    if (status === 'retrying') {
      sets.push('retry_count = retry_count + 1');
    }
    if (output !== undefined) {
      sets.push('output = ?');
      params.push(JSON.stringify(output));
    }
    if (errorMessage) {
      sets.push('error_message = ?');
      params.push(errorMessage);
    }
    if (status === 'running') {
      sets.push('started_at = ?');
      params.push(now());
    }
    params.push(id);
    await run(
      `UPDATE workflow_instance_steps SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async assignStep(id: string, assignedTo: string): Promise<void> {
    await run(
      'UPDATE workflow_instance_steps SET assigned_to = ? WHERE id = ?',
      [assignedTo, id],
    );
  },

  mapInstanceStep(row: any): T.WorkflowInstanceStep {
    return {
      id: row.id,
      instanceId: row.instance_id,
      stepId: row.step_id,
      stepName: row.step_name,
      stepType: row.step_type,
      status: row.status,
      input: JSON.parse(row.input || '{}'),
      output: JSON.parse(row.output || '{}'),
      startedAt: row.started_at || null,
      completedAt: row.completed_at || null,
      errorMessage: row.error_message || null,
      retryCount: row.retry_count || 0,
      assignedTo: row.assigned_to || null,
      completedBy: row.completed_by || null,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // WORKFLOW VARIABLES
  // ═════════════════════════════════════════════════════════════════════

  async setVariable(
    instanceId: string,
    dto: T.SetVariableDto,
  ): Promise<T.WorkflowVariable> {
    const existing = await query(
      'SELECT * FROM workflow_variables WHERE instance_id = ? AND name = ?',
      [instanceId, dto.name],
    );
    if (existing.length) {
      await run(
        'UPDATE workflow_variables SET value = ?, scope = ? WHERE instance_id = ? AND name = ?',
        [dto.value, dto.scope || 'local', instanceId, dto.name],
      );
      const rows = await query(
        'SELECT * FROM workflow_variables WHERE instance_id = ? AND name = ?',
        [instanceId, dto.name],
      );
      return this.mapVariable(rows[0]);
    }
    const id = uid('wfv');
    await run(
      `INSERT INTO workflow_variables (id, instance_id, name, value, scope) VALUES (?, ?, ?, ?, ?)`,
      [id, instanceId, dto.name, dto.value, dto.scope || 'local'],
    );
    const rows = await query('SELECT * FROM workflow_variables WHERE id = ?', [
      id,
    ]);
    return this.mapVariable(rows[0]);
  },

  async getVariable(
    instanceId: string,
    name: string,
  ): Promise<T.WorkflowVariable | null> {
    const rows = await query(
      'SELECT * FROM workflow_variables WHERE instance_id = ? AND name = ?',
      [instanceId, name],
    );
    return rows.length ? this.mapVariable(rows[0]) : null;
  },

  async getAllVariables(instanceId: string): Promise<T.WorkflowVariable[]> {
    const rows = await query(
      'SELECT * FROM workflow_variables WHERE instance_id = ?',
      [instanceId],
    );
    return rows.map((r: any) => this.mapVariable(r));
  },

  async deleteVariable(instanceId: string, name: string): Promise<void> {
    await run(
      'DELETE FROM workflow_variables WHERE instance_id = ? AND name = ?',
      [instanceId, name],
    );
  },

  mapVariable(row: any): T.WorkflowVariable {
    return {
      id: row.id,
      instanceId: row.instance_id,
      name: row.name,
      value: row.value,
      scope: row.scope || 'local',
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // WORKFLOW TIMERS
  // ═════════════════════════════════════════════════════════════════════

  async createTimer(dto: {
    instanceId?: string;
    stepId?: string;
    triggerAt: string;
    action?: Record<string, any>;
  }): Promise<T.WorkflowTimer> {
    const id = uid('wft');
    await run(
      `INSERT INTO workflow_timers (id, instance_id, step_id, trigger_at, action) VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        dto.instanceId || null,
        dto.stepId || null,
        dto.triggerAt,
        JSON.stringify(dto.action || {}),
      ],
    );
    const rows = await query('SELECT * FROM workflow_timers WHERE id = ?', [
      id,
    ]);
    return this.mapTimer(rows[0]);
  },

  async findTimerById(id: string): Promise<T.WorkflowTimer | null> {
    const rows = await query('SELECT * FROM workflow_timers WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapTimer(rows[0]) : null;
  },

  async getPendingTimers(before: string): Promise<T.WorkflowTimer[]> {
    const rows = await query(
      "SELECT * FROM workflow_timers WHERE trigger_at <= ? AND status = 'pending' ORDER BY trigger_at ASC LIMIT 100",
      [before],
    );
    return rows.map((r: any) => this.mapTimer(r));
  },

  async updateTimerStatus(id: string, status: T.TimerStatus): Promise<void> {
    await run('UPDATE workflow_timers SET status = ? WHERE id = ?', [
      status,
      id,
    ]);
  },

  mapTimer(row: any): T.WorkflowTimer {
    return {
      id: row.id,
      instanceId: row.instance_id || null,
      stepId: row.step_id || null,
      triggerAt: row.trigger_at,
      status: row.status,
      action: JSON.parse(row.action || '{}'),
      createdAt: row.created_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // BUSINESS RULES
  // ═════════════════════════════════════════════════════════════════════

  async createRule(dto: T.CreateRuleDto): Promise<T.BusinessRule> {
    const id = uid('br');
    await run(
      `INSERT INTO business_rules (id, name, description, category, domain, priority,
        conditions, actions, else_actions, effectivity_start, effectivity_end, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.description || null,
        dto.category,
        dto.domain || 'general',
        dto.priority || 0,
        dto.conditions,
        dto.actions,
        dto.elseActions || null,
        dto.effectivityStart || null,
        dto.effectivityEnd || null,
        JSON.stringify(dto.tags || []),
        dto.createdBy || 'system',
      ],
    );
    return this.findRuleById(id) as Promise<T.BusinessRule>;
  },

  async findRuleById(id: string): Promise<T.BusinessRule | null> {
    const rows = await query('SELECT * FROM business_rules WHERE id = ?', [id]);
    return rows.length ? this.mapRule(rows[0]) : null;
  },

  async findRuleByName(name: string): Promise<T.BusinessRule | null> {
    const rows = await query('SELECT * FROM business_rules WHERE name = ?', [
      name,
    ]);
    return rows.length ? this.mapRule(rows[0]) : null;
  },

  async findAllRules(
    filter?: T.FilterParams,
  ): Promise<T.PaginatedResult<T.BusinessRule>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter?.domain) {
      conditions.push('domain = ?');
      params.push(filter.domain);
    }
    if (filter?.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM business_rules ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM business_rules ${where} ORDER BY priority DESC, updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapRule(r)),
      total,
      offset,
      limit,
    };
  },

  async findRulesByDomain(domain: string): Promise<T.BusinessRule[]> {
    const rows = await query(
      "SELECT * FROM business_rules WHERE domain = ? AND status = 'active' ORDER BY priority DESC",
      [domain],
    );
    return rows.map((r: any) => this.mapRule(r));
  },

  async updateRule(
    id: string,
    changes: T.UpdateRuleDto,
  ): Promise<T.BusinessRule> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description);
    }
    if (changes.category !== undefined) {
      sets.push('category = ?');
      params.push(changes.category);
    }
    if (changes.domain !== undefined) {
      sets.push('domain = ?');
      params.push(changes.domain);
    }
    if (changes.priority !== undefined) {
      sets.push('priority = ?');
      params.push(changes.priority);
    }
    if (changes.conditions !== undefined) {
      sets.push('conditions = ?');
      params.push(changes.conditions);
    }
    if (changes.actions !== undefined) {
      sets.push('actions = ?');
      params.push(changes.actions);
    }
    if (changes.elseActions !== undefined) {
      sets.push('else_actions = ?');
      params.push(changes.elseActions);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }
    if (changes.tags !== undefined) {
      sets.push('tags = ?');
      params.push(JSON.stringify(changes.tags));
    }
    if (changes.effectivityStart !== undefined) {
      sets.push('effectivity_start = ?');
      params.push(changes.effectivityStart);
    }
    if (changes.effectivityEnd !== undefined) {
      sets.push('effectivity_end = ?');
      params.push(changes.effectivityEnd);
    }
    if (params.length === 1)
      return this.findRuleById(id) as Promise<T.BusinessRule>;
    params.push(id);
    await run(
      `UPDATE business_rules SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findRuleById(id) as Promise<T.BusinessRule>;
  },

  async deleteRule(id: string): Promise<void> {
    await run('DELETE FROM business_rules WHERE id = ?', [id]);
  },

  mapRule(row: any): T.BusinessRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description || null,
      category: row.category,
      domain: row.domain || 'general',
      priority: row.priority || 0,
      conditions: row.conditions,
      actions: row.actions,
      elseActions: row.else_actions || null,
      status: row.status,
      version: row.version || 1,
      effectivityStart: row.effectivity_start || null,
      effectivityEnd: row.effectivity_end || null,
      tags: JSON.parse(row.tags || '[]'),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // APPROVAL CHAINS
  // ═════════════════════════════════════════════════════════════════════

  async createChain(dto: T.CreateChainDto): Promise<T.ApprovalChain> {
    const id = uid('ac');
    await run(
      `INSERT INTO approval_chains (id, name, description, category, levels, timeout_hours,
        auto_approve, auto_reject, require_all)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.description || null,
        dto.category,
        dto.levels || 1,
        dto.timeoutHours || 48,
        dto.autoApprove ? 1 : 0,
        dto.autoReject ? 1 : 0,
        dto.requireAll !== false ? 1 : 0,
      ],
    );
    return this.findChainById(id) as Promise<T.ApprovalChain>;
  },

  async findChainById(id: string): Promise<T.ApprovalChain | null> {
    const rows = await query('SELECT * FROM approval_chains WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapChain(rows[0]) : null;
  },

  async findAllChains(filter?: {
    category?: T.ApprovalCategory;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.ApprovalChain>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM approval_chains ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM approval_chains ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapChain(r)),
      total,
      offset,
      limit,
    };
  },

  async updateChain(
    id: string,
    changes: Partial<T.CreateChainDto>,
  ): Promise<T.ApprovalChain> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description);
    }
    if (changes.category !== undefined) {
      sets.push('category = ?');
      params.push(changes.category);
    }
    if (changes.levels !== undefined) {
      sets.push('levels = ?');
      params.push(changes.levels);
    }
    if (changes.timeoutHours !== undefined) {
      sets.push('timeout_hours = ?');
      params.push(changes.timeoutHours);
    }
    if (changes.autoApprove !== undefined) {
      sets.push('auto_approve = ?');
      params.push(changes.autoApprove ? 1 : 0);
    }
    if (changes.autoReject !== undefined) {
      sets.push('auto_reject = ?');
      params.push(changes.autoReject ? 1 : 0);
    }
    if (changes.requireAll !== undefined) {
      sets.push('require_all = ?');
      params.push(changes.requireAll ? 1 : 0);
    }
    if (params.length === 1)
      return this.findChainById(id) as Promise<T.ApprovalChain>;
    params.push(id);
    await run(
      `UPDATE approval_chains SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findChainById(id) as Promise<T.ApprovalChain>;
  },

  async deleteChain(id: string): Promise<void> {
    await run('DELETE FROM approval_chains WHERE id = ?', [id]);
  },

  mapChain(row: any): T.ApprovalChain {
    return {
      id: row.id,
      name: row.name,
      description: row.description || null,
      category: row.category,
      levels: row.levels || 1,
      timeoutHours: row.timeout_hours || 48,
      autoApprove: !!row.auto_approve,
      autoReject: !!row.auto_reject,
      requireAll: row.require_all !== 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // APPROVAL CHAIN LEVELS
  // ═════════════════════════════════════════════════════════════════════

  async createChainLevel(
    dto: T.CreateChainLevelDto,
  ): Promise<T.ApprovalChainLevel> {
    const id = uid('acl');
    await run(
      `INSERT INTO approval_chain_levels (id, chain_id, level, role, approver_type, approval_type,
        timeout_hours, escalation_to, can_delegate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.chainId,
        dto.level,
        dto.role,
        dto.approverType,
        dto.approvalType || 'any',
        dto.timeoutHours || 24,
        dto.escalationTo || null,
        dto.canDelegate !== false ? 1 : 0,
      ],
    );
    const rows = await query(
      'SELECT * FROM approval_chain_levels WHERE id = ?',
      [id],
    );
    return this.mapChainLevel(rows[0]);
  },

  async findLevelsByChain(chainId: string): Promise<T.ApprovalChainLevel[]> {
    const rows = await query(
      'SELECT * FROM approval_chain_levels WHERE chain_id = ? ORDER BY level ASC',
      [chainId],
    );
    return rows.map((r: any) => this.mapChainLevel(r));
  },

  async deleteChainLevel(id: string): Promise<void> {
    await run('DELETE FROM approval_chain_levels WHERE id = ?', [id]);
  },

  mapChainLevel(row: any): T.ApprovalChainLevel {
    return {
      id: row.id,
      chainId: row.chain_id,
      level: row.level,
      role: row.role,
      approverType: row.approver_type,
      approvalType: row.approval_type || 'any',
      timeoutHours: row.timeout_hours || 24,
      escalationTo: row.escalation_to || null,
      canDelegate: !!row.can_delegate,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // APPROVAL REQUESTS
  // ═════════════════════════════════════════════════════════════════════

  async createApprovalRequest(
    dto: T.CreateApprovalRequestDto,
  ): Promise<T.ApprovalRequest> {
    const id = uid('ar');
    const chain = await this.findChainById(dto.chainId);
    if (!chain) throw new Error(`Approval chain not found: ${dto.chainId}`);
    await run(
      `INSERT INTO approval_requests (id, instance_id, step_id, chain_id, chain_version, context,
        requested_by, requested_from, priority, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.instanceId || null,
        dto.stepId || null,
        dto.chainId,
        chain.levels,
        JSON.stringify(dto.context || {}),
        dto.requestedBy,
        dto.requestedFrom || null,
        dto.priority || 0,
        dto.expiresAt || null,
      ],
    );
    return this.findApprovalRequestById(id) as Promise<T.ApprovalRequest>;
  },

  async findApprovalRequestById(id: string): Promise<T.ApprovalRequest | null> {
    const rows = await query('SELECT * FROM approval_requests WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapApprovalRequest(rows[0]) : null;
  },

  async findApprovalRequestsByUser(
    userId: string,
    status?: T.ApprovalStatus,
  ): Promise<T.ApprovalRequest[]> {
    let sql = `SELECT DISTINCT ar.* FROM approval_requests ar
       INNER JOIN approval_assignments aa ON aa.request_id = ar.id
       WHERE aa.assigned_to = ?`;
    const params: any[] = [userId];
    if (status) {
      sql += ' AND ar.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY ar.requested_at DESC LIMIT 100';
    const rows = await query(sql, params);
    return rows.map((r: any) => this.mapApprovalRequest(r));
  },

  async findApprovalRequestsByInstance(
    instanceId: string,
  ): Promise<T.ApprovalRequest[]> {
    const rows = await query(
      'SELECT * FROM approval_requests WHERE instance_id = ? ORDER BY requested_at DESC',
      [instanceId],
    );
    return rows.map((r: any) => this.mapApprovalRequest(r));
  },

  async updateApprovalRequestStatus(
    id: string,
    status: T.ApprovalStatus,
    comments?: string,
  ): Promise<void> {
    const sets: string[] = ['status = ?', 'completed_at = ?'];
    const params: any[] = [status, now()];
    if (comments) {
      sets.push('comments = ?');
      params.push(comments);
    }
    params.push(id);
    await run(
      `UPDATE approval_requests SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async getExpiredApprovals(): Promise<T.ApprovalRequest[]> {
    const rows = await query(
      "SELECT * FROM approval_requests WHERE expires_at <= ? AND status = 'pending'",
      [now()],
    );
    return rows.map((r: any) => this.mapApprovalRequest(r));
  },

  async getPendingApprovalsForAutoAction(): Promise<T.ApprovalRequest[]> {
    const rows = await query(
      "SELECT * FROM approval_requests WHERE status = 'pending' AND chain_id IN (SELECT id FROM approval_chains WHERE auto_approve = 1 OR auto_reject = 1)",
    );
    return rows.map((r: any) => this.mapApprovalRequest(r));
  },

  mapApprovalRequest(row: any): T.ApprovalRequest {
    return {
      id: row.id,
      instanceId: row.instance_id || null,
      stepId: row.step_id || null,
      chainId: row.chain_id,
      chainVersion: row.chain_version || 1,
      context: JSON.parse(row.context || '{}'),
      status: row.status,
      requestedBy: row.requested_by,
      requestedFrom: row.requested_from || null,
      requestedAt: row.requested_at,
      completedAt: row.completed_at || null,
      comments: row.comments || null,
      priority: row.priority || 0,
      expiresAt: row.expires_at || null,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // APPROVAL ASSIGNMENTS
  // ═════════════════════════════════════════════════════════════════════

  async createAssignment(dto: {
    requestId: string;
    level: number;
    assignedTo: string;
  }): Promise<T.ApprovalAssignment> {
    const id = uid('aa');
    await run(
      `INSERT INTO approval_assignments (id, request_id, level, assigned_to) VALUES (?, ?, ?, ?)`,
      [id, dto.requestId, dto.level, dto.assignedTo],
    );
    const rows = await query(
      'SELECT * FROM approval_assignments WHERE id = ?',
      [id],
    );
    return this.mapAssignment(rows[0]);
  },

  async createAssignmentsBulk(
    assignments: {
      requestId: string;
      level: number;
      assignedTo: string;
    }[],
  ): Promise<T.ApprovalAssignment[]> {
    const results: T.ApprovalAssignment[] = [];
    for (const a of assignments) {
      results.push(await this.createAssignment(a));
    }
    return results;
  },

  async findAssignmentsByRequest(
    requestId: string,
  ): Promise<T.ApprovalAssignment[]> {
    const rows = await query(
      'SELECT * FROM approval_assignments WHERE request_id = ? ORDER BY level ASC',
      [requestId],
    );
    return rows.map((r: any) => this.mapAssignment(r));
  },

  async findPendingAssignmentsByUser(
    userId: string,
  ): Promise<T.ApprovalAssignment[]> {
    const rows = await query(
      "SELECT * FROM approval_assignments WHERE assigned_to = ? AND status = 'pending' ORDER BY assigned_at DESC",
      [userId],
    );
    return rows.map((r: any) => this.mapAssignment(r));
  },

  async updateAssignmentStatus(
    id: string,
    status: T.AssignmentStatus,
    comments?: string,
    delegatedTo?: string,
  ): Promise<void> {
    const sets: string[] = ['status = ?', 'completed_at = ?'];
    const params: any[] = [status, now()];
    if (comments) {
      sets.push('comments = ?');
      params.push(comments);
    }
    if (delegatedTo) {
      sets.push('delegated_to = ?');
      params.push(delegatedTo);
    }
    params.push(id);
    await run(
      `UPDATE approval_assignments SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  mapAssignment(row: any): T.ApprovalAssignment {
    return {
      id: row.id,
      requestId: row.request_id,
      level: row.level,
      assignedTo: row.assigned_to,
      status: row.status,
      comments: row.comments || null,
      assignedAt: row.assigned_at,
      completedAt: row.completed_at || null,
      delegatedTo: row.delegated_to || null,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═════════════════════════════════════════════════════════════════════

  async createNotification(
    dto: T.CreateNotificationDto,
  ): Promise<T.Notification> {
    const id = uid('notif');
    await run(
      `INSERT INTO notifications (id, user_id, role, type, category, title, body, data, channel, source, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.userId || null,
        dto.role || null,
        dto.type || 'in_app',
        dto.category,
        dto.title,
        dto.body || null,
        JSON.stringify(dto.data || {}),
        dto.channel || 'in_app',
        dto.source || null,
        dto.sourceId || null,
      ],
    );
    const rows = await query('SELECT * FROM notifications WHERE id = ?', [id]);
    return this.mapNotification(rows[0]);
  },

  async createNotificationsBulk(
    dtos: T.CreateNotificationDto[],
  ): Promise<T.Notification[]> {
    const results: T.Notification[] = [];
    for (const dto of dtos) {
      results.push(await this.createNotification(dto));
    }
    return results;
  },

  async findNotificationById(id: string): Promise<T.Notification | null> {
    const rows = await query('SELECT * FROM notifications WHERE id = ?', [id]);
    return rows.length ? this.mapNotification(rows[0]) : null;
  },

  async findNotificationsByUser(
    userId: string,
    filter?: {
      category?: T.NotifCategory;
      isRead?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<T.PaginatedResult<T.Notification>> {
    const conditions: string[] = ['user_id = ?'];
    const params: any[] = [userId];
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter?.isRead !== undefined) {
      conditions.push('is_read = ?');
      params.push(filter.isRead ? 1 : 0);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM notifications ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM notifications ${where} ORDER BY sent_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapNotification(r)),
      total,
      offset,
      limit,
    };
  },

  async findNotificationsByRole(
    role: string,
    filter?: { category?: T.NotifCategory; limit?: number },
  ): Promise<T.Notification[]> {
    const conditions: string[] = ['role = ?'];
    const params: any[] = [role];
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const limit = filter?.limit || 50;
    const rows = await query(
      `SELECT * FROM notifications ${where} ORDER BY sent_at DESC LIMIT ?`,
      [...params, limit],
    );
    return rows.map((r: any) => this.mapNotification(r));
  },

  async getUnreadCount(userId: string): Promise<number> {
    const rows = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId],
    );
    return rows[0].count;
  },

  async markNotificationRead(id: string): Promise<void> {
    await run(
      'UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?',
      [now(), id],
    );
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await run(
      'UPDATE notifications SET is_read = 1, read_at = ? WHERE user_id = ? AND is_read = 0',
      [now(), userId],
    );
  },

  async archiveNotification(id: string): Promise<void> {
    await run('UPDATE notifications SET is_archived = 1 WHERE id = ?', [id]);
  },

  async deleteNotification(id: string): Promise<void> {
    await run('DELETE FROM notifications WHERE id = ?', [id]);
  },

  mapNotification(row: any): T.Notification {
    return {
      id: row.id,
      userId: row.user_id || null,
      role: row.role || null,
      type: row.type,
      category: row.category,
      title: row.title,
      body: row.body || null,
      data: JSON.parse(row.data || '{}'),
      channel: row.channel || 'in_app',
      isRead: !!row.is_read,
      isArchived: !!row.is_archived,
      sentAt: row.sent_at,
      readAt: row.read_at || null,
      deliveredAt: row.delivered_at || null,
      source: row.source || null,
      sourceId: row.source_id || null,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // NOTIFICATION CHANNELS
  // ═════════════════════════════════════════════════════════════════════

  async upsertChannel(
    userId: string,
    channel: T.NotifChannel,
    enabled: boolean,
    config?: Record<string, any>,
  ): Promise<void> {
    const existing = await query(
      'SELECT * FROM notification_channels WHERE user_id = ? AND channel = ?',
      [userId, channel],
    );
    if (existing.length) {
      await run(
        'UPDATE notification_channels SET enabled = ?, config = ? WHERE user_id = ? AND channel = ?',
        [enabled ? 1 : 0, JSON.stringify(config || {}), userId, channel],
      );
    } else {
      const id = uid('nc');
      await run(
        `INSERT INTO notification_channels (id, user_id, channel, enabled, config) VALUES (?, ?, ?, ?, ?)`,
        [id, userId, channel, enabled ? 1 : 0, JSON.stringify(config || {})],
      );
    }
  },

  async getChannelsByUser(userId: string): Promise<T.NotificationChannel[]> {
    const rows = await query(
      'SELECT * FROM notification_channels WHERE user_id = ?',
      [userId],
    );
    return rows.map((r: any) => this.mapNotifChannel(r));
  },

  mapNotifChannel(row: any): T.NotificationChannel {
    return {
      id: row.id,
      userId: row.user_id,
      channel: row.channel,
      enabled: !!row.enabled,
      config: JSON.parse(row.config || '{}'),
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // NOTIFICATION TEMPLATES
  // ═════════════════════════════════════════════════════════════════════

  async createTemplate(dto: {
    name: string;
    category: string;
    channel: string;
    template: string;
    variables?: string[];
  }): Promise<T.NotificationTemplate> {
    const id = uid('nt');
    await run(
      `INSERT INTO notification_templates (id, name, category, channel, template, variables) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.category,
        dto.channel,
        dto.template,
        JSON.stringify(dto.variables || []),
      ],
    );
    const rows = await query(
      'SELECT * FROM notification_templates WHERE id = ?',
      [id],
    );
    return this.mapTemplate(rows[0]);
  },

  async findTemplates(filter?: {
    category?: string;
    channel?: string;
  }): Promise<T.NotificationTemplate[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter?.channel) {
      conditions.push('channel = ?');
      params.push(filter.channel);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT * FROM notification_templates ${where} ORDER BY name ASC`,
      params,
    );
    return rows.map((r: any) => this.mapTemplate(r));
  },

  mapTemplate(row: any): T.NotificationTemplate {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      channel: row.channel,
      template: row.template,
      variables: JSON.parse(row.variables || '[]'),
      createdAt: row.created_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // SCHEDULED JOBS
  // ═════════════════════════════════════════════════════════════════════

  async createJob(dto: T.CreateJobDto): Promise<T.ScheduledJob> {
    const id = uid('sj');
    await run(
      `INSERT INTO scheduled_jobs (id, name, description, workflow_id, workflow_input, cron_expr,
        interval_seconds, start_at, end_at, timezone, business_calendar_only, max_retries, max_instances, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.description || null,
        dto.workflowId || null,
        JSON.stringify(dto.workflowInput || {}),
        dto.cronExpr || null,
        dto.intervalSeconds || null,
        dto.startAt || null,
        dto.endAt || null,
        dto.timezone || 'UTC',
        dto.businessCalendarOnly ? 1 : 0,
        dto.maxRetries || 3,
        dto.maxInstances || 1,
        dto.createdBy || null,
      ],
    );
    return this.findJobById(id) as Promise<T.ScheduledJob>;
  },

  async findJobById(id: string): Promise<T.ScheduledJob | null> {
    const rows = await query('SELECT * FROM scheduled_jobs WHERE id = ?', [id]);
    return rows.length ? this.mapJob(rows[0]) : null;
  },

  async findAllJobs(filter?: {
    status?: T.JobStatus;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.ScheduledJob>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM scheduled_jobs ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM scheduled_jobs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map((r: any) => this.mapJob(r)), total, offset, limit };
  },

  async getDueJobs(): Promise<T.ScheduledJob[]> {
    const rows = await query(
      "SELECT * FROM scheduled_jobs WHERE status = 'active' AND (next_run_at <= ? OR next_run_at IS NULL) AND (end_at IS NULL OR end_at >= ?) AND (start_at IS NULL OR start_at <= ?) ORDER BY next_run_at ASC",
      [now(), now(), now()],
    );
    return rows.map((r: any) => this.mapJob(r));
  },

  async updateJob(
    id: string,
    changes: Partial<
      T.CreateJobDto & {
        status?: T.JobStatus;
        nextRunAt?: string;
        lastRunAt?: string;
      }
    >,
  ): Promise<T.ScheduledJob> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description);
    }
    if (changes.workflowId !== undefined) {
      sets.push('workflow_id = ?');
      params.push(changes.workflowId);
    }
    if (changes.cronExpr !== undefined) {
      sets.push('cron_expr = ?');
      params.push(changes.cronExpr);
    }
    if (changes.intervalSeconds !== undefined) {
      sets.push('interval_seconds = ?');
      params.push(changes.intervalSeconds);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }
    if (changes.nextRunAt !== undefined) {
      sets.push('next_run_at = ?');
      params.push(changes.nextRunAt);
    }
    if (changes.lastRunAt !== undefined) {
      sets.push('last_run_at = ?');
      params.push(changes.lastRunAt);
    }
    if (changes.timezone !== undefined) {
      sets.push('timezone = ?');
      params.push(changes.timezone);
    }
    if (changes.businessCalendarOnly !== undefined) {
      sets.push('business_calendar_only = ?');
      params.push(changes.businessCalendarOnly ? 1 : 0);
    }
    if (changes.maxRetries !== undefined) {
      sets.push('max_retries = ?');
      params.push(changes.maxRetries);
    }
    if (params.length === 1)
      return this.findJobById(id) as Promise<T.ScheduledJob>;
    params.push(id);
    await run(
      `UPDATE scheduled_jobs SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findJobById(id) as Promise<T.ScheduledJob>;
  },

  async deleteJob(id: string): Promise<void> {
    await run('DELETE FROM scheduled_jobs WHERE id = ?', [id]);
  },

  mapJob(row: any): T.ScheduledJob {
    return {
      id: row.id,
      name: row.name,
      description: row.description || null,
      workflowId: row.workflow_id || null,
      workflowInput: JSON.parse(row.workflow_input || '{}'),
      cronExpr: row.cron_expr || null,
      intervalSeconds: row.interval_seconds || null,
      startAt: row.start_at || null,
      endAt: row.end_at || null,
      timezone: row.timezone || 'UTC',
      businessCalendarOnly: !!row.business_calendar_only,
      maxRetries: row.max_retries || 3,
      maxInstances: row.max_instances || 1,
      status: row.status,
      lastRunAt: row.last_run_at || null,
      nextRunAt: row.next_run_at || null,
      createdBy: row.created_by || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // SCHEDULED JOB INSTANCES
  // ═════════════════════════════════════════════════════════════════════

  async createJobInstance(
    jobId: string,
    scheduledAt: string,
  ): Promise<T.ScheduledJobInstance> {
    const id = uid('sji');
    await run(
      `INSERT INTO scheduled_job_instances (id, job_id, scheduled_at) VALUES (?, ?, ?)`,
      [id, jobId, scheduledAt],
    );
    const rows = await query(
      'SELECT * FROM scheduled_job_instances WHERE id = ?',
      [id],
    );
    return this.mapJobInstance(rows[0]);
  },

  async findJobInstanceById(
    id: string,
  ): Promise<T.ScheduledJobInstance | null> {
    const rows = await query(
      'SELECT * FROM scheduled_job_instances WHERE id = ?',
      [id],
    );
    return rows.length ? this.mapJobInstance(rows[0]) : null;
  },

  async findJobInstancesByJob(
    jobId: string,
    limit = 50,
  ): Promise<T.ScheduledJobInstance[]> {
    const rows = await query(
      'SELECT * FROM scheduled_job_instances WHERE job_id = ? ORDER BY scheduled_at DESC LIMIT ?',
      [jobId, limit],
    );
    return rows.map((r: any) => this.mapJobInstance(r));
  },

  async getOverdueJobInstances(): Promise<T.ScheduledJobInstance[]> {
    const rows = await query(
      "SELECT * FROM scheduled_job_instances WHERE status = 'pending' AND scheduled_at <= ? ORDER BY scheduled_at ASC LIMIT 100",
      [now()],
    );
    return rows.map((r: any) => this.mapJobInstance(r));
  },

  async updateJobInstanceStatus(
    id: string,
    status: T.JobInstanceStatus,
    errorMessage?: string,
    workflowInstanceId?: string,
    output?: string,
  ): Promise<void> {
    const sets: string[] = ['status = ?'];
    const params: any[] = [status];
    if (status === 'running') {
      sets.push('started_at = ?');
      params.push(now());
    }
    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled'
    ) {
      sets.push('completed_at = ?');
      params.push(now());
    }
    if (errorMessage) {
      sets.push('error_message = ?');
      params.push(errorMessage);
    }
    if (workflowInstanceId) {
      sets.push('workflow_instance_id = ?');
      params.push(workflowInstanceId);
    }
    if (output) {
      sets.push('output = ?');
      params.push(output);
    }
    params.push(id);
    await run(
      `UPDATE scheduled_job_instances SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  mapJobInstance(row: any): T.ScheduledJobInstance {
    return {
      id: row.id,
      jobId: row.job_id,
      scheduledAt: row.scheduled_at,
      startedAt: row.started_at || null,
      completedAt: row.completed_at || null,
      status: row.status,
      errorMessage: row.error_message || null,
      retryCount: row.retry_count || 0,
      workflowInstanceId: row.workflow_instance_id || null,
      output: row.output || null,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // WORKFLOW AUDIT LOG
  // ═════════════════════════════════════════════════════════════════════

  async logAudit(entry: {
    instanceId?: string;
    workflowId?: string;
    action: string;
    actor: string;
    details?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    const id = uid('wal');
    await run(
      `INSERT INTO workflow_audit_log (id, instance_id, workflow_id, action, actor, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.instanceId || null,
        entry.workflowId || null,
        entry.action,
        entry.actor,
        JSON.stringify(entry.details || {}),
        entry.ipAddress || null,
      ],
    );
  },

  async findAuditLogs(
    instanceId?: string,
    workflowId?: string,
    limit = 100,
  ): Promise<T.WorkflowAuditEntry[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (instanceId) {
      conditions.push('instance_id = ?');
      params.push(instanceId);
    }
    if (workflowId) {
      conditions.push('workflow_id = ?');
      params.push(workflowId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT * FROM workflow_audit_log ${where} ORDER BY created_at DESC LIMIT ?`,
      [...params, limit],
    );
    return rows.map((r: any) => this.mapAuditEntry(r));
  },

  mapAuditEntry(row: any): T.WorkflowAuditEntry {
    return {
      id: row.id,
      instanceId: row.instance_id || null,
      workflowId: row.workflow_id || null,
      action: row.action,
      actor: row.actor,
      details: JSON.parse(row.details || '{}'),
      ipAddress: row.ip_address || null,
      createdAt: row.created_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // BUSINESS CALENDAR
  // ═════════════════════════════════════════════════════════════════════

  async setBusinessDay(
    date: string,
    isHoliday: boolean,
    holidayName?: string,
  ): Promise<void> {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessDay = !isHoliday && !isWeekend;
    const existing = await query(
      'SELECT * FROM business_calendar WHERE date = ?',
      [date],
    );
    if (existing.length) {
      await run(
        'UPDATE business_calendar SET is_holiday = ?, holiday_name = ?, is_weekend = ?, is_business_day = ? WHERE date = ?',
        [
          isHoliday ? 1 : 0,
          holidayName || null,
          isWeekend ? 1 : 0,
          isBusinessDay ? 1 : 0,
          date,
        ],
      );
    } else {
      const id = uid('bc');
      await run(
        `INSERT INTO business_calendar (id, date, is_holiday, is_weekend, holiday_name, year, month, day, day_of_week, is_business_day)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          date,
          isHoliday ? 1 : 0,
          isWeekend ? 1 : 0,
          holidayName || null,
          year,
          month,
          day,
          dayOfWeek,
          isBusinessDay ? 1 : 0,
        ],
      );
    }
  },

  async isBusinessDay(date: string): Promise<boolean> {
    const rows = await query(
      'SELECT is_business_day FROM business_calendar WHERE date = ?',
      [date],
    );
    if (rows.length) return !!rows[0].is_business_day;
    const d = new Date(date);
    return d.getDay() !== 0 && d.getDay() !== 6;
  },

  async getNextBusinessDay(from: string, count = 1): Promise<string[]> {
    const results: string[] = [];
    let current = new Date(from);
    while (results.length < count) {
      current.setDate(current.getDate() + 1);
      const dateStr = current.toISOString().split('T')[0];
      if (await this.isBusinessDay(dateStr)) {
        results.push(dateStr);
      }
    }
    return results;
  },

  // ═════════════════════════════════════════════════════════════════════
  // HEALTH
  // ═════════════════════════════════════════════════════════════════════

  async getHealth(): Promise<{
    workflowCount: number;
    publishedCount: number;
    activeInstanceCount: number;
    ruleCount: number;
    chainCount: number;
    pendingApprovals: number;
    unreadNotifications: number;
    activeJobs: number;
    pendingTimers: number;
  }> {
    const wfCount = await query(
      'SELECT COUNT(*) as count FROM workflow_definitions',
    );
    const pubCount = await query(
      "SELECT COUNT(*) as count FROM workflow_definitions WHERE status = 'published'",
    );
    const instCount = await query(
      "SELECT COUNT(*) as count FROM workflow_instances WHERE status IN ('pending','running','paused')",
    );
    const ruleCount = await query(
      "SELECT COUNT(*) as count FROM business_rules WHERE status = 'active'",
    );
    const chainCount = await query(
      'SELECT COUNT(*) as count FROM approval_chains',
    );
    const pendingApprovals = await query(
      "SELECT COUNT(*) as count FROM approval_requests WHERE status = 'pending'",
    );
    const unreadNotifs = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0',
    );
    const activeJobs = await query(
      "SELECT COUNT(*) as count FROM scheduled_jobs WHERE status = 'active'",
    );
    const pendingTimers = await query(
      "SELECT COUNT(*) as count FROM workflow_timers WHERE status = 'pending' AND trigger_at <= ?",
      [now()],
    );
    return {
      workflowCount: wfCount[0].count,
      publishedCount: pubCount[0].count,
      activeInstanceCount: instCount[0].count,
      ruleCount: ruleCount[0].count,
      chainCount: chainCount[0].count,
      pendingApprovals: pendingApprovals[0].count,
      unreadNotifications: unreadNotifs[0].count,
      activeJobs: activeJobs[0].count,
      pendingTimers: pendingTimers[0].count,
    };
  },
};
