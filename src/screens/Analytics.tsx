import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  financeForMonth,
  cashInHand,
  bankBalance,
  customerOutstanding,
  vendorPayables,
  inventoryValue,
  liquorStockValue,
  occupancy,
  lowStockItems,
  financeForDay
} from '../context/StoreContext';
import { BarChart, DonutLegend, HBarChart } from '../components/Charts';
import { Card, Row, SectionTitle } from '../components/Primitives';
import { inr, dateKey, keyOf } from '../utils/helpers';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns the YYYY-MM key for N months ago */
const monthKeyNAgo = (n: number): string => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Short month label: "Jan", "Feb", … */
const monthShortLabel = (yyyyMM: string): string => {
  const [y, m] = yyyyMM.split('-').map(Number);
  return new Date(y, m - 1, 15).toLocaleDateString('en-IN', { month: 'short' });
};

// ── KPI Card ──────────────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  color: string;
  bg: string;
}

const KpiCard: React.FC<KpiProps> = ({ label, value, sub, icon, color, bg }) => {
  const { theme } = useTheme();
  return (
    <Card
      style={{
        flex: 1,
        minWidth: 140,
        padding: 14,
        gap: 10
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text }} numberOfLines={1}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, color: theme.sub, marginTop: 1 }} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ fontSize: 10, color: theme.faint, marginTop: 1 }} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Card>
  );
};

// ── Main Screen ──────────────────────────────────────────────────────────

