import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { BranchService as S } from './branches.service';
import * as T from './branches.types';

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
        err.message?.includes('already') ||
        err.message?.includes('Cannot')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || msg });
}

// ═════════════════════════════════════════════════════════════════════════
// BRANCH CRUD
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = {
        tenantId: (req.query.tenantId as string) || req.user?.tenantId,
        status: req.query.status as T.BranchStatus,
        type: req.query.type as T.BranchType,
        search: req.query.search as string,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await S.listBranches(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branch = await S.getBranch(req.params.id);
      if (!branch) {
        res.status(404).json({ message: 'Branch not found' });
        return;
      }
      res.json(branch);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto = {
        ...req.body,
        tenantId: req.body.tenantId || req.user?.tenantId,
      };
      if (!dto.name || !dto.code) {
        res.status(400).json({ message: 'name and code are required' });
        return;
      }
      const branch = await S.createBranch(dto);
      res.status(201).json(branch);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.patch(
  '/:id',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branch = await S.updateBranch(req.params.id, req.body);
      res.json(branch);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/:id',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await S.deleteBranch(req.params.id);
      res.json({ message: 'Branch deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// BRANCH GROUPS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/groups',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { BranchRepository } = await import('./branches.repository');
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      if (!tenantId) {
        res.status(400).json({ message: 'tenantId is required' });
        return;
      }
      const groups = await BranchRepository.findAllBranchGroups(tenantId);
      res.json(groups);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/groups',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto = {
        ...req.body,
        tenantId: req.body.tenantId || req.user?.tenantId,
      };
      if (!dto.name) {
        res.status(400).json({ message: 'name is required' });
        return;
      }
      const group = await S.createBranchGroup(dto);
      res.status(201).json(group);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/groups/:groupId/branches',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { branchId } = req.body;
      if (!branchId) {
        res.status(400).json({ message: 'branchId is required' });
        return;
      }
      const group = await S.addBranchToGroup(req.params.groupId, branchId);
      res.json(group);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/groups/:groupId/branches/:branchId',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await S.removeBranchFromGroup(
        req.params.groupId,
        req.params.branchId,
      );
      res.json(group);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// BRANCH TRANSFERS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/transfers',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { BranchRepository } = await import('./branches.repository');
      const filter = {
        fromBranchId: req.query.fromBranchId as string,
        toBranchId: req.query.toBranchId as string,
        status: req.query.status as T.TransferStatus,
        itemType: req.query.itemType as string,
        offset: parseInt((req.query.offset as string) || '0', 10),
        limit: parseInt((req.query.limit as string) || '50', 10),
      };
      const result = await BranchRepository.findAllTransfers(filter);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/transfers/:id',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { BranchRepository } = await import('./branches.repository');
      const transfer = await BranchRepository.findTransferById(req.params.id);
      if (!transfer) {
        res.status(404).json({ message: 'Transfer not found' });
        return;
      }
      res.json(transfer);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/transfers',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto = {
        ...req.body,
        requestedBy: req.user?.id || 'system',
      };
      if (
        !dto.fromBranchId ||
        !dto.toBranchId ||
        !dto.itemType ||
        !dto.itemId ||
        !dto.quantity
      ) {
        res.status(400).json({
          message:
            'fromBranchId, toBranchId, itemType, itemId, and quantity are required',
        });
        return;
      }
      const transfer = await S.initiateTransfer(dto);
      res.status(201).json(transfer);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/transfers/:id/approve',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const transfer = await S.approveTransfer(
        req.params.id,
        req.user?.id || 'system',
      );
      res.json(transfer);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/transfers/:id/complete',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const transfer = await S.completeTransfer(req.params.id);
      res.json(transfer);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/transfers/:id/reject',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const transfer = await S.rejectTransfer(
        req.params.id,
        req.user?.id || 'system',
      );
      res.json(transfer);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// CORPORATE DASHBOARD
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      if (!tenantId) {
        res.status(400).json({ message: 'tenantId is required' });
        return;
      }
      const dashboard = await S.getCrossPropertyDashboard(tenantId);
      res.json(dashboard);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// REGIONAL MANAGER
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/regional/:managerId',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await S.getRegionalSummary(req.params.managerId);
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// SHARED INVENTORY POOLS
// ═════════════════════════════════════════════════════════════════════════

router.get(
  '/pools',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { BranchRepository } = await import('./branches.repository');
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      if (!tenantId) {
        res.status(400).json({ message: 'tenantId is required' });
        return;
      }
      const pools = await BranchRepository.findAllSharedPools(tenantId);
      res.json(pools);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/pools',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto = {
        ...req.body,
        tenantId: req.body.tenantId || req.user?.tenantId,
      };
      if (!dto.name) {
        res.status(400).json({ message: 'name is required' });
        return;
      }
      const pool = await S.createSharedInventoryPool(dto);
      res.status(201).json(pool);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/pools/:id/availability',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const availability = await S.getSharedInventoryAvailability(
        req.params.id,
      );
      res.json(availability);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/pools/:id/items',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { itemId } = req.body;
      if (!itemId) {
        res.status(400).json({ message: 'itemId is required' });
        return;
      }
      const pool = await S.addItemToPool(req.params.id, itemId);
      res.json(pool);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/pools/:id/items/:itemId',
  authenticate,
  authorize('superadmin', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pool = await S.removeItemFromPool(req.params.id, req.params.itemId);
      res.json(pool);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════
// CROSS-PROPERTY INVENTORY TRANSFER
// ═════════════════════════════════════════════════════════════════════════

router.post(
  '/transfers/cross-property',
  authenticate,
  authorize('superadmin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto = {
        fromBranchId: req.body.fromBranchId,
        toBranchId: req.body.toBranchId,
        itemId: req.body.itemId,
        quantity: req.body.quantity,
        notes: req.body.notes,
        requestedBy: req.user?.id || 'system',
      };
      if (
        !dto.fromBranchId ||
        !dto.toBranchId ||
        !dto.itemId ||
        !dto.quantity
      ) {
        res.status(400).json({
          message:
            'fromBranchId, toBranchId, itemId, and quantity are required',
        });
        return;
      }
      const transfer = await S.transferBetweenBranches(dto);
      res.status(201).json(transfer);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
