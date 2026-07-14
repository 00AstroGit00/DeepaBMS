import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  Animated,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './context/ThemeContext';
import { useStore, cashInHand, SyncStatus } from './context/StoreContext';
import { useAuth, ROLE_INFO } from './context/AuthContext';
import { useLayout } from './utils/useLayout';
import { inr, uid } from './utils/helpers';
import {
  useElectronShortcut,
  useElectronThemeSync,
} from './utils/useElectron';

// Screens
import Dashboard from './screens/Dashboard';
import DayBook from './screens/DayBook';
import Sales from './screens/Sales';
import Hotel from './screens/Hotel';
import Bar from './screens/Bar';
import Inventory from './screens/Inventory';
import Credits from './screens/Credits';
import Banking from './screens/Banking';
import Employees from './screens/Employees';
import Reports from './screens/Reports';
import Users from './screens/Users';
import Settings from './screens/Settings';
import Analytics from './screens/Analytics';
import EmployeeDashboard from './screens/EmployeeDashboard';

const SCREENS_MAP: Record<string, React.ComponentType<{ navigation: any }>> = {
  Dashboard,
  DayBook,
  Sales,
  Hotel,
  Bar,
  Inventory,
  Credits,
  Banking,
  Employees,
  Reports,
  Users,
  Settings,
  Analytics,
  EmployeeDashboard
};

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  owner: 'key-outline',
  manager: 'briefcase-outline',
  cashier: 'cash-outline',
  reception: 'desktop-outline',
  fnb: 'restaurant-outline',
  barstaff: 'wine-outline',
  accountant: 'calculator-outline',
  employee: 'person-outline'
};

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  section?: string;
  perm: string | null;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', section: 'OVERVIEW', perm: 'dashboard' },
  { key: 'DayBook', label: 'Day Book', icon: 'book-outline', section: 'DAILY OPERATIONS', perm: 'daybook' },
  { key: 'Sales', label: 'Sales Register', icon: 'receipt-outline', perm: 'sales' },
  { key: 'Hotel', label: 'Hotel & Rooms', icon: 'bed-outline', perm: 'hotel' },
  { key: 'Bar', label: 'Bar Management', icon: 'wine-outline', perm: 'bar' },
  { key: 'Inventory', label: 'Inventory', icon: 'cube-outline', section: 'BACK OFFICE', perm: 'inventory' },
  { key: 'Credits', label: 'Credits & Payables', icon: 'people-outline', perm: 'credits' },
  { key: 'Banking', label: 'Banking', icon: 'business-outline', perm: 'banking' },
  { key: 'Employees', label: 'Employees', icon: 'id-card-outline', perm: 'employees' },
  { key: 'Reports', label: 'Reports & GST', icon: 'stats-chart-outline', section: 'ANALYSIS', perm: 'reports' },
  { key: 'Analytics', label: 'Analytics Board', icon: 'pie-chart-outline', perm: 'reports' },
  { key: 'Users', label: 'Users & Access', icon: 'shield-checkmark-outline', perm: 'users' },
  { key: 'EmployeeDashboard', label: 'My Dashboard', icon: 'person-outline', section: 'SELF SERVICE', perm: 'selfservice' },
  { key: 'Settings', label: 'Settings & More', icon: 'settings-outline', perm: null }
];