export default function Analytics() {
  const { theme } = useTheme();
  const { state } = useStore();

  // ── 6-Month revenue trend (real data) ──────────────────────────────────
  const sixMonthRevenue = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const mk = monthKeyNAgo(5 - i); // oldest → newest
      let rev = 0;
      state.sales.forEach((s) => {
        if (keyOf(s.date).startsWith(mk)) rev += s.total;
      });
      return { label: monthShortLabel(mk), value: rev };
    });
  }, [state.sales]);

  // ── This month department split ────────────────────────────────────────
  const monthFinance = useMemo(() => financeForMonth(state), [state]);
  const departmentSplit = useMemo(() => [
    { label: 'Restaurant', value: monthFinance.restaurant, color: theme.primary },
    { label: 'Bar',        value: monthFinance.bar,        color: theme.amber },
    { label: 'Rooms',      value: monthFinance.rooms,      color: theme.blue },
    { label: 'Takeaway',   value: monthFinance.takeaway,   color: theme.teal },
    { label: 'Online',     value: monthFinance.online,     color: theme.purple }
  ].filter(d => d.value > 0), [monthFinance, theme]);

  // ── Top expense categories (all-time) ─────────────────────────────────
  const topExpenses = useMemo(() => {
    const catMap: Record<string, number> = {};
    state.txns.forEach((t) => {
      if (t.kind === 'expense') {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({
        label,
        value,
        color: [theme.red, theme.amber, theme.purple, theme.teal, theme.blue, theme.primary][i]
      }));
  }, [state.txns, theme]);

  // ── 30-day daily revenue sparkline ────────────────────────────────────
  const last30Days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dk = dateKey(d);
      let rev = 0;
      state.sales.forEach((s) => { if (keyOf(s.date) === dk) rev += s.total; });
      return {
        label: i % 7 === 0
          ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : '',
        value: rev
      };
    });
  }, [state.sales]);

  // ── KPI values ────────────────────────────────────────────────────────
  const cashAmt      = useMemo(() => cashInHand(state),         [state]);
  const bankAmt      = useMemo(() => bankBalance(state),        [state]);
  const debtors      = useMemo(() => customerOutstanding(state),[state]);
  const payables     = useMemo(() => vendorPayables(state),     [state]);
  const invVal       = useMemo(() => inventoryValue(state),     [state]);
  const barVal       = useMemo(() => liquorStockValue(state),   [state]);
  const occ          = useMemo(() => occupancy(state),          [state]);
  const lowStock     = useMemo(() => lowStockItems(state),      [state]);

  // ── Employee stats ────────────────────────────────────────────────────
  const empStats = useMemo(() => {
    const active   = state.employees.filter(e => e.status === 'active').length;
    const totalSalary = state.employees
      .filter(e => e.status === 'active')
      .reduce((s, e) => s + e.salary, 0);
    const today = dateKey(new Date());
    const presentToday = state.employees.filter(
      e => e.status === 'active' && e.attendance?.[today] === 'P'
    ).length;
    return { active, totalSalary, presentToday };
  }, [state.employees]);

  // ── Profit margin % ───────────────────────────────────────────────────
  const profitMargin = monthFinance.revenue > 0
    ? Math.round((monthFinance.profit / monthFinance.revenue) * 100)
    : 0;

  // ── 6-month cumulative totals ─────────────────────────────────────────
  const sixMonthTotal = useMemo(() => {
    let rev = 0, exp = 0;
    for (let i = 0; i < 6; i++) {
      const mk = monthKeyNAgo(i);
      state.sales.forEach(s => { if (keyOf(s.date).startsWith(mk)) rev += s.total; });
      state.txns.forEach(t => {
        if (t.kind === 'expense' && keyOf(t.date).startsWith(mk)) exp += t.amount;
      });
    }
    return { revenue: rev, expenses: exp, profit: rev - exp };
  }, [state.sales, state.txns]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* Header */}
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>
        Analytics Board
      </Text>
      <Text style={{ color: theme.sub, fontSize: 13, marginTop: 2, marginBottom: 16 }}>
        Live business intelligence · all figures from actual records
      </Text>

      {/* ── KPI Grid ──────────────────────────────────────────────── */}
      <SectionTitle>Financial Position</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <KpiCard
          label="Cash in Hand"
          value={inr(cashAmt)}
          icon="cash-outline"
          color={theme.green}
          bg={theme.greenSoft}
        />
        <KpiCard
          label="Bank Balance"
          value={inr(bankAmt)}
          icon="business-outline"
          color={theme.blue}
          bg={theme.blueSoft}
        />
        <KpiCard
          label="Customer Credit"
          value={inr(debtors)}
          icon="people-outline"
          color={theme.amber}
          bg={theme.amberSoft}
        />
        <KpiCard
          label="Vendor Payables"
          value={inr(payables)}
          icon="cart-outline"
          color={theme.red}
          bg={theme.redSoft}
        />
        <KpiCard
          label="Inventory Value"
          value={inr(invVal)}
          icon="cube-outline"
          color={theme.teal}
          bg={theme.tealSoft}
        />
        <KpiCard
          label="Bar Stock Value"
          value={inr(barVal)}
          icon="wine-outline"
          color={theme.purple}
          bg={theme.purpleSoft}
        />
      </View>

      {/* ── Month Summary Hero ────────────────────────────────────── */}
      <SectionTitle>This Month</SectionTitle>
      <Card
        style={{
          backgroundColor: theme.primary,
          borderColor: theme.primary,
          padding: 18,
          marginBottom: 10
        }}
      >
        <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Total Revenue</Text>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>
              {inr(monthFinance.revenue)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Net Profit</Text>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>
              {monthFinance.profit >= 0 ? '+' : ''}{inr(monthFinance.profit)}
            </Text>
          </View>
        </Row>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 14 }} />
        <Row style={{ justifyContent: 'space-between' }}>
          {[
            ['Expenses', monthFinance.expenses],
            ['GST Collected', monthFinance.gstCollected],
            ['Margin', profitMargin + '%']
          ].map(([label, val]) => (
            <View key={label as string}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{label}</Text>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {typeof val === 'number' ? inr(val) : val}
              </Text>
            </View>
          ))}
        </Row>
      </Card>

      {/* ── Department Split ─────────────────────────────────────── */}
      <SectionTitle>Revenue by Department (This Month)</SectionTitle>
      <Card style={{ marginBottom: 10 }}>
        {departmentSplit.length > 0 ? (
          <>
            <DonutLegend data={departmentSplit} total={monthFinance.revenue} />
            <View style={{ marginTop: 14, gap: 8 }}>
              {departmentSplit.map(d => (
                <Row key={d.label} style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                    <Text style={{ color: theme.sub, fontSize: 13 }}>{d.label}</Text>
                  </Row>
                  <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }}>
                    {inr(d.value)}
                  </Text>
                </Row>
              ))}
            </View>
          </>
        ) : (
          <Text style={{ color: theme.faint, fontSize: 13 }}>No sales recorded this month yet.</Text>
        )}
      </Card>

      {/* ── 6-Month Revenue Trend ────────────────────────────────── */}
      <SectionTitle>6-Month Revenue Trend</SectionTitle>
      <Card style={{ marginBottom: 10 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ color: theme.sub, fontSize: 12 }}>6-Month Total</Text>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>
              {inr(sixMonthTotal.revenue)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.sub, fontSize: 12 }}>6-Month Profit</Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: sixMonthTotal.profit >= 0 ? theme.green : theme.red
              }}
            >
              {sixMonthTotal.profit >= 0 ? '+' : ''}{inr(sixMonthTotal.profit)}
            </Text>
          </View>
        </Row>
        <BarChart
          data={sixMonthRevenue.map((d, i) => ({
            ...d,
            color: i === 5 ? theme.primary : theme.primarySoft
          }))}
          height={160}
        />
      </Card>

      {/* ── 30-Day Daily Trend ──────────────────────────────────── */}
      <SectionTitle>Daily Revenue · Last 30 Days</SectionTitle>
      <Card style={{ marginBottom: 10 }}>
        <BarChart
          data={last30Days.map((d, i) => ({
            ...d,
            color: i === 29 ? theme.green : theme.primary
          }))}
          height={120}
        />
      </Card>

      {/* ── Top Expense Categories ──────────────────────────────── */}
      <SectionTitle>Top Expense Categories (All-Time)</SectionTitle>
      <Card style={{ marginBottom: 10 }}>
        {topExpenses.length > 0 ? (
          <HBarChart data={topExpenses} />
        ) : (
          <Text style={{ color: theme.faint, fontSize: 13 }}>No expense records yet.</Text>
        )}
      </Card>

      {/* ── Hotel & Staff Snapshot ──────────────────────────────── */}
      <SectionTitle>Operations Snapshot</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {/* Occupancy */}
        <Card style={{ flex: 1, minWidth: 140, padding: 14, gap: 8 }}>
          <Row style={{ gap: 8, alignItems: 'center' }}>
            <Ionicons name="bed-outline" size={18} color={theme.blue} />
            <Text style={{ color: theme.sub, fontSize: 12, fontWeight: '600' }}>Occupancy</Text>
          </Row>
          <Text style={{ fontSize: 28, fontWeight: '900', color: theme.text }}>
            {occ.pct}%
          </Text>
          <Text style={{ fontSize: 11, color: theme.faint }}>
            {occ.occupied}/{occ.total} rooms · {occ.total - occ.occupied} vacant
          </Text>
          <View style={{ height: 6, backgroundColor: theme.cardAlt, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${occ.pct}%`, height: 6, backgroundColor: theme.blue, borderRadius: 3 }} />
          </View>
        </Card>

        {/* Staff */}
        <Card style={{ flex: 1, minWidth: 140, padding: 14, gap: 8 }}>
          <Row style={{ gap: 8, alignItems: 'center' }}>
            <Ionicons name="id-card-outline" size={18} color={theme.purple} />
            <Text style={{ color: theme.sub, fontSize: 12, fontWeight: '600' }}>Employees</Text>
          </Row>
          <Text style={{ fontSize: 28, fontWeight: '900', color: theme.text }}>
            {empStats.active}
          </Text>
          <Text style={{ fontSize: 11, color: theme.faint }}>
            {empStats.presentToday} present today
          </Text>
          <Text style={{ fontSize: 11, color: theme.faint }}>
            Monthly payroll {inr(empStats.totalSalary)}
          </Text>
        </Card>

        {/* Low Stock */}
        <Card style={{ flex: 1, minWidth: 140, padding: 14, gap: 8 }}>
          <Row style={{ gap: 8, alignItems: 'center' }}>
            <Ionicons name="warning-outline" size={18} color={lowStock.length > 0 ? theme.amber : theme.green} />
            <Text style={{ color: theme.sub, fontSize: 12, fontWeight: '600' }}>Stock Alerts</Text>
          </Row>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '900',
              color: lowStock.length > 0 ? theme.amber : theme.green
            }}
          >
            {lowStock.length}
          </Text>
          <Text style={{ fontSize: 11, color: theme.faint }}>
            {lowStock.length > 0
              ? `${lowStock.slice(0, 2).map(i => i.name).join(', ')}${lowStock.length > 2 ? '…' : ''}`
              : 'All items above reorder level'}
          </Text>
        </Card>
      </View>

      {/* ── Payment Mode Split (this month) ─────────────────────── */}
      <SectionTitle>Payment Mode Split (This Month)</SectionTitle>
      <Card>
        {(() => {
          const mk = monthKeyNAgo(0);
          const modes: Record<string, number> = {};
          state.sales.forEach(s => {
            if (keyOf(s.date).startsWith(mk)) {
              modes[s.mode] = (modes[s.mode] || 0) + s.total;
            }
          });
          const modeColors: Record<string, string> = {
            cash: theme.green,
            upi: theme.primary,
            card: theme.blue,
            bank: theme.teal
          };
          const modeItems = Object.entries(modes)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({
              label: label.toUpperCase(),
              value,
              color: modeColors[label] || theme.sub
            }));
          return modeItems.length > 0 ? (
            <>
              <DonutLegend data={modeItems} total={monthFinance.revenue} />
              <View style={{ marginTop: 14, gap: 8 }}>
                {modeItems.map(m => (
                  <Row key={m.label} style={{ justifyContent: 'space-between' }}>
                    <Row style={{ gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color }} />
                      <Text style={{ color: theme.sub, fontSize: 13 }}>{m.label}</Text>
                    </Row>
                    <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }}>
                      {inr(m.value)}
                    </Text>
                  </Row>
                ))}
              </View>
            </>
          ) : (
            <Text style={{ color: theme.faint, fontSize: 13 }}>No sales this month yet.</Text>
          );
        })()}
      </Card>
    </ScrollView>
  );
}
