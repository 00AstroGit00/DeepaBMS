import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { hrService } from './hr.service';
import { HrRepository } from './hr.repository';
import * as T from './hr.types';

const router = Router();

function handleError(
  res: Response,
  err: any,
  msg = 'Internal server error',
): void {
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('Invalid') ||
        err.message?.includes('required') ||
        err.message?.includes('Validation') ||
        err.message?.includes('duplicate') ||
        err.message?.includes('Cannot') ||
        err.message?.includes('already') ||
        err.message?.includes('must be') ||
        err.message?.includes('overlap') ||
        err.message?.includes('Insufficient') ||
        err.message?.includes('balance')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || msg });
}

// ── Filter Parsers ──────────────────────────────────────────────────────────

function parseEmployeeFilter(req: AuthenticatedRequest): T.EmployeeFilter {
  const {
    departmentId,
    designationId,
    status,
    employmentType,
    search,
    offset,
    limit,
  } = req.query as any;
  const filter: T.EmployeeFilter = {};
  if (departmentId) filter.departmentId = departmentId as string;
  if (designationId) filter.designationId = designationId as string;
  if (status) filter.status = status as T.EmployeeStatus;
  if (employmentType)
    filter.employmentType = employmentType as T.EmploymentType;
  if (search) filter.search = search as string;
  if (offset) filter.offset = parseInt(offset as string, 10);
  if (limit) filter.limit = parseInt(limit as string, 10);
  return filter;
}

function parseAttendanceFilter(req: AuthenticatedRequest): T.AttendanceFilter {
  const {
    employeeId,
    fromDate,
    toDate,
    status,
    departmentId,
    shiftId,
    offset,
    limit,
  } = req.query as any;
  const filter: T.AttendanceFilter = {};
  if (employeeId) filter.employeeId = employeeId as string;
  if (fromDate) filter.fromDate = fromDate as string;
  if (toDate) filter.toDate = toDate as string;
  if (status) filter.status = status as T.AttendanceStatus;
  if (departmentId) filter.departmentId = departmentId as string;
  if (shiftId) filter.shiftId = shiftId as string;
  if (offset) filter.offset = parseInt(offset as string, 10);
  if (limit) filter.limit = parseInt(limit as string, 10);
  return filter;
}

function parseIntParam(val: any): number | undefined {
  const n = parseInt(val as string, 10);
  return isNaN(n) ? undefined : n;
}

