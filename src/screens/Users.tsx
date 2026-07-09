import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../context/StoreContext';
import { useAuth, ROLE_INFO } from '../context/AuthContext';
import {
  Card,
  Row,
  Badge,
  Sheet,
  Field,
  Select,
  PrimaryButton,
  EmptyState
} from '../components/Primitives';
import { uid } from '../utils/helpers';

export default function Users() {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();
  const { currentUser } = useAuth();

  // Screen Tab: 'users' or 'audit'
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  // Edit user state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // New user state
  const [addUserVisible, setAddUserVisible] = useState(false);

  // Form states
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('cashier');
  const [userPin, setUserPin] = useState('');

  const roleOptions = useMemo(() => {
    return Object.entries(ROLE_INFO).map(([key, info]) => ({
      value: key,
      label: info.label,
      sub: info.desc,
      icon:
        key === 'owner'
          ? ('key-outline' as const)
          : key === 'manager'
          ? ('briefcase-outline' as const)
          : key === 'cashier'
          ? ('cash-outline' as const)
          : key === 'reception'
          ? ('desktop-outline' as const)
          : key === 'fnb'
          ? ('restaurant-outline' as const)
          : key === 'barstaff'
          ? ('wine-outline' as const)
          : ('calculator-outline' as const)
    }));
  }, []);

  const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

  const handleCreateUser = () => {
    if (!userName.trim()) {
      Alert.alert('Name Required', 'Enter the staff member’s name.');
      return;
    }
    if (!isValidPin(userPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits.');
      return;
    }
    if (state.users.some((u) => u.active && u.pin === userPin)) {
      Alert.alert('PIN In Use', 'Another active user already has this PIN. Choose a different one.');
      return;
    }

    const newUser = {
      id: uid(),
      name: userName.trim(),
      role: userRole,
      pin: userPin,
      active: true,
      createdAt: new Date().toISOString()
    };

    dispatch({
      type: 'ADD_USER',
      user: newUser
    });

    dispatch({
      type: 'AUDIT',
      event: {
        id: uid(),
        date: new Date().toISOString(),
        userId: currentUser?.id || '',
        userName: currentUser?.name || '',
        action: `Created user ${newUser.name} (${ROLE_INFO[userRole].label})`
      }
    });

    setAddUserVisible(false);
    setUserName('');
    setUserPin('');
    setUserRole('cashier');
  };

  const handleSaveChanges = () => {
    if (!selectedUser) return;
    if (!userName.trim()) {
      Alert.alert('Name Required', 'Name cannot be empty.');
      return;
    }
    if (!isValidPin(userPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits.');
      return;
    }
    if (state.users.some((u) => u.active && u.id !== selectedUser.id && u.pin === userPin)) {
      Alert.alert('PIN In Use', 'Another active user already has this PIN.');
      return;
    }

    const updatedUser = {
      ...selectedUser,
      name: userName.trim(),
      role: userRole,
      pin: userPin
    };

    dispatch({
      type: 'UPDATE_USER',
      user: updatedUser
    });

    dispatch({
      type: 'AUDIT',
      event: {
        id: uid(),
        date: new Date().toISOString(),
        userId: currentUser?.id || '',
        userName: currentUser?.name || '',
        action: `Updated user ${updatedUser.name}`
      }
    });

    setSelectedUser(null);
  };

  const handleDeleteUser = (user: any) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Not Allowed', 'You cannot delete your own account while signed in.');
      return;
    }
    if (user.role === 'owner' && state.users.filter((u) => u.role === 'owner').length === 1) {
      Alert.alert('Cannot Delete', 'At least one Owner account must exist.');
      return;
    }

    Alert.alert('Delete User', `Delete user ${user.name}? Their past audit entries are retained.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({
            type: 'REMOVE_USER',
            userId: user.id
          });

          dispatch({
            type: 'AUDIT',
            event: {
              id: uid(),
              date: new Date().toISOString(),
              userId: currentUser?.id || '',
              userName: currentUser?.name || '',
              action: `Deleted user ${user.name}`
            }
          });

          setSelectedUser(null);
        }
      }
    ]);
  };

  const handleToggleActive = (user: any) => {
    if (user.role === 'owner' && user.active && state.users.filter((u) => u.role === 'owner' && u.active).length === 1) {
      Alert.alert('Cannot Deactivate', 'At least one active Owner account is required.');
      return;
    }

    const updated = {
      ...user,
      active: !user.active
    };

    dispatch({
      type: 'UPDATE_USER',
      user: updated
    });

    dispatch({
      type: 'AUDIT',
      event: {
        id: uid(),
        date: new Date().toISOString(),
        userId: currentUser?.id || '',
        userName: currentUser?.name || '',
        action: `${user.active ? 'Deactivated' : 'Activated'} user ${user.name}`
      }
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        {/* Header stats card */}
        <Card style={{ padding: 14, marginBottom: 12 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontWeight: '800', color: theme.text, fontSize: 16 }}>
                User Accounts & Roles
              </Text>
              <Text style={{ color: theme.sub, fontSize: 12, marginTop: 3 }}>
                {state.users.filter((u) => u.active).length} active · {state.users.length} total · each role sees only its permitted modules
              </Text>
            </View>
            <Ionicons name="shield-checkmark-outline" size={26} color={theme.green} />
          </Row>
        </Card>

        {/* Tab selector */}
        <Row style={{ gap: 8, marginBottom: 4 }}>
          {(['users', 'audit'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: activeTab === tab ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor: activeTab === tab ? theme.primary : theme.border
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? '#fff' : theme.sub,
                  fontWeight: '700',
                  fontSize: 13
                }}
              >
                {tab === 'users' ? 'Users' : 'Audit Log'}
              </Text>
            </TouchableOpacity>
          ))}
        </Row>
      </View>

      {/* Users Tab panel */}
      {activeTab === 'users' ? (
        <FlatList
          data={state.users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const roleInfo = ROLE_INFO[item.role];
            return (
              <TouchableOpacity
                onPress={() => {
                  setSelectedUser(item);
                  setUserName(item.name);
                  setUserRole(item.role);
                  setUserPin(item.pin);
                }}
              >
                <Card
                  style={{
                    marginBottom: 8,
                    padding: 13,
                    opacity: item.active ? 1 : 0.55
                  }}
                >
                  <Row style={{ gap: 12, alignItems: 'center' }}>
                    {/* User profile initial avatar */}
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: theme.primarySoft,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '800',
                          color: theme.primary,
                          fontSize: 16
                        }}
                      >
                        {item.name.charAt(0)}
                      </Text>
                    </View>

                    {/* Information */}
                    <View style={{ flex: 1 }}>
                      <Row style={{ gap: 8, alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', color: theme.text, fontSize: 14 }}>
                          {item.name}
                        </Text>
                        {item.id === currentUser?.id && <Badge text="YOU" color={theme.green} soft />}
                        {!item.active && <Badge text="DISABLED" color={theme.red} soft />}
                      </Row>
                      <Text style={{ color: theme.sub, fontSize: 12, marginTop: 2 }}>{roleInfo.label}</Text>
                      <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        Modules: {roleInfo.perms.filter((p) => p !== 'settings').join(', ')}
                      </Text>
                    </View>

                    {/* Disable/Enable Toggle */}
                    <TouchableOpacity onPress={() => handleToggleActive(item)} style={{ padding: 6 }}>
                      <Ionicons
                        name={item.active ? 'toggle' : 'toggle-outline'}
                        size={30}
                        color={item.active ? theme.green : theme.faint}
                      />
                    </TouchableOpacity>
                  </Row>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        /* Audit Log Tab panel */
        <FlatList
          data={state.auditLog}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState icon="shield-outline" text="No audit events yet" />}
          renderItem={({ item }) => {
            const isFailed = item.action.startsWith('LOGIN FAILED');
            const isLogin = item.action === 'LOGIN';
            const isLogout = item.action === 'LOGOUT';

            let iconName: any = 'create-outline';
            if (isFailed) iconName = 'warning-outline';
            else if (isLogin) iconName = 'log-in-outline';
            else if (isLogout) iconName = 'log-out-outline';

            return (
              <Card
                style={{
                  marginBottom: 6,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11
                }}
              >
                <Ionicons name={iconName} size={18} color={isFailed ? theme.red : theme.sub} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                    {item.userName} · {item.action}
                  </Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                    {new Date(item.date).toLocaleString('en-IN')}
                  </Text>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Floating Add User account trigger */}
      {activeTab === 'users' && (
        <TouchableOpacity
          onPress={() => {
            setUserName('');
            setUserPin('');
            setUserRole('cashier');
            setAddUserVisible(true);
          }}
          style={{
            position: 'absolute',
            right: 20,
            bottom: 24,
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: theme.primary,
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
      )}

      {/* Sheet Modal: New User Account */}
      <Sheet visible={addUserVisible} onClose={() => setAddUserVisible(false)} title="New User Account">
        <Field label="Staff Name" value={userName} onChangeText={setUserName} placeholder="e.g. Priya K" />

        <Select label="Role" value={userRole} onChange={setUserRole} options={roleOptions} color={theme.primary} />

        <Card style={{ backgroundColor: theme.cardAlt, marginBottom: 14, padding: 12 }}>
          <Text style={{ color: theme.sub, fontSize: 12, lineHeight: 17 }}>
            {ROLE_INFO[userRole].label} can access:{' '}
            {ROLE_INFO[userRole].perms
              .filter((p) => p !== 'settings' && p !== 'users')
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join(' · ')}
          </Text>
        </Card>

        <Field
          label="4-digit PIN"
          value={userPin}
          onChangeText={(val) => setUserPin(val.replace(/\D/g, '').slice(0, 4))}
          keyboardType="numeric"
          placeholder="••••"
        />

        <PrimaryButton title="Create User" onPress={handleCreateUser} icon="person-add-outline" />
      </Sheet>

      {/* Sheet Modal: Edit User Account */}
      <Sheet visible={!!selectedUser} onClose={() => setSelectedUser(null)} title={selectedUser ? `Edit · ${selectedUser.name}` : ''}>
        <Field label="Staff Name" value={userName} onChangeText={setUserName} />

        <Select label="Role" value={userRole} onChange={setUserRole} options={roleOptions} color={theme.primary} />

        <Field
          label="4-digit PIN"
          value={userPin}
          onChangeText={(val) => setUserPin(val.replace(/\D/g, '').slice(0, 4))}
          keyboardType="numeric"
        />

        <PrimaryButton title="Save Changes" onPress={handleSaveChanges} icon="save-outline" />

        <View style={{ height: 10 }} />

        {selectedUser && (
          <TouchableOpacity
            onPress={() => handleDeleteUser(selectedUser)}
            style={{
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: theme.red
            }}
          >
            <Ionicons name="trash-outline" size={17} color={theme.red} />
            <Text style={{ color: theme.red, fontWeight: '700', fontSize: 15 }}>Delete User Account</Text>
          </TouchableOpacity>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
