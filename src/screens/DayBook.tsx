import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  useStore,
  financeForDay,
  cashInHand
} from '../context/StoreContext';
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
import { inr, todayKey, dateKey, keyOf, fmtDateTime, uid, parseNum } from '../utils/helpers';
import { pickBillImage, captureBillPhoto, pickBillDocument, AttachmentResult } from '../utils/mediaPicker';

const EXPENSE_CATEGORIES = [
  { value: 'Provisions', icon: 'basket-outline' as const, sub: 'Vegetables, rice, groceries' },
  { value: 'Meat & Fish', icon: 'fish-outline' as const, sub: 'Chicken, fish, mutton' },
  { value: 'LPG & Fuel', icon: 'flame-outline' as const, sub: 'Cylinders, generator diesel' },
  { value: 'Electricity', icon: 'flash-outline' as const, sub: 'KSEB bills' },
  { value: 'Water', icon: 'water-outline' as const },
  { value: 'Maintenance', icon: 'construct-outline' as const, sub: 'Repairs, plumbing, AMC' },
  { value: 'Salaries', icon: 'people-outline' as const, sub: 'Wages & advances' },
  { value: 'Staff Welfare', icon: 'cafe-outline' as const, sub: 'Staff food & tea' },
  { value: 'Liquor Purchase', icon: 'wine-outline' as const, sub: 'BEVCO invoices' },
  { value: 'Soft Drinks Purchase', icon: 'pint-outline' as const },
  { value: 'Rent', icon: 'home-outline' as const },
  { value: 'License & Tax', icon: 'document-text-outline' as const, sub: 'Excise, GST, local body' },
  { value: 'Marketing', icon: 'megaphone-outline' as const },
  { value: 'Vendor Payment', icon: 'cart-outline' as const, sub: 'Supplier settlements' },
  { value: 'Other', icon: 'ellipsis-horizontal-outline' as const }
];

const INCOME_CATEGORIES = [
  { value: 'Other Income', icon: 'cash-outline' as const },
  { value: 'Credit Recovery', icon: 'people-outline' as const, sub: 'Customer credit received' },
  { value: 'Function Advance', icon: 'calendar-outline' as const, sub: 'Hall / event bookings' },
  { value: 'Misc', icon: 'ellipsis-horizontal-outline' as const }
];

