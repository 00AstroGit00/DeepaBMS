import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  cashInHand,
  bankBalance
} from '../context/StoreContext';
import {
  Card,
  Row,
  StatPill,
  Segmented,
  Select,
  Field,
  PrimaryButton,
  EmptyState,
  Sheet
} from '../components/Primitives';
import { inr, uid, parseNum, fmtDateTime } from '../utils/helpers';

export default function Banking({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();

  // Dialog visible
  const [txnSheetVisible, setTxnSheetVisible] = useState(false);

  // Form states
  const [txnKind, setTxnKind] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [fromBankId, setFromBankId] = useState(state.banks[0]?.id || '');
  const [toBankId, setToBankId] = useState(state.banks[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const cashAmount = useMemo(() => cashInHand(state), [state]);
  const totalBankAmount = useMemo(() => bankBalance(state), [state]);

  const bankOptions = useMemo(() => {
    return state.banks.map((b) => ({
      value: b.id,
      label: b.name,
      icon: 'business-outline' as const,
      sub: `${b.accountNo} · balance ${inr(bankBalance(state, b.id))}`
    }));
  }, [state.banks, state.bankMoves]);

  const transferToOptions = useMemo(() => {
    return state.banks
      .filter((b) => b.id !== fromBankId)
      .map((b) => ({
        value: b.id,
        label: b.name,
        icon: 'business-outline' as const,
        sub: b.accountNo
      }));
  }, [state.banks, fromBankId]);

  const getBankName = (id: string) => {
    const b = state.banks.find((bank) => bank.id === id);
    return b ? b.name.split(' · ')[0] : '';
  };

  const handleSaveTransaction = () => {
    const amt = parseNum(amount);
    if (!amt) return;

    // 1. Check Cash in Hand for Deposits
    if (txnKind === 'deposit' && amt > cashAmount) {
      Alert.alert('Not Enough Cash', `Cash in hand is ${inr(cashAmount)}. Cannot deposit ${inr(amt)}.`);
      return;
    }

    // 2. Check Bank Balance for Withdrawals / Transfers
    const sourceBalance = bankBalance(state, fromBankId);
    if ((txnKind === 'withdraw' || txnKind === 'transfer') && amt > sourceBalance) {
      Alert.alert(
        'Insufficient Bank Balance',
        `${getBankName(fromBankId)} balance is ${inr(sourceBalance)}. Cannot move ${inr(amt)}.`
      );
      return;
    }

    // 3. Resolve Target Bank for Transfers
    let targetId: string | undefined = undefined;
    if (txnKind === 'transfer') {
      targetId = toBankId !== fromBankId ? toBankId : state.banks.find((b) => b.id !== fromBankId)?.id;
      if (!targetId) {
        Alert.alert('Transfer Error', 'Need a second bank account to transfer to.');
        return;
      }
    }

    const defaultNote =
      txnKind === 'deposit'
        ? 'Cash deposit'
        : txnKind === 'withdraw'
        ? 'Cash withdrawal'
        : 'Inter-bank transfer';

    const move = {
      id: uid(),
      date: new Date().toISOString(),
      kind: txnKind,
      amount: amt,
      bankId: fromBankId,
      toBankId: targetId,
      note: note.trim() || defaultNote
    };

    dispatch({
      type: 'ADD_BANK_MOVE',
      move
    });

    setTxnSheetVisible(false);
    setAmount('');
    setNote('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
          Banking
        </Text>

        {/* Global summary */}
        <Card style={{ padding: 14, marginBottom: 12 }}>
          <Row>
            <StatPill label="Cash in Hand" value={inr(cashAmount)} color={theme.green} />
            <StatPill label="Total Bank Balance" value={inr(totalBankAmount)} color={theme.blue} />
          </Row>
        </Card>

        {/* Individual bank account balances */}
        {state.banks.map((b) => (
          <Card
            key={b.id}
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
                borderRadius: 12,
                backgroundColor: theme.blueSoft,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="business-outline" size={19} color={theme.blue} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{b.name}</Text>
              <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                {b.accountNo}
                {b.id === state.settings.defaultBankId ? ' · Default for UPI/Card' : ''}
              </Text>
            </View>

            <Text style={{ fontWeight: '800', fontSize: 15, color: theme.blue }}>
              {inr(bankBalance(state, b.id))}
            </Text>
          </Card>
        ))}

        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: theme.sub,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginTop: 14,
            marginBottom: 8
          }}
        >
          Recent Movements
        </Text>
      </View>

      {/* Recent Contra Movements list */}
      <FlatList
        data={state.bankMoves}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="swap-horizontal-outline" text="No bank movements yet" />}
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
            <Ionicons
              name={
                item.kind === 'deposit'
                  ? 'arrow-down-circle-outline'
                  : item.kind === 'withdraw'
                  ? 'arrow-up-circle-outline'
                  : 'swap-horizontal-outline'
              }
              size={22}
              color={item.kind === 'deposit' ? theme.green : item.kind === 'withdraw' ? theme.amber : theme.blue}
            />

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{item.note}</Text>
              <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                {item.kind === 'transfer'
                  ? `${getBankName(item.bankId)} ➔ ${getBankName(item.toBankId || '')}`
                  : getBankName(item.bankId)}
                {' · '}
                {fmtDateTime(item.date)}
              </Text>
            </View>

            <Text style={{ fontWeight: '800', fontSize: 15, color: theme.text }}>{inr(item.amount)}</Text>
          </Card>
        )}
      />

      {/* Floating contra transaction trigger */}
      <TouchableOpacity
        onPress={() => {
          setTxnKind('deposit');
          setFromBankId(state.banks[0]?.id || '');
          setToBankId(state.banks[1]?.id || '');
          setAmount('');
          setNote('');
          setTxnSheetVisible(true);
        }}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: theme.blue,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 }
        }}
      >
        <Ionicons name="swap-horizontal" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Sheet Modal: Bank Transaction */}
      <Sheet visible={txnSheetVisible} onClose={() => setTxnSheetVisible(false)} title="Bank Transaction">
        <Segmented
          options={[
            { key: 'deposit', label: 'Deposit' },
            { key: 'withdraw', label: 'Withdraw' },
            { key: 'transfer', label: 'Transfer' }
          ]}
          value={txnKind}
          onChange={(val) => {
            setTxnKind(val as any);
            if (val === 'transfer' && fromBankId === toBankId) {
              // Auto select first target bank that is not source bank
              const alt = state.banks.find((b) => b.id !== fromBankId);
              if (alt) setToBankId(alt.id);
            }
          }}
        />

        <Select
          label={txnKind === 'transfer' ? 'From Account' : 'Account'}
          value={fromBankId}
          onChange={(val) => {
            setFromBankId(val);
            if (txnKind === 'transfer' && val === toBankId) {
              const alt = state.banks.find((b) => b.id !== val);
              if (alt) setToBankId(alt.id);
            }
          }}
          options={bankOptions}
          color={theme.blue}
        />

        {txnKind === 'transfer' && (
          <Select
            label="To Account"
            value={toBankId}
            onChange={setToBankId}
            options={transferToOptions}
            color={theme.purple}
          />
        )}

        <Field label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />

        <Field label="Note" value={note} onChangeText={setNote} placeholder="e.g. Weekly cash deposit" />

        {txnKind !== 'transfer' && (
          <Text style={{ color: theme.faint, fontSize: 12, marginBottom: 14 }}>
            {txnKind === 'deposit'
              ? 'Cash in hand will decrease, bank will increase.'
              : 'Bank will decrease, cash in hand will increase.'}
          </Text>
        )}

        <PrimaryButton title="Save Transaction" onPress={handleSaveTransaction} icon="checkmark" color={theme.blue} />
      </Sheet>
    </SafeAreaView>
  );
}
