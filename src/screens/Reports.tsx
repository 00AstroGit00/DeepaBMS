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
  financeForMonth,
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

export default function Reports() {
  const { theme } = useTheme();
  const { state } = useStore();

  // Selected tab: 'pl', 'cash', 'gst', 'registers'
  const [activeTab, setActiveTab] = useState<'pl' | 'cash' | 'gst' | 'registers'>('pl');

  // Selected export report key
  const [exportReportKey, setExportReportKey] = useState<string>('pl');
  const [isExporting, setIsExporting] = useState(false);

  const monthFinance = useMemo(() => financeForMonth(state), [state]);
  const cashAmount = useMemo(() => cashInHand(state), [state]);
  const bankAmount = useMemo(() => bankBalance(state), [state]);
  const currentMonthKey = todayKey().slice(0, 7);

  // Dynamic GST outputs
  const gstSummary = useMemo(() => {
    let outFood = 0;
    let outRooms = 0;
    let taxFood = 0;
    let taxRooms = 0;
    let liquor = 0;

    state.sales.forEach((s) => {
      if (keyOf(s.date).startsWith(currentMonthKey)) {
        if (s.dept === 'rooms') {
          outRooms += s.gstAmount;
          taxRooms += s.amount;
        } else if (s.gstRate > 0) {
          outFood += s.gstAmount;
          taxFood += s.amount;
        } else {
          liquor += s.total;
        }
      }
    });

    return {
      outFood,
      outRooms,
      taxFood,
      taxRooms,
      liquor,
      tot: Math.round(0.1 * liquor),
      total: outFood + outRooms
    };
  }, [state.sales, currentMonthKey]);

  // Expenses breakdown list sorted by size
  const expenseBreakdown = useMemo(() => {
    const categoriesMap = new Map<string, number>();
    state.txns.forEach((t) => {
      if (t.kind === 'expense' && keyOf(t.date).startsWith(currentMonthKey)) {
        categoriesMap.set(t.category, (categoriesMap.get(t.category) || 0) + t.amount);
      }
    });
    return Array.from(categoriesMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [state.txns, currentMonthKey]);

  // 14 Days Cash Flow history
  const cashFlow14Days = useMemo(() => {
    return lastNDays(14).map((day) => {
      const f = financeForDay(state, day);
      return {
        label: dayLabel(day).charAt(0),
        value: Math.max(0, f.revenue + f.otherIncome - f.expenses)
      };
    });
  }, [state]);

  const compileReportData = (key: string) => {
    switch (key) {
      case 'daybook':
        return buildDayBook(state);
      case 'sales':
        return buildSalesRegister(state);
      case 'expenses':
        return buildExpenseRegister(state);
      case 'gst':
        return buildGST(state);
      case 'guests':
        return buildGuestRegister(state);
      case 'credits':
        return buildCredits(state);
      case 'position':
        return buildPosition(state);
      default:
        return buildPL(state);
    }
  };

  const handleTriggerExport = async (format: 'PDF' | 'Excel' | 'CSV') => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const report = compileReportData(exportReportKey);
      const filename = `${report.code.replace(/\//g, '-').toLowerCase()}`;

      if (format === 'CSV') {
        const csvContent = renderCSV(report, state.settings);
        await saveTextFile(`${filename}.csv`, csvContent, 'text/csv');
      } else if (format === 'Excel') {
        const excelContent = renderExcel(report, state.settings);
        await saveTextFile(`${filename}.xls`, excelContent, 'application/vnd.ms-excel');
      } else {
        const pdfContent = renderPDF(report, state.settings);
        await exportPDF(filename, pdfContent);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Helper row renderer matches original module styling
  const renderItemRow = (label: string, value: string, isBold = false, color?: string) => {
    return (
      <Row style={{ justifyContent: 'space-between', paddingVertical: 7 }}>
        <Text
          style={{
            color: isBold ? theme.text : theme.sub,
            fontSize: isBold ? 15 : 14,
            fontWeight: isBold ? '800' : '500'
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: color || theme.text,
            fontSize: isBold ? 16 : 14,
            fontWeight: isBold ? '800' : '600'
          }}
        >
          {value}
        </Text>
      </Row>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
          Reports
        </Text>

        <Segmented
          options={[
            { key: 'pl', label: 'P&L' },
            { key: 'cash', label: 'Cash Flow' },
            { key: 'gst', label: 'GST' },
            { key: 'registers', label: 'Registers' }
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />

        <View style={{ height: 16 }} />

        {/* TAB 1: Profit & Loss */}
        {activeTab === 'pl' && (
          <View style={{ gap: 12 }}>
            <Card style={{ padding: 14 }}>
              <Text style={{ fontWeight: '800', color: theme.text, fontSize: 16, marginBottom: 4 }}>
                Profit & Loss - This Month
              </Text>
              <Text style={{ color: theme.faint, fontSize: 12, marginBottom: 10 }}>
                {state.settings.businessName}
              </Text>

              {renderItemRow('Restaurant sales', inr(monthFinance.restaurant))}
              {renderItemRow('Bar sales', inr(monthFinance.bar))}
              {renderItemRow('Room revenue', inr(monthFinance.rooms))}
              {renderItemRow('Takeaway + online', inr(monthFinance.takeaway + monthFinance.online))}
              {renderItemRow('Other income', inr(monthFinance.otherIncome))}

              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 6 }} />

              {renderItemRow('Total income', inr(monthFinance.revenue + monthFinance.otherIncome), true, theme.green)}

              <View style={{ height: 10 }} />

              {expenseBreakdown.slice(0, 8).map(([cat, val]) => renderItemRow(cat, '-' + inr(val)))}

              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 6 }} />

              {renderItemRow('Total expenses', '-' + inr(monthFinance.expenses), true, theme.red)}

              <View style={{ height: 1.5, backgroundColor: theme.text, marginVertical: 8, opacity: 0.5 }} />

              {renderItemRow(
                'NET PROFIT / LOSS',
                `${monthFinance.profit >= 0 ? '+' : ''}${inr(monthFinance.profit)}`,
                true,
                monthFinance.profit >= 0 ? theme.green : theme.red
              )}
            </Card>

            <SectionTitle>Expense Breakdown</SectionTitle>
            <Card style={{ padding: 14 }}>
              <HBarChart
                data={expenseBreakdown.slice(0, 6).map(([cat, val], idx) => ({
                  label: cat,
                  value: val,
                  color: [theme.red, theme.amber, theme.blue, theme.purple, theme.teal, theme.primary][idx]
                }))}
              />
            </Card>
          </View>
        )}

        {/* TAB 2: Cash Flow */}
        {activeTab === 'cash' && (
          <View style={{ gap: 12 }}>
            <Card style={{ padding: 14 }}>
              <Text style={{ fontWeight: '800', color: theme.text, fontSize: 16, marginBottom: 10 }}>
                Cash & Fund Position
              </Text>

              {renderItemRow('Cash in hand', inr(cashAmount), false, theme.green)}
              {renderItemRow('Bank balances (all accounts)', inr(bankAmount), false, theme.blue)}
              {renderItemRow('Customer credits receivable', inr(customerOutstanding(state)), false, theme.amber)}
              {renderItemRow('Vendor payables', '-' + inr(vendorPayables(state)), false, theme.red)}
              {renderItemRow('Inventory value', inr(inventoryValue(state)))}
              {renderItemRow('Liquor stock value', inr(liquorStockValue(state)))}

              <View style={{ height: 1.5, backgroundColor: theme.text, marginVertical: 8, opacity: 0.5 }} />

              {renderItemRow(
                'Net position',
                inr(
                  cashAmount +
                    bankAmount +
                    customerOutstanding(state) -
                    vendorPayables(state) +
                    inventoryValue(state) +
                    liquorStockValue(state)
                ),
                true,
                theme.green
              )}
            </Card>

            <SectionTitle>Daily Net Cash Flow - 14 Days</SectionTitle>
            <Card style={{ padding: 14 }}>
              <BarChart data={cashFlow14Days} height={110} />
            </Card>
          </View>
        )}

        {/* TAB 3: GST & KGST TOT */}
        {activeTab === 'gst' && (
          <Card style={{ padding: 14 }}>
            <Text style={{ fontWeight: '800', color: theme.text, fontSize: 16, marginBottom: 4 }}>
              GST & TOT Summary - This Month
            </Text>
            <Text style={{ color: theme.faint, fontSize: 12, marginBottom: 10 }}>
              GSTIN {state.settings.gstin} · GST 2.0 rates w.e.f. 22-Sep-2025
            </Text>

            {renderItemRow('Restaurant / takeaway / online taxable', inr(gstSummary.taxFood))}
            {renderItemRow('Output GST @ 5% (no ITC)', inr(gstSummary.outFood), false, theme.purple)}

            <View style={{ height: 8 }} />

            {renderItemRow('Room taxable (tariff ≤ ₹7,500/day)', inr(gstSummary.taxRooms))}
            {renderItemRow('Output GST @ 5% (no ITC)', inr(gstSummary.outRooms), false, theme.purple)}

            <View style={{ height: 1.5, backgroundColor: theme.text, marginVertical: 8, opacity: 0.5 }} />

            {renderItemRow('Total output GST payable', inr(gstSummary.total), true, theme.purple)}
            <Text style={{ color: theme.faint, fontSize: 12, marginTop: 4 }}>
              CGST {inr(gstSummary.total / 2)} + SGST {inr(gstSummary.total / 2)} · for GSTR-1 / GSTR-3B filing.
            </Text>

            <View style={{ height: 14 }} />

            {renderItemRow('Liquor sales (outside GST)', inr(gstSummary.liquor), false, theme.amber)}
            {renderItemRow('Kerala Turnover Tax @ 10% (KGST S.5(2))', inr(gstSummary.tot), true, theme.amber)}

            <Text style={{ color: theme.faint, fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
              Under GST 2.0, hotels with tariff ≤ ₹7,500/day and their restaurants are taxed at 5% without input tax credit. Liquor served under the FL-3 bar licence is outside GST — bar-attached hotels pay 10% Turnover Tax on liquor sales under the KGST Act (file via KITIS portal), plus annual licence fee to Kerala Excise. Stock must be purchased only from KSBC/BEVCO warehouses.
            </Text>
          </Card>
        )}

        {/* TAB 4: Registers & Export */}
        {activeTab === 'registers' && (
          <View style={{ gap: 12 }}>
            {[
              {
                t: 'Sales Register',
                d: `${state.sales.length} bills recorded`,
                i: 'receipt-outline' as const,
                c: theme.green
              },
              {
                t: 'Purchase Register',
                d: `${
                  state.txns.filter((t) =>
                    ['Provisions', 'Meat & Fish', 'Liquor Purchase', 'Soft Drinks Purchase'].includes(t.category)
                  ).length
                } purchase entries`,
                i: 'cart-outline' as const,
                c: theme.blue
              },
              {
                t: 'Expense Register',
                d: `${state.txns.filter((t) => t.kind === 'expense').length} expense entries`,
                i: 'wallet-outline' as const,
                c: theme.red
              },
              {
                t: 'Guest Register',
                d: `${state.stays.length} completed stays`,
                i: 'people-outline' as const,
                c: theme.purple
              },
              {
                t: 'Stock Movement Register',
                d: `${state.stockMoves.length} movements`,
                i: 'cube-outline' as const,
                c: theme.teal
              }
            ].map((reg) => (
              <Card
                key={reg.t}
                style={{
                  padding: 13,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: theme.cardAlt,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ionicons name={reg.i} size={19} color={reg.c} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{reg.t}</Text>
                  <Text style={{ color: theme.faint, fontSize: 12, marginTop: 2 }}>{reg.d}</Text>
                </View>

                <Ionicons name="checkmark-circle" size={18} color={theme.green} />
              </Card>
            ))}

            <SectionTitle>Export & Share</SectionTitle>
            <Card style={{ padding: 14 }}>
              <Select
                label="What to export"
                value={exportReportKey}
                onChange={setExportReportKey}
                color={theme.primary}
                options={[
                  {
                    value: 'pl',
                    label: 'Profit & Loss Statement',
                    icon: 'stats-chart-outline',
                    sub: 'Classified income & expenses · this month'
                  },
                  {
                    value: 'daybook',
                    label: 'Day Book (Cash Book)',
                    icon: 'book-outline',
                    sub: 'Double-column: opening b/d ➔ closing c/d · today'
                  },
                  {
                    value: 'sales',
                    label: 'Sales Register',
                    icon: 'receipt-outline',
                    sub: 'Invoice listing + GSTR-1 rate-wise summary'
                  },
                  {
                    value: 'expenses',
                    label: 'Expense Register',
                    icon: 'wallet-outline',
                    sub: 'Voucher listing + category analysis'
                  },
                  {
                    value: 'gst',
                    label: 'GST & TOT Summary',
                    icon: 'document-text-outline',
                    sub: 'GSTR-3B Table 3.1 layout + Kerala TOT annexure'
                  },
                  {
                    value: 'guests',
                    label: 'Guest Register',
                    icon: 'people-outline',
                    sub: 'In-house + departed · police-register format'
                  },
                  {
                    value: 'credits',
                    label: 'Credits & Payables',
                    icon: 'card-outline',
                    sub: 'Debtors/creditors with ageing buckets'
                  },
                  {
                    value: 'position',
                    label: 'Financial Position',
                    icon: 'briefcase-outline',
                    sub: 'Working capital: assets vs liabilities'
                  }
                ]}
              />

              <Row style={{ gap: 10, marginTop: 14 }}>
                {['PDF', 'Excel', 'CSV'].map((format) => (
                  <TouchableOpacity
                    key={format}
                    disabled={isExporting}
                    onPress={() => handleTriggerExport(format as any)}
                    style={{
                      flex: 1,
                      backgroundColor: theme.cardAlt,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 14,
                      paddingVertical: 14,
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
                          name={
                            format === 'PDF'
                              ? 'document-outline'
                              : format === 'Excel'
                              ? 'grid-outline'
                              : 'list-outline'
                          }
                          size={20}
                          color={theme.primary}
                        />
                        <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }}>{format}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </Row>

              <Text style={{ color: theme.faint, fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
                Desktop: CSV & Excel download instantly; PDF opens the print dialog — choose “Save as PDF”.
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
