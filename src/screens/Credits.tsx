import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  customerOutstanding,
  vendorPayables,
  CreditAccount
} from '../context/StoreContext';
import {
  Card,
  Row,
  StatPill,
  Segmented,
  Badge,
  Sheet,
  Field,
  PrimaryButton,
  EmptyState
} from '../components/Primitives';
import { inr, uid, parseNum, fmtDate } from '../utils/helpers';

export default function Credits({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();

  // Screen Tab state: 'customer' or 'vendor'
  const [activeTab, setActiveTab] = useState<'customer' | 'vendor'>('customer');

  // Selected account detail sheet
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // New account form sheet
  const [addAccountVisible, setAddAccountVisible] = useState(false);

  // Form states: Entry (Payment/Credit)
  const [opMode, setOpMode] = useState<'payment' | 'credit'>('payment');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');

  // Form states: New Account
  const [newAccName, setNewAccName] = useState('');
  const [newAccPhone, setNewAccPhone] = useState('');
  const [newAccGstin, setNewAccGstin] = useState('');

  const totalDebtors = useMemo(() => customerOutstanding(state), [state]);
  const totalCreditors = useMemo(() => vendorPayables(state), [state]);

  const accountsList = useMemo(() => {
    return state.credits
      .filter((acc) => acc.type === activeTab)
      .sort((a, b) => b.balance - a.balance);
  }, [state.credits, activeTab]);

  const activeAccount = useMemo(() => {
    return state.credits.find((acc) => acc.id === selectedAccountId) || null;
  }, [state.credits, selectedAccountId]);

  const handleCreateAccount = () => {
    if (!newAccName.trim()) return;

    const account = {
      id: uid(),
      name: newAccName.trim(),
      phone: newAccPhone.trim(),
      type: activeTab,
      gstin: activeTab === 'vendor' && newAccGstin.trim() ? newAccGstin.trim() : undefined,
      balance: 0,
      history: []
    };

    dispatch({
      type: 'ADD_CREDIT_ACCOUNT',
      account
    });

    setAddAccountVisible(false);
    setNewAccName('');
    setNewAccPhone('');
    setNewAccGstin('');
  };

  const handleSaveEntry = () => {
    if (!activeAccount) return;

    const amt = parseNum(entryAmount);
    if (!amt) return;

    if (opMode === 'payment' && amt > activeAccount.balance) {
      Alert.alert(
        'Invalid Settlement',
        `Outstanding is ${inr(activeAccount.balance)}. Payment cannot exceed the balance.`
      );
      return;
    }

    // Auto-create a cash effect DayBook transaction if doing physical payment settlement
    let cashEffect: any = undefined;
    if (opMode === 'payment') {
      if (activeAccount.type === 'customer') {
        cashEffect = {
          id: uid(),
          date: new Date().toISOString(),
          kind: 'income' as const,
          category: 'Credit Recovery',
          description: `Credit received - ${activeAccount.name}`,
          amount: amt,
          mode: 'cash' as const
        };
      } else {
        cashEffect = {
          id: uid(),
          date: new Date().toISOString(),
          kind: 'expense' as const,
          category: 'Vendor Payment',
          description: `Paid to ${activeAccount.name}`,
          amount: amt,
          mode: 'cash' as const
        };
      }
    }

    const entry = {
      id: uid(),
      date: new Date().toISOString(),
      kind: opMode,
      amount: amt,
      note: entryNote.trim() || (opMode === 'credit' ? 'Credit given' : 'Payment received')
    };

    dispatch({
      type: 'CREDIT_ENTRY',
      accountId: activeAccount.id,
      entry,
      cashEffect
    });

    setSelectedAccountId(null);
    setEntryAmount('');
    setEntryNote('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top Header stats */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
          Credits & Payables
        </Text>

        <Card style={{ padding: 14, marginBottom: 12 }}>
          <Row>
            <StatPill label="Customers Owe Us" value={inr(totalDebtors)} color={theme.amber} />
            <StatPill label="We Owe Vendors" value={inr(totalCreditors)} color={theme.red} />
          </Row>
        </Card>

        <Segmented
          options={[
            { key: 'customer', label: 'Customer Credits' },
            { key: 'vendor', label: 'Vendor Payables' }
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />
      </View>

      {/* Accounts List */}
      <FlatList
        data={accountsList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="people-outline" text={`No ${activeTab} accounts yet`} />}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedAccountId(item.id);
              setOpMode('payment');
              setEntryAmount('');
              setEntryNote('');
            }}
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
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: activeTab === 'customer' ? theme.amberSoft : theme.redSoft,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    color: activeTab === 'customer' ? theme.amber : theme.red,
                    fontSize: 15
                  }}
                >
                  {item.name.charAt(0)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                  {item.phone}
                  {item.gstin ? ' · GSTIN ' + item.gstin : ''}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 15,
                    color: item.balance > 0 ? (activeTab === 'customer' ? theme.amber : theme.red) : theme.green
                  }}
                >
                  {inr(item.balance)}
                </Text>
                <Text
                  style={{
                    color: theme.faint,
                    fontSize: 10,
                    marginTop: 2
                  }}
                >
                  {item.balance > 0 ? 'OUTSTANDING' : 'SETTLED'}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* Floating Add Account button */}
      <TouchableOpacity
        onPress={() => {
          setNewAccName('');
          setNewAccPhone('');
          setNewAccGstin('');
          setAddAccountVisible(true);
        }}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: theme.amber,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 }
        }}
      >
        <Ionicons name="person-add-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Sheet Modal: Ledger Entry (Payment/Credit) */}
      <Sheet visible={!!activeAccount} onClose={() => setSelectedAccountId(null)} title={activeAccount?.name || ''}>
        {activeAccount && (
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Outstanding Summary */}
            <Card
              style={{
                backgroundColor: activeAccount.balance > 0 ? theme.amberSoft : theme.greenSoft,
                borderColor: activeAccount.balance > 0 ? theme.amber : theme.green,
                marginBottom: 16,
                padding: 14
              }}
            >
              <Text style={{ color: theme.sub, fontSize: 13 }}>Outstanding Balance</Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '900',
                  color: activeAccount.balance > 0 ? theme.amber : theme.green,
                  marginTop: 2
                }}
              >
                {inr(activeAccount.balance)}
              </Text>
            </Card>

            <Segmented
              options={[
                {
                  key: 'payment',
                  label: activeAccount.type === 'customer' ? 'Receive Payment' : 'Pay Vendor'
                },
                { key: 'credit', label: 'Add Credit' }
              ]}
              value={opMode}
              onChange={(val) => setOpMode(val as any)}
            />

            <Field label="Amount (₹)" value={entryAmount} onChangeText={setEntryAmount} keyboardType="numeric" placeholder="0" />

            <Field
              label="Note"
              value={entryNote}
              onChangeText={setEntryNote}
              placeholder={opMode === 'payment' ? 'e.g. Part payment - cash' : 'e.g. Invoice credit purchase'}
            />

            <PrimaryButton
              title={opMode === 'payment' ? 'Record Settlement' : 'Record Credit'}
              onPress={handleSaveEntry}
              icon="checkmark"
              color={opMode === 'payment' ? theme.green : theme.amber}
            />

            {/* Ledger History List */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: theme.sub,
                marginTop: 22,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
            >
              Ledger History
            </Text>

            {activeAccount.history.length === 0 ? (
              <Text style={{ color: theme.faint, fontSize: 13 }}>No entries yet.</Text>
            ) : (
              activeAccount.history.map((t) => (
                <Row
                  key={t.id}
                  style={{
                    justifyContent: 'space-between',
                    paddingVertical: 9,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{t.note}</Text>
                    <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>{fmtDate(t.date)}</Text>
                  </View>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: t.kind === 'credit' ? theme.amber : theme.green
                    }}
                  >
                    {t.kind === 'credit' ? '+' : '-'}
                    {inr(t.amount)}
                  </Text>
                </Row>
              ))
            )}
          </ScrollView>
        )}
      </Sheet>

      {/* Sheet Modal: New Customer/Vendor Account */}
      <Sheet
        visible={addAccountVisible}
        onClose={() => setAddAccountVisible(false)}
        title={`New ${activeTab === 'customer' ? 'Customer' : 'Vendor'} Account`}
      >
        <Field
          label="Name"
          value={newAccName}
          onChangeText={setNewAccName}
          placeholder={activeTab === 'customer' ? 'Customer name' : 'Vendor / supplier name'}
        />

        <Field label="Phone" value={newAccPhone} onChangeText={setNewAccPhone} keyboardType="phone-pad" placeholder="98470 XXXXX" />

        {activeTab === 'vendor' && (
          <Field label="GSTIN (optional)" value={newAccGstin} onChangeText={setNewAccGstin} placeholder="32XXXXXXXXXXXXX" />
        )}

        <PrimaryButton
          title="Create Account"
          onPress={handleCreateAccount}
          icon="person-add-outline"
          color={theme.amber}
        />
      </Sheet>
    </SafeAreaView>
  );
}
