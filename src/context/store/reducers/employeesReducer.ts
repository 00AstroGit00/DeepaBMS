import { Employee, LeaveRequest, Action } from '../types';

export const employeesReducer = (
  state: { employees: Employee[]; leaves: LeaveRequest[] } = {
    employees: [],
    leaves: [],
  },
  action: Action,
): { employees: Employee[]; leaves: LeaveRequest[] } => {
  switch (action.type) {
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [action.emp, ...state.employees] };
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.emp.id ? action.emp : e,
        ),
      };
    case 'MARK_ATTENDANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? {
                ...e,
                attendance: { ...e.attendance, [action.day]: action.status },
              }
            : e,
        ),
      };
    case 'BULK_ATTENDANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          action.empIds.includes(e.id)
            ? {
                ...e,
                attendance: { ...e.attendance, [action.day]: action.status },
              }
            : e,
        ),
      };
    case 'ADD_ADVANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? {
                ...e,
                advances: [
                  {
                    id: (action as any).uid || '',
                    date: action.txn.date,
                    amount: action.amount,
                  },
                  ...e.advances,
                ],
              }
            : e,
        ),
      };
    case 'REQUEST_LEAVE':
      return { ...state, leaves: [action.leave, ...state.leaves] };
    case 'DECIDE_LEAVE': {
      const leave = state.leaves.find((l) => l.id === action.leaveId);
      if (!leave) return state;

      let updatedEmployees = state.employees;
      if (action.status === 'approved') {
        updatedEmployees = state.employees.map((emp) => {
          if (emp.id !== leave.empId) return emp;

          const updatedAttendance = { ...emp.attendance };
          const fromDate = new Date(leave.from + 'T12:00:00');
          const toDate = new Date(leave.to + 'T12:00:00');
          let safety = 0;

          while (fromDate <= toDate && safety < 62) {
            const dateStr = fromDate.toISOString().slice(0, 10);
            updatedAttendance[dateStr] = 'L';
            fromDate.setDate(fromDate.getDate() + 1);
            safety++;
          }

          const updatedBalance = { ...emp.leaveBalance };
          if (leave.type === 'casual') {
            updatedBalance.casual = Math.max(
              0,
              updatedBalance.casual - leave.days,
            );
          } else if (leave.type === 'sick') {
            updatedBalance.sick = Math.max(0, updatedBalance.sick - leave.days);
          }

          return {
            ...emp,
            attendance: updatedAttendance,
            leaveBalance: updatedBalance,
          };
        });
      }

      return {
        ...state,
        employees: updatedEmployees,
        leaves: state.leaves.map((l) =>
          l.id === action.leaveId ? { ...l, status: action.status } : l,
        ),
      };
    }
    case 'ADD_REVIEW':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? { ...e, reviews: [action.review, ...e.reviews] }
            : e,
        ),
      };
    case 'ADD_EMP_DOC':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? { ...e, documents: [action.doc, ...e.documents] }
            : e,
        ),
      };
    case 'REMOVE_EMP_DOC':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? {
                ...e,
                documents: e.documents.filter((d) => d.id !== action.docId),
              }
            : e,
        ),
      };
    case 'HYDRATE':
      return {
        employees: (
          action.state.employees ||
          (action as any).seed?.employees ||
          state.employees
        ).map((emp: any) => ({
          status: 'active',
          joinDate: '2022-01-01',
          access: 'staff',
          leaveBalance: { casual: 6, sick: 6 },
          reviews: [],
          documents: [],
          ...emp,
        })),
        leaves: action.state.leaves ?? state.leaves,
      };
    case 'RESET_DEMO':
      const seed = (action as any).seed;
      return { employees: seed.employees, leaves: seed.leaves };
    default:
      return state;
  }
};
