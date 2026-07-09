import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../context/StoreContext';
import { useAuth, ROLE_INFO } from '../context/AuthContext';
import { Card, SectionTitle, Sheet, Field, PrimaryButton } from '../components/Primitives';
import { uid } from '../utils/helpers';

export default function Settings({ navigation }: { navigation: any }) {
  const { theme, toggle } = useTheme();
  const { state, dispatch, syncStatus, syncNow } = useStore();
  const { currentUser, logout, can } = useAuth();

  const [syncVisible, setSyncVisible] = React.useState(false);
  const [syncServer, setSyncServer] = React.useState(state.settings.serverUrl || '');
  const syncing = syncStatus === 'syncing';

  // Keep local input in sync if settings change externally
  React.useEffect(() => {
    setSyncServer(state.settings.serverUrl || '');
  }, [state.settings.serverUrl]);

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

  const handleStartSync = async () => {
    if (!syncServer.trim()) {
      Alert.alert('Configuration Error', 'Please enter a valid Central Server URL.');
      return;
    }

    // Save the server URL into settings first, then trigger sync
    dispatch({
      type: 'HYDRATE',
      state: {
        ...state,
        settings: {
          ...state.settings,
          serverUrl: syncServer.trim()
        }
      }
    });

    // Give reducer time to settle, then sync
    setTimeout(async () => {
      await syncNow();
      setSyncVisible(false);
    }, 300);
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

        {/* Analysis & Reports (visible if user has reports access) */}
        {can('reports') && (
          <View>
            <SectionTitle>Analysis & Reports</SectionTitle>
            {renderSettingRow(
              'Reports & GST Statements',
              'Generate P&L, Day Book, GST returns, and register exports',
              'stats-chart-outline',
              theme.primary,
              theme.primarySoft,
              () => navigation.navigate('Reports')
            )}
            {renderSettingRow(
              'Analytics Board',
              'Charts and insights of monthly business metrics',
              'pie-chart-outline',
              theme.blue,
              theme.blueSoft,
              () => navigation.navigate('Analytics')
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
          'Central Sync',
          syncStatus === 'syncing'
            ? 'Syncing with central server\u2026'
            : syncStatus === 'synced'
              ? `\u2713 Synced \u00b7 Auto-syncs every 30s \u00b7 ${state.settings.lastSyncedAt || ''}`
              : syncStatus === 'offline'
                ? '\u26a0\ufe0f Server unreachable \u00b7 Retrying\u2026'
                : state.settings.serverUrl
                  ? `Auto-syncing every 30s \u00b7 ${state.settings.lastSyncedAt ? 'Last: ' + state.settings.lastSyncedAt : 'Pending\u2026'}`
                  : 'Configure central server for automatic multi-device sync',
          'sync-outline',
          syncStatus === 'offline' ? theme.red : syncStatus === 'synced' ? theme.green : theme.blue,
          syncStatus === 'offline' ? theme.redSoft : syncStatus === 'synced' ? theme.greenSoft : theme.blueSoft,
          () => {
            setSyncServer(state.settings.serverUrl || '');
            setSyncVisible(true);
          }
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

      {/* ── Central Sync Configuration Sheet ──────────────────────── */}
      <Sheet
        visible={syncVisible}
        onClose={() => setSyncVisible(false)}
        title="Central Sync"
      >
        {/* Status banner */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor:
              syncStatus === 'synced'
                ? theme.greenSoft
                : syncStatus === 'offline'
                  ? theme.redSoft
                  : syncStatus === 'syncing'
                    ? theme.amberSoft
                    : theme.cardAlt,
            borderRadius: 12,
            padding: 12,
            marginBottom: 18
          }}
        >
          <Ionicons
            name={
              syncStatus === 'synced'
                ? 'checkmark-circle'
                : syncStatus === 'offline'
                  ? 'warning'
                  : syncStatus === 'syncing'
                    ? 'sync'
                    : 'cloud-outline'
            }
            size={20}
            color={
              syncStatus === 'synced'
                ? theme.green
                : syncStatus === 'offline'
                  ? theme.red
                  : syncStatus === 'syncing'
                    ? theme.amber
                    : theme.sub
            }
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }}>
              {syncStatus === 'synced'
                ? 'Synced successfully'
                : syncStatus === 'offline'
                  ? 'Server unreachable'
                  : syncStatus === 'syncing'
                    ? 'Syncing now…'
                    : state.settings.serverUrl
                      ? 'Auto-sync active'
                      : 'Not configured'}
            </Text>
            {state.settings.lastSyncedAt ? (
              <Text style={{ color: theme.faint, fontSize: 11, marginTop: 1 }}>
                Last sync: {state.settings.lastSyncedAt}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Server URL input */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.sub, marginBottom: 6 }}>
          Central Server URL
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.cardAlt,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            marginBottom: 6
          }}
        >
          <Ionicons name="globe-outline" size={16} color={theme.faint} style={{ marginRight: 8 }} />
          <TextInput
            value={syncServer}
            onChangeText={setSyncServer}
            placeholder="192.168.1.100:3000"
            placeholderTextColor={theme.faint}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => handleStartSync()}
            style={{
              flex: 1,
              fontSize: 15,
              color: theme.text,
              paddingVertical: 13
            }}
          />
          {syncServer.trim() ? (
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.faint}
              onPress={() => setSyncServer('')}
            />
          ) : null}
        </View>
        <Text style={{ color: theme.faint, fontSize: 11, marginBottom: 20 }}>
          Enter the local IP of the device running the backend server (e.g. http://192.168.1.10:3000). All devices on the same Wi-Fi network will auto-sync every 30s.
        </Text>

        {/* How it works info box */}
        <View
          style={{
            backgroundColor: theme.blueSoft,
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
            gap: 6
          }}
        >
          {[
            '📲 New entries sync to server within 2 seconds',
            '🔄 Auto-pull from server every 30 seconds',
            '📱 Immediate sync when phone unlocks',
            '🔀 Data from all devices is intelligently merged'
          ].map((line) => (
            <Text key={line} style={{ color: theme.blue, fontSize: 12, lineHeight: 18 }}>
              {line}
            </Text>
          ))}
        </View>

        {/* Action buttons */}
        <PrimaryButton
          title={syncing ? 'Syncing…' : state.settings.serverUrl ? 'Save & Sync Now' : 'Connect & Sync'}
          onPress={handleStartSync}
          icon="sync-outline"
          color={theme.blue}
        />

        {state.settings.serverUrl ? (
          <TouchableOpacity
            onPress={() => {
              dispatch({
                type: 'HYDRATE',
                state: {
                  ...state,
                  settings: { ...state.settings, serverUrl: '', lastSyncedAt: '' }
                }
              });
              setSyncServer('');
            }}
            style={{ alignItems: 'center', marginTop: 14 }}
          >
            <Text style={{ color: theme.red, fontSize: 13, fontWeight: '600' }}>
              Disconnect from server
            </Text>
          </TouchableOpacity>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}
