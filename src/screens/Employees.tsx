import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  Employee,
  LeaveRequest,
  EmployeeReview,
  EmployeeDocument
} from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  Row,
  StatPill,
  Segmented,
  Chip,
  Badge,
  Sheet,
  Field,
  Select,
  PrimaryButton,
  EmptyState
} from '../components/Primitives';
import { inr, uid, parseNum, todayKey, dateKey, fmtDate, fmtDateTime } from '../utils/helpers';
import { captureBillPhoto, pickBillImage, pickBillDocument } from '../utils/mediaPicker';

const STAFF_ROLES = [
  { value: 'Head Cook', label: 'Head Cook' },
  { value: 'Cook', label: 'Cook' },
  { value: 'Kitchen Helper', label: 'Kitchen Helper' },
  { value: 'Waiter', label: 'Waiter' },
  { value: 'Bar Man', label: 'Bar Man' },
  { value: 'Reception', label: 'Reception' },
  { value: 'Housekeeping', label: 'Housekeeping' },
  { value: 'Cleaner', label: 'Cleaner' },
  { value: 'Security', label: 'Security' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Cashier', label: 'Cashier' },
  { value: 'Driver', label: 'Driver' }
];

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave', icon: 'sunny-outline' as const, sub: 'From casual balance' },
  { value: 'sick', label: 'Sick Leave', icon: 'medkit-outline' as const, sub: 'From sick balance' },
  { value: 'paid', label: 'Paid Leave', icon: 'cash-outline' as const, sub: 'No balance deduction' },
  { value: 'unpaid', label: 'Unpaid Leave', icon: 'remove-circle-outline' as const, sub: 'Salary deducted per day' }
];

const ACCESS_LEVELS = [
  { value: 'staff', label: 'Staff', icon: 'person-outline' as const, sub: 'Attendance & leave requests only' },
  { value: 'manager', label: 'Manager', icon: 'briefcase-outline' as const, sub: 'Approve leave, mark attendance, view payroll' },
  { value: 'owner', label: 'Owner', icon: 'key-outline' as const, sub: 'Full access incl. salary edits & documents' }
];

const DOC_CATEGORIES = [
  { value: 'ID Proof', label: 'ID Proof', icon: 'finger-print-outline' as const },
  { value: 'Contract', label: 'Contract', icon: 'document-text-outline' as const },
  { value: 'Certificate', label: 'Certificate', icon: 'ribbon-outline' as const },
  { value: 'Payslip', label: 'Payslip', icon: 'receipt-outline' as const },
  { value: 'Other', label: 'Other', icon: 'folder-outline' as const }
];

