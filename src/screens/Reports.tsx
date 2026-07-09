import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  cashInHand,
  bankBalance,
  customerOutstanding,
  vendorPayables,
  inventoryValue,
  liquorStockValue,
  financeForDay
} from '../context/StoreContext';
import {
  Card,
  Row,
  Segmented,
  Select,
  SectionTitle
} from '../components/Primitives';
import { BarChart, HBarChart } from '../components/Charts';
import { inr, todayKey, keyOf, lastNDays, dayLabel } from '../utils/helpers';
import {
  buildPL,
  buildDayBook,
  buildSalesRegister,
  buildExpenseRegister,
  buildGST,
  buildGuestRegister,
  buildCredits,
  buildPosition
} from '../utils/ledgerBuilders';
import { renderPDF, renderExcel, renderCSV } from '../utils/templateRenderers';
import { saveTextFile, exportPDF } from '../utils/fileExporter';

// ── Helper: compute finance for any month key ────────────────────────────────

const computeMonthFinance = (state: any, monthKey: string) => {
  const data = {
    revenue: 0, restaurant: 0, bar: 0, rooms: 0,
    takeaway: 0, online: 0, expenses: 0, purchases: 0,
    otherIncome: 0, profit: 0, gstCollected: 0
  };
  state.sales.forEach((s: any) => {
    if (keyOf(s.date).startsWith(monthKey)) {
      data.revenue += s.total;
      data.gstCollected += s.gstAmount;
      if (s.dept in data) (data as any)[s.dept] += s.total;
    }
  });
  state.txns.forEach((t: any) => {
    if (keyOf(t.date).startsWith(monthKey)) {
      if (t.kind === 'expense') {
        data.expenses += t.amount;
        if (['Provisions', 'Meat & Fish', 'Liquor Purchase', 'Soft Drinks Purchase'].includes(t.category))
          data.purchases += t.amount;
      } else {
        data.otherIncome += t.amount;
      }
    }
  });
  data.profit = data.revenue + data.otherIncome - data.expenses;
  return data;
};

// ── Helper: generate last-N months options ───────────────────────────────────

