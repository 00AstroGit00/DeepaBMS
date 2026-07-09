import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  financeForDay,
  financeForMonth,
  cashInHand,
  bankBalance,
  customerOutstanding,
  vendorPayables,
  lowStockItems,
  occupancy,
  liquorStockValue,
  inventoryValue
} from '../context/StoreContext';
import { Card, Row, SectionTitle } from '../components/Primitives';
import { BarChart, HBarChart, DonutLegend } from '../components/Charts';
import { inr, todayKey, lastNDays, dayLabel, keyOf } from '../utils/helpers';

interface DashboardProps {
  navigation: any;
}

export default function Dashboard({ navigation }: DashboardProps) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { state } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  // Compute daily / monthly finances
  const todayFinance = useMemo(() => financeForDay(state, todayKey()), [state]);
  const monthFinance = useMemo(() => financeForMonth(state), [state]);
  const cashAmount = useMemo(() => cashInHand(state), [state]);
  const bankAmount = useMemo(() => bankBalance(state), [state]);
  const debtorsAmount = useMemo(() => customerOutstanding(state), [state]);
  const creditorsAmount = useMemo(() => vendorPayables(state), [state]);
  const lowStock = useMemo(() => lowStockItems(state), [state]);
  const occupancyStats = useMemo(() => occupancy(state), [state]);

  // Last 7 days chart data
  const last7DaysData = useMemo(() => {
    return lastNDays(7).map((day) => {
      const f = financeForDay(state, day);
      return {
        label: dayLabel(day),
        value: f.revenue
      };
    });
  }, [state]);

  // Top monthly expenses chart data
  const topExpensesData = useMemo(() => {
    const monthPrefix = todayKey().slice(0, 7);
    const expMap = new Map<string, number>();

    state.txns.forEach((t) => {
      if (t.kind === 'expense' && keyOf(t.date).startsWith(monthPrefix)) {
        expMap.set(t.category, (expMap.get(t.category) || 0) + t.amount);
      }
    });

    const colorsList = [theme.red, theme.amber, theme.blue, theme.purple, theme.teal];

    return Array.from(expMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt], idx) => ({
        label: cat,
        value: amt,
        color: colorsList[idx % colorsList.length]
      }));
  }, [state, theme]);

  // Department split donut legend
  const departmentSplit = [
    { label: 'Restaurant', value: monthFinance.restaurant, color: theme.primary },
    { label: 'Bar', value: monthFinance.bar, color: theme.amber },
    { label: 'Rooms', value: monthFinance.rooms, color: theme.blue },
    { label: 'Takeaway', value: monthFinance.takeaway + monthFinance.online, color: theme.teal }
  ];

  const currentDateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // Helper metric card renderer
  const renderMetricCard = (
    label: string,
    value: string,
    icon: keyof typeof Ionicons.glyphMap,
    iconColor: string,
    iconBg: string,
    onPress?: () => void
  ) => {
    return (
      <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        style={{ width: '48.5%' }}
      >
        <Card style={{ padding: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: iconBg,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            {onPress && <Ionicons name="chevron-forward" size={15} color={theme.faint} />}
          </Row>
          <Text style={{ fontSize: 12, color: theme.sub, marginTop: 10 }}>{label}</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text, marginTop: 2 }}>{value}</Text>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Top Header */}
        <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>Deepa BMS</Text>
            <Text style={{ fontSize: 13, color: theme.sub, marginTop: 2 }}>
              {currentDateLabel} · Cherpulassery
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons name={theme.dark ? 'sunny-outline' : 'moon-outline'} size={19} color={theme.sub} />
          </TouchableOpacity>
        </Row>

        {/* Today's Revenue Card */}
        <Card style={{ backgroundColor: theme.primary, borderColor: theme.primary }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>
            TODAY'S REVENUE
          </Text>
          <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 }}>
            {inr(todayFinance.revenue)}
          </Text>

          {/* Department mini metrics */}
          <Row style={{ marginTop: 14, gap: 0 }}>
            {[
              ['Restaurant', todayFinance.restaurant],
              ['Bar', todayFinance.bar],
              ['Rooms', todayFinance.rooms],
              ['Other', todayFinance.takeaway + todayFinance.online]
            ].map(([deptLabel, deptVal], idx) => (
              <View key={idx} style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{deptLabel as string}</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 }}>
                  {inr(deptVal as number)}
                </Text>
              </View>
            ))}
          </Row>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 12 }} />

          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              Expenses {inr(todayFinance.expenses)}
            </Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>
              Day P/L {todayFinance.profit >= 0 ? '+' : ''}
              {inr(todayFinance.profit)}
            </Text>
          </Row>
        </Card>

        {/* Section: Money Position */}
        <SectionTitle>Money Position</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {renderMetricCard('Cash in Hand', inr(cashAmount), 'cash-outline', theme.green, theme.greenSoft, () =>
            navigation.navigate('DayBookTab')
          )}
          {renderMetricCard('Bank Balance', inr(bankAmount), 'business-outline', theme.blue, theme.blueSoft, () =>
            navigation.navigate('MoreTab', { screen: 'Banking' })
          )}
          {renderMetricCard('Customer Credits', inr(debtorsAmount), 'people-outline', theme.amber, theme.amberSoft, () =>
            navigation.navigate('MoreTab', { screen: 'Credits' })
          )}
          {renderMetricCard('Vendor Payables', inr(creditorsAmount), 'cart-outline', theme.red, theme.redSoft, () =>
            navigation.navigate('MoreTab', { screen: 'Credits' })
          )}
          {renderMetricCard("Today's Purchases", inr(todayFinance.purchases), 'bag-add-outline', theme.purple, theme.purpleSoft, () =>
            navigation.navigate('DayBookTab')
          )}
          {renderMetricCard('Month Expenses', inr(monthFinance.expenses), 'trending-down-outline', theme.teal, theme.tealSoft, () =>
            navigation.navigate('ReportsTab')
          )}
        </View>

        {/* Low Stock Warning Card */}
        {lowStock.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('MoreTab', { screen: 'Inventory' })}
            style={{ marginTop: 14 }}
          >
            <Card
              style={{
                backgroundColor: theme.amberSoft,
                borderColor: theme.amber,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12
              }}
            >
              <Ionicons name="warning-outline" size={22} color={theme.amber} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>
                  {lowStock.length} item{lowStock.length > 1 ? 's' : ''} below reorder level
                </Text>
                <Text style={{ color: theme.sub, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {lowStock.map((i) => i.name).join(', ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.amber} />
            </Card>
          </TouchableOpacity>
        )}

        {/* Hotel Occupancy stats */}
        <TouchableOpacity onPress={() => navigation.navigate('HotelTab')} style={{ marginTop: 14 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: theme.blueSoft,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="bed-outline" size={22} color={theme.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: theme.text, fontSize: 15 }}>
                Occupancy {occupancyStats.pct}%
              </Text>
              <Text style={{ color: theme.sub, fontSize: 12, marginTop: 2 }}>
                {occupancyStats.occupied} of {occupancyStats.total} rooms occupied
              </Text>
            </View>
            <View style={{ width: 80 }}>
              <View
                style={{
                  height: 8,
                  backgroundColor: theme.cardAlt,
                  borderRadius: 4,
                  overflow: 'hidden'
                }}
              >
                <View
                  style={{
                    width: `${occupancyStats.pct}%`,
                    height: 8,
                    backgroundColor: theme.blue
                  }}
                />
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Last 7 Days Revenue chart */}
        <SectionTitle>Revenue · Last 7 Days</SectionTitle>
        <Card>
          <BarChart data={last7DaysData} />
        </Card>

        {/* This Month department split */}
        <SectionTitle>This Month · Department Split</SectionTitle>
        <Card>
          <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 12, color: theme.sub }}>Month Revenue</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>
                {inr(monthFinance.revenue)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: theme.sub }}>Month P/L</Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: monthFinance.profit >= 0 ? theme.green : theme.red
                }}
              >
                {monthFinance.profit >= 0 ? '+' : ''}
                {inr(monthFinance.profit)}
              </Text>
            </View>
          </Row>
          <DonutLegend data={departmentSplit} total={monthFinance.revenue} />
        </Card>

        {/* Top expenses this month */}
        <SectionTitle>Top Expenses · This Month</SectionTitle>
        <Card>
          {topExpensesData.length > 0 ? (
            <HBarChart data={topExpensesData} />
          ) : (
            <Text style={{ color: theme.faint, fontSize: 13 }}>No expenses recorded this month.</Text>
          )}
        </Card>

        {/* Month GST collected */}
        <Card
          style={{
            marginTop: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: theme.purpleSoft,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons name="document-text-outline" size={22} color={theme.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: theme.text, fontSize: 15 }}>
              GST collected this month
            </Text>
            <Text style={{ color: theme.sub, fontSize: 12, marginTop: 2 }}>
              GST 2.0 · restaurant 5% · rooms 5% (no ITC)
            </Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.purple }}>
            {inr(monthFinance.gstCollected)}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
