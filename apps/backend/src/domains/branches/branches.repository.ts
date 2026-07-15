import { query, run } from '../../db';
import * as T from './branches.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

export const BranchRepository = {
  // ═════════════════════════════════════════════════════════════════════
  // BRANCHES — CRUD
  // ═════════════════════════════════════════════════════════════════════

  async createBranch(
    dto: Partial<T.Branch> & { name: string; code: string; tenantId: string },
  ): Promise<T.Branch> {
    const id = uid('br');
    const metadata = dto.metadata ? JSON.stringify(dto.metadata) : '{}';
    await run(
      `INSERT INTO branches (id, name, code, tenant_id, address, phone, email, status, type, manager_name, opening_time, closing_time, timezone, currency, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.code,
        dto.tenantId,
        dto.address || null,
        dto.phone || null,
        dto.email || null,
        dto.status || 'active',
        dto.type || 'branch',
        dto.managerName || null,
        dto.openingTime || null,
        dto.closingTime || null,
        dto.timezone || 'UTC',
        dto.currency || 'INR',
        metadata,
        now(),
        now(),
      ],
    );
    return this.findBranchById(id) as Promise<T.Branch>;
  },

  async findBranchById(id: string): Promise<T.Branch | null> {
    const rows = await query('SELECT * FROM branches WHERE id = ?', [id]);
    return rows.length ? this.mapBranch(rows[0]) : null;
  },

  async findAllBranches(filter?: {
    tenantId?: string;
    status?: T.BranchStatus;
    type?: T.BranchType;
    search?: string;
    offset?: number;
    limit?: number;
  }): Promise<{
    data: T.Branch[];
    total: number;
    offset: number;
    limit: number;
  }> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.tenantId) {
      conditions.push('tenant_id = ?');
      params.push(filter.tenantId);
    }
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.type) {
      conditions.push('type = ?');
      params.push(filter.type);
    }
    if (filter?.search) {
      conditions.push('(name LIKE ? OR code LIKE ? OR phone LIKE ?)');
      const p = `%${filter.search}%`;
      params.push(p, p, p);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM branches ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM branches ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapBranch(r)),
      total,
      offset,
      limit,
    };
  },

  async updateBranch(id: string, updates: Partial<T.Branch>): Promise<void> {
    const timestamp = now();
    const sets: string[] = [];
    const params: any[] = [];
    const fieldMap: Record<string, string> = {
      name: 'name',
      code: 'code',
      address: 'address',
      phone: 'phone',
      email: 'email',
      status: 'status',
      type: 'type',
      managerName: 'manager_name',
      openingTime: 'opening_time',
      closingTime: 'closing_time',
      timezone: 'timezone',
      currency: 'currency',
    };
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'metadata' && val !== undefined) {
        sets.push('metadata = ?');
        params.push(JSON.stringify(val));
        continue;
      }
      const dbKey = fieldMap[key];
      if (dbKey && val !== undefined) {
        sets.push(`${dbKey} = ?`);
        params.push(val === null ? null : val);
      }
    }
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    params.push(timestamp, id);
    await run(`UPDATE branches SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async deleteBranch(id: string): Promise<void> {
    await run('DELETE FROM branches WHERE id = ?', [id]);
  },

  mapBranch(row: any): T.Branch {
    let metadata: Record<string, any> = {};
    try {
      metadata = JSON.parse(row.metadata || '{}');
    } catch {
      /* ignore */
    }
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      tenantId: row.tenant_id,
      address: row.address || null,
      phone: row.phone || null,
      email: row.email || null,
      status: row.status,
      type: row.type,
      managerName: row.manager_name || null,
      openingTime: row.opening_time || null,
      closingTime: row.closing_time || null,
      timezone: row.timezone || 'UTC',
      currency: row.currency || 'INR',
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // BRANCH GROUPS
  // ═════════════════════════════════════════════════════════════════════

  async createBranchGroup(
    dto: Partial<T.BranchGroup> & { name: string; tenantId: string },
  ): Promise<T.BranchGroup> {
    const id = uid('bgrp');
    const branchIds = JSON.stringify(dto.branchIds || []);
    const metadata = dto.metadata ? JSON.stringify(dto.metadata) : '{}';
    await run(
      `INSERT INTO branch_groups (id, name, description, tenant_id, branch_ids, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.description || null,
        dto.tenantId,
        branchIds,
        metadata,
        now(),
        now(),
      ],
    );
    return this.findBranchGroupById(id) as Promise<T.BranchGroup>;
  },

  async findBranchGroupById(id: string): Promise<T.BranchGroup | null> {
    const rows = await query('SELECT * FROM branch_groups WHERE id = ?', [id]);
    return rows.length ? this.mapBranchGroup(rows[0]) : null;
  },

  async findAllBranchGroups(tenantId: string): Promise<T.BranchGroup[]> {
    const rows = await query(
      'SELECT * FROM branch_groups WHERE tenant_id = ? ORDER BY name ASC',
      [tenantId],
    );
    return rows.map((r: any) => this.mapBranchGroup(r));
  },

  async updateBranchGroup(
    id: string,
    updates: Partial<T.BranchGroup>,
  ): Promise<void> {
    const timestamp = now();
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      params.push(updates.description);
    }
    if (updates.branchIds !== undefined) {
      sets.push('branch_ids = ?');
      params.push(JSON.stringify(updates.branchIds));
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    params.push(timestamp, id);
    await run(
      `UPDATE branch_groups SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async deleteBranchGroup(id: string): Promise<void> {
    await run('DELETE FROM branch_groups WHERE id = ?', [id]);
  },

  mapBranchGroup(row: any): T.BranchGroup {
    let branchIds: string[] = [];
    try {
      branchIds = JSON.parse(row.branch_ids || '[]');
    } catch {
      /* ignore */
    }
    let metadata: Record<string, any> = {};
    try {
      metadata = JSON.parse(row.metadata || '{}');
    } catch {
      /* ignore */
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description || null,
      tenantId: row.tenant_id,
      branchIds,
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // BRANCH TRANSFERS
  // ═════════════════════════════════════════════════════════════════════

  async createTransfer(
    dto: Partial<T.BranchTransfer> & {
      fromBranchId: string;
      toBranchId: string;
      itemType: string;
      itemId: string;
      quantity: number;
      requestedBy: string;
    },
  ): Promise<T.BranchTransfer> {
    const id = uid('btr');
    await run(
      `INSERT INTO branch_transfers (id, from_branch_id, to_branch_id, item_type, item_id, quantity, status, requested_by, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.fromBranchId,
        dto.toBranchId,
        dto.itemType,
        dto.itemId,
        dto.quantity,
        'pending',
        dto.requestedBy,
        dto.notes || null,
        now(),
        now(),
      ],
    );
    return this.findTransferById(id) as Promise<T.BranchTransfer>;
  },

  async findTransferById(id: string): Promise<T.BranchTransfer | null> {
    const rows = await query('SELECT * FROM branch_transfers WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapTransfer(rows[0]) : null;
  },

  async findAllTransfers(filter?: {
    fromBranchId?: string;
    toBranchId?: string;
    status?: T.TransferStatus;
    itemType?: string;
    offset?: number;
    limit?: number;
  }): Promise<{
    data: T.BranchTransfer[];
    total: number;
    offset: number;
    limit: number;
  }> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filter?.fromBranchId) {
      conditions.push('from_branch_id = ?');
      params.push(filter.fromBranchId);
    }
    if (filter?.toBranchId) {
      conditions.push('to_branch_id = ?');
      params.push(filter.toBranchId);
    }
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.itemType) {
      conditions.push('item_type = ?');
      params.push(filter.itemType);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;
    const countResult = await query(
      `SELECT COUNT(*) as total FROM branch_transfers ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM branch_transfers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: rows.map((r: any) => this.mapTransfer(r)),
      total,
      offset,
      limit,
    };
  },

  async updateTransferStatus(
    id: string,
    status: T.TransferStatus,
    userId?: string,
  ): Promise<void> {
    const timestamp = now();
    const sets: string[] = ['status = ?'];
    const params: any[] = [status];
    if (status === 'approved' && userId) {
      sets.push('approved_by = ?');
      params.push(userId);
    }
    if (status === 'completed') {
      sets.push('completed_at = ?');
      params.push(timestamp);
    }
    sets.push('updated_at = ?');
    params.push(timestamp, id);
    await run(
      `UPDATE branch_transfers SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  mapTransfer(row: any): T.BranchTransfer {
    return {
      id: row.id,
      fromBranchId: row.from_branch_id,
      toBranchId: row.to_branch_id,
      itemType: row.item_type,
      itemId: row.item_id,
      quantity: row.quantity,
      status: row.status,
      requestedBy: row.requested_by,
      approvedBy: row.approved_by || null,
      completedAt: row.completed_at || null,
      notes: row.notes || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // SHARED INVENTORY POOLS
  // ═════════════════════════════════════════════════════════════════════

  async createSharedPool(
    dto: Partial<T.SharedInventoryPool> & { name: string; tenantId: string },
  ): Promise<T.SharedInventoryPool> {
    const id = uid('pool');
    const branchIds = JSON.stringify(dto.branchIds || []);
    const itemIds = JSON.stringify(dto.itemIds || []);
    const metadata = dto.metadata ? JSON.stringify(dto.metadata) : '{}';
    await run(
      `INSERT INTO shared_inventory_pools (id, name, tenant_id, branch_ids, item_ids, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, dto.name, dto.tenantId, branchIds, itemIds, metadata, now(), now()],
    );
    return this.findSharedPoolById(id) as Promise<T.SharedInventoryPool>;
  },

  async findSharedPoolById(id: string): Promise<T.SharedInventoryPool | null> {
    const rows = await query(
      'SELECT * FROM shared_inventory_pools WHERE id = ?',
      [id],
    );
    return rows.length ? this.mapSharedPool(rows[0]) : null;
  },

  async findAllSharedPools(tenantId: string): Promise<T.SharedInventoryPool[]> {
    const rows = await query(
      'SELECT * FROM shared_inventory_pools WHERE tenant_id = ? ORDER BY name ASC',
      [tenantId],
    );
    return rows.map((r: any) => this.mapSharedPool(r));
  },

  async updateSharedPool(
    id: string,
    updates: Partial<T.SharedInventoryPool>,
  ): Promise<void> {
    const timestamp = now();
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.branchIds !== undefined) {
      sets.push('branch_ids = ?');
      params.push(JSON.stringify(updates.branchIds));
    }
    if (updates.itemIds !== undefined) {
      sets.push('item_ids = ?');
      params.push(JSON.stringify(updates.itemIds));
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }
    if (sets.length === 0) return;
    sets.push('updated_at = ?');
    params.push(timestamp, id);
    await run(
      `UPDATE shared_inventory_pools SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async deleteSharedPool(id: string): Promise<void> {
    await run('DELETE FROM shared_inventory_pools WHERE id = ?', [id]);
  },

  mapSharedPool(row: any): T.SharedInventoryPool {
    let branchIds: string[] = [];
    try {
      branchIds = JSON.parse(row.branch_ids || '[]');
    } catch {
      /* ignore */
    }
    let itemIds: string[] = [];
    try {
      itemIds = JSON.parse(row.item_ids || '[]');
    } catch {
      /* ignore */
    }
    let metadata: Record<string, any> = {};
    try {
      metadata = JSON.parse(row.metadata || '{}');
    } catch {
      /* ignore */
    }
    return {
      id: row.id,
      name: row.name,
      tenantId: row.tenant_id,
      branchIds,
      itemIds,
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
