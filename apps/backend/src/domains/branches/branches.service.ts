import { BranchRepository as R } from './branches.repository';
import * as T from './branches.types';
import { query } from '../../db';

// ═════════════════════════════════════════════════════════════════════════
// BRANCH SERVICE
// ═════════════════════════════════════════════════════════════════════════

export const BranchService = {
  async createBranch(
    dto: Partial<T.Branch> & { name: string; code: string; tenantId: string },
  ): Promise<T.Branch> {
    if (!dto.name || !dto.name.trim())
      throw new Error('Branch name is required');
    if (!dto.code || !dto.code.trim())
      throw new Error('Branch code is required');
    if (!dto.tenantId) throw new Error('Tenant ID is required');
    return R.createBranch(dto);
  },

  async getBranch(id: string): Promise<T.Branch | null> {
    return R.findBranchById(id);
  },

  async updateBranch(
    id: string,
    updates: Partial<T.Branch>,
  ): Promise<T.Branch> {
    const existing = await R.findBranchById(id);
    if (!existing) throw new Error('Branch not found');
    await R.updateBranch(id, updates);
    const updated = await R.findBranchById(id);
    if (!updated) throw new Error('Branch not found after update');
    return updated;
  },

  async listBranches(filter?: {
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
    return R.findAllBranches(filter);
  },

  async deleteBranch(id: string): Promise<void> {
    const existing = await R.findBranchById(id);
    if (!existing) throw new Error('Branch not found');
    await R.deleteBranch(id);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // BRANCH GROUPS
  // ═════════════════════════════════════════════════════════════════════════

  async createBranchGroup(
    dto: Partial<T.BranchGroup> & { name: string; tenantId: string },
  ): Promise<T.BranchGroup> {
    if (!dto.name || !dto.name.trim())
      throw new Error('Branch group name is required');
    if (!dto.tenantId) throw new Error('Tenant ID is required');
    return R.createBranchGroup(dto);
  },

  async addBranchToGroup(
    groupId: string,
    branchId: string,
  ): Promise<T.BranchGroup> {
    const group = await R.findBranchGroupById(groupId);
    if (!group) throw new Error('Branch group not found');
    const branch = await R.findBranchById(branchId);
    if (!branch) throw new Error('Branch not found');
    if (group.branchIds.includes(branchId))
      throw new Error('Branch already in group');
    const updatedIds = [...group.branchIds, branchId];
    await R.updateBranchGroup(groupId, { branchIds: updatedIds });
    return R.findBranchGroupById(groupId) as Promise<T.BranchGroup>;
  },

  async removeBranchFromGroup(
    groupId: string,
    branchId: string,
  ): Promise<T.BranchGroup> {
    const group = await R.findBranchGroupById(groupId);
    if (!group) throw new Error('Branch group not found');
    const updatedIds = group.branchIds.filter((id) => id !== branchId);
    await R.updateBranchGroup(groupId, { branchIds: updatedIds });
    return R.findBranchGroupById(groupId) as Promise<T.BranchGroup>;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // BRANCH TRANSFERS
  // ═════════════════════════════════════════════════════════════════════════

  async initiateTransfer(
    dto: Partial<T.BranchTransfer> & {
      fromBranchId: string;
      toBranchId: string;
      itemType: string;
      itemId: string;
      quantity: number;
      requestedBy: string;
    },
  ): Promise<T.BranchTransfer> {
    if (!dto.fromBranchId || !dto.toBranchId)
      throw new Error('Both fromBranchId and toBranchId are required');
    if (!dto.itemType || !dto.itemId)
      throw new Error('Item type and ID are required');
    if (!dto.quantity || dto.quantity <= 0)
      throw new Error('Quantity must be positive');
    if (dto.fromBranchId === dto.toBranchId)
      throw new Error('Cannot transfer to the same branch');

    const fromBranch = await R.findBranchById(dto.fromBranchId);
    if (!fromBranch) throw new Error('Source branch not found');
    const toBranch = await R.findBranchById(dto.toBranchId);
    if (!toBranch) throw new Error('Destination branch not found');

    return R.createTransfer(dto);
  },

  async approveTransfer(id: string, userId: string): Promise<T.BranchTransfer> {
    const transfer = await R.findTransferById(id);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== 'pending')
      throw new Error(`Cannot approve transfer with status ${transfer.status}`);
    await R.updateTransferStatus(id, 'approved', userId);
    return R.findTransferById(id) as Promise<T.BranchTransfer>;
  },

  async completeTransfer(id: string): Promise<T.BranchTransfer> {
    const transfer = await R.findTransferById(id);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== 'approved')
      throw new Error(
        `Cannot complete transfer with status ${transfer.status}`,
      );
    await R.updateTransferStatus(id, 'completed');
    return R.findTransferById(id) as Promise<T.BranchTransfer>;
  },

  async rejectTransfer(id: string, userId?: string): Promise<T.BranchTransfer> {
    const transfer = await R.findTransferById(id);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== 'pending' && transfer.status !== 'approved') {
      throw new Error(`Cannot reject transfer with status ${transfer.status}`);
    }
    await R.updateTransferStatus(id, 'rejected', userId);
    return R.findTransferById(id) as Promise<T.BranchTransfer>;
  },

  async cancelTransfer(id: string): Promise<T.BranchTransfer> {
    const transfer = await R.findTransferById(id);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status === 'completed' || transfer.status === 'cancelled') {
      throw new Error(`Cannot cancel transfer with status ${transfer.status}`);
    }
    await R.updateTransferStatus(id, 'cancelled');
    return R.findTransferById(id) as Promise<T.BranchTransfer>;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // CORPORATE DASHBOARD
  // ═════════════════════════════════════════════════════════════════════════

  async getCrossPropertyDashboard(
    tenantId: string,
  ): Promise<T.CorporateDashboard> {
    const branches = await R.findAllBranches({ tenantId, limit: 10000 });
    const groups = await R.findAllBranchGroups(tenantId);
    const transfersResult = await R.findAllTransfers({ limit: 10000 });
    const pools = await R.findAllSharedPools(tenantId);

    const branchesByType: Record<string, number> = {};
    const branchesByStatus: Record<string, number> = {};
    for (const b of branches.data) {
      branchesByType[b.type] = (branchesByType[b.type] || 0) + 1;
      branchesByStatus[b.status] = (branchesByStatus[b.status] || 0) + 1;
    }

    const recentTransfers = transfersResult.data.slice(0, 20);

    return {
      totalBranches: branches.total,
      activeBranches: branchesByStatus['active'] || 0,
      totalGroups: groups.length,
      totalTransfers: transfersResult.total,
      pendingTransfers: transfersResult.data.filter(
        (t) => t.status === 'pending',
      ).length,
      completedTransfers: transfersResult.data.filter(
        (t) => t.status === 'completed',
      ).length,
      totalPools: pools.length,
      branchesByType,
      branchesByStatus,
      recentTransfers,
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // REGIONAL SUMMARY
  // ═════════════════════════════════════════════════════════════════════════

  async getRegionalSummary(regionalManagerId: string): Promise<{
    manager: T.RegionalManager | null;
    branches: T.Branch[];
    branchCount: number;
    activeBranchCount: number;
    recentTransfers: T.BranchTransfer[];
  }> {
    const mgrRows = await query(
      'SELECT * FROM regional_managers WHERE id = ?',
      [regionalManagerId],
    );
    if (!mgrRows.length) throw new Error('Regional manager not found');
    const mgrRow = mgrRows[0];
    let assignedBranchIds: string[] = [];
    try {
      assignedBranchIds = JSON.parse(mgrRow.assigned_branch_ids || '[]');
    } catch {
      /* ignore */
    }
    const manager: T.RegionalManager = {
      id: mgrRow.id,
      name: mgrRow.name,
      tenantId: mgrRow.tenant_id,
      region: mgrRow.region,
      assignedBranchIds,
      createdAt: mgrRow.created_at,
      updatedAt: mgrRow.updated_at,
    };

    const branches: T.Branch[] = [];
    for (const bid of assignedBranchIds) {
      const b = await R.findBranchById(bid);
      if (b) branches.push(b);
    }

    const allTransfers = await R.findAllTransfers({ limit: 50 });
    const recentTransfers = allTransfers.data
      .filter(
        (t) =>
          assignedBranchIds.includes(t.fromBranchId) ||
          assignedBranchIds.includes(t.toBranchId),
      )
      .slice(0, 20);

    return {
      manager,
      branches,
      branchCount: branches.length,
      activeBranchCount: branches.filter((b) => b.status === 'active').length,
      recentTransfers,
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SHARED INVENTORY POOLS
  // ═════════════════════════════════════════════════════════════════════════

  async createSharedInventoryPool(
    dto: Partial<T.SharedInventoryPool> & { name: string; tenantId: string },
  ): Promise<T.SharedInventoryPool> {
    if (!dto.name || !dto.name.trim()) throw new Error('Pool name is required');
    if (!dto.tenantId) throw new Error('Tenant ID is required');
    return R.createSharedPool(dto);
  },

  async addItemToPool(
    poolId: string,
    itemId: string,
  ): Promise<T.SharedInventoryPool> {
    const pool = await R.findSharedPoolById(poolId);
    if (!pool) throw new Error('Shared inventory pool not found');
    if (pool.itemIds.includes(itemId)) throw new Error('Item already in pool');
    const updatedIds = [...pool.itemIds, itemId];
    await R.updateSharedPool(poolId, { itemIds: updatedIds });
    return R.findSharedPoolById(poolId) as Promise<T.SharedInventoryPool>;
  },

  async removeItemFromPool(
    poolId: string,
    itemId: string,
  ): Promise<T.SharedInventoryPool> {
    const pool = await R.findSharedPoolById(poolId);
    if (!pool) throw new Error('Shared inventory pool not found');
    const updatedIds = pool.itemIds.filter((id) => id !== itemId);
    await R.updateSharedPool(poolId, { itemIds: updatedIds });
    return R.findSharedPoolById(poolId) as Promise<T.SharedInventoryPool>;
  },

  async getSharedInventoryAvailability(poolId: string): Promise<{
    pool: T.SharedInventoryPool;
    items: {
      itemId: string;
      itemName: string;
      totalStock: number;
      branchStocks: {
        branchId: string;
        branchName: string;
        stock: number;
      }[];
    }[];
  }> {
    const pool = await R.findSharedPoolById(poolId);
    if (!pool) throw new Error('Shared inventory pool not found');

    const branches: T.Branch[] = [];
    for (const bid of pool.branchIds) {
      const b = await R.findBranchById(bid);
      if (b) branches.push(b);
    }

    const items: any[] = [];
    for (const itemId of pool.itemIds) {
      const itemRows = await query(
        'SELECT id, name, stock FROM inventory WHERE id = ?',
        [itemId],
      );
      if (!itemRows.length) continue;
      const item = itemRows[0];
      const branchStocks: {
        branchId: string;
        branchName: string;
        stock: number;
      }[] = [];
      let totalStock = 0;
      for (const branch of branches) {
        const stockRows = await query(
          'SELECT COALESCE(SUM(quantity), 0) as stock FROM branch_inventory WHERE branch_id = ? AND item_id = ?',
          [branch.id, itemId],
        );
        const stock = stockRows[0]?.stock || 0;
        totalStock += stock;
        branchStocks.push({
          branchId: branch.id,
          branchName: branch.name,
          stock,
        });
      }

      items.push({
        itemId: item.id,
        itemName: item.name,
        totalStock,
        branchStocks,
      });
    }

    return { pool, items };
  },

  async transferBetweenBranches(dto: {
    fromBranchId: string;
    toBranchId: string;
    itemId: string;
    quantity: number;
    requestedBy: string;
    notes?: string;
  }): Promise<T.BranchTransfer> {
    const transfer = await this.initiateTransfer({
      ...dto,
      itemType: 'inventory',
      status: 'pending',
    } as any);
    return transfer;
  },
};
