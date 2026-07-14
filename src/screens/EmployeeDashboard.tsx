import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

interface OwnProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  departmentName?: string;
  designationName?: string;
  joinDate: string;
  employmentType: string;
  status: string;
}

interface LeaveBalance {
  leaveTypeName: string;
  total: number;
  used: number;
  remaining: number;
}

interface AttendanceRecord {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}

export default function EmployeeDashboard({
  navigation,
}: {
  navigation: any;
}) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const { state } = useStore();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'attendance' | 'leave' | 'payslips'
  >('profile');
  const employees = state.employees || [];
  const employee = employees.find(
    (e: any) =>
      e.id === currentUser?.id ||
      e.email === `${currentUser?.name?.toLowerCase().replace(/\s+/g, '.')}@example.com`,
  );

  const textColor = theme.text || '#1f2937';
  const bgColor = theme.card || '#fff';
  const primaryColor = theme.primary || '#6366f1';
  const borderColor = theme.border || '#e5e7eb';

  const TabButton = ({
    tab,
    label,
    icon,
  }: {
    tab: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab as any)}
      accessibilityLabel={label}
      accessibilityRole="tab"
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: activeTab === tab ? primaryColor : 'transparent',
      }}
    >
      <Ionicons
        name={icon}
        size={20}
        color={activeTab === tab ? primaryColor : '#9ca3af'}
      />
      <Text
        style={{
          fontSize: 11,
          marginTop: 4,
          color: activeTab === tab ? primaryColor : '#9ca3af',
          fontWeight: activeTab === tab ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SectionCard = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View
      style={{
        backgroundColor: bgColor,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: borderColor,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: textColor,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
      }}
    >
      <Text style={{ color: '#6b7280', fontSize: 14 }}>{label}</Text>
      <Text style={{ color: textColor, fontSize: 14, fontWeight: '500' }}>
        {value}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg || '#f3f4f6' }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: primaryColor + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="person-outline" size={24} color={primaryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: textColor,
            }}
          >
            {currentUser?.name || 'Employee'}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>
            {employee?.role || 'Staff'}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: bgColor,
          borderRadius: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: borderColor,
        }}
      >
        <TabButton tab="profile" label="Profile" icon="person-outline" />
        <TabButton tab="attendance" label="Attendance" icon="calendar-outline" />
        <TabButton tab="leave" label="Leave" icon="umbrella-outline" />
        <TabButton tab="payslips" label="Payslips" icon="card-outline" />
      </View>

      {activeTab === 'profile' && (
        <SectionCard title="My Profile">
          {employee ? (
            <>
              <InfoRow label="Name" value={employee.name || '-'} />
              <InfoRow label="Phone" value={employee.phone || '-'} />
              <InfoRow label="Role" value={employee.role || '-'} />
              <InfoRow label="Status" value={employee.status || 'active'} />
              <InfoRow label="Salary" value={`₹${employee.salary?.toLocaleString() || '0'}`} />
              <InfoRow label="Joined" value={employee.joinDate || '-'} />
            </>
          ) : (
            <Text style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>
              No employee profile found. Sync your account with the server.
            </Text>
          )}
        </SectionCard>
      )}

      {activeTab === 'attendance' && (
        <SectionCard title="Recent Attendance">
          <Text style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>
            Attendance records will appear here after syncing with the server.
            {'\n\n'}
            <Text
              style={{ color: primaryColor }}
              onPress={() => Alert.alert('Sync', 'Pull latest data from server')}
            >
              Tap to sync
            </Text>
          </Text>
        </SectionCard>
      )}

      {activeTab === 'leave' && (
        <>
          <SectionCard title="Leave Balance">
            <Text style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>
              Leave balance data will appear here after syncing.
            </Text>
          </SectionCard>
          <TouchableOpacity
            onPress={() => Alert.alert('Apply Leave', 'Leave application coming soon')}
            accessibilityLabel="Apply for leave"
            accessibilityRole="button"
            style={{
              backgroundColor: primaryColor,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text
              style={{ color: '#fff', fontWeight: '600', marginTop: 4, fontSize: 14 }}
            >
              Apply for Leave
            </Text>
          </TouchableOpacity>
        </>
      )}

      {activeTab === 'payslips' && (
        <SectionCard title="My Payslips">
          <Text style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>
            Payslips will appear here after payroll processing and syncing.
          </Text>
        </SectionCard>
      )}
    </ScrollView>
  );
}