export default function Employees({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();
  const { currentUser } = useAuth();

  const currentTodayKey = todayKey();
  const currentMonthKey = currentTodayKey.slice(0, 7); // e.g. '2026-07'

  // Sub tabs: 'overview', 'attendance', 'leaves', 'staff'
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'leaves' | 'staff'>('overview');

  // Staff list filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Selected Employee & Detail Tabs
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [empDetailTab, setEmpDetailTab] = useState<'profile' | 'payroll' | 'docs' | 'reviews' | 'advances'>('profile');

  // Sheet Visibilities
  const [addEmpVisible, setAddEmpVisible] = useState(false);
  const [requestLeaveVisible, setRequestLeaveVisible] = useState(false);

  // Form states: New Employee
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Waiter');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [empAccess, setEmpAccess] = useState('staff');

  // Form states: Leave Request
  const [leaveEmpId, setLeaveEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [leaveFrom, setLeaveFrom] = useState(currentTodayKey);
  const [leaveDays, setLeaveDays] = useState('1');
  const [leaveNote, setLeaveNote] = useState('');

  // Form states: Staff Rating / Review
  const [reviewNote, setReviewNote] = useState('');
  const [reviewRating, setReviewRating] = useState(4);

  // Form states: Document
  const [docCategory, setDocCategory] = useState('ID Proof');

  // Form states: Advance
  const [advanceAmount, setAdvanceAmount] = useState('');

  // Attendance date offset
  const [attOffsetDays, setAttOffsetDays] = useState(0);
  const attDateKey = useMemo(() => {
    const d = new Date(Date.now() - 86400000 * attOffsetDays);
    return dateKey(d);
  }, [attOffsetDays]);

  // Bulk attendance selection
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);

  // Computed state derivations
  const activeEmployees = useMemo(() => {
    return state.employees.filter((e) => e.status === 'active');
  }, [state.employees]);

  const todayPresentCount = useMemo(() => {
    return activeEmployees.filter((e) => e.attendance[currentTodayKey] === 'P' || e.attendance[currentTodayKey] === 'H').length;
  }, [activeEmployees, currentTodayKey]);

  const todayLeaveCount = useMemo(() => {
    return activeEmployees.filter((e) => e.attendance[currentTodayKey] === 'L').length;
  }, [activeEmployees, currentTodayKey]);

  const pendingLeavesCount = useMemo(() => {
    return state.leaves.filter((l) => l.status === 'pending').length;
  }, [state.leaves]);

  const ratingAvg = useMemo(() => {
    const ratings = state.employees.flatMap((e) => e.reviews.map((r) => r.rating));
    return ratings.length ? (ratings.reduce((sum, val) => sum + val, 0) / ratings.length).toFixed(1) : '—';
  }, [state.employees]);

  // Dynamic Payroll computations
  const payrollList = useMemo(() => {
    // Generate salary computation details for active tab month
    return state.employees.map((emp) => {
      // Basic daily rate is salary / 26
      const baseDaily = emp.salary / 26;
      // Count monthly days: Count occurrences of 'P', 'H', 'A', 'L' in this month
      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let leaveDays = 0;

      Object.entries(emp.attendance).forEach(([day, status]) => {
        if (day.startsWith(currentMonthKey)) {
          if (status === 'P') presentDays++;
          else if (status === 'H') halfDays++;
          else if (status === 'A') absentDays++;
          else if (status === 'L') leaveDays++;
        }
      });

      // Earned = (presentDays * baseDaily) + (halfDays * baseDaily * 0.5) + (leaveDays * baseDaily)
      // Unpaid leaves deduct salary
      const earned = Math.max(0, Math.round((presentDays + halfDays * 0.5 + leaveDays) * baseDaily));

      // Month advances
      const advancesSum = emp.advances
        .filter((adv) => adv.date.startsWith(currentMonthKey))
        .reduce((sum, adv) => sum + adv.amount, 0);

      const netPayable = Math.max(0, earned - advancesSum);

      return {
        empId: emp.id,
        name: emp.name,
        role: emp.role,
        salary: emp.salary,
        earned,
        advances: advancesSum,
        netPayable
      };
    });
  }, [state.employees, state.leaves, currentMonthKey]);

  const payrollTotals = useMemo(() => {
    return payrollList.reduce(
      (acc, item) => {
        acc.earned += item.earned;
        acc.advances += item.advances;
        acc.netPayable += item.netPayable;
        return acc;
      },
      { earned: 0, advances: 0, netPayable: 0 }
    );
  }, [payrollList]);

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    return state.employees.find((e) => e.id === selectedEmpId) || null;
  }, [state.employees, selectedEmpId]);

  // Filters staff roster
  const filteredEmployees = useMemo(() => {
    return state.employees
      .filter((e) => roleFilter === 'all' || e.role === roleFilter)
      .filter((e) => {
        const query = searchQuery.toLowerCase();
        return (
          !searchQuery ||
          e.name.toLowerCase().includes(query) ||
          e.role.toLowerCase().includes(query) ||
          e.phone.includes(query)
        );
      })
      .sort((a, b) => {
        if (a.status === b.status) return a.name.localeCompare(b.name);
        return a.status === 'active' ? -1 : 1;
      });
  }, [state.employees, searchQuery, roleFilter]);

  const roleCategories = useMemo(() => {
    return ['all', ...Array.from(new Set(state.employees.map((e) => e.role)))];
  }, [state.employees]);

  // Form validations & Handlers
  const handleCreateEmployee = () => {
    if (!empName.trim() || empName.trim().length < 3) {
      Alert.alert('Validation Error', 'Enter the full name (min 3 characters)');
      return;
    }
    if (empPhone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Validation Error', 'Enter a valid 10-digit mobile number');
      return;
    }
    const salaryVal = parseNum(empSalary);
    if (salaryVal < 5000 || salaryVal > 200000) {
      Alert.alert('Validation Error', 'Salary should be between ₹5,000 and ₹2,00,000');
      return;
    }

    const employee = {
      id: uid(),
      name: empName.trim(),
      role: empRole,
      phone: empPhone.trim(),
      salary: salaryVal,
      access: empAccess as any,
      status: 'active' as const,
      attendance: {},
      advances: [],
      documents: [],
      reviews: [],
      leaveBalance: { casual: 12, sick: 8 },
      joinDate: new Date().toISOString()
    };

    dispatch({
      type: 'ADD_EMPLOYEE',
      emp: employee
    });

    setAddEmpVisible(false);
    setEmpName('');
    setEmpPhone('');
    setEmpSalary('');
  };

  const handleApplyLeave = () => {
    if (!leaveEmpId) return;

    const days = parseNum(leaveDays) || 1;
    const leave = {
      id: uid(),
      empId: leaveEmpId,
      type: leaveType as any,
      from: leaveFrom,
      to: leaveFrom, // assuming 1 day or calculating date offset
      days,
      reason: leaveNote.trim() || 'Personal work',
      status: 'pending' as const,
      requestedOn: new Date().toISOString()
    };

    dispatch({
      type: 'REQUEST_LEAVE',
      leave
    });

    setRequestLeaveVisible(false);
    setLeaveNote('');
    setLeaveDays('1');
  };

  const handleBulkAttendance = (status: 'P' | 'H' | 'A') => {
    const targets = bulkSelectedIds.length ? bulkSelectedIds : activeEmployees.map((e) => e.id);
    dispatch({
      type: 'BULK_ATTENDANCE',
      empIds: targets,
      day: attDateKey,
      status
    });
    setBulkSelectedIds([]);
  };

  const handleAddReview = () => {
    if (!selectedEmployee) return;

    const review = {
      id: uid(),
      date: new Date().toISOString(),
      rating: reviewRating,
      strengths: reviewNote.trim() || 'Reviewed',
      improvements: '',
      reviewer: currentUser?.name || 'Owner'
    };

    dispatch({
      type: 'ADD_REVIEW',
      empId: selectedEmployee.id,
      review
    });

    setReviewNote('');
  };

  const handleRecordAdvance = () => {
    if (!selectedEmployee) return;

    const amt = parseNum(advanceAmount);
    if (!amt) return;

    if (amt > selectedEmployee.salary) {
      Alert.alert('Too Large', `Advance cannot exceed monthly salary (${inr(selectedEmployee.salary)}).`);
      return;
    }

    const txn = {
      id: uid(),
      date: new Date().toISOString(),
      kind: 'expense' as const,
      category: 'Salaries',
      description: `Salary advance - ${selectedEmployee.name}`,
      amount: amt,
      mode: 'cash' as const
    };

    dispatch({
      type: 'ADD_ADVANCE',
      empId: selectedEmployee.id,
      amount: amt,
      txn
    });

    setAdvanceAmount('');
  };

  const handleUploadDocument = async (method: 'camera' | 'gallery' | 'document') => {
    if (!selectedEmployee) return;

    const file =
      method === 'camera'
        ? await captureBillPhoto()
        : method === 'gallery'
        ? await pickBillImage()
        : await pickBillDocument();

    if (!file) return;

    const doc = {
      id: file.id,
      name: file.name,
      kind: file.kind,
      uri: file.uri,
      category: docCategory,
      addedOn: new Date().toISOString()
    };

    dispatch({
      type: 'ADD_EMP_DOC',
      empId: selectedEmployee.id,
      doc
    });
  };

  const handleToggleStatus = () => {
    if (!selectedEmployee) return;

    const nextStatus = selectedEmployee.status === 'active' ? 'inactive' : 'active';
    dispatch({
      type: 'UPDATE_EMPLOYEE',
      emp: {
        ...selectedEmployee,
        status: nextStatus as any
      }
    });
  };

  const getAttendanceBadgeStyle = (status?: string) => {
    if (status === 'P') return { color: theme.green, bg: theme.greenSoft, label: 'Present' };
    if (status === 'H') return { color: theme.amber, bg: theme.amberSoft, label: 'Half Day' };
    if (status === 'A') return { color: theme.red, bg: theme.redSoft, label: 'Absent' };
    if (status === 'L') return { color: theme.blue, bg: theme.blueSoft, label: 'Leave' };
    return { color: theme.faint, bg: theme.cardAlt, label: 'Not Marked' };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header and Sub tabs selector */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
          Employees & Payroll
        </Text>

        <Segmented
          options={[
            { key: 'overview', label: 'Overview' },
            { key: 'attendance', label: 'Attendance' },
            { key: 'leaves', label: 'Leaves' },
            { key: 'staff', label: 'Staff' }
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />
      </View>

      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Row style={{ flexWrap: 'wrap', gap: 12 }}>
            <View style={{ width: '48.5%' }}>
              <Card style={{ padding: 13 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.sub, fontSize: 13 }}>Active Staff</Text>
                  <Ionicons name="people-outline" size={18} color={theme.teal} />
                </Row>
                <Text style={{ fontSize: 24, fontWeight: '900', color: theme.text, marginTop: 4 }}>
                  {activeEmployees.length}
                </Text>
              </Card>
            </View>

            <View style={{ width: '48.5%' }}>
              <Card style={{ padding: 13 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.sub, fontSize: 13 }}>Today Active</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.green} />
                </Row>
                <Text style={{ fontSize: 24, fontWeight: '900', color: theme.text, marginTop: 4 }}>
                  {todayPresentCount} <Text style={{ fontSize: 13, fontWeight: 'normal', color: theme.faint }}>/ {activeEmployees.length}</Text>
                </Text>
              </Card>
            </View>

            <View style={{ width: '48.5%' }}>
              <Card style={{ padding: 13 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.sub, fontSize: 13 }}>Pending Leaves</Text>
                  <Ionicons name="calendar-outline" size={18} color={pendingLeavesCount > 0 ? theme.red : theme.faint} />
                </Row>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: '900',
                    color: pendingLeavesCount > 0 ? theme.red : theme.text,
                    marginTop: 4
                  }}
                >
                  {pendingLeavesCount}
                </Text>
              </Card>
            </View>

            <View style={{ width: '48.5%' }}>
              <Card style={{ padding: 13 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.sub, fontSize: 13 }}>Avg Staff Rating</Text>
                  <Ionicons name="star-outline" size={18} color={theme.amber} />
                </Row>
                <Text style={{ fontSize: 24, fontWeight: '900', color: theme.text, marginTop: 4 }}>
                  {ratingAvg} <Text style={{ fontSize: 13, color: theme.faint }}>★</Text>
                </Text>
              </Card>
            </View>
          </Row>

          <Card style={{ padding: 14, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 12 }}>
              Salary Ledger ({currentMonthKey})
            </Text>
            <Row>
              <StatPill label="Total Wages" value={inr(payrollTotals.earned)} />
              <StatPill label="Advances Paid" value={inr(payrollTotals.advances)} color={theme.red} />
              <StatPill label="Net Payable" value={inr(payrollTotals.netPayable)} color={theme.green} />
            </Row>
          </Card>
        </ScrollView>
      )}

      {/* 2. Attendance Tab */}
      {activeTab === 'attendance' && (
        <View style={{ flex: 1 }}>
          {/* Date Selector and bulk controls */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 10 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setAttOffsetDays((prev) => prev + 1)}>
                <Ionicons name="arrow-back-outline" size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={{ fontWeight: '800', color: theme.text }}>
                {attDateKey} {attOffsetDays === 0 ? '(Today)' : attOffsetDays === 1 ? '(Yesterday)' : ''}
              </Text>
              <TouchableOpacity onPress={() => setAttOffsetDays((prev) => Math.max(0, prev - 1))} disabled={attOffsetDays === 0}>
                <Ionicons name="arrow-forward-outline" size={20} color={attOffsetDays === 0 ? theme.border : theme.text} />
              </TouchableOpacity>
            </Row>

            <Row style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleBulkAttendance('P')}
                style={{
                  flex: 1,
                  backgroundColor: theme.greenSoft,
                  paddingVertical: 9,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: theme.green, fontWeight: '700', fontSize: 12 }}>Mark Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBulkAttendance('H')}
                style={{
                  flex: 1,
                  backgroundColor: theme.amberSoft,
                  paddingVertical: 9,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: theme.amber, fontWeight: '700', fontSize: 12 }}>Mark Half Day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBulkAttendance('A')}
                style={{
                  flex: 1,
                  backgroundColor: theme.redSoft,
                  paddingVertical: 9,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: theme.red, fontWeight: '700', fontSize: 12 }}>Mark Absent</Text>
              </TouchableOpacity>
            </Row>
            {bulkSelectedIds.length > 0 && (
              <Text style={{ fontSize: 12, color: theme.faint }}>
                {bulkSelectedIds.length} staff selected for bulk action
              </Text>
            )}
          </View>

          <FlatList
            data={activeEmployees}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item }) => {
              const status = item.attendance[attDateKey];
              const styles = getAttendanceBadgeStyle(status);
              const isSelected = bulkSelectedIds.includes(item.id);

              return (
                <Card
                  style={{
                    marginBottom: 8,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      if (isSelected) {
                        setBulkSelectedIds((prev) => prev.filter((id) => id !== item.id));
                      } else {
                        setBulkSelectedIds((prev) => [...prev, item.id]);
                      }
                    }}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isSelected ? theme.teal : theme.faint}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: theme.text }}>{item.name}</Text>
                    <Text style={{ color: theme.faint, fontSize: 11, marginTop: 1 }}>{item.role}</Text>
                  </View>

                  <Row style={{ gap: 4 }}>
                    {['P', 'H', 'A'].map((code) => {
                      const isActive = status === code;
                      const cStyle = getAttendanceBadgeStyle(code);
                      return (
                        <TouchableOpacity
                          key={code}
                          onPress={() => {
                            dispatch({
                              type: 'MARK_ATTENDANCE',
                              empId: item.id,
                              day: attDateKey,
                              status: code as any
                            });
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isActive ? cStyle.bg : theme.cardAlt,
                            borderWidth: 1,
                            borderColor: isActive ? cStyle.color : 'transparent'
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '800', color: isActive ? cStyle.color : theme.sub }}>
                            {code}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </Row>
                </Card>
              );
            }}
          />
        </View>
      )}

      {/* 3. Leaves Tab */}
      {activeTab === 'leaves' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <PrimaryButton title="Request Leave for Staff" onPress={() => setRequestLeaveVisible(true)} icon="calendar" />
          </View>

          <FlatList
            data={state.leaves}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            ListEmptyComponent={<EmptyState icon="calendar-outline" text="No leave records" />}
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item }) => {
              const statusColor = item.status === 'approved' ? theme.green : item.status === 'rejected' ? theme.red : theme.amber;
              const statusBg = item.status === 'approved' ? theme.greenSoft : item.status === 'rejected' ? theme.redSoft : theme.amberSoft;

              return (
                <Card style={{ marginBottom: 8, padding: 13 }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>
                        {state.employees.find((e) => e.id === item.empId)?.name || 'Unknown'}
                      </Text>
                      <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                        {item.type.toUpperCase()} · {item.days} days ({fmtDate(item.from)})
                      </Text>
                      <Text style={{ color: theme.sub, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                        "{item.reason}"
                      </Text>
                    </View>
                    <Badge text={item.status.toUpperCase()} color={statusColor} soft={statusBg} />
                  </Row>

                  {item.status === 'pending' && (
                    <Row style={{ marginTop: 12, gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => dispatch({ type: 'DECIDE_LEAVE', leaveId: item.id, status: 'approved' })}
                        style={{
                          flex: 1,
                          backgroundColor: theme.greenSoft,
                          borderRadius: 8,
                          paddingVertical: 8,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ color: theme.green, fontWeight: '700', fontSize: 12 }}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => dispatch({ type: 'DECIDE_LEAVE', leaveId: item.id, status: 'rejected' })}
                        style={{
                          flex: 1,
                          backgroundColor: theme.redSoft,
                          borderRadius: 8,
                          paddingVertical: 8,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ color: theme.red, fontWeight: '700', fontSize: 12 }}>Reject</Text>
                      </TouchableOpacity>
                    </Row>
                  )}
                </Card>
              );
            }}
          />
        </View>
      )}

      {/* 4. Staff Tab */}
      {activeTab === 'staff' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 4, gap: 8 }}>
            <Field label="" value={searchQuery} onChangeText={setSearchQuery} placeholder="Search staff name or role..." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {roleCategories.map((role) => (
                <Chip
                  key={role}
                  label={role === 'all' ? 'All Roles' : role}
                  active={roleFilter === role}
                  onPress={() => setRoleFilter(role)}
                  color={theme.amber}
                />
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedEmpId(item.id);
                  setEmpDetailTab('profile');
                }}
              >
                <Card
                  style={{
                    marginBottom: 8,
                    padding: 13,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: item.status === 'active' ? 1 : 0.6
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.cardAlt,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Ionicons name="person-outline" size={18} color={theme.text} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{item.name}</Text>
                    <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                      {item.role} · {item.phone}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '800', fontSize: 14, color: theme.text }}>
                      {inr(item.salary)}/mo
                    </Text>
                    <Badge
                      text={item.status.toUpperCase()}
                      color={item.status === 'active' ? theme.green : theme.faint}
                      soft
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />

          {/* Floating Add Employee */}
          <TouchableOpacity
            onPress={() => {
              setEmpName('');
              setEmpPhone('');
              setEmpSalary('');
              setEmpRole('Waiter');
              setEmpAccess('staff');
              setAddEmpVisible(true);
            }}
            style={{
              position: 'absolute',
              right: 20,
              bottom: 24,
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: theme.amber,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 6,
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 }
            }}
          >
            <Ionicons name="person-add-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Sheet Modal: Add Employee */}
      <Sheet visible={addEmpVisible} onClose={() => setAddEmpVisible(false)} title="Add New Employee">
        <Field label="Employee Name" value={empName} onChangeText={setEmpName} placeholder="e.g. Anand Kumar" />

        <Select label="Role" value={empRole} onChange={setEmpRole} options={STAFF_ROLES} color={theme.amber} />

        <Field label="Phone Number" value={empPhone} onChangeText={setEmpPhone} keyboardType="phone-pad" placeholder="98470 XXXXX" />

        <Field label="Monthly Salary (₹)" value={empSalary} onChangeText={setEmpSalary} keyboardType="numeric" placeholder="15000" />

        <Select label="App Access Role" value={empAccess} onChange={setEmpAccess} options={ACCESS_LEVELS} color={theme.amber} />

        <PrimaryButton title="Add Employee" onPress={handleCreateEmployee} icon="person-add-outline" color={theme.amber} />
      </Sheet>

      {/* Sheet Modal: Request Leave */}
      <Sheet visible={requestLeaveVisible} onClose={() => setRequestLeaveVisible(false)} title="Apply Leave Request">
        <Select
          label="Select Employee"
          value={leaveEmpId}
          onChange={setLeaveEmpId}
          options={activeEmployees.map((e) => ({ value: e.id, label: e.name }))}
          color={theme.amber}
        />

        <Select label="Leave Type" value={leaveType} onChange={setLeaveType} options={LEAVE_TYPES} color={theme.amber} />

        <Field label="Date (YYYY-MM-DD)" value={leaveFrom} onChangeText={setLeaveFrom} placeholder="e.g. 2026-07-09" />

        <Field label="Duration (days)" value={leaveDays} onChangeText={setLeaveDays} keyboardType="numeric" placeholder="1" />

        <Field label="Reason / Note" value={leaveNote} onChangeText={setLeaveNote} placeholder="e.g. Family function" />

        <PrimaryButton title="Submit Leave Request" onPress={handleApplyLeave} icon="checkmark" color={theme.amber} />
      </Sheet>

      {/* Sheet Modal: Employee Profile Detail Hub */}
      <Sheet visible={!!selectedEmployee} onClose={() => setSelectedEmpId(null)} title={selectedEmployee?.name || ''}>
        {selectedEmployee && (
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <Segmented
              options={[
                { key: 'profile', label: 'Profile' },
                { key: 'payroll', label: 'Payroll' },
                { key: 'docs', label: 'Docs' },
                { key: 'reviews', label: 'Reviews' },
                { key: 'advances', label: 'Advances' }
              ]}
              value={empDetailTab}
              onChange={(val) => setEmpDetailTab(val as any)}
            />

            {/* TAB: profile */}
            {empDetailTab === 'profile' && (
              <View style={{ marginTop: 14, gap: 12 }}>
                <Card style={{ padding: 13, gap: 8 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.sub }}>Role / Designation</Text>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{selectedEmployee.role}</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.sub }}>Contact Phone</Text>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{selectedEmployee.phone}</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.sub }}>Base Salary</Text>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{inr(selectedEmployee.salary)} / mo</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.sub }}>Joined On</Text>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{fmtDate(selectedEmployee.joinDate)}</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.sub }}>Leave Balances</Text>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>
                      C: {selectedEmployee.leaveBalance.casual} · S: {selectedEmployee.leaveBalance.sick}
                    </Text>
                  </Row>
                </Card>

                <TouchableOpacity
                  onPress={handleToggleStatus}
                  style={{
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: selectedEmployee.status === 'active' ? theme.red : theme.green
                  }}
                >
                  <Text
                    style={{
                      color: selectedEmployee.status === 'active' ? theme.red : theme.green,
                      fontWeight: '700',
                      fontSize: 15
                    }}
                  >
                    {selectedEmployee.status === 'active' ? 'Deactivate Employee' : 'Reactivate Employee'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB: payroll */}
            {empDetailTab === 'payroll' && (
              <View style={{ marginTop: 14, gap: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.sub }}>Monthly computation ({currentMonthKey})</Text>
                {(() => {
                  const pay = payrollList.find((p) => p.empId === selectedEmployee.id);
                  if (!pay) return null;
                  return (
                    <Card style={{ padding: 13, gap: 10 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.sub }}>Basic Salary</Text>
                        <Text style={{ color: theme.text, fontWeight: '700' }}>{inr(pay.salary)}</Text>
                      </Row>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.sub }}>Earned Salary</Text>
                        <Text style={{ color: theme.text, fontWeight: '700' }}>{inr(pay.earned)}</Text>
                      </Row>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.sub }}>Advances Deducted</Text>
                        <Text style={{ color: theme.red, fontWeight: '700' }}>-{inr(pay.advances)}</Text>
                      </Row>
                      <View style={{ height: 1, backgroundColor: theme.border }} />
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.text, fontWeight: '700' }}>Net Payable</Text>
                        <Text style={{ color: theme.green, fontWeight: '900', fontSize: 16 }}>{inr(pay.netPayable)}</Text>
                      </Row>
                    </Card>
                  );
                })()}
              </View>
            )}

            {/* TAB: docs */}
            {empDetailTab === 'docs' && (
              <View style={{ marginTop: 14, gap: 12 }}>
                <Select label="Doc Category" value={docCategory} onChange={setDocCategory} options={DOC_CATEGORIES} color={theme.amber} />

                <Row style={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleUploadDocument('camera')}
                    style={{
                      flex: 1,
                      backgroundColor: theme.cardAlt,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name="camera-outline" size={17} color={theme.text} />
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleUploadDocument('gallery')}
                    style={{
                      flex: 1,
                      backgroundColor: theme.cardAlt,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name="image-outline" size={17} color={theme.text} />
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleUploadDocument('document')}
                    style={{
                      flex: 1,
                      backgroundColor: theme.cardAlt,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ionicons name="document-text-outline" size={17} color={theme.text} />
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>File</Text>
                  </TouchableOpacity>
                </Row>

                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.sub, marginTop: 8 }}>Uploaded Documents</Text>
                {selectedEmployee.documents.length === 0 ? (
                  <Text style={{ color: theme.faint, fontSize: 12 }}>No attachments uploaded yet</Text>
                ) : (
                  selectedEmployee.documents.map((d) => (
                    <Card key={d.id} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="document-attach-outline" size={19} color={theme.amber} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }}>{d.name}</Text>
                        <Text style={{ color: theme.faint, fontSize: 11, marginTop: 1 }}>
                          {d.category} · {fmtDate(d.addedOn)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          dispatch({
                            type: 'REMOVE_EMP_DOC',
                            empId: selectedEmployee.id,
                            docId: d.id
                          });
                        }}
                      >
                        <Ionicons name="trash-outline" size={17} color={theme.red} />
                      </TouchableOpacity>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB: reviews */}
            {empDetailTab === 'reviews' && (
              <View style={{ marginTop: 14, gap: 12 }}>
                <Row style={{ gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                      <Ionicons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={26}
                        color={theme.amber}
                      />
                    </TouchableOpacity>
                  ))}
                </Row>

                <Field label="Review Note" value={reviewNote} onChangeText={setReviewNote} placeholder="e.g. Excellent service at bar" />

                <PrimaryButton title="Add Performance Review" onPress={handleAddReview} icon="checkmark" color={theme.amber} />

                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.sub, marginTop: 10 }}>Review Log</Text>
                {selectedEmployee.reviews.length === 0 ? (
                  <Text style={{ color: theme.faint, fontSize: 12 }}>No reviews recorded</Text>
                ) : (
                  selectedEmployee.reviews.map((r) => (
                    <Card key={r.id} style={{ padding: 12, gap: 6 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Row style={{ gap: 2 }}>
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Ionicons key={i} name="star" size={12} color={theme.amber} />
                          ))}
                        </Row>
                        <Text style={{ color: theme.faint, fontSize: 11 }}>{fmtDate(r.date)}</Text>
                      </Row>
                      <Text style={{ color: theme.text, fontSize: 13 }}>{r.strengths}</Text>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB: advances */}
            {empDetailTab === 'advances' && (
              <View style={{ marginTop: 14, gap: 12 }}>
                <Field label="Advance Amount (₹)" value={advanceAmount} onChangeText={setAdvanceAmount} keyboardType="numeric" placeholder="0" />

                <PrimaryButton title="Record Advance Cash Payment" onPress={handleRecordAdvance} icon="cash-outline" color={theme.amber} />

                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.sub, marginTop: 10 }}>Advance Ledger</Text>
                {selectedEmployee.advances.length === 0 ? (
                  <Text style={{ color: theme.faint, fontSize: 12 }}>No advances recorded yet</Text>
                ) : (
                  selectedEmployee.advances.map((a) => (
                    <Row
                      key={a.id}
                      style={{
                        justifyContent: 'space-between',
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border
                      }}
                    >
                      <View>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Salary Advance</Text>
                        <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>{fmtDate(a.date)}</Text>
                      </View>
                      <Text style={{ color: theme.red, fontWeight: '800' }}>-{inr(a.amount)}</Text>
                    </Row>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