const buildMonthOptions = () => {
  const opts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    opts.push({ value: key, label, icon: 'calendar-outline' as const });
  }
  return opts;
};

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function Reports() {
  const { theme } = useTheme();
  const { state } = useStore();

  const [activeTab, setActiveTab] = useState<'pl' | 'cash' | 'gst' | 'registers'>('pl');
  const [selectedMonth, setSelectedMonth] = useState(todayKey().slice(0, 7));
  const [exportReportKey, setExportReportKey] = useState<string>('pl');
  const [isExporting, setIsExporting] = useState(false);

  const monthOptions = useMemo(buildMonthOptions, []);

  // ── Finance for selected month ─────────────────────────────────────────────
  const monthFinance = useMemo(
    () => computeMonthFinance(state, selectedMonth),
    [state, selectedMonth]
  );

  // ── Expense categories for selected month ──────────────────────────────────
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    state.txns.forEach((t: any) => {
      if (t.kind === 'expense' && keyOf(t.date).startsWith(selectedMonth))
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [state.txns, selectedMonth]);

  // ── GST summary for selected month ────────────────────────────────────────
  const gstSummary = useMemo(() => {
    let outFood = 0, outRooms = 0, taxFood = 0, taxRooms = 0, liquor = 0, barSales = 0;
    state.sales.forEach((s: any) => {
      if (keyOf(s.date).startsWith(selectedMonth)) {
        if (s.dept === 'rooms') {
          outRooms += s.gstAmount; taxRooms += s.amount;
        } else if (s.gstRate > 0) {
          outFood += s.gstAmount; taxFood += s.amount;
        } else {
          liquor += s.total;
          if (s.dept === 'bar') barSales += s.total;
        }
      }
    });
    return {
      outFood, outRooms, taxFood, taxRooms, liquor, barSales,
      tot: Math.round(0.1 * barSales),
      total: outFood + outRooms
    };
  }, [state.sales, selectedMonth]);

  // ── 30-day cash flow ──────────────────────────────────────────────────────
  const cashFlow30Days = useMemo(() => {
    return lastNDays(30).map((day) => {
      const f = financeForDay(state, day);
      return {
        label: dayLabel(day).charAt(0),
        value: Math.max(0, f.revenue + f.otherIncome - f.expenses)
      };
    });
  }, [state]);

  // ── Daily breakdown for selected month ────────────────────────────────────
  const dailyBreakdown = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const rows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const day = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const f = financeForDay(state, day);
      if (f.revenue > 0 || f.expenses > 0 || f.otherIncome > 0) {
        rows.push({
          day,
          label: new Date(day + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', weekday: 'short' }),
          revenue: f.revenue,
          expenses: f.expenses,
          net: f.revenue + f.otherIncome - f.expenses
        });
      }
    }
    return rows;
  }, [state, selectedMonth]);

  // ── Fund position live ─────────────────────────────────────────────────────
  const cashAmt = useMemo(() => cashInHand(state), [state]);
  const bankAmt = useMemo(() => bankBalance(state), [state]);
  const debtors = useMemo(() => customerOutstanding(state), [state]);
  const payables = useMemo(() => vendorPayables(state), [state]);
  const invVal = useMemo(() => inventoryValue(state), [state]);
  const barVal = useMemo(() => liquorStockValue(state), [state]);
  const netPosition = cashAmt + bankAmt + debtors - payables + invVal + barVal;

  // ── Month label ────────────────────────────────────────────────────────────
  const selectedMonthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 15).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const isCurrentMonth = selectedMonth === todayKey().slice(0, 7);

  // ── Export ─────────────────────────────────────────────────────────────────
  const compileReportData = (key: string) => {
    switch (key) {
      case 'daybook':    return buildDayBook(state);
      case 'sales':      return buildSalesRegister(state);
      case 'expenses':   return buildExpenseRegister(state);
      case 'gst':        return buildGST(state);
      case 'guests':     return buildGuestRegister(state);
      case 'credits':    return buildCredits(state);
      case 'position':   return buildPosition(state);
      default:           return buildPL(state);
    }
  };

  const handleTriggerExport = async (format: 'PDF' | 'Excel' | 'CSV') => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const report = compileReportData(exportReportKey);
      const filename = `${report.code.replace(/\//g, '-').toLowerCase()}`;
      if (format === 'CSV') {
        await saveTextFile(`${filename}.csv`, renderCSV(report, state.settings), 'text/csv');
      } else if (format === 'Excel') {
        await saveTextFile(`${filename}.xls`, renderExcel(report, state.settings), 'application/vnd.ms-excel');
      } else {
        await exportPDF(filename, renderPDF(report, state.settings));
      }
    } finally {
      setIsExporting(false);
    }
  };

  // ── Row renderer ───────────────────────────────────────────────────────────
  const Row2 = ({
    label, value, bold = false, color, indent = false, topBorder = false, bottomBorder = false
  }: {
    label: string; value: string; bold?: boolean; color?: string;
    indent?: boolean; topBorder?: boolean; bottomBorder?: boolean;
  }) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: bold ? 9 : 7,
        paddingLeft: indent ? 12 : 0,
        borderTopWidth: topBorder ? 1 : 0,
        borderTopColor: theme.border,
        borderBottomWidth: bottomBorder ? 1.5 : 0,
        borderBottomColor: bold ? theme.sub : theme.border,
        marginTop: topBorder ? 6 : 0
      }}
    >
      <Text style={{
        color: bold ? theme.text : indent ? theme.faint : theme.sub,
        fontSize: bold ? 15 : 13.5,
        fontWeight: bold ? '800' : '400',
        flex: 1, marginRight: 8
      }}>
        {label}
      </Text>
      <Text style={{
        color: color || (bold ? theme.text : theme.text),
        fontSize: bold ? 16 : 13.5,
        fontWeight: bold ? '900' : '600'
      }}>
        {value}
      </Text>
    </View>
  );

  // ── Month picker (shared across P&L and GST) ──────────────────────────────
  const MonthPicker = () => (
    <Card style={{ padding: 10, marginBottom: 12 }}>
      <Select
        label="Reporting period"
        value={selectedMonth}
        onChange={setSelectedMonth}
        color={theme.primary}
        options={monthOptions}
      />
    </Card>
  );

  const profitMargin = monthFinance.revenue > 0
    ? Math.round((monthFinance.profit / monthFinance.revenue) * 100)
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Header */}
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 4 }}>
          Reports & GST
        </Text>
        <Text style={{ color: theme.sub, fontSize: 13, marginBottom: 14 }}>
          Financial statements · GST & TOT · Registers & exports
        </Text>

        <Segmented
          options={[
            { key: 'pl',        label: 'P&L' },
            { key: 'cash',      label: 'Cash Flow' },
            { key: 'gst',       label: 'GST / TOT' },
            { key: 'registers', label: 'Registers' }
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />

        <View style={{ height: 16 }} />

        {/* ── TAB 1 · Profit & Loss ──────────────────────────────────────── */}
        {activeTab === 'pl' && (
          <View style={{ gap: 12 }}>

            <MonthPicker />

            {/* Revenue card */}
            <Card style={{ padding: 16 }}>
              <Text style={{ fontWeight: '800', color: theme.text, fontSize: 16, marginBottom: 2 }}>
                Profit & Loss Statement
              </Text>
              <Text style={{ color: theme.faint, fontSize: 12, marginBottom: 14 }}>
                {state.settings.businessName} · {selectedMonthLabel}
              </Text>

              {/* Income section */}
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary, letterSpacing: 1, marginBottom: 4 }}>
                INCOME
              </Text>
              <Row2 label="Restaurant sales" value={inr(monthFinance.restaurant)} indent />
              <Row2 label="Bar & liquor sales" value={inr(monthFinance.bar)} indent />
              <Row2 label="Room revenue" value={inr(monthFinance.rooms)} indent />
              <Row2 label="Takeaway & online" value={inr(monthFinance.takeaway + monthFinance.online)} indent />
              {monthFinance.otherIncome > 0 &&
                <Row2 label="Other income / receipts" value={inr(monthFinance.otherIncome)} indent />
              }
              <Row2
                label="Gross Income"
                value={inr(monthFinance.revenue + monthFinance.otherIncome)}
                bold color={theme.green} topBorder
              />

              <View style={{ height: 14 }} />

              {/* Expenditure section */}
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.red, letterSpacing: 1, marginBottom: 4 }}>
                EXPENDITURE
              </Text>
              {expenseBreakdown.length === 0
                ? <Text style={{ color: theme.faint, fontSize: 13 }}>No expenses recorded this month.</Text>
                : expenseBreakdown.map(([cat, val]) => (
                    <Row2 key={cat} label={cat} value={inr(val)} indent />
                  ))
              }
              <Row2
                label="Total Expenditure"
                value={inr(monthFinance.expenses)}
                bold color={theme.red} topBorder
              />

              <View style={{ height: 10 }} />

              {/* Net result */}
              <View style={{
                backgroundColor: monthFinance.profit >= 0 ? theme.greenSoft : theme.redSoft,
                borderRadius: 12, padding: 14, marginTop: 4, gap: 6
              }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '800', color: theme.text, fontSize: 15 }}>
                    NET {monthFinance.profit >= 0 ? 'PROFIT' : 'LOSS'}
                  </Text>
                  <Text style={{
                    fontWeight: '900', fontSize: 22,
                    color: monthFinance.profit >= 0 ? theme.green : theme.red
                  }}>
                    {monthFinance.profit >= 0 ? '+' : ''}{inr(monthFinance.profit)}
                  </Text>
                </Row>
                <Row style={{ gap: 16, flexWrap: 'wrap' }}>
                  <Text style={{ color: theme.sub, fontSize: 12 }}>
                    Profit margin: <Text style={{ fontWeight: '700', color: theme.text }}>
                      {profitMargin}%
                    </Text>
                  </Text>
                  <Text style={{ color: theme.sub, fontSize: 12 }}>
                    GST collected: <Text style={{ fontWeight: '700', color: theme.purple }}>
                      {inr(monthFinance.gstCollected)}
                    </Text>
                  </Text>
                  {!isCurrentMonth && (
                    <Text style={{ color: theme.faint, fontSize: 11 }}>
                      Historical period
                    </Text>
                  )}
                </Row>
              </View>
            </Card>

            {/* Expense breakdown chart */}
            {expenseBreakdown.length > 0 && (
              <>
                <SectionTitle>Expense Breakdown</SectionTitle>
                <Card style={{ padding: 16 }}>
                  <HBarChart
                    data={expenseBreakdown.slice(0, 7).map(([cat, val], idx) => ({
                      label: cat,
                      value: val,
                      color: [theme.red, theme.amber, theme.blue, theme.purple, theme.teal, theme.primary, theme.green][idx]
                    }))}
                  />
                </Card>
              </>
            )}

            {/* Department split */}
            {monthFinance.revenue > 0 && (
              <>
                <SectionTitle>Revenue by Department</SectionTitle>
                <Card style={{ padding: 16, gap: 10 }}>
                  {[
                    { label: 'Restaurant', val: monthFinance.restaurant, color: theme.primary },
                    { label: 'Bar & Liquor', val: monthFinance.bar, color: theme.amber },
                    { label: 'Hotel Rooms', val: monthFinance.rooms, color: theme.blue },
                    { label: 'Takeaway & Online', val: monthFinance.takeaway + monthFinance.online, color: theme.teal }
                  ].filter(d => d.val > 0).map(d => (
                    <View key={d.label}>
                      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: theme.sub, fontSize: 13 }}>{d.label}</Text>
                        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                          {inr(d.val)}
                          <Text style={{ color: theme.faint, fontWeight: '400', fontSize: 11 }}>
                            {' '}({Math.round((d.val / monthFinance.revenue) * 100)}%)
                          </Text>
                        </Text>
                      </Row>
                      <View style={{ height: 8, backgroundColor: theme.cardAlt, borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.round((d.val / monthFinance.revenue) * 100)}%`, height: 8, backgroundColor: d.color, borderRadius: 4 }} />
                      </View>
                    </View>
                  ))}
                </Card>
              </>
            )}
          </View>
        )}

        {/* ── TAB 2 · Cash Flow ─────────────────────────────────────────── */}
        {activeTab === 'cash' && (
          <View style={{ gap: 12 }}>

            {/* Fund position — always live */}
            <SectionTitle>Fund Position (Live)</SectionTitle>
            <Card style={{ padding: 16 }}>
              <Row2 label="Cash in hand" value={inr(cashAmt)} color={theme.green} />
              <Row2 label="Bank balances (all accounts)" value={inr(bankAmt)} color={theme.blue} />
              <Row2 label="Customer credits receivable" value={inr(debtors)} color={theme.amber} />
              <Row2 label="Vendor payables (outstanding)" value={'- ' + inr(payables)} color={theme.red} />
              <Row2 label="Inventory stock value" value={inr(invVal)} />
              <Row2 label="Liquor stock value" value={inr(barVal)} color={theme.purple} />
              <Row2
                label="Net Working Capital"
                value={inr(netPosition)}
                bold topBorder
                color={netPosition >= 0 ? theme.green : theme.red}
              />
            </Card>

            {/* 30-day cash flow chart */}
            <SectionTitle>Net Cash Flow — Last 30 Days</SectionTitle>
            <Card style={{ padding: 16 }}>
              <BarChart data={cashFlow30Days} height={120} />
            </Card>

            {/* Daily breakdown for selected month */}
            <SectionTitle>Daily Breakdown</SectionTitle>
            <MonthPicker />
            <Card style={{ padding: 14 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: theme.faint, fontSize: 11, fontWeight: '700', flex: 1 }}>DATE</Text>
                <Text style={{ color: theme.faint, fontSize: 11, fontWeight: '700', width: 80, textAlign: 'right' }}>REVENUE</Text>
                <Text style={{ color: theme.faint, fontSize: 11, fontWeight: '700', width: 80, textAlign: 'right' }}>EXPENSES</Text>
                <Text style={{ color: theme.faint, fontSize: 11, fontWeight: '700', width: 70, textAlign: 'right' }}>NET</Text>
              </Row>
              <View style={{ height: 1, backgroundColor: theme.border, marginBottom: 8 }} />

              {dailyBreakdown.length === 0
                ? <Text style={{ color: theme.faint, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
                    No transactions in {selectedMonthLabel}.
                  </Text>
                : dailyBreakdown.map((row, i) => (
                    <View key={row.day} style={{
                      flexDirection: 'row',
                      paddingVertical: 7,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: theme.border
                    }}>
                      <Text style={{ color: theme.sub, fontSize: 12, flex: 1 }}>{row.label}</Text>
                      <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', width: 80, textAlign: 'right' }}>
                        {inr(row.revenue)}
                      </Text>
                      <Text style={{ color: theme.red, fontSize: 12, fontWeight: '600', width: 80, textAlign: 'right' }}>
                        {row.expenses > 0 ? '- ' + inr(row.expenses) : '—'}
                      </Text>
                      <Text style={{
                        fontSize: 12, fontWeight: '700', width: 70, textAlign: 'right',
                        color: row.net >= 0 ? theme.green : theme.red
                      }}>
                        {row.net >= 0 ? '+' : ''}{inr(row.net)}
                      </Text>
                    </View>
                  ))
              }

              {dailyBreakdown.length > 0 && (
                <>
                  <View style={{ height: 1.5, backgroundColor: theme.text, opacity: 0.3, marginVertical: 8 }} />
                  <Row style={{ justifyContent: 'flex-end', gap: 4 }}>
                    <Text style={{ color: theme.faint, fontSize: 12, flex: 1 }}>
                      {dailyBreakdown.length} days with activity
                    </Text>
                    <Text style={{ color: theme.green, fontSize: 13, fontWeight: '700', width: 80, textAlign: 'right' }}>
                      {inr(monthFinance.revenue)}
                    </Text>
                    <Text style={{ color: theme.red, fontSize: 13, fontWeight: '700', width: 80, textAlign: 'right' }}>
                      {inr(monthFinance.expenses)}
                    </Text>
                    <Text style={{
                      fontSize: 13, fontWeight: '800', width: 70, textAlign: 'right',
                      color: monthFinance.profit >= 0 ? theme.green : theme.red
                    }}>
                      {monthFinance.profit >= 0 ? '+' : ''}{inr(monthFinance.profit)}
                    </Text>
                  </Row>
                </>
              )}
            </Card>
          </View>
        )}

        {/* ── TAB 3 · GST & TOT ─────────────────────────────────────────── */}
        {activeTab === 'gst' && (
          <View style={{ gap: 12 }}>

            <MonthPicker />

            {/* GST Summary */}
            <Card style={{ padding: 16 }}>
              <Text style={{ fontWeight: '800', color: theme.text, fontSize: 16, marginBottom: 2 }}>
                GST & TOT Summary
              </Text>
              <Text style={{ color: theme.faint, fontSize: 12, marginBottom: 14 }}>
                GSTIN: {state.settings.gstin || 'Not configured'} · {selectedMonthLabel}
              </Text>

              {/* CGST / SGST block */}
              <View style={{
                backgroundColor: theme.purpleSoft, borderRadius: 10, padding: 12, marginBottom: 14
              }}>
                <Text style={{ fontWeight: '800', color: theme.purple, fontSize: 13, marginBottom: 8 }}>
                  GST @ 5% (No ITC) — GSTR-3B Table 3.1
                </Text>

                <Row2
                  label="Restaurant / takeaway / online — taxable turnover"
                  value={inr(gstSummary.taxFood)}
                  indent
                />
                <Row2
                  label="Output GST on food & F&B @ 5%"
                  value={inr(gstSummary.outFood)}
                  indent color={theme.purple}
                />

                <View style={{ height: 8 }} />

                <Row2
                  label="Hotel rooms (tariff ≤ ₹7,500/night) — taxable"
                  value={inr(gstSummary.taxRooms)}
                  indent
                />
                <Row2
                  label="Output GST on rooms @ 5%"
                  value={inr(gstSummary.outRooms)}
                  indent color={theme.purple}
                />

                <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />

                <Row2
                  label="Total Output GST payable"
                  value={inr(gstSummary.total)}
                  bold color={theme.purple}
                />
                <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: theme.sub, fontSize: 12 }}>
                    CGST (2.5%): <Text style={{ fontWeight: '700', color: theme.text }}>{inr(gstSummary.total / 2)}</Text>
                  </Text>
                  <Text style={{ color: theme.sub, fontSize: 12 }}>
                    SGST (2.5%): <Text style={{ fontWeight: '700', color: theme.text }}>{inr(gstSummary.total / 2)}</Text>
                  </Text>
                </Row>
              </View>

              {/* TOT block */}
              <View style={{
                backgroundColor: theme.amberSoft, borderRadius: 10, padding: 12
              }}>
                <Text style={{ fontWeight: '800', color: theme.amber, fontSize: 13, marginBottom: 8 }}>
                  Kerala TOT — KGST Act S.5(2) · FL-3 Bar Licence
                </Text>

                <Row2
                  label="Liquor sales (FL-3) — outside GST"
                  value={inr(gstSummary.barSales)}
                  indent color={theme.amber}
                />
                <Row2
                  label="Turnover Tax (TOT) @ 10%"
                  value={inr(gstSummary.tot)}
                  bold color={theme.amber}
                />
              </View>

              <View style={{ height: 12 }} />

              {/* Grand total payable */}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between',
                backgroundColor: theme.cardAlt, borderRadius: 10, padding: 14, alignItems: 'center'
              }}>
                <View>
                  <Text style={{ color: theme.sub, fontSize: 12 }}>Total Tax Payable this month</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>GST + Kerala TOT</Text>
                </View>
                <Text style={{ fontWeight: '900', fontSize: 22, color: theme.text }}>
                  {inr(gstSummary.total + gstSummary.tot)}
                </Text>
              </View>

              {/* Footnote */}
              <Text style={{ color: theme.faint, fontSize: 11, marginTop: 14, lineHeight: 17 }}>
                Under GST 2.0, hotels with tariff ≤ ₹7,500/night and their restaurants are taxed at 5% without input tax credit.
                Liquor served under the FL-3 bar licence is outside GST — bar-attached hotels pay 10% Turnover Tax on liquor sales
                under the KGST Act (file via KITIS portal), plus annual licence fee to Kerala Excise. Stock must be purchased only
                from KSBC/BEVCO warehouses.
              </Text>
            </Card>

            {/* GST filing checklist */}
            <SectionTitle>Filing Checklist</SectionTitle>
            <Card style={{ padding: 14, gap: 10 }}>
              {[
                { label: 'GSTR-1 (outward supply details)', due: '11th of next month', icon: 'document-text-outline' as const, color: theme.blue },
                { label: 'GSTR-3B (monthly return + payment)', due: '20th of next month', icon: 'cash-outline' as const, color: theme.green },
                { label: 'Kerala TOT — KITIS portal', due: 'By 20th of next month', icon: 'globe-outline' as const, color: theme.amber },
                { label: 'Excise FL-3 register update', due: 'Daily / weekly', icon: 'wine-outline' as const, color: theme.red }
              ].map(item => (
                <Row key={item.label} style={{ gap: 12, alignItems: 'flex-start' }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 10,
                    backgroundColor: theme.cardAlt,
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Ionicons name={item.icon} size={17} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{item.label}</Text>
                    <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>Due: {item.due}</Text>
                  </View>
                </Row>
              ))}
            </Card>
          </View>
        )}

        {/* ── TAB 4 · Registers & Export ────────────────────────────────── */}
        {activeTab === 'registers' && (
          <View style={{ gap: 12 }}>

            {/* Register summary cards */}
            {[
              {
                t: 'Sales Register',
                d: `${state.sales.length} bills recorded`,
                i: 'receipt-outline' as const, c: theme.green
              },
              {
                t: 'Purchase Register',
                d: `${state.txns.filter((t: any) => ['Provisions', 'Meat & Fish', 'Liquor Purchase', 'Soft Drinks Purchase'].includes(t.category)).length} purchase entries`,
                i: 'cart-outline' as const, c: theme.blue
              },
              {
                t: 'Expense Register',
                d: `${state.txns.filter((t: any) => t.kind === 'expense').length} expense entries`,
                i: 'wallet-outline' as const, c: theme.red
              },
              {
                t: 'Guest Register',
                d: `${state.stays.length} stays on record`,
                i: 'people-outline' as const, c: theme.purple
              },
              {
                t: 'Stock Movement Register',
                d: `${state.stockMoves.length} movements logged`,
                i: 'cube-outline' as const, c: theme.teal
              },
              {
                t: 'Credit Accounts Register',
                d: `${state.credits.length} accounts active`,
                i: 'card-outline' as const, c: theme.amber
              }
            ].map((reg) => (
              <Card key={reg.t} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: theme.cardAlt,
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <Ionicons name={reg.i} size={20} color={reg.c} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{reg.t}</Text>
                  <Text style={{ color: theme.faint, fontSize: 12, marginTop: 2 }}>{reg.d}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={theme.green} />
              </Card>
            ))}

            {/* Export section */}
            <SectionTitle>Export & Share</SectionTitle>
            <Card style={{ padding: 16 }}>
              <Select
                label="Select report to export"
                value={exportReportKey}
                onChange={setExportReportKey}
                color={theme.primary}
                options={[
                  { value: 'pl',       label: 'Profit & Loss Statement',   icon: 'stats-chart-outline', sub: 'Revenue, expenses, net profit — this month' },
                  { value: 'daybook',  label: 'Day Book (Cash Book)',       icon: 'book-outline',        sub: 'Double-column cash book — today' },
                  { value: 'sales',    label: 'Sales Register',            icon: 'receipt-outline',     sub: 'Invoice listing + GSTR-1 rate-wise summary' },
                  { value: 'expenses', label: 'Expense Register',          icon: 'wallet-outline',      sub: 'Voucher listing + category analysis' },
                  { value: 'gst',      label: 'GST & TOT Summary',         icon: 'document-text-outline', sub: 'GSTR-3B Table 3.1 + Kerala TOT annexure' },
                  { value: 'guests',   label: 'Guest Register',            icon: 'people-outline',      sub: 'In-house + departed · police register format' },
                  { value: 'credits',  label: 'Credits & Payables',        icon: 'card-outline',        sub: 'Debtors/creditors with ageing buckets' },
                  { value: 'position', label: 'Financial Position',        icon: 'briefcase-outline',   sub: 'Working capital: assets vs liabilities' }
                ]}
              />

              <Row style={{ gap: 10, marginTop: 16 }}>
                {(['PDF', 'Excel', 'CSV'] as const).map((format) => (
                  <TouchableOpacity
                    key={format}
                    disabled={isExporting}
                    onPress={() => handleTriggerExport(format)}
                    style={{
                      flex: 1,
                      backgroundColor: theme.cardAlt,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 14,
                      paddingVertical: 16,
                      alignItems: 'center',
                      gap: 5,
                      opacity: isExporting ? 0.5 : 1
                    }}
                  >
                    {isExporting ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Ionicons
                          name={format === 'PDF' ? 'document-outline' : format === 'Excel' ? 'grid-outline' : 'list-outline'}
                          size={22}
                          color={theme.primary}
                        />
                        <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }}>{format}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </Row>

              <Text style={{ color: theme.faint, fontSize: 12, marginTop: 12, lineHeight: 18 }}>
                Desktop: CSV & Excel download instantly; PDF opens the print dialog — choose "Save as PDF".
              </Text>
            </Card>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
