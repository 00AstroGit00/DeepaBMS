import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../context/StoreContext';
import { ThermalPrinter } from '../utils/ThermalPrinter';
import {
  Card,
  Row,
  StatPill,
  Chip,
  Sheet,
  Segmented,
  Select,
  Field,
  PrimaryButton,
  EmptyState
} from '../components/Primitives';
import { inr, todayKey, keyOf, fmtDateTime, uid, parseNum, lastNDays } from '../utils/helpers';

const DEPT_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'bar', label: 'Bar' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'takeaway', label: 'Takeaway' },
  { key: 'online', label: 'Online' }
];

const GST_RATES: Record<string, number> = {
  restaurant: 5,
  takeaway: 5,
  online: 5,
  rooms: 5,
  bar: 0
};

const DEPT_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline' as const, sub: 'Dine-in · GST 5%' },
  { value: 'bar', label: 'Bar', icon: 'wine-outline' as const, sub: 'Liquor · outside GST' },
  { value: 'rooms', label: 'Rooms', icon: 'bed-outline' as const, sub: 'Lodging · GST 5%' },
  { value: 'takeaway', label: 'Takeaway', icon: 'bag-handle-outline' as const, sub: 'Parcel counter · GST 5%' },
  { value: 'online', label: 'Online', icon: 'phone-portrait-outline' as const, sub: 'Swiggy / Zomato · GST 5%' }
];

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: 'cash-outline' as const },
  { value: 'upi', label: 'UPI', icon: 'qr-code-outline' as const, sub: 'GPay / PhonePe' },
  { value: 'card', label: 'Card', icon: 'card-outline' as const },
  { value: 'bank', label: 'Bank Transfer', icon: 'business-outline' as const, sub: 'NEFT / online settlement' },
  { value: 'credit', label: 'Credit', icon: 'time-outline' as const, sub: 'Pay later - add to customer credit' }
];

const QUICK_TAGS: Record<string, string[]> = {
  restaurant: ['Lunch meals', 'Biriyani orders', 'Breakfast & tea', 'Dinner service', 'Evening snacks', 'Family party'],
  bar: ['Bar counter sales', 'Peg sales - evening', 'Beer & pegs', 'Bar table service'],
  rooms: ['Room advance', 'Extra bed charge', 'Late checkout charge'],
  takeaway: ['Parcel biriyani', 'Takeaway meals', 'Parcel counter'],
  online: ['Swiggy orders', 'Zomato orders']
};

const PERIODS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' }
];