export default function Layout() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { state, dispatch, syncStatus, syncNow } = useStore();
  const { currentUser, logout, can } = useAuth();
  const { width } = useLayout();

  // ── Animated pulsing dot for 'syncing' state ──────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (syncStatus === 'syncing') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true })
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => { if (loop) loop.stop(); };
  }, [syncStatus, pulseAnim]);

  const allowedItems = MENU_ITEMS.filter((item) => item.perm === null || can(item.perm));
  const initialScreen = allowedItems[0]?.key || 'Settings';

  const [activeScreen, setActiveScreen] = useState(initialScreen);

  // Fallback if current screen is no longer allowed
  const currentScreen = allowedItems.some((item) => item.key === activeScreen)
    ? activeScreen
    : initialScreen;

  // ── Electron keyboard shortcuts ──────────────────────────────
  useElectronShortcut('onNewEntry', () => {
    setActiveScreen('DayBook');
  });
  useElectronShortcut('onSearch', () => {
    setActiveScreen('DayBook');
  });
  useElectronShortcut('onToggleDark', toggleTheme);
  useElectronShortcut('onSync', () => syncNow());

  // Sync app theme with system dark mode
  useElectronThemeSync(toggleTheme);

  const isDesktop = width >= 768;

  const syncDotColor = (s: SyncStatus): string => {
    if (s === 'synced') return theme.green;
    if (s === 'syncing') return theme.amber || '#f59e0b';
    if (s === 'offline') return theme.red;
    if (s === 'no-server') return theme.faint;
    return theme.faint;
  };

  const syncLabel = (s: SyncStatus): string => {
    if (s === 'synced') return 'Synced ✓';
    if (s === 'syncing') return 'Syncing…';
    if (s === 'offline') return 'Server offline';
    if (s === 'no-server') return 'Tap to configure';
    return state.settings.lastSyncedAt
      ? `Last: ${state.settings.lastSyncedAt.split(',')[1]?.trim() || 'today'}`
      : 'Tap to sync';
  };

  const SyncBadge = ({ compact }: { compact?: boolean }) => (
    <TouchableOpacity
      onPress={syncNow}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        backgroundColor: theme.cardAlt,
        paddingHorizontal: compact ? 7 : 10,
        paddingVertical: compact ? 4 : 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: syncStatus === 'offline' ? theme.red
          : syncStatus === 'synced' ? theme.green
          : theme.border
      }}
    >
      {/* Animated dot — pulses while syncing */}
      <Animated.View
        style={{
          width: compact ? 6 : 7,
          height: compact ? 6 : 7,
          borderRadius: 4,
          backgroundColor: syncDotColor(syncStatus),
          opacity: syncStatus === 'syncing' ? pulseAnim : 1
        }}
      />
      {!compact && (
        <Text style={{
          color: syncStatus === 'offline' ? theme.red
            : syncStatus === 'synced' ? theme.green
            : theme.faint,
          fontSize: 11,
          fontWeight: '700'
        }}>
          {syncLabel(syncStatus)}
        </Text>
      )}
      <Ionicons
        name={syncStatus === 'syncing' ? 'sync' : 'sync-outline'}
        size={compact ? 11 : 13}
        color={syncStatus === 'offline' ? theme.red : theme.faint}
      />
    </TouchableOpacity>
  );

  // ── Sidebar keyboard navigation (arrow keys) ────────────────
  const allowedKeys = allowedItems.map((i) => i.key);
  const currentIdx = allowedKeys.indexOf(currentScreen);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isDesktop || currentIdx === -1) return;
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;
      if (isInput && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;

      let next = currentIdx;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        next = (currentIdx + 1) % allowedKeys.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        next = (currentIdx - 1 + allowedKeys.length) % allowedKeys.length;
      } else {
        return;
      }
      setActiveScreen(allowedKeys[next]);
    };

    if (isDesktop) {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [isDesktop, currentIdx, allowedKeys]);

  const ActiveComponent = SCREENS_MAP[currentScreen] || Settings;

  // Custom navigation router object
  const navigation = {
    navigate: (tabName: string, params?: { screen?: string }) => {
      const routeMap: Record<string, string> = {
        HomeTab: 'Dashboard',
        DayBookTab: 'DayBook',
        SalesTab: 'Sales',
        HotelTab: 'Hotel',
        BarTab: 'Bar',
        ReportsTab: 'Reports',
        MoreTab: 'Settings',
        Inventory: 'Inventory',
        Credits: 'Credits',
        Banking: 'Banking',
        Employees: 'Employees',
        Users: 'Users'
      };

      let target = routeMap[tabName] || tabName;
      if (tabName === 'MoreTab' && params?.screen && (routeMap[params.screen] || params.screen)) {
        target = routeMap[params.screen] || params.screen;
      }

      const targetScreen = target || 'Dashboard';
      if (allowedItems.some((item) => item.key === targetScreen)) {
        setActiveScreen(targetScreen);
      }
    }
  };

  const cashAmount = cashInHand(state);

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

  if (isDesktop) {
    // Sidebar Layout for Desktop / Tablet
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.bg }}>
        <View
          style={{
            width: 248,
            backgroundColor: theme.card,
            borderRightWidth: 1,
            borderRightColor: theme.border
          }}
        >
          {/* Header */}
          <View
            style={{
              padding: 18,
              paddingBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11
            }}
          >
            <Image
              source={require('../assets/logo.png')}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                resizeMode: 'contain',
                opacity: 0.85
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '900', color: theme.text, fontSize: 16 }}>Deepa BMS</Text>
              <Text style={{ color: theme.faint, fontSize: 11 }}>Cherpulassery</Text>
            </View>
            <SyncBadge compact />
          </View>

          {/* User Section */}
          {currentUser && (
            <View
              style={{
                marginHorizontal: 10,
                marginBottom: 6,
                backgroundColor: theme.cardAlt,
                borderRadius: 12,
                padding: 11,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: theme.border
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ fontWeight: '800', color: theme.primary, fontSize: 14 }}>
                  {currentUser.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: theme.text, fontSize: 12.5 }} numberOfLines={1}>
                  {currentUser.name}
                </Text>
                <Text style={{ color: theme.faint, fontSize: 10.5 }}>
                  {ROLE_INFO[currentUser.role]?.label || currentUser.role}
                </Text>
              </View>
              <TouchableOpacity onPress={handleSignOut} style={{ padding: 5 }}>
                <Ionicons name="log-out-outline" size={18} color={theme.red} />
              </TouchableOpacity>
            </View>
          )}

          {/* Menu Items */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 12 }}
          >
            {allowedItems.map((item) => (
              <View key={item.key}>
                {item.section && (
                  <Text
                    style={{
                      color: theme.faint,
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 1,
                      marginTop: 14,
                      marginBottom: 6,
                      marginLeft: 12
                    }}
                  >
                    {item.section}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => setActiveScreen(item.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    marginBottom: 2,
                    backgroundColor: currentScreen === item.key ? theme.primarySoft : 'transparent'
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={currentScreen === item.key ? theme.primary : theme.sub}
                  />
                  <Text
                    style={{
                      color: currentScreen === item.key ? theme.primary : theme.sub,
                      fontWeight: currentScreen === item.key ? '800' : '600',
                      fontSize: 13.5
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Bottom Sidebar Widget */}
          <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: theme.border, gap: 10 }}>
            {(can('dashboard') || can('banking')) && (
              <View style={{ backgroundColor: theme.greenSoft, borderRadius: 12, padding: 11 }}>
                <Text style={{ color: theme.sub, fontSize: 11, fontWeight: '600' }}>CASH IN HAND</Text>
                <Text style={{ color: theme.green, fontSize: 18, fontWeight: '900', marginTop: 2 }}>
                  {inr(cashAmount)}
                </Text>
              </View>
            )}

            {/* Sync status widget */}
            {state.settings.serverUrl ? (
              <SyncBadge />
            ) : null}

            <TouchableOpacity
              onPress={toggleTheme}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: theme.cardAlt,
                borderWidth: 1,
                borderColor: theme.border
              }}
            >
              <Ionicons name={theme.dark ? 'sunny-outline' : 'moon-outline'} size={16} color={theme.sub} />
              <Text style={{ color: theme.sub, fontWeight: '600', fontSize: 13 }}>
                {theme.dark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Panel */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 1100 }}>
            <ActiveComponent navigation={navigation} />
          </View>
        </View>
      </View>
    );
  }

  // Mobile Bottom Tab Bar Layout
  const mobileTabs = allowedItems.filter((item) =>
    ['Dashboard', 'DayBook', 'Hotel', 'Bar', 'Settings'].includes(item.key)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>
          {MENU_ITEMS.find((m) => m.key === currentScreen)?.label || 'Deepa BMS'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {state.settings.serverUrl ? <SyncBadge compact /> : null}
          {currentUser && (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web') {
                  if (window.confirm('Sign out of your session?')) handleSignOut();
                } else {
                  Alert.alert('Sign Out', 'Sign out of your session?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: handleSignOut }
                  ]);
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: theme.primarySoft,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8
              }}
            >
              <Ionicons name={ROLE_ICONS[currentUser.role]} size={14} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 12 }}>
                {currentUser.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Screen Content */}
      <View style={{ flex: 1 }}>
        <ActiveComponent navigation={navigation} />
      </View>

      {/* Bottom Tabs */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: Platform.OS === 'ios' ? 10 : 0
        }}
      >
        {mobileTabs.map((item) => {
          const isActive = currentScreen === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setActiveScreen(item.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3
              }}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? theme.primary : theme.sub}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: isActive ? theme.primary : theme.sub,
                  fontWeight: isActive ? '800' : '500'
                }}
              >
                {item.key === 'Settings' ? 'More' : item.label.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
