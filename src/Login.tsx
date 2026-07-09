import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './context/ThemeContext';
import { useStore } from './context/StoreContext';
import { useAuth, User, ROLE_INFO } from './context/AuthContext';
import { useLayout } from './utils/useLayout';
import { uid } from './utils/helpers';

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  owner: 'key',
  manager: 'briefcase',
  cashier: 'cash',
  reception: 'desktop',
  fnb: 'restaurant',
  barstaff: 'wine',
  accountant: 'calculator'
};

export default function Login() {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();
  const { login } = useAuth();
  const { width } = useLayout();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);

  const activeUsers = state.users.filter((u) => u.active);
  const isTabletOrDesktop = width >= 700;

  const handleKeyPress = (val: string) => {
    if (!selectedUser) return;

    if (val === 'del') {
      setPin((prev) => prev.slice(0, -1));
      setIsError(false);
      return;
    }

    const newPin = (pin + val).slice(0, 4);
    setPin(newPin);
    setIsError(false);

    if (newPin.length === 4) {
      if (newPin === selectedUser.pin) {
        dispatch({
          type: 'AUDIT',
          event: {
            id: uid(),
            date: new Date().toISOString(),
            userId: selectedUser.id,
            userName: selectedUser.name,
            action: 'LOGIN'
          }
        });
        login(selectedUser);
      } else {
        setIsError(true);
        dispatch({
          type: 'AUDIT',
          event: {
            id: uid(),
            date: new Date().toISOString(),
            userId: selectedUser.id,
            userName: selectedUser.name,
            action: 'LOGIN FAILED (wrong PIN)'
          }
        });
        // Clear pin after short delay
        setTimeout(() => setPin(''), 350);
      }
    }
  };

  if (selectedUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <TouchableOpacity
          onPress={() => setSelectedUser(null)}
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 40,
            left: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Ionicons name="arrow-back" size={19} color={theme.sub} />
          <Text style={{ color: theme.sub, fontWeight: '600', fontSize: 15 }}>All users</Text>
        </TouchableOpacity>

        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            backgroundColor: theme.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12
          }}
        >
          <Ionicons name={ROLE_ICONS[selectedUser.role] || 'person'} size={27} color={theme.primary} />
        </View>

        <Text style={{ fontSize: 19, fontWeight: '800', color: theme.text }}>{selectedUser.name}</Text>
        <Text style={{ fontSize: 13, color: theme.sub, marginTop: 3 }}>
          {ROLE_INFO[selectedUser.role]?.label || selectedUser.role}
        </Text>

        <Text style={{ fontSize: 14, color: isError ? theme.red : theme.sub, marginTop: 24, fontWeight: '600' }}>
          {isError ? 'Wrong PIN — try again' : 'Enter your 4-digit PIN'}
        </Text>

        {/* PIN Indicators */}
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 16, marginBottom: 26 }}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={{
                width: 15,
                height: 15,
                borderRadius: 8,
                backgroundColor: idx < pin.length ? (isError ? theme.red : theme.primary) : theme.border
              }}
            />
          ))}
        </View>

        {/* Keypad */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 272, justifyContent: 'center' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, idx) => {
            if (key === '') {
              return <View key={idx} style={{ width: 74, height: 74, margin: 8 }} />;
            }
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleKeyPress(key)}
                style={{
                  width: 74,
                  height: 74,
                  margin: 8,
                  borderRadius: 37,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {key === 'del' ? (
                  <Ionicons name="backspace-outline" size={23} color={theme.sub} />
                ) : (
                  <Text style={{ fontSize: 25, fontWeight: '700', color: theme.text }}>{key}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 20,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
            marginBottom: 14
          }}
        >
          <Ionicons name="restaurant" size={32} color="#fff" />
        </View>

        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>Deepa BMS</Text>
        <Text style={{ fontSize: 13, color: theme.sub, marginTop: 4, marginBottom: 26 }}>
          Restaurant & Tourist Home · Cherpulassery
        </Text>

        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.sub, marginBottom: 14, letterSpacing: 0.5 }}>
          WHO IS SIGNING IN?
        </Text>

        {/* User profile list */}
        <View
          style={{
            width: '100%',
            maxWidth: 720,
            flexDirection: isTabletOrDesktop ? 'row' : 'column',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center'
          }}
        >
          {activeUsers.map((user) => {
            const roleDetail = ROLE_INFO[user.role];
            return (
              <TouchableOpacity
                key={user.id}
                onPress={() => {
                  setSelectedUser(user);
                  setPin('');
                  setIsError(false);
                }}
                style={{
                  width: isTabletOrDesktop ? 340 : '100%',
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 16,
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
                    borderRadius: 14,
                    backgroundColor: theme.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ionicons name={ROLE_ICONS[user.role] || 'person'} size={21} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: theme.text, fontSize: 15 }}>{user.name}</Text>
                  <Text style={{ color: theme.sub, fontSize: 12, marginTop: 2 }}>{roleDetail?.label || user.role}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                    {roleDetail?.desc}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={theme.faint} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 26,
            backgroundColor: theme.cardAlt,
            borderRadius: 12,
            padding: 14,
            maxWidth: 720,
            width: '100%'
          }}
        >
          <Text style={{ color: theme.faint, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            Demo PINs — Owner 1234 · Manager 2345 · Cashier 3456 · Reception 4567 · F&B 5678 · Bar 6789
            {'\n'}
            Each role sees only the modules it is permitted to use.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
