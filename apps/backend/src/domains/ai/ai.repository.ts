import { query, run } from '../../db';
import * as T from './ai.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

export const AiRepository = {
  // ═════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ═════════════════════════════════════════════════════════════════════

  async createConversation(
    userId: string,
    title: string,
    metadata?: Record<string, any>,
  ): Promise<T.Conversation> {
    const id = uid('conv');
    const ts = now();
    await run(
      `INSERT INTO ai_conversations (id, user_id, title, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, title, JSON.stringify(metadata || {}), ts, ts],
    );
    return (await this.getConversation(id)) as T.Conversation;
  },

  async getConversation(id: string): Promise<T.Conversation | null> {
    const rows = await query('SELECT * FROM ai_conversations WHERE id = ?', [
      id,
    ]);
    if (!rows.length) return null;
    const row = rows[0];
    const msgRows = await query(
      'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id],
    );
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      messages: msgRows.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolCalls: JSON.parse(m.tool_calls || 'null'),
        createdAt: m.created_at,
      })),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async updateConversation(
    id: string,
    updates: { title?: string; metadata?: Record<string, any> },
  ): Promise<T.Conversation | null> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (updates.title !== undefined) {
      sets.push('title = ?');
      params.push(updates.title);
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }
    params.push(id);
    await run(
      `UPDATE ai_conversations SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    return this.getConversation(id);
  },

  async listConversations(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<T.Conversation[]> {
    const rows = await query(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset],
    );
    const results: T.Conversation[] = [];
    for (const row of rows) {
      const conv = await this.getConversation(row.id);
      if (conv) results.push(conv);
    }
    return results;
  },

  async deleteConversation(id: string): Promise<void> {
    await run('DELETE FROM ai_messages WHERE conversation_id = ?', [id]);
    await run('DELETE FROM ai_conversations WHERE id = ?', [id]);
  },

  // ═════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ═════════════════════════════════════════════════════════════════════

  async addMessage(
    conversationId: string,
    role: T.AiMessage['role'],
    content: string,
    toolCalls?: T.AiToolCall[],
  ): Promise<T.AiMessage> {
    const id = uid('msg');
    const ts = now();
    await run(
      `INSERT INTO ai_messages (id, conversation_id, role, content, tool_calls, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        conversationId,
        role,
        content,
        toolCalls ? JSON.stringify(toolCalls) : null,
        ts,
      ],
    );
    await run('UPDATE ai_conversations SET updated_at = ? WHERE id = ?', [
      ts,
      conversationId,
    ]);
    return {
      id,
      role,
      content,
      toolCalls,
      createdAt: ts,
    };
  },

  async getMessages(conversationId: string): Promise<T.AiMessage[]> {
    const rows = await query(
      'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId],
    );
    return rows.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: JSON.parse(m.tool_calls || 'null'),
      createdAt: m.created_at,
    }));
  },

  async clearMessages(conversationId: string): Promise<void> {
    await run('DELETE FROM ai_messages WHERE conversation_id = ?', [
      conversationId,
    ]);
    await run('UPDATE ai_conversations SET updated_at = ? WHERE id = ?', [
      now(),
      conversationId,
    ]);
  },

  // ═════════════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ═════════════════════════════════════════════════════════════════════

  async createAuditEntry(
    entry: Omit<T.AiAuditEntry, 'id' | 'createdAt'>,
  ): Promise<T.AiAuditEntry> {
    const id = uid('aud');
    const ts = now();
    await run(
      `INSERT INTO ai_audit_log (id, user_id, action, model, prompt, response, tokens, duration, safety_checks, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.userId,
        entry.action,
        entry.model,
        entry.prompt,
        entry.response,
        entry.tokens,
        entry.duration,
        JSON.stringify(entry.safetyChecks),
        ts,
      ],
    );
    return (await this.getAuditEntry(id)) as T.AiAuditEntry;
  },

  async getAuditEntry(id: string): Promise<T.AiAuditEntry | null> {
    const rows = await query('SELECT * FROM ai_audit_log WHERE id = ?', [id]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      action: r.action,
      model: r.model,
      prompt: r.prompt,
      response: r.response,
      tokens: r.tokens,
      duration: r.duration,
      safetyChecks: JSON.parse(r.safety_checks || '[]'),
      createdAt: r.created_at,
    };
  },

  async getAuditEntries(
    userId?: string,
    limit = 50,
    offset = 0,
  ): Promise<T.AiAuditEntry[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT * FROM ai_audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      action: r.action,
      model: r.model,
      prompt: r.prompt,
      response: r.response,
      tokens: r.tokens,
      duration: r.duration,
      safetyChecks: JSON.parse(r.safety_checks || '[]'),
      createdAt: r.created_at,
    }));
  },

  // ═════════════════════════════════════════════════════════════════════
  // CONTEXT CACHE
  // ═════════════════════════════════════════════════════════════════════

  async cacheContext(
    key: string,
    data: Record<string, any>,
    ttlSeconds = 300,
  ): Promise<void> {
    const existing = await query(
      'SELECT * FROM ai_context_cache WHERE cache_key = ?',
      [key],
    );
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const serialized = JSON.stringify(data);
    if (existing.length) {
      await run(
        'UPDATE ai_context_cache SET data = ?, expires_at = ?, updated_at = ? WHERE cache_key = ?',
        [serialized, expiresAt, now(), key],
      );
    } else {
      const id = uid('ctx');
      await run(
        `INSERT INTO ai_context_cache (id, cache_key, data, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, key, serialized, expiresAt, now(), now()],
      );
    }
  },

  async getCachedContext(key: string): Promise<Record<string, any> | null> {
    const rows = await query(
      'SELECT * FROM ai_context_cache WHERE cache_key = ? AND expires_at > ?',
      [key, now()],
    );
    if (!rows.length) return null;
    return JSON.parse(rows[0].data || '{}');
  },

  async clearContextCache(): Promise<void> {
    await run('DELETE FROM ai_context_cache');
  },

  // ═════════════════════════════════════════════════════════════════════
  // PROMPT TEMPLATES
  // ═════════════════════════════════════════════════════════════════════

  async savePromptTemplate(
    template: Omit<T.PromptTemplate, 'id'>,
  ): Promise<T.PromptTemplate> {
    const id = uid('pt');
    await run(
      `INSERT INTO ai_prompt_templates (id, name, intent, template, variables, domain, roles, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        template.name,
        template.intent,
        template.template,
        JSON.stringify(template.variables),
        JSON.stringify(template.domain),
        JSON.stringify(template.roles),
        template.version || 1,
      ],
    );
    return (await this.getPromptTemplate(id)) as T.PromptTemplate;
  },

  async getPromptTemplate(id: string): Promise<T.PromptTemplate | null> {
    const rows = await query('SELECT * FROM ai_prompt_templates WHERE id = ?', [
      id,
    ]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      intent: r.intent,
      template: r.template,
      variables: JSON.parse(r.variables || '[]'),
      domain: JSON.parse(r.domain || '[]'),
      roles: JSON.parse(r.roles || '[]'),
      version: r.version,
    };
  },

  async listPromptTemplates(
    intent?: T.PromptIntent,
  ): Promise<T.PromptTemplate[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (intent) {
      conditions.push('intent = ?');
      params.push(intent);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT * FROM ai_prompt_templates ${where} ORDER BY name ASC`,
      params,
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      intent: r.intent,
      template: r.template,
      variables: JSON.parse(r.variables || '[]'),
      domain: JSON.parse(r.domain || '[]'),
      roles: JSON.parse(r.roles || '[]'),
      version: r.version,
    }));
  },

  // ═════════════════════════════════════════════════════════════════════
  // DATABASE CONTEXT GATHERING
  // ═════════════════════════════════════════════════════════════════════

  async getDatabaseContext(): Promise<Record<string, any>> {
    const today = now().split('T')[0];
    const [dailyRev, expenses, occupancy, covers, barSales, invVal, payroll] =
      await Promise.all([
        query(
          `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
           WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)=?`,
          [today],
        ),
        query(
          `SELECT COALESCE(SUM(debit_total), 0) as val FROM journal_entries
           WHERE status='posted' AND voucher_type IN ('payment','journal','adjustment') AND date(entry_date)=?`,
          [today],
        ),
        query("SELECT COUNT(*) as occ FROM rooms WHERE status='occupied'").then(
          (r) =>
            query('SELECT COUNT(*) as total FROM rooms').then((t) => ({
              occ: r[0].occ,
              total: t[0].total,
            })),
        ),
        query(
          `SELECT COALESCE(SUM(guest_count), 0) as cnt FROM restaurant_orders
           WHERE date(created_at)=? AND status IN ('served','completed','paid')`,
          [today],
        ),
        query(
          `SELECT COALESCE(SUM(total_amount), 0) as val FROM bar_sales
           WHERE date(created_at)=? AND status='completed'`,
          [today],
        ),
        query(
          'SELECT COALESCE(SUM(stock * cost), 0) as val FROM inventory WHERE is_active=1',
        ),
        query(
          `SELECT COALESCE(SUM(amount), 0) as val FROM payroll_entries
           WHERE strftime('%Y-%m', pay_date)=strftime('%Y-%m', 'now') AND status='paid'`,
        ),
      ]);

    const occRate =
      occupancy.total > 0
        ? (Number(occupancy.occ) / Number(occupancy.total)) * 100
        : 0;

    return {
      date: today,
      dailyRevenue: Number(dailyRev[0]?.val || 0),
      expenses: Number(expenses[0]?.val || 0),
      occupancyRate: Math.round(occRate * 100) / 100,
      restaurantCovers: Number(covers[0]?.cnt || 0),
      barSales: Number(barSales[0]?.val || 0),
      inventoryValue: Number(invVal[0]?.val || 0),
      payroll: Number(payroll[0]?.val || 0),
    };
  },

  async getAnalyticsHealth(): Promise<{ isHealthy: boolean; tables: string }> {
    try {
      await query('SELECT 1 FROM ai_conversations LIMIT 1');
      return { isHealthy: true, tables: 'ai tables accessible' };
    } catch {
      return { isHealthy: false, tables: 'ai tables not accessible' };
    }
  },
};