// ═════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/departments',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findAllDepartments();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/departments/tree',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.getDepartmentTree();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/departments/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findDepartmentById(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Department not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/departments',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code, name, description, headId, parentId, costCenter } =
        req.body;
      if (!code || !name) {
        res.status(400).json({ message: 'code and name are required' });
        return;
      }
      const data = await HrRepository.createDepartment({
        code,
        name,
        description,
        headId,
        parentId,
        costCenter,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/departments/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.updateDepartment(req.params.id, req.body);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/departments/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await HrRepository.deleteDepartment(req.params.id);
      res.json({ message: 'Department deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// DESIGNATIONS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/designations',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findAllDesignations();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/designations/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findDesignationById(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Designation not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/designations/by-department/:deptId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findDesignationsByDepartment(
        req.params.deptId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/designations',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        code,
        name,
        departmentId,
        description,
        grade,
        level,
        minSalary,
        maxSalary,
      } = req.body;
      if (!code || !name || !departmentId) {
        res
          .status(400)
          .json({ message: 'code, name, and departmentId are required' });
        return;
      }
      const data = await HrRepository.createDesignation({
        code,
        name,
        departmentId,
        description,
        grade,
        level: level !== undefined ? Number(level) : undefined,
        minSalary: minSalary !== undefined ? Number(minSalary) : undefined,
        maxSalary: maxSalary !== undefined ? Number(maxSalary) : undefined,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/designations/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.updateDesignation(
        req.params.id,
        req.body,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/designations/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await HrRepository.deleteDesignation(req.params.id);
      res.json({ message: 'Designation deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYEES
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/employees',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = parseEmployeeFilter(req);
      const data = await hrService.employee.listEmployees(filter);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/employees/count',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const count = await HrRepository.getEmployeeCount();
      res.json({ count });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/employees/by-department/:deptId',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findEmployeesByDepartment(
        req.params.deptId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/employees/by-designation/:desigId',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findEmployeesByDesignation(
        req.params.desigId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/employees/by-manager/:managerId',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findEmployeesByReportingTo(
        req.params.managerId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/employees/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.employee.getEmployee(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/employees/:id/report',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.employee.getEmployeeReport(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/employees',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        firstName,
        lastName,
        phone,
        email,
        gender,
        dateOfBirth,
        departmentId,
        designationId,
        employmentType,
        joinDate,
        reportingToId,
        salary,
        bankAccountNo,
        bankName,
        bankIfsc,
        pfNumber,
        esiNumber,
        panNumber,
        aadhaarNumber,
      } = req.body;
      if (
        !firstName ||
        !lastName ||
        !phone ||
        !gender ||
        !dateOfBirth ||
        !departmentId ||
        !designationId ||
        !joinDate
      ) {
        res.status(400).json({
          message:
            'firstName, lastName, phone, gender, dateOfBirth, departmentId, designationId, and joinDate are required',
        });
        return;
      }
      if (
        !T.VALID_EMPLOYMENT_TYPES.includes(
          employmentType as T.EmploymentType,
        ) &&
        employmentType
      ) {
        res
          .status(400)
          .json({ message: `Invalid employment type: ${employmentType}` });
        return;
      }
      const dto: T.CreateEmployeeDto = {
        firstName,
        lastName,
        phone,
        email,
        gender,
        dateOfBirth,
        departmentId,
        designationId,
        employmentType,
        joinDate,
        reportingToId,
        salary: salary !== undefined ? Number(salary) : undefined,
        bankAccountNo,
        bankName,
        bankIfsc,
        pfNumber,
        esiNumber,
        panNumber,
        aadhaarNumber,
      };
      const data = await hrService.employee.createEmployee(dto);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/employees/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.employee.updateEmployee(
        req.params.id,
        req.body,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/employees/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await HrRepository.deleteEmployee(req.params.id);
      res.json({ message: 'Employee deactivated' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/org-chart',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.employee.getOrgChart();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// SHIFTS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/shifts',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findAllShifts();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/shifts/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findShiftById(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Shift not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/shifts',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        code,
        name,
        shiftType,
        startTime,
        endTime,
        graceMinutes,
        lateThresholdMinutes,
        earlyDepartureThresholdMinutes,
        halfDayHours,
        fullDayHours,
        isNightShift,
        applicableDepartments,
      } = req.body;
      if (!code || !name || !shiftType || !startTime || !endTime) {
        res.status(400).json({
          message: 'code, name, shiftType, startTime, and endTime are required',
        });
        return;
      }
      if (!T.VALID_SHIFT_TYPES.includes(shiftType)) {
        res.status(400).json({ message: `Invalid shift type: ${shiftType}` });
        return;
      }
      const data = await HrRepository.createShift({
        code,
        name,
        shiftType,
        startTime,
        endTime,
        graceMinutes: Number(graceMinutes) || 0,
        lateThresholdMinutes: Number(lateThresholdMinutes) || 0,
        earlyDepartureThresholdMinutes:
          Number(earlyDepartureThresholdMinutes) || 0,
        halfDayHours: Number(halfDayHours) || 4.5,
        fullDayHours: Number(fullDayHours) || 9,
        isNightShift: isNightShift === true,
        applicableDepartments,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/shifts/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.updateShift(req.params.id, req.body);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/shifts/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await HrRepository.deleteShift(req.params.id);
      res.json({ message: 'Shift deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/shifts/assign',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId, shiftId, effectiveFrom, effectiveTo } = req.body;
      if (!employeeId || !shiftId || !effectiveFrom) {
        res.status(400).json({
          message: 'employeeId, shiftId, and effectiveFrom are required',
        });
        return;
      }
      const data = await HrRepository.assignShiftToEmployee({
        employeeId,
        shiftId,
        effectiveFrom,
        effectiveTo,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/attendance',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = parseAttendanceFilter(req);
      const data = filter.employeeId
        ? await hrService.attendance.getAttendance(
            filter.employeeId,
            filter.fromDate || '',
            filter.toDate || '',
          )
        : [];
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/attendance/summary',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId, fromDate, toDate } = req.query as any;
      if (!employeeId || !fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'employeeId, fromDate, and toDate are required' });
        return;
      }
      const data = await hrService.attendance.getAttendanceSummary(
        employeeId,
        fromDate,
        toDate,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/attendance/department',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { departmentId, date } = req.query as any;
      if (!departmentId || !date) {
        res.status(400).json({ message: 'departmentId and date are required' });
        return;
      }
      const data = await hrService.attendance.getDepartmentAttendance(
        departmentId,
        date,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/attendance/late-report',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res.status(400).json({ message: 'fromDate and toDate are required' });
        return;
      }
      const data = await hrService.attendance.getLateReport(fromDate, toDate);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/attendance/missing-punches',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date } = req.query as any;
      if (!date) {
        res.status(400).json({ message: 'date query param is required' });
        return;
      }
      const data = await hrService.attendance.getMissingPunches(date);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/attendance',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        date,
        shiftId,
        clockIn,
        clockOut,
        status,
        source,
        notes,
      } = req.body;
      if (!employeeId || !date) {
        res.status(400).json({ message: 'employeeId and date are required' });
        return;
      }
      const dto: T.MarkAttendanceDto = {
        employeeId,
        date,
        shiftId,
        clockIn,
        clockOut,
        status,
        source,
        notes,
      };
      const data = await hrService.attendance.markAttendance(dto);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/attendance/bulk',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        res
          .status(400)
          .json({ message: 'records array is required and must be non-empty' });
        return;
      }
      const data = await hrService.attendance.bulkMarkAttendance(records);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/attendance/:id/approve',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.attendance.approveAttendance(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/attendance/corrections',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId } = req.query as any;
      if (!employeeId) {
        res.status(400).json({ message: 'employeeId query param is required' });
        return;
      }
      const data = await HrRepository.findAttendanceCorrections(employeeId);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/attendance/corrections',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId, date, correctedClockIn, correctedClockOut, reason } =
        req.body;
      if (!employeeId || !date || !reason) {
        res
          .status(400)
          .json({ message: 'employeeId, date, and reason are required' });
        return;
      }
      const data = await hrService.attendance.requestAttendanceCorrection({
        employeeId,
        date,
        correctedClockIn,
        correctedClockOut,
        reason,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/attendance/corrections/:id/approve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.attendance.approveAttendanceCorrection(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// HOLIDAYS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/holidays',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const year = parseIntParam(req.query.year) || new Date().getFullYear();
      const data = await HrRepository.findHolidaysByYear(year);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/holidays/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findHolidayById(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Holiday not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/holidays',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, date, year, type, isOptional, applicableDepartments } =
        req.body;
      if (!name || !date || !year || !type) {
        res
          .status(400)
          .json({ message: 'name, date, year, and type are required' });
        return;
      }
      if (!['public', 'restricted', 'optional'].includes(type)) {
        res.status(400).json({ message: `Invalid holiday type: ${type}` });
        return;
      }
      const data = await HrRepository.createHoliday({
        name,
        date,
        year: Number(year),
        type,
        isOptional: isOptional === true,
        applicableDepartments,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/holidays/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.updateHoliday(req.params.id, req.body);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/holidays/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await HrRepository.deleteHoliday(req.params.id);
      res.json({ message: 'Holiday deleted' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// LEAVE TYPES, BALANCE, APPLICATIONS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/leaves/types',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findAllLeaveTypeConfigs();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/leaves/balance',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId, year } = req.query as any;
      if (!employeeId) {
        res.status(400).json({ message: 'employeeId query param is required' });
        return;
      }
      const data = await hrService.leave.getLeaveBalance(
        employeeId,
        year ? Number(year) : new Date().getFullYear(),
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/leaves/balance/initialize',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId, year } = req.body;
      if (!employeeId || !year) {
        res.status(400).json({ message: 'employeeId and year are required' });
        return;
      }
      const data = await hrService.leave.initializeLeaveBalances(
        employeeId,
        Number(year),
      );
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/leaves/balance/carry-forward',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId, fromYear, toYear } = req.body;
      if (!employeeId || !fromYear || !toYear) {
        res
          .status(400)
          .json({ message: 'employeeId, fromYear, and toYear are required' });
        return;
      }
      const data = await hrService.leave.carryForwardLeave(
        employeeId,
        Number(fromYear),
        Number(toYear),
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/leaves',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        status,
        leaveTypeId,
        fromDate,
        toDate,
        offset,
        limit,
      } = req.query as any;
      const filter: T.LeaveFilter = {};
      if (employeeId) filter.employeeId = employeeId as string;
      if (status) filter.status = status as T.LeaveStatus;
      if (leaveTypeId) filter.leaveTypeId = leaveTypeId as string;
      if (fromDate) filter.fromDate = fromDate as string;
      if (toDate) filter.toDate = toDate as string;
      let data: T.LeaveApplication[];
      if (employeeId) {
        data = await HrRepository.findLeaveApplicationsByEmployee(
          employeeId,
          filter,
        );
      } else {
        data =
          status === 'pending'
            ? await HrRepository.findPendingLeaveApplications()
            : await HrRepository.findPendingLeaveApplications();
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/leaves/pending',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findPendingLeaveApplications();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/leaves/calendar',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate, departmentId } = req.query as any;
      if (!fromDate || !toDate) {
        res.status(400).json({ message: 'fromDate and toDate are required' });
        return;
      }
      const data = await hrService.leave.getTeamLeaveCalendar(
        fromDate,
        toDate,
        departmentId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/leaves/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findLeaveApplicationById(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Leave application not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/leaves',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        leaveTypeId,
        fromDate,
        toDate,
        session,
        reason,
        isUrgent,
        contactDuringLeave,
      } = req.body;
      if (!employeeId || !leaveTypeId || !fromDate || !toDate || !reason) {
        res.status(400).json({
          message:
            'employeeId, leaveTypeId, fromDate, toDate, and reason are required',
        });
        return;
      }
      const dto: T.LeaveApplicationDto = {
        employeeId,
        leaveTypeId,
        fromDate,
        toDate,
        session: session || 'full_day',
        reason,
        isUrgent,
        contactDuringLeave,
      };
      const data = await hrService.leave.applyLeave(dto);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/leaves/:id/approve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.leave.approveLeave(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/leaves/:id/reject',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reason } = req.body;
      const data = await hrService.leave.rejectLeave(
        req.params.id,
        req.user?.name || 'system',
        reason,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/leaves/:id/cancel',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.leave.cancelLeave(req.params.id);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// PAYROLL
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/payroll/frequencies',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findAllPayrollFrequencies();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/payroll/runs',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { month, year, employeeId, status, departmentId } =
        req.query as any;
      const filter: T.PayrollFilter = {};
      if (month) filter.month = Number(month);
      if (year) filter.year = Number(year);
      if (employeeId) filter.employeeId = employeeId as string;
      if (status) filter.status = status as T.PayrollStatus;
      if (departmentId) filter.departmentId = departmentId as string;
      const data = await HrRepository.findPayrollRuns(filter);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/payroll/runs/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.payroll.getPayrollRun(req.params.id);
      if (!data) {
        res.status(404).json({ message: 'Payroll run not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/payroll/runs',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        month,
        year,
        frequency,
        periodStart,
        periodEnd,
        employeeIds,
        notes,
      } = req.body;
      if (!month || !year || !periodStart || !periodEnd) {
        res.status(400).json({
          message: 'month, year, periodStart, and periodEnd are required',
        });
        return;
      }
      const dto: T.PayrollRunDto = {
        month: Number(month),
        year: Number(year),
        frequency,
        periodStart,
        periodEnd,
        employeeIds,
        notes,
      };
      const data = await hrService.payroll.runPayroll(dto);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/payroll/runs/:id/approve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.payroll.approvePayroll(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/payroll/runs/:id/lock',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.payroll.lockPayroll(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/payroll/runs/:id/pay',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.payroll.processPayrollPayment(
        req.params.id,
        'bank',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/payroll/runs/:id/recalculate',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.payroll.recalculatePayroll(req.params.id);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/payroll/salary-structure/:employeeId',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.payroll.getSalaryStructure(
        req.params.employeeId,
      );
      if (!data) {
        res.status(404).json({ message: 'Salary structure not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/payroll/salary-structure',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        effectiveFrom,
        basicPay,
        hra,
        conveyanceAllowance,
        medicalAllowance,
        specialAllowance,
        otherAllowance,
      } = req.body;
      if (
        !employeeId ||
        !effectiveFrom ||
        basicPay === undefined ||
        hra === undefined
      ) {
        res.status(400).json({
          message: 'employeeId, effectiveFrom, basicPay, and hra are required',
        });
        return;
      }
      const dto: T.SalaryStructureDto = {
        employeeId,
        effectiveFrom,
        basicPay: Number(basicPay),
        hra: Number(hra),
        conveyanceAllowance:
          conveyanceAllowance !== undefined
            ? Number(conveyanceAllowance)
            : undefined,
        medicalAllowance:
          medicalAllowance !== undefined ? Number(medicalAllowance) : undefined,
        specialAllowance:
          specialAllowance !== undefined ? Number(specialAllowance) : undefined,
        otherAllowance:
          otherAllowance !== undefined ? Number(otherAllowance) : undefined,
      };
      const data = await HrRepository.createSalaryStructure(dto);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/payroll/salary-revision',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId, newGross, effectiveFrom, reason } = req.body;
      if (!employeeId || newGross === undefined || !effectiveFrom || !reason) {
        res.status(400).json({
          message:
            'employeeId, newGross, effectiveFrom, and reason are required',
        });
        return;
      }
      const data = await hrService.payroll.reviseSalary(
        employeeId,
        Number(newGross),
        effectiveFrom,
        reason,
        req.user?.name || 'system',
      );
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/payroll/salary-revision/:employeeId',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.payroll.getSalaryRevisionHistory(
        req.params.employeeId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/payroll/payslip/:employeeId/:runId',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.payroll.getEmployeePaySlip(
        req.params.employeeId,
        req.params.runId,
      );
      if (!data) {
        res.status(404).json({ message: 'Payslip not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/payroll/summary',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { month, year } = req.query as any;
      if (!month || !year) {
        res.status(400).json({ message: 'month and year are required' });
        return;
      }
      const data = await hrService.payroll.getPayrollSummary(
        Number(month),
        Number(year),
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// LOANS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/loans',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId } = req.query as any;
      if (!employeeId) {
        res.status(400).json({ message: 'employeeId query param is required' });
        return;
      }
      const data = await HrRepository.findLoansByEmployee(employeeId);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/loans/active',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findActiveLoans();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/loans',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        loanType,
        principalAmount,
        emiAmount,
        totalEmis,
        purpose,
      } = req.body;
      if (
        !employeeId ||
        !loanType ||
        !principalAmount ||
        !emiAmount ||
        !totalEmis ||
        !purpose
      ) {
        res.status(400).json({
          message:
            'employeeId, loanType, principalAmount, emiAmount, totalEmis, and purpose are required',
        });
        return;
      }
      const dto: T.LoanApplicationDto = {
        employeeId,
        loanType,
        principalAmount: Number(principalAmount),
        emiAmount: Number(emiAmount),
        totalEmis: Number(totalEmis),
        purpose,
      };
      const data = await hrService.loanAdvance.applyLoan(dto);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/loans/:id/approve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { firstEmiDate } = req.body;
      const data = await hrService.loanAdvance.approveLoan(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/loans/:id/schedule',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.loanAdvance.getLoanEMISchedule(
        req.params.id,
      );
      if (!data) {
        res.status(404).json({ message: 'Loan not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// ADVANCES
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/advances',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId } = req.query as any;
      if (!employeeId) {
        res.status(400).json({ message: 'employeeId query param is required' });
        return;
      }
      const data = await HrRepository.findAdvancesByEmployee(employeeId);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/advances/pending',
  authenticate,
  authorize('owner', 'manager'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findPendingAdvances();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/advances',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        amount,
        recoveryMode,
        installmentAmount,
        installments,
        recoveryStartMonth,
        purpose,
      } = req.body;
      if (!employeeId || amount === undefined || !recoveryMode || !purpose) {
        res.status(400).json({
          message: 'employeeId, amount, recoveryMode, and purpose are required',
        });
        return;
      }
      const dto: T.AdvanceRequestDto = {
        employeeId,
        amount: Number(amount),
        recoveryMode,
        installmentAmount:
          installmentAmount !== undefined
            ? Number(installmentAmount)
            : undefined,
        installments:
          installments !== undefined ? Number(installments) : undefined,
        recoveryStartMonth,
        purpose,
      };
      const data = await hrService.loanAdvance.applyAdvance(dto);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/advances/:id/approve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.loanAdvance.approveAdvance(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// REIMBURSEMENTS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/reimbursements',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId } = req.query as any;
      if (!employeeId) {
        res.status(400).json({ message: 'employeeId query param is required' });
        return;
      }
      const data = await HrRepository.findReimbursementsByEmployee(employeeId);
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reimbursements/pending',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findPendingReimbursements();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/reimbursements',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        category,
        description,
        amount,
        billDate,
        billNumber,
        billImageUrl,
      } = req.body;
      if (
        !employeeId ||
        !category ||
        !description ||
        amount === undefined ||
        !billDate
      ) {
        res.status(400).json({
          message:
            'employeeId, category, description, amount, and billDate are required',
        });
        return;
      }
      const data = await HrRepository.createReimbursement({
        employeeId,
        category,
        description,
        amount: Number(amount),
        billDate,
        billNumber,
        billImageUrl,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/reimbursements/:id/approve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.approveReimbursement(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/reimbursements/:id/pay',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.markReimbursementPaid(req.params.id, '');
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// PERFORMANCE REVIEWS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/performance/:employeeId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.performance.getReviewHistory(
        req.params.employeeId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/performance',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        reviewType,
        reviewDate,
        rating,
        strengths,
        improvements,
        goals,
        reviewerComments,
        nextReviewDate,
      } = req.body;
      if (
        !employeeId ||
        !reviewType ||
        !reviewDate ||
        rating === undefined ||
        !strengths ||
        !improvements
      ) {
        res.status(400).json({
          message:
            'employeeId, reviewType, reviewDate, rating, strengths, and improvements are required',
        });
        return;
      }
      const data = await hrService.performance.createReview({
        employeeId,
        reviewType,
        reviewDate,
        rating: Number(rating),
        reviewerId: req.user?.id || '',
        strengths,
        improvements,
        goals: goals || null,
        reviewerComments: reviewerComments || null,
        employeeComments: '',
        isAcknowledged: false,
        overallScore: Number(rating),
        nextReviewDate: nextReviewDate || null,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/performance/:id/acknowledge',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeComments } = req.body;
      const data = await hrService.performance.acknowledgeReview(
        req.params.id,
        employeeComments,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/performance/team/:managerId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.performance.getTeamReviews(
        req.params.managerId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// TRAINING
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/training/:employeeId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findTrainingRecordsByEmployee(
        req.params.employeeId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/training',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        trainingName,
        provider,
        startDate,
        endDate,
        cost,
        isCertification,
        certificateUrl,
        feedback,
      } = req.body;
      if (!employeeId || !trainingName || !provider || !startDate || !endDate) {
        res.status(400).json({
          message:
            'employeeId, trainingName, provider, startDate, and endDate are required',
        });
        return;
      }
      const data = await HrRepository.createTrainingRecord({
        employeeId,
        trainingName,
        provider,
        startDate,
        endDate,
        cost: cost !== undefined ? Number(cost) : 0,
        isCertification: isCertification === true,
        certificateUrl,
        feedback,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/training/:id/status',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ message: 'status is required' });
        return;
      }
      const data = await HrRepository.updateTrainingStatus(
        req.params.id,
        status as T.TrainingStatus,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// DISCIPLINARY
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/disciplinary/:employeeId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findDisciplinaryRecordsByEmployee(
        req.params.employeeId,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/disciplinary',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { employeeId, action, date, reason, description, duration } =
        req.body;
      if (!employeeId || !action || !date || !reason || !description) {
        res.status(400).json({
          message:
            'employeeId, action, date, reason, and description are required',
        });
        return;
      }
      const data = await HrRepository.createDisciplinaryRecord({
        employeeId,
        action,
        date,
        reason,
        description,
        issuedBy: req.user?.id || '',
        duration: duration !== undefined ? Number(duration) : undefined,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/disciplinary/:id/deactivate',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.updateDisciplinaryStatus(
        req.params.id,
        false,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// EXIT PROCESS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/exit/:employeeId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await HrRepository.findExitProcessByEmployee(
        req.params.employeeId,
      );
      if (!data) {
        res.status(404).json({ message: 'Exit record not found' });
        return;
      }
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/exit',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        employeeId,
        exitType,
        expectedLastDate,
        reason,
        noticePeriodDays,
        noticePeriodWaived,
      } = req.body;
      if (!employeeId || !exitType || !expectedLastDate || !reason) {
        res.status(400).json({
          message:
            'employeeId, exitType, expectedLastDate, and reason are required',
        });
        return;
      }
      const data = await hrService.exit.initiateExit({
        employeeId,
        exitType,
        expectedLastDate,
        reason,
        noticePeriodDays:
          noticePeriodDays !== undefined ? Number(noticePeriodDays) : undefined,
      });
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/exit/:id/approve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.exit.approveExit(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/exit/:id/clearance',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clearanceItems } = req.body;
      const data = await hrService.exit.processClearance(
        req.params.id,
        clearanceItems,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/exit/:id/complete',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { actualLastDate, exitInterviewNotes } = req.body;
      const data = await hrService.exit.completeExit(
        req.params.id,
        actualLastDate,
        exitInterviewNotes,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  '/reports/headcount',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { departmentId } = req.query as any;
      const data = await hrService.reporting.getHeadcountReport();
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/attrition',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res.status(400).json({ message: 'fromDate and toDate are required' });
        return;
      }
      const data = await hrService.reporting.getAttritionReport(
        fromDate,
        toDate,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/labour-cost',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { month, year } = req.query as any;
      if (!month || !year) {
        res.status(400).json({ message: 'month and year are required' });
        return;
      }
      const data = await hrService.reporting.getLabourCostReport(
        Number(month),
        Number(year),
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/attendance',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { departmentId, month, year } = req.query as any;
      if (!month || !year) {
        res.status(400).json({ message: 'month and year are required' });
        return;
      }
      const data = await hrService.reporting.getAttendanceReport(
        departmentId,
        Number(month),
        Number(year),
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/leave-utilization',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { year } = req.query as any;
      const data = await hrService.reporting.getLeaveUtilizationReport(
        year ? Number(year) : new Date().getFullYear(),
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/payroll-projection',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { months } = req.query as any;
      const data = await hrService.reporting.getPayrollCostProjection(
        months ? Number(months) : 3,
      );
      res.json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════════════
// INTEGRATION (Accounting & Analytics Hooks)
// ═════════════════════════════════════════════════════════════════════════════

router.post(
  '/integration/payroll-journal/:runId',
  authenticate,
  authorize('owner', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.integration.generatePayrollJournal(
        req.params.runId,
      );
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/integration/publish-payroll-kpis/:runId',
  authenticate,
  authorize('owner', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await hrService.integration.publishPayrollKpis(
        req.params.runId,
      );
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/integration/publish-attendance-kpis',
  authenticate,
  authorize('owner', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date } = req.body;
      if (!date) {
        res.status(400).json({ message: 'date is required in body' });
        return;
      }
      const data = await hrService.integration.publishAttendanceKpis(date);
      res.status(201).json(data);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Self-Service (Employee Role) ─────────────────────────────────────────────

function requireEmployee(
  req: AuthenticatedRequest,
  res: Response,
): string | null {
  if (!req.user?.employeeId) {
    res
      .status(400)
      .json({ message: 'Employee ID not linked to this user account' });
    return null;
  }
  return req.user.employeeId;
}

router.get(
  '/self/profile',
  authenticate,
  authorize('employee', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    const empId = requireEmployee(req, res);
    if (!empId) return;
    try {
      const employee = await hrService.employee.getEmployee(empId);
      if (!employee) {
        res.status(404).json({ message: 'Employee not found' });
        return;
      }
      res.json(employee);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/self/profile',
  authenticate,
  authorize('employee'),
  async (req: AuthenticatedRequest, res: Response) => {
    const empId = requireEmployee(req, res);
    if (!empId) return;
    try {
      const allowed = [
        'phone',
        'email',
        'address',
        'bankAccountNo',
        'bankName',
        'bankIfsc',
        'emergencyContact',
        'emergencyPhone',
      ];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ message: 'No updatable fields provided' });
        return;
      }
      const employee = await hrService.employee.updateEmployee(empId, updates);
      res.json(employee);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/self/attendance',
  authenticate,
  authorize('employee', 'owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    const empId = requireEmployee(req, res);
    if (!empId) return;
    try {
      const fromDate =
        (req.query.fromDate as string) ||
        new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const toDate =
        (req.query.toDate as string) || new Date().toISOString().slice(0, 10);
      const attendance = await hrService.attendance.getAttendance(
        empId,
        fromDate,
        toDate,
      );
      res.json(attendance);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/self/attendance/summary',
  authenticate,
  authorize('employee', 'owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    const empId = requireEmployee(req, res);
    if (!empId) return;
    try {
      const fromDate =
        (req.query.fromDate as string) ||
        new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const toDate =
        (req.query.toDate as string) || new Date().toISOString().slice(0, 10);
      const summary = await hrService.attendance.getAttendanceSummary(
        empId,
        fromDate,
        toDate,
      );
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/self/leave-balance',
  authenticate,
  authorize('employee', 'owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    const empId = requireEmployee(req, res);
    if (!empId) return;
    try {
      const year = new Date().getFullYear();
      const balance = await hrService.leave.getLeaveBalance(empId, year);
      res.json(balance);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/self/apply-leave',
  authenticate,
  authorize('employee', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    const empId = requireEmployee(req, res);
    if (!empId) return;
    try {
      const dto: T.LeaveApplicationDto = {
        employeeId: empId,
        leaveTypeId: req.body.leaveTypeId,
        fromDate: req.body.fromDate,
        toDate: req.body.toDate,
        reason: req.body.reason,
      };
      if (!dto.leaveTypeId || !dto.fromDate || !dto.toDate) {
        res
          .status(400)
          .json({ message: 'leaveTypeId, fromDate, toDate are required' });
        return;
      }
      const leave = await hrService.leave.applyLeave(dto);
      res.status(201).json(leave);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/self/payslips',
  authenticate,
  authorize('employee', 'owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    const empId = requireEmployee(req, res);
    if (!empId) return;
    try {
      const runId = req.query.runId as string;
      if (!runId) {
        res.status(400).json({ message: 'runId query parameter is required' });
        return;
      }
      const payslip = await hrService.payroll.getEmployeePaySlip(empId, runId);
      res.json(payslip);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/self/request-advance',
  authenticate,
  authorize('employee', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    const empId = requireEmployee(req, res);
    if (!empId) return;
    try {
      const amount = Number(req.body.amount);
      if (!amount || amount <= 0) {
        res.status(400).json({ message: 'Valid amount is required' });
        return;
      }
      const dto: T.AdvanceRequestDto = {
        employeeId: empId,
        amount,
        recoveryMode: req.body.recoveryMode || 'one_time',
        purpose: req.body.reason || req.body.purpose || 'Salary advance',
        installmentAmount: req.body.installmentAmount || undefined,
        installments: req.body.installments || undefined,
        recoveryStartMonth: req.body.recoveryStartMonth || undefined,
      };
      const advance = await hrService.loanAdvance.applyAdvance(dto);
      res.status(201).json(advance);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
