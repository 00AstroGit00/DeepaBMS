export type BranchStatus = 'active' | 'inactive' | 'closed';
export type BranchType = 'main' | 'branch' | 'franchise' | 'kiosk';
export type TransferStatus =
  | 'pending'
  | 'approved'
  | 'in_transit'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface Branch {
  id: string;
  name: string;
  code: string;
  tenantId: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: BranchStatus;
  type: BranchType;
  managerName: string | null;
  openingTime: string | null;
  closingTime: string | null;
  timezone: string;
  currency: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BranchGroup {
  id: string;
  name: string;
  description: string | null;
  tenantId: string;
  branchIds: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BranchTransfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  itemType: string;
  itemId: string;
  quantity: number;
  status: TransferStatus;
  requestedBy: string;
  approvedBy: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedInventoryPool {
  id: string;
  name: string;
  tenantId: string;
  branchIds: string[];
  itemIds: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateDashboard {
  totalBranches: number;
  activeBranches: number;
  totalGroups: number;
  totalTransfers: number;
  pendingTransfers: number;
  completedTransfers: number;
  totalPools: number;
  branchesByType: Record<string, number>;
  branchesByStatus: Record<string, number>;
  recentTransfers: BranchTransfer[];
}

export interface RegionalManager {
  id: string;
  name: string;
  tenantId: string;
  region: string;
  assignedBranchIds: string[];
  createdAt: string;
  updatedAt: string;
}
