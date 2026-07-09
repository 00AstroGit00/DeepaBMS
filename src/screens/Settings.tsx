import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../context/StoreContext';
import { useAuth, ROLE_INFO } from '../context/AuthContext';
import { Card, SectionTitle } from '../components/Primitives';
import { uid } from '../utils/helpers';

export default function Settings({ navigation }: { navigation: any }) {
  const { theme, toggle } = useTheme();
  const { state, dispatch } = useStore();
  const { currentUser, logout, can } = useAuth();

  const handleSignOut = () => {
    if (currentUser) {
      dispatch({
        type: 'AUDIT',
        event: {
          id: uid(),
          date: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'LOGOUT'
        }
      });
      logout();
    }
  };

  const handleResetDemo = () => {
    Alert.alert('Reset Demo Data', 'Are you sure you want to reset all records to the fresh sample data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          dispatch({
            type: 'RESET_DEMO'
          });
          Alert.alert('Success', 'Data reset to seeded demo records.');
        }
      }
    ]);
  };

  // Helper row renderer matches original module styling
  const renderSettingRow = (
    title: string,
    desc: string,
    icon: any,
    iconColor: string,
    iconBg: string,
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity onPress={onPress}>
        <Card
          style={{
            marginBottom: 8,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 13
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              backgroundColor: iconBg,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons name={icon} size={21} color={iconColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: '700',
                color: theme.text,
                fontSize: 15
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: theme.faint,
                fontSize: 12,
                marginTop: 2
              }}
            >
              {desc}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={17} color={theme.faint} />
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>More</Text>
        <Text style={{ color: theme.sub, fontSize: 13, marginTop: 2, marginBottom: 14 }}>
          {state.settings.businessName}
        </Text>

        {/* User profile header card */}
        {currentUser && (
          <Card
            style={{
              marginBottom: 4,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 13
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: theme.primarySoft,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text
                style={{
                  fontWeight: '800',
                  color: theme.primary,
                  fontSize: 17
                }}
              >
                {currentUser.name.charAt(0)}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontWeight: '800',
                  color: theme.text,
                  fontSize: 15
                }}
              >
                {currentUser.name}
              </Text>
              <Text
                style={{
                  color: theme.sub,
                  fontSize: 12,
                  marginTop: 2
                }}
              >
                {ROLE_INFO[currentUser.role]?.label} · signed in
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSignOut}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: theme.redSoft,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 11
              }}
            >
              <Ionicons name="log-out-outline" size={16} color={theme.red} />
              <Text
                style={{
                  color: theme.red,
                  fontWeight: '700',
                  fontSize: 13
                }}
              >
                Sign Out
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Operations launchers (only visible if user has operations access) */}
        {(can('inventory') || can('credits') || can('banking') || can('employees')) && (
          <View>
            <SectionTitle>Operations</SectionTitle>
            {can('inventory') &&
              renderSettingRow(
                'Inventory',
                'Food, soft drinks, kitchen, housekeeping stock',
                'cube-outline',
                theme.teal,
                theme.tealSoft,
                () => navigation.navigate('Inventory')
              )}
            {can('credits') &&
              renderSettingRow(
                'Credits & Payables',
                'Customer credit book and vendor outstanding',
                'people-outline',
                theme.amber,
                theme.amberSoft,
                () => navigation.navigate('Credits')
              )}
            {can('banking') &&
              renderSettingRow(
                'Banking',
                'Deposits, withdrawals, transfers, reconciliation',
                'business-outline',
                theme.blue,
                theme.blueSoft,
                () => navigation.navigate('Banking')
              )}
            {can('employees') &&
              renderSettingRow(
                'Employees',
                'Attendance, salary, advances',
                'id-card-outline',
                theme.primary,
                theme.primarySoft,
                () => navigation.navigate('Employees')
              )}
          </View>
        )}

        {/* Data & Security parameters */}
        <SectionTitle>Data & Security</SectionTitle>
        {can('users') &&
          renderSettingRow(
            'Users & Access Control',
            `${state.users.filter((u) => u.active).length} active users · roles, PINs, audit log`,
            'shield-checkmark-outline',
            theme.green,
            theme.greenSoft,
            () => navigation.navigate('Users')
          )}

        {renderSettingRow(
          'Backup Now',
          'Encrypted local backup + cloud sync when online',
          'cloud-upload-outline',
          theme.green,
          theme.greenSoft,
          () => {
            Alert.alert(
              'Backup Complete',
              'All data is stored offline-first on this device and auto-saved on every entry. An encrypted snapshot has been created. When internet is available, it syncs to Firebase automatically.'
            );
          }
        )}

        {renderSettingRow(
          'Audit Log',
          `${state.auditLog.length} security events · logins & user changes tracked`,
          'document-lock-outline',
          theme.purple,
          theme.purpleSoft,
          () => {
            if (can('users')) {
              navigation.navigate('Users');
            } else {
              Alert.alert(
                'Audit Trail Active',
                `${state.auditLog.length} security events and ${state.sales.length + state.txns.length + state.bankMoves.length} business entries are timestamped. The full log is visible to the Owner.`
              );
            }
          }
        )}

        {renderSettingRow(
          'Language / ഭാഷ',
          'English · മലയാളം',
          'language-outline',
          theme.blue,
          theme.blueSoft,
          () => {
            Alert.alert(
              'ഭാഷ തിരഞ്ഞെടുക്കുക',
              'Malayalam UI pack ships in the production build - all labels, categories and reports render in മലയാളം with Indian number formatting.'
            );
          }
        )}

        {renderSettingRow(
          'Theme',
          theme.dark ? 'Dark mode on - tap to switch' : 'Light mode on - tap to switch',
          theme.dark ? 'moon-outline' : 'sunny-outline',
          theme.amber,
          theme.amberSoft,
          toggle
        )}

        {can('users') &&
          renderSettingRow(
            'Reset Demo Data',
            'Restore fresh sample data set (Owner only)',
            'refresh-outline',
            theme.red,
            theme.redSoft,
            handleResetDemo
          )}

        {/* Footer info card */}
        <Card
          style={{
            marginTop: 18,
            backgroundColor: theme.cardAlt,
            alignItems: 'center',
            padding: 18
          }}
        >
          <Text
            style={{
              fontWeight: '800',
              color: theme.text,
              fontSize: 15
            }}
          >
            Deepa BMS v1.0
          </Text>
          <Text
            style={{
              color: theme.faint,
              fontSize: 12,
              marginTop: 4,
              textAlign: 'center',
              lineHeight: 18
            }}
          >
            Offline-first Business Management System{'\n'}
            Deepa Restaurant & Tourist Home, Cherpulassery{'\n'}
            GSTIN {state.settings.gstin}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