export default function DayBook({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();
  const { currentUser } = useAuth();

  // Day Book State
  const [search, setSearch] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [filterMode, setFilterMode] = useState<'all' | 'in' | 'out'>('all');
  const [newEntryVisible, setNewEntryVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  // New Transaction Form State
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('Provisions');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'cash' | 'bank'>('cash');
  const [attachments, setAttachments] = useState<AttachmentResult[]>([]);
  const [viewingDoc, setViewingDoc] = useState<AttachmentResult | null>(null);

  const selectedDateKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    return dateKey(d);
  }, [dayOffset]);

  const finance = useMemo(() => financeForDay(state, selectedDateKey), [state, selectedDateKey]);
  const cashAmount = useMemo(() => cashInHand(state), [state]);

  const dayEntries = useMemo(() => {
    const list: any[] = [];

    // Add Sales (Hidden for cashiers)
    if (currentUser?.role !== 'cashier') {
      state.sales.forEach((s) => {
        if (keyOf(s.date) === selectedDateKey) {
          list.push({
            id: s.id,
            date: s.date,
            title: s.description,
            sub: `${s.dept.toUpperCase()}${s.billNo ? ' · ' + s.billNo : ''}${s.gstAmount ? ' · GST ' + inr(s.gstAmount) : ''}`,
            amount: s.total,
            positive: true,
            icon: 'receipt-outline',
            mode: s.mode
          });
        }
      });
    }

    // Add Transactions
    state.txns.forEach((t) => {
      if (keyOf(t.date) === selectedDateKey) {
        // Cashiers only see transactions they created + seed transactions
        if (currentUser?.role === 'cashier') {
          const isOwn = t.userId === currentUser.id;
          const isSeed = !t.userId;
          if (!isOwn && !isSeed) return;
        }

        list.push({
          id: t.id,
          date: t.date,
          title: t.description,
          sub: t.category,
          amount: t.amount,
          positive: t.kind === 'income',
          icon: t.kind === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline',
          mode: t.mode,
          hasBill: t.hasBill,
          attachments: (t as any).attachments || []
        });
      }
    });

    // Add Bank Moves (Hidden for cashiers)
    if (currentUser?.role !== 'cashier') {
      state.bankMoves.forEach((bm) => {
        if (keyOf(bm.date) === selectedDateKey) {
          list.push({
            id: bm.id,
            date: bm.date,
            title: bm.note || bm.kind,
            sub: `BANK ${bm.kind.toUpperCase()}`,
            amount: bm.amount,
            positive: bm.kind === 'withdraw',
            icon: 'swap-horizontal-outline',
            mode: 'bank'
          });
        }
      });
    }

    return list
      .filter((e) => {
        if (filterMode === 'all') return true;
        return filterMode === 'in' ? e.positive : !e.positive;
      })
      .filter((e) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return e.title.toLowerCase().includes(q) || e.sub.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state, selectedDateKey, filterMode, search]);

  const handlePickAttachment = async (type: 'camera' | 'gallery' | 'document') => {
    const res =
      type === 'camera'
        ? await captureBillPhoto()
        : type === 'gallery'
        ? await pickBillImage()
        : await pickBillDocument();

    if (res) {
      setAttachments((prev) => [...prev, res]);
    }
  };

  const handleOpenDoc = (doc: AttachmentResult) => {
    if (doc.kind === 'pdf' && Platform.OS === 'web') {
      try {
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(`<iframe src="${doc.uri}" style="width:100%;height:100%;border:0" title="${doc.name}"></iframe>`);
          return;
        }
      } catch {}
    }
    setViewingDoc(doc);
  };

  const handleSaveEntry = () => {
    const parsedAmt = parseNum(amount);
    if (!parsedAmt || !description.trim()) return;

    const txnId = uid();
    const txn = {
      id: txnId,
      date: new Date().toISOString(),
      kind,
      category,
      description: description.trim(),
      amount: parsedAmt,
      mode,
      bankId: mode === 'bank' ? state.settings.defaultBankId : undefined,
      hasBill: attachments.length > 0,
      attachments: attachments.length ? attachments : undefined,
      userId: currentUser?.id,
      userName: currentUser?.name
    };

    dispatch({ type: 'ADD_TXN', txn });
    setNewEntryVisible(false);
    setDescription('');
    setAmount('');
    setAttachments([]);
  };

  const dayLabelText =
    dayOffset === 0
      ? 'Today'
      : dayOffset === 1
      ? 'Yesterday'
      : new Date(selectedDateKey + 'T12:00:00').toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short'
        });

  // Cashier Stats Computation
  const cashierReceived = useMemo(() => {
    return dayEntries
      .filter((e) => e.positive)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [dayEntries]);

  const cashierPaidOut = useMemo(() => {
    return dayEntries
      .filter((e) => !e.positive)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [dayEntries]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        {/* Header Controls */}
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>Day Book</Text>
          <Row style={{ gap: 8 }}>
            <TouchableOpacity
              disabled={currentUser?.role === 'cashier' && dayOffset >= 4}
              onPress={() => setDayOffset((prev) => prev + 1)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (currentUser?.role === 'cashier' && dayOffset >= 4) ? 0.4 : 1
              }}
            >
              <Ionicons name="chevron-back" size={17} color={theme.sub} />
            </TouchableOpacity>
            <View
              style={{
                paddingHorizontal: 12,
                height: 34,
                borderRadius: 17,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }}>{dayLabelText}</Text>
            </View>
            <TouchableOpacity
              disabled={dayOffset === 0}
              onPress={() => setDayOffset((prev) => Math.max(0, prev - 1))}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: dayOffset === 0 ? 0.4 : 1
              }}
            >
              <Ionicons name="chevron-forward" size={17} color={theme.sub} />
            </TouchableOpacity>
          </Row>
        </Row>

        {/* Today's Day Book Financial stats */}
        <Card style={{ padding: 14 }}>
          <Row>
            <StatPill
              label="Received"
              value={inr(currentUser?.role === 'cashier' ? cashierReceived : (finance.revenue + finance.otherIncome))}
              color={theme.green}
            />
            <StatPill
              label="Paid Out"
              value={inr(currentUser?.role === 'cashier' ? cashierPaidOut : finance.expenses)}
              color={theme.red}
            />
            {currentUser?.role === 'cashier' ? (
              <StatPill
                label="Net Entered"
                value={inr(cashierReceived - cashierPaidOut)}
                color={cashierReceived - cashierPaidOut >= 0 ? theme.green : theme.red}
              />
            ) : (
              <StatPill label="Cash in Hand" value={inr(cashAmount)} />
            )}
          </Row>
        </Card>

        {/* Search Bar */}
        <Row style={{ marginTop: 12, gap: 0 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 12
            }}
          >
            <Ionicons name="search" size={16} color={theme.faint} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search entries..."
              placeholderTextColor={theme.faint}
              style={{
                flex: 1,
                paddingVertical: 9,
                paddingHorizontal: 8,
                color: theme.text,
                fontSize: 14
              }}
              returnKeyType="search"
            />
          </View>
        </Row>

        {/* Tab Filters */}
        <Row style={{ marginTop: 10 }}>
          <Chip label="All" active={filterMode === 'all'} onPress={() => setFilterMode('all')} />
          <Chip label="Money In" active={filterMode === 'in'} onPress={() => setFilterMode('in')} color={theme.green} />
          <Chip label="Money Out" active={filterMode === 'out'} onPress={() => setFilterMode('out')} color={theme.red} />
        </Row>
      </View>

      {/* Transactions List */}
      <FlatList
        data={dayEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="book-outline" text="No entries for this day" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedEntry(item)}
          >
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
                backgroundColor: item.positive ? theme.greenSoft : theme.redSoft,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons
                name={item.icon}
                size={19}
                color={item.positive ? theme.green : theme.red}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }} numberOfLines={1}>
                {item.title}
              </Text>
              <Row style={{ gap: 6, marginTop: 3 }}>
                <Text style={{ color: theme.faint, fontSize: 11 }}>
                  {item.sub} · {fmtDateTime(item.date).split(', ')[1]}
                </Text>
                {item.hasBill && <Ionicons name="attach" size={12} color={theme.blue} />}
              </Row>

              {/* Attachment Thumbnails */}
              {item.attachments && item.attachments.length > 0 && (
                <Row style={{ gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                  {item.attachments.map((doc: AttachmentResult) => (
                    <TouchableOpacity key={doc.id} onPress={(e) => { e.stopPropagation?.(); handleOpenDoc(doc); }}>
                      {doc.kind === 'image' ? (
                        <Image
                          source={{ uri: doc.uri }}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: theme.border
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            backgroundColor: theme.redSoft,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Ionicons name="document-text" size={18} color={theme.red} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </Row>
              )}
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 15,
                  color: item.positive ? theme.green : theme.red
                }}
              >
                {item.positive ? '+' : '-'}
                {inr(item.amount)}
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
          </TouchableOpacity>
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => {
          setKind('expense');
          setCategory('Provisions');
          setDescription('');
          setAmount('');
          setMode('cash');
          setAttachments([]);
          setNewEntryVisible(true);
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

      {/* Modal: New Day Book Entry */}
      <Sheet visible={newEntryVisible} onClose={() => setNewEntryVisible(false)} title="New Day Book Entry">
        <Segmented
          options={[
            { key: 'expense', label: 'Expense / Paid' },
            { key: 'income', label: 'Income / Received' }
          ]}
          value={kind}
          onChange={(val) => {
            setKind(val as any);
            setCategory(val === 'expense' ? 'Provisions' : 'Other Income');
          }}
        />

        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          options={kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES}
        />

        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder={kind === 'expense' ? 'e.g. Vegetables from market' : 'e.g. Hall advance booking'}
        />

        <Field
          label="Amount (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
        />

        <Segmented
          options={[
            { key: 'cash', label: 'Cash' },
            { key: 'bank', label: 'Bank / UPI' }
          ]}
          value={mode}
          onChange={(val) => setMode(val as any)}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.sub, marginBottom: 8 }}>
          Supporting Documents (bill / receipt)
        </Text>
        <Row style={{ gap: 8, marginBottom: 14 }}>
          <TouchableOpacity
            onPress={() => handlePickAttachment('camera')}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 12,
              alignItems: 'center',
              gap: 4,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border
            }}
          >
            <Ionicons name="camera-outline" size={19} color={theme.primary} />
            <Text style={{ color: theme.sub, fontSize: 12, fontWeight: '600' }}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handlePickAttachment('gallery')}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 12,
              alignItems: 'center',
              gap: 4,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border
            }}
          >
            <Ionicons name="image-outline" size={19} color={theme.primary} />
            <Text style={{ color: theme.sub, fontSize: 12, fontWeight: '600' }}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handlePickAttachment('document')}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 12,
              alignItems: 'center',
              gap: 4,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border
            }}
          >
            <Ionicons name="document-attach-outline" size={19} color={theme.primary} />
            <Text style={{ color: theme.sub, fontSize: 12, fontWeight: '600' }}>PDF / File</Text>
          </TouchableOpacity>
        </Row>

        {/* Selected Attachments list */}
        {attachments.length > 0 && (
          <Row style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {attachments.map((item) => (
              <View key={item.id} style={{ position: 'relative' }}>
                {item.kind === 'image' ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.border
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 10,
                      backgroundColor: theme.redSoft,
                      borderWidth: 1,
                      borderColor: theme.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4
                    }}
                  >
                    <Ionicons name="document-text" size={22} color={theme.red} />
                    <Text style={{ fontSize: 8, color: theme.sub, marginTop: 3 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => setAttachments((prev) => prev.filter((doc) => doc.id !== item.id))}
                  style={{
                    position: 'absolute',
                    top: -7,
                    right: -7,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: theme.red,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ionicons name="close" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </Row>
        )}

        <PrimaryButton title="Save Entry" onPress={handleSaveEntry} icon="checkmark" />
      </Sheet>

      {/* Entry Detail Sheet */}
      <Sheet
        visible={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Entry Details"
      >
        {selectedEntry && (
          <View>
            {/* Type Badge */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: selectedEntry.positive ? theme.greenSoft : theme.redSoft,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons
                  name={selectedEntry.icon}
                  size={22}
                  color={selectedEntry.positive ? theme.green : theme.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: theme.text }}>
                  {selectedEntry.title}
                </Text>
                <Text style={{ color: theme.faint, fontSize: 12, marginTop: 2 }}>
                  {selectedEntry.sub}
                </Text>
              </View>
              <Text
                style={{
                  fontWeight: '900',
                  fontSize: 20,
                  color: selectedEntry.positive ? theme.green : theme.red
                }}
              >
                {selectedEntry.positive ? '+' : '-'}{inr(selectedEntry.amount)}
              </Text>
            </View>

            {/* Info Rows */}
            <Card style={{ marginBottom: 14, padding: 14 }}>
              {[
                ['Date & Time', fmtDateTime(selectedEntry.date)],
                ['Payment Mode', (selectedEntry.mode || '').toUpperCase()],
                ['Entry Type', selectedEntry.positive ? 'Money In (Income / Sale)' : 'Money Out (Expense / Payment)'],
              ].map(([label, value], idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingVertical: 8,
                    borderBottomWidth: idx < 2 ? 1 : 0,
                    borderBottomColor: theme.border
                  }}
                >
                  <Text style={{ color: theme.sub, fontSize: 13, flex: 1 }}>{label}</Text>
                  <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13, flex: 2, textAlign: 'right' }}>{value}</Text>
                </View>
              ))}
            </Card>

            {/* Attachments Section */}
            {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: theme.sub,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 10
                  }}
                >
                  Supporting Documents ({selectedEntry.attachments.length})
                </Text>
                <Row style={{ gap: 10, flexWrap: 'wrap' }}>
                  {selectedEntry.attachments.map((doc: AttachmentResult) => (
                    <TouchableOpacity
                      key={doc.id}
                      onPress={() => handleOpenDoc(doc)}
                      style={{ alignItems: 'center', gap: 4 }}
                    >
                      {doc.kind === 'image' ? (
                        <Image
                          source={{ uri: doc.uri }}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: theme.border
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 12,
                            backgroundColor: theme.redSoft,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 6
                          }}
                        >
                          <Ionicons name="document-text" size={28} color={theme.red} />
                        </View>
                      )}
                      <Text style={{ fontSize: 10, color: theme.faint, maxWidth: 80 }} numberOfLines={2}>
                        {doc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Row>
              </View>
            )}

            {/* No attachment note */}
            {(!selectedEntry.attachments || selectedEntry.attachments.length === 0) &&
              !selectedEntry.positive && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: theme.amberSoft,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 14
                }}
              >
                <Ionicons name="alert-circle-outline" size={17} color={theme.amber} />
                <Text style={{ color: theme.amber, fontSize: 12, fontWeight: '600', flex: 1 }}>
                  No bill / receipt attached to this expense entry.
                </Text>
              </View>
            )}
          </View>
        )}
      </Sheet>

      {/* Modal: View Attachment */}
      <Modal visible={!!viewingDoc} transparent={true} animationType="fade" onRequestClose={() => setViewingDoc(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={() => setViewingDoc(null)}
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 60 : 40,
              right: 20,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {viewingDoc?.kind === 'image' ? (
            <Image
              source={{ uri: viewingDoc.uri }}
              style={{ width: '100%', height: '78%' }}
              resizeMode="contain"
            />
          ) : (
            <View style={{ alignItems: 'center', padding: 30 }}>
              <Ionicons name="document-text" size={64} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>
                {viewingDoc?.name}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                PDF attached to this entry.{'\n'}
                On Android it opens with your PDF viewer via share.
              </Text>
            </View>
          )}

          <Text style={{ position: 'absolute', bottom: 40, alignSelf: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            {viewingDoc?.name}
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