export default function Sales({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();

  // State
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [recordSheetVisible, setRecordSheetVisible] = useState(false);

  // Record Sale Form State
  const [dept, setDept] = useState<'bar' | 'restaurant' | 'takeaway' | 'online' | 'rooms'>('restaurant');
  const [description, setDescription] = useState('');
  const [amountBeforeGst, setAmountBeforeGst] = useState('');
  const [billNo, setBillNo] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');

  const matchesPeriod = (dateStr: string) => {
    const k = keyOf(dateStr);
    const today = todayKey();
    if (selectedPeriod === 'day') {
      return k === today;
    }
    if (selectedPeriod === 'week') {
      return lastNDays(7).includes(k);
    }
    if (selectedPeriod === 'month') {
      return k.slice(0, 7) === today.slice(0, 7);
    }
    // Year
    return k.slice(0, 4) === today.slice(0, 4);
  };

  const filteredSales = useMemo(() => {
    return state.sales
      .filter((s) => matchesPeriod(s.date))
      .filter((s) => selectedDept === 'all' || s.dept === selectedDept)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.sales, selectedDept, selectedPeriod]);

  const summary = useMemo(() => {
    let total = 0;
    let gst = 0;
    let cashAmt = 0;
    let digital = 0;

    filteredSales.forEach((s) => {
      total += s.total;
      gst += s.gstAmount;
      if (s.mode === 'cash') {
        cashAmt += s.total;
      } else {
        digital += s.total;
      }
    });

    return {
      total,
      gst,
      cashAmt,
      digital,
      count: filteredSales.length
    };
  }, [filteredSales]);

  // Styling maps based on dept
  const deptColors: Record<string, string> = {
    restaurant: theme.primary,
    bar: theme.amber,
    rooms: theme.blue,
    takeaway: theme.teal,
    online: theme.purple
  };

  const deptBgColors: Record<string, string> = {
    restaurant: theme.primarySoft,
    bar: theme.amberSoft,
    rooms: theme.blueSoft,
    takeaway: theme.tealSoft,
    online: theme.purpleSoft
  };

  const gstRateVal = GST_RATES[dept] || 0;
  const parsedAmt = parseNum(amountBeforeGst);
  const gstCalculated = Math.round((parsedAmt * gstRateVal) / 100);

  const handleSaveSale = () => {
    const baseAmt = parseNum(amountBeforeGst);
    if (!baseAmt || !description.trim()) return;

    const rate = GST_RATES[dept] || 0;
    const gstAmt = Math.round((baseAmt * rate) / 100);

    const sale = {
      id: uid(),
      date: new Date().toISOString(),
      dept,
      description: description.trim(),
      amount: baseAmt,
      gstRate: rate,
      gstAmount: gstAmt,
      total: baseAmt + gstAmt,
      mode: paymentMode as any,
      billNo: billNo.trim() || undefined
    };

    dispatch({ type: 'ADD_SALE', sale });
    setRecordSheetVisible(false);
    setDescription('');
    setAmountBeforeGst('');
    setBillNo('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
          Sales Register
        </Text>

        <Segmented options={PERIODS} value={selectedPeriod} onChange={setSelectedPeriod} />

        {/* Summary Card */}
        <Card style={{ padding: 14 }}>
          <Row>
            <StatPill label="Total Sales" value={inr(summary.total)} color={theme.green} />
            <StatPill label="GST Collected" value={inr(summary.gst)} color={theme.purple} />
            <StatPill label="Bills" value={String(summary.count)} />
          </Row>
          <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 10 }} />
          <Row>
            <StatPill label="Cash" value={inr(summary.cashAmt)} />
            <StatPill label="UPI / Card / Bank" value={inr(summary.digital)} />
          </Row>
        </Card>

        {/* Horizontal Scroll for Dept Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12, flexGrow: 0 }}
          contentContainerStyle={{ gap: 6 }}
        >
          {DEPT_CHIPS.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              active={selectedDept === chip.key}
              onPress={() => setSelectedDept(chip.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="receipt-outline" text="No sales in this period" />}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        renderItem={({ item }) => (
          <Card
            style={{
              marginBottom: 8,
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
                backgroundColor: deptBgColors[item.dept] || theme.border,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons
                name={
                  item.dept === 'bar'
                    ? 'wine-outline'
                    : item.dept === 'rooms'
                    ? 'bed-outline'
                    : item.dept === 'online'
                    ? 'phone-portrait-outline'
                    : item.dept === 'takeaway'
                    ? 'bag-handle-outline'
                    : 'restaurant-outline'
                }
                size={18}
                color={deptColors[item.dept] || theme.sub}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={{ color: theme.faint, fontSize: 11, marginTop: 3 }}>
                {fmtDateTime(item.date)}
                {item.billNo ? ' · ' + item.billNo : ''}
                {item.gstRate ? ` · GST ${item.gstRate}%` : ' · No GST'}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <TouchableOpacity 
                style={{ padding: 6, backgroundColor: theme.cardAlt, borderRadius: 6, marginBottom: 8 }}
                onPress={() => ThermalPrinter.printReceipt(item, state.settings.businessName, state.settings.gstin)}
              >
                <Ionicons name="print-outline" size={16} color={theme.primary} />
              </TouchableOpacity>
              <Text style={{ fontWeight: '800', fontSize: 15, color: theme.text }}>
                {inr(item.total)}
              </Text>
              <Text
                style={{
                  color: theme.faint,
                  fontSize: 10,
                  marginTop: 2,
                  textTransform: 'uppercase'
                }}
              >
                {item.mode}
              </Text>
            </View>
          </Card>
        )}
      />

      {/* Floating Add button */}
      <TouchableOpacity
        onPress={() => {
          setDept('restaurant');
          setDescription('');
          setAmountBeforeGst('');
          setBillNo('');
          setPaymentMode('cash');
          setRecordSheetVisible(true);
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
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Sheet Modal: Record Sale */}
      <Sheet visible={recordSheetVisible} onClose={() => setRecordSheetVisible(false)} title="Record Sale">
        <Select label="Department" value={dept} onChange={(val) => setDept(val as any)} options={DEPT_OPTIONS} color={theme.primary} />

        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Lunch meals x 8"
        />

        {/* Quick Tag Pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6, marginBottom: 14 }}>
          {(QUICK_TAGS[dept] || []).map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => setDescription(tag)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: theme.cardAlt,
                borderWidth: 1,
                borderColor: theme.border
              }}
            >
              <Text style={{ color: theme.sub, fontSize: 11, fontWeight: '600' }}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field
          label="Amount before GST (₹)"
          value={amountBeforeGst}
          onChangeText={setAmountBeforeGst}
          keyboardType="numeric"
          placeholder="0"
        />

        <Field label="Bill No (optional)" value={billNo} onChangeText={setBillNo} placeholder="R3450" />

        <Select label="Payment Mode" value={paymentMode} onChange={setPaymentMode} options={PAYMENT_MODES} />

        {/* Bill calculation details */}
        <Card style={{ backgroundColor: theme.cardAlt, marginBottom: 16, padding: 13 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: theme.sub, fontSize: 13 }}>
              GST @ {gstRateVal}%{dept === 'bar' ? ' (liquor - outside GST)' : ''}
            </Text>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{inr(gstCalculated)}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: theme.sub, fontSize: 13 }}>Bill Total</Text>
            <Text style={{ color: theme.green, fontWeight: '800', fontSize: 17 }}>
              {inr(parsedAmt + gstCalculated)}
            </Text>
          </Row>
        </Card>

        <PrimaryButton title="Save Sale" onPress={handleSaveSale} icon="checkmark" />
      </Sheet>
    </SafeAreaView>
  );
}
