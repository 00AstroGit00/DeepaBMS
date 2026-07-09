import React, { useState, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  cashInHand,
  bankBalance,
  BankStatement,
  BankStatementRow
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
  Sheet,
  Badge
} from '../components/Primitives';
import { inr, uid, parseNum, fmtDateTime, dateKey, fmtDate } from '../utils/helpers';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseBankStatement, ParsedBankRow } from '../utils/bankStatementParser';
import { warnUser } from '../utils/fileExporter';

// ─── Date Picker Helper ────────────────────────────────────────────────────

function buildDateOptions(monthsBack: number = 13) {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    opts.push({ value: key, label });
  }
  return opts;
}

const monthOpts = buildDateOptions(13);

function monthRangeFilter(date: string, fromMonth: string, toMonth: string): boolean {
  const d = dateKey(new Date(date)).slice(0, 7); // yyyy-MM
  return d >= fromMonth && d <= toMonth;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Banking({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();

  // Tab
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'statements'>('summary');

  // Manual contra-move sheet
  const [txnSheetVisible, setTxnSheetVisible] = useState(false);
  const [txnKind, setTxnKind] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [fromBankId, setFromBankId] = useState(state.banks[0]?.id || '');
  const [toBankId, setToBankId] = useState(state.banks[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Transactions tab date filter
  const [fromMonth, setFromMonth] = useState(monthOpts[1]?.value || monthOpts[0]?.value);
  const [toMonth, setToMonth] = useState(monthOpts[0]?.value);
  const [filterBankId, setFilterBankId] = useState('all');

  // Statement import state
  const [importing, setImporting] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    statement: Omit<BankStatement, 'id' | 'importedAt'>;
    rows: ParsedBankRow[];
    fileName: string;
    bankGuess: string;
  } | null>(null);
  const [importBankId, setImportBankId] = useState(state.banks[0]?.id || '');
  const [previewSheetVisible, setPreviewSheetVisible] = useState(false);

  // Selected statement for detail view
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null);
  const [stmtDetailVisible, setStmtDetailVisible] = useState(false);
  const [stmtRowSearch, setStmtRowSearch] = useState('');
  const [stmtRowFilter, setStmtRowFilter] = useState<'all' | 'credit' | 'debit'>('all');

  // ── Computed values ─────────────────────────────────────────────────────

  const cashAmount = useMemo(() => cashInHand(state), [state]);
  const totalBankAmount = useMemo(() => bankBalance(state), [state]);

  const bankOptions = useMemo(() => {
    return state.banks.map((b) => ({
      value: b.id,
      label: b.name,
      icon: 'business-outline' as const,
      sub: `${b.accountNo} · Bal ${inr(bankBalance(state, b.id))}`
    }));
  }, [state.banks, state.bankMoves]);

  const bankFilterOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Accounts', icon: 'layers-outline' as const },
      ...state.banks.map((b) => ({
        value: b.id,
        label: b.name.split(' · ')[0],
        icon: 'business-outline' as const
      }))
    ];
  }, [state.banks]);

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

  const getBankName = useCallback(
    (id: string) => {
      const b = state.banks.find((bank) => bank.id === id);
      return b ? b.name.split(' · ')[0] : id;
    },
    [state.banks]
  );

  // All bank movements (contra moves) filtered by date & bank
  const filteredMoves = useMemo(() => {
    return (state.bankMoves ?? [])
      .filter((m) => {
        const inRange = monthRangeFilter(m.date, fromMonth, toMonth);
        const matchesBank =
          filterBankId === 'all' || m.bankId === filterBankId || m.toBankId === filterBankId;
        return inRange && matchesBank;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.bankMoves, fromMonth, toMonth, filterBankId]);

  // ── Statement-specific rows (for detail view) ────────────────────────────

  const filteredStmtRows = useMemo(() => {
    if (!selectedStatement) return [];
    return selectedStatement.rows
      .filter((r) => {
        if (stmtRowFilter === 'credit') return r.credit > 0;
        if (stmtRowFilter === 'debit') return r.debit > 0;
        return true;
      })
      .filter((r) => {
        if (!stmtRowSearch) return true;
        const q = stmtRowSearch.toLowerCase();
        return (
          r.description.toLowerCase().includes(q) ||
          r.refNo.toLowerCase().includes(q)
        );
      });
  }, [selectedStatement, stmtRowFilter, stmtRowSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveTransaction = () => {
    const amt = parseNum(amount);
    if (!amt) return;

    if (txnKind === 'deposit' && amt > cashAmount) {
      Alert.alert('Not Enough Cash', `Cash in hand is ${inr(cashAmount)}. Cannot deposit ${inr(amt)}.`);
      return;
    }

    const sourceBalance = bankBalance(state, fromBankId);
    if ((txnKind === 'withdraw' || txnKind === 'transfer') && amt > sourceBalance) {
      Alert.alert(
        'Insufficient Bank Balance',
        `${getBankName(fromBankId)} balance is ${inr(sourceBalance)}. Cannot move ${inr(amt)}.`
      );
      return;
    }

    let targetId: string | undefined = undefined;
    if (txnKind === 'transfer') {
      targetId = toBankId !== fromBankId ? toBankId : state.banks.find((b) => b.id !== fromBankId)?.id;
      if (!targetId) {
        Alert.alert('Transfer Error', 'Need a second bank account to transfer to.');
        return;
      }
    }

    const defaultNote =
      txnKind === 'deposit' ? 'Cash deposit' : txnKind === 'withdraw' ? 'Cash withdrawal' : 'Inter-bank transfer';

    dispatch({
      type: 'ADD_BANK_MOVE',
      move: {
        id: uid(),
        date: new Date().toISOString(),
        kind: txnKind,
        amount: amt,
        bankId: fromBankId,
        toBankId: targetId,
        note: note.trim() || defaultNote
      }
    });

    setTxnSheetVisible(false);
    setAmount('');
    setNote('');
  };

  const handleUploadStatement = async () => {
    try {
      setImporting(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
        multiple: false
      });

      if (result.canceled || !result.assets?.length) {
        setImporting(false);
        return;
      }

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.name || 'statement.csv';

      // Read content
      let content = '';
      if (Platform.OS === 'web') {
        // On web, read via fetch
        const resp = await fetch(fileUri);
        content = await resp.text();
      } else {
        content = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8
        });
      }

      if (!content.trim()) {
        warnUser('Empty File', 'The selected file appears to be empty.');
        setImporting(false);
        return;
      }

      const parsed = parseBankStatement(content);

      if (parsed.errors.length > 0 && parsed.rows.length === 0) {
        warnUser('Parse Error', parsed.errors.join('\n'));
        setImporting(false);
        return;
      }

      if (parsed.rows.length === 0) {
        warnUser('No Data', 'No transaction rows could be extracted from this file. Please check the format.');
        setImporting(false);
        return;
      }

      const fromDate = parsed.rows[0]?.date || new Date().toISOString();
      const toDate = parsed.rows[parsed.rows.length - 1]?.date || new Date().toISOString();

      setParsedPreview({
        statement: {
          bankId: importBankId,
          bankGuess: parsed.bankGuess,
          fileName,
          fromDate,
          toDate,
          totalCredit: parsed.totalCredit,
          totalDebit: parsed.totalDebit,
          openingBalance: parsed.openingBalance,
          closingBalance: parsed.closingBalance,
          rows: parsed.rows
        },
        rows: parsed.rows,
        fileName,
        bankGuess: parsed.bankGuess
      });

      setPreviewSheetVisible(true);
    } catch (err) {
      warnUser('Upload Error', String(err));
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedPreview) return;

    const statement: BankStatement = {
      id: uid(),
      importedAt: new Date().toISOString(),
      ...parsedPreview.statement,
      bankId: importBankId
    };

    dispatch({ type: 'ADD_BANK_STATEMENT', statement });
    setPreviewSheetVisible(false);
    setParsedPreview(null);
    setActiveTab('statements');
  };

  const handleDeleteStatement = (id: string) => {
    Alert.alert(
      'Delete Statement',
      'Are you sure you want to remove this imported bank statement? This only removes the statement from the app, it does not affect any other records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'REMOVE_BANK_STATEMENT', statementId: id });
            setStmtDetailVisible(false);
            setSelectedStatement(null);
          }
        }
      ]
    );
  };

  const openStatementDetail = (stmt: BankStatement) => {
    setSelectedStatement(stmt);
    setStmtRowSearch('');
    setStmtRowFilter('all');
    setStmtDetailVisible(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
          Banking
        </Text>

        {/* Global Summary */}
        <Card style={{ padding: 14, marginBottom: 12 }}>
          <Row>
            <StatPill label="Cash in Hand" value={inr(cashAmount)} color={theme.green} />
            <StatPill label="Total Bank Balance" value={inr(totalBankAmount)} color={theme.blue} />
          </Row>
        </Card>

        {/* Tabs */}
        <Segmented
          options={[
            { key: 'summary', label: 'Summary' },
            { key: 'transactions', label: 'Movements' },
            { key: 'statements', label: 'Statements' }
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />
      </View>

      {/* ── TAB: SUMMARY ──────────────────────────────────────────────── */}
      {activeTab === 'summary' && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
          {/* Bank account cards */}
          {state.banks.map((b) => {
            const bal = bankBalance(state, b.id);
            return (
              <Card
                key={b.id}
                style={{ marginBottom: 10, padding: 16 }}
              >
                <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <Row style={{ gap: 10 }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        backgroundColor: theme.blueSoft,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Ionicons name="business-outline" size={20} color={theme.blue} />
                    </View>
                    <View>
                      <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{b.name.split(' · ')[0]}</Text>
                      <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                        {b.accountNo}{b.id === state.settings.defaultBankId ? ' · Default' : ''}
                      </Text>
                    </View>
                  </Row>
                  <Text style={{ fontWeight: '900', fontSize: 18, color: theme.blue }}>{inr(bal)}</Text>
                </Row>
                {/* Statement count badge */}
                {(() => {
                  const stmtCount = (state.bankStatements || []).filter((s) => s.bankId === b.id).length;
                  return stmtCount > 0 ? (
                    <Row style={{ gap: 6 }}>
                      <Ionicons name="document-text-outline" size={13} color={theme.sub} />
                      <Text style={{ color: theme.sub, fontSize: 11 }}>
                        {stmtCount} statement{stmtCount > 1 ? 's' : ''} imported
                      </Text>
                    </Row>
                  ) : null;
                })()}
              </Card>
            );
          })}

          {/* Quick action buttons */}
          <Row style={{ gap: 10, marginTop: 6 }}>
            <TouchableOpacity
              onPress={() => {
                setTxnKind('deposit');
                setFromBankId(state.banks[0]?.id || '');
                setAmount('');
                setNote('');
                setTxnSheetVisible(true);
              }}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                backgroundColor: theme.greenSoft,
                borderWidth: 1,
                borderColor: theme.green + '44',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Ionicons name="arrow-down-circle-outline" size={22} color={theme.green} />
              <Text style={{ color: theme.green, fontWeight: '700', fontSize: 12 }}>Deposit Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTxnKind('withdraw');
                setFromBankId(state.banks[0]?.id || '');
                setAmount('');
                setNote('');
                setTxnSheetVisible(true);
              }}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                backgroundColor: theme.amberSoft,
                borderWidth: 1,
                borderColor: theme.amber + '44',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Ionicons name="arrow-up-circle-outline" size={22} color={theme.amber} />
              <Text style={{ color: theme.amber, fontWeight: '700', fontSize: 12 }}>Withdraw Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTxnKind('transfer');
                setFromBankId(state.banks[0]?.id || '');
                setToBankId(state.banks[1]?.id || '');
                setAmount('');
                setNote('');
                setTxnSheetVisible(true);
              }}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                backgroundColor: theme.blueSoft,
                borderWidth: 1,
                borderColor: theme.blue + '44',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Ionicons name="swap-horizontal-outline" size={22} color={theme.blue} />
              <Text style={{ color: theme.blue, fontWeight: '700', fontSize: 12 }}>Transfer</Text>
            </TouchableOpacity>
          </Row>

          {/* Upload Statement */}
          <TouchableOpacity
            onPress={() => setActiveTab('statements')}
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: theme.primary + '66',
              borderStyle: 'dashed',
              alignItems: 'center',
              gap: 6,
              flexDirection: 'row',
              justifyContent: 'center'
            }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 14 }}>
              Import Bank Statement
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── TAB: TRANSACTIONS / MOVEMENTS ─────────────────────────────── */}
      {activeTab === 'transactions' && (
        <>
          {/* Date & Bank Filters */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Row style={{ gap: 10, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Select
                  label="From Month"
                  value={fromMonth}
                  onChange={setFromMonth}
                  options={monthOpts}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Select
                  label="To Month"
                  value={toMonth}
                  onChange={setToMonth}
                  options={monthOpts}
                />
              </View>
            </Row>
            <Select
              label="Filter by Account"
              value={filterBankId}
              onChange={setFilterBankId}
              options={bankFilterOptions}
              color={theme.blue}
            />
          </View>

          <FlatList
            data={filteredMoves}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            ListEmptyComponent={<EmptyState icon="swap-horizontal-outline" text="No bank movements in this period" />}
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
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor:
                      item.kind === 'deposit'
                        ? theme.greenSoft
                        : item.kind === 'withdraw'
                        ? theme.amberSoft
                        : theme.blueSoft,
                    alignItems: 'center',
                    justifyContent: 'center'
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
                    size={20}
                    color={item.kind === 'deposit' ? theme.green : item.kind === 'withdraw' ? theme.amber : theme.blue}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }} numberOfLines={1}>
                    {item.note}
                  </Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                    {item.kind === 'transfer'
                      ? `${getBankName(item.bankId)} ➔ ${getBankName(item.toBankId || '')}`
                      : getBankName(item.bankId)}
                    {' · '}
                    {fmtDateTime(item.date)}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: theme.text }}>
                    {inr(item.amount)}
                  </Text>
                  <Badge
                    text={item.kind.toUpperCase()}
                    color={item.kind === 'deposit' ? theme.green : item.kind === 'withdraw' ? theme.amber : theme.blue}
                    soft
                  />
                </View>
              </Card>
            )}
          />
        </>
      )}

      {/* ── TAB: STATEMENTS ───────────────────────────────────────────── */}
      {activeTab === 'statements' && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
          {/* Account selector for import */}
          <Select
            label="Import Statement For Account"
            value={importBankId}
            onChange={setImportBankId}
            options={bankOptions}
            color={theme.blue}
          />

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handleUploadStatement}
            disabled={importing}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 20,
              opacity: importing ? 0.7 : 1
            }}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {importing ? 'Reading file...' : 'Upload Bank Statement (CSV)'}
            </Text>
          </TouchableOpacity>

          {/* Info Card */}
          <Card style={{ backgroundColor: theme.blueSoft, marginBottom: 16, padding: 14 }}>
            <Row style={{ gap: 10, alignItems: 'flex-start' }}>
              <Ionicons name="information-circle-outline" size={20} color={theme.blue} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: theme.blue, fontSize: 13, marginBottom: 4 }}>
                  Supported Formats
                </Text>
                <Text style={{ color: theme.blue, fontSize: 12, lineHeight: 18 }}>
                  • HDFC Bank CSV / Excel export{'\n'}
                  • SBI CSV statement{'\n'}
                  • ICICI Bank statement CSV{'\n'}
                  • Axis / Federal / Kotak CSV{'\n'}
                  • Any CSV with Date, Description, Debit, Credit, Balance columns
                </Text>
              </View>
            </Row>
          </Card>

          {/* Imported Statements List */}
          {(state.bankStatements || []).length === 0 ? (
            <EmptyState icon="document-text-outline" text="No statements imported yet" />
          ) : (
            <>
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
                Imported Statements ({(state.bankStatements || []).length})
              </Text>

              {(state.bankStatements || []).map((stmt) => (
                <TouchableOpacity key={stmt.id} activeOpacity={0.75} onPress={() => openStatementDetail(stmt)}>
                  <Card style={{ marginBottom: 10, padding: 14 }}>
                    <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      <Row style={{ gap: 8 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 11,
                            backgroundColor: theme.primarySoft,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Ionicons name="document-text-outline" size={18} color={theme.primary} />
                        </View>
                        <View>
                          <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13 }} numberOfLines={1}>
                            {stmt.fileName}
                          </Text>
                          <Text style={{ color: theme.faint, fontSize: 11, marginTop: 1 }}>
                            {stmt.bankGuess} · {getBankName(stmt.bankId)}
                          </Text>
                        </View>
                      </Row>
                      <Ionicons name="chevron-forward" size={16} color={theme.faint} />
                    </Row>

                    <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: theme.sub, fontSize: 11 }}>Period</Text>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 11 }}>
                        {fmtDate(stmt.fromDate)} → {fmtDate(stmt.toDate)}
                      </Text>
                    </Row>

                    <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: theme.sub, fontSize: 11 }}>Transactions</Text>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 11 }}>
                        {stmt.rows.length} entries
                      </Text>
                    </Row>

                    <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />

                    <Row style={{ justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ color: theme.sub, fontSize: 10 }}>Total Credit</Text>
                        <Text style={{ color: theme.green, fontWeight: '800', fontSize: 13 }}>
                          +{inr(stmt.totalCredit)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: theme.sub, fontSize: 10 }}>Total Debit</Text>
                        <Text style={{ color: theme.red, fontWeight: '800', fontSize: 13 }}>
                          -{inr(stmt.totalDebit)}
                        </Text>
                      </View>
                    </Row>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── FAB: New Bank Move ────────────────────────────────────────── */}
      {activeTab !== 'statements' && (
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
      )}

      {/* ── Sheet: Manual Bank Transaction ──────────────────────────── */}
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

      {/* ── Sheet: Statement Preview / Confirm Import ─────────────────── */}
      <Sheet
        visible={previewSheetVisible}
        onClose={() => { setPreviewSheetVisible(false); setParsedPreview(null); }}
        title="Preview Bank Statement"
      >
        {parsedPreview && (
          <View>
            {/* Summary */}
            <Card style={{ backgroundColor: theme.cardAlt, marginBottom: 14, padding: 14 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: theme.sub, fontSize: 13 }}>File</Text>
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13, flex: 1, textAlign: 'right' }} numberOfLines={1}>
                  {parsedPreview.fileName}
                </Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: theme.sub, fontSize: 13 }}>Bank Detected</Text>
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{parsedPreview.bankGuess}</Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: theme.sub, fontSize: 13 }}>Transactions</Text>
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{parsedPreview.rows.length}</Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: theme.sub, fontSize: 13 }}>Period</Text>
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>
                  {parsedPreview.rows.length > 0
                    ? `${fmtDate(parsedPreview.rows[0].date)} → ${fmtDate(parsedPreview.rows[parsedPreview.rows.length - 1].date)}`
                    : '—'}
                </Text>
              </Row>
              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: theme.sub, fontSize: 11 }}>Total Credit</Text>
                  <Text style={{ color: theme.green, fontWeight: '900', fontSize: 16 }}>
                    +{inr(parsedPreview.statement.totalCredit)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.sub, fontSize: 11 }}>Total Debit</Text>
                  <Text style={{ color: theme.red, fontWeight: '900', fontSize: 16 }}>
                    -{inr(parsedPreview.statement.totalDebit)}
                  </Text>
                </View>
              </Row>
            </Card>

            {/* Link to account */}
            <Select
              label="Link to Bank Account"
              value={importBankId}
              onChange={setImportBankId}
              options={bankOptions}
              color={theme.blue}
            />

            {/* Sample rows preview */}
            <Text style={{ fontWeight: '700', color: theme.sub, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              First 5 Transactions
            </Text>
            {parsedPreview.rows.slice(0, 5).map((r) => (
              <View
                key={r.id}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  paddingVertical: 8
                }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.faint, fontSize: 11 }}>{fmtDate(r.date)}</Text>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: r.credit > 0 ? theme.green : theme.red }}>
                    {r.credit > 0 ? `+${inr(r.credit)}` : `-${inr(r.debit)}`}
                  </Text>
                </Row>
                <Text style={{ color: theme.text, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {r.description || '—'}
                </Text>
              </View>
            ))}

            <View style={{ marginTop: 16 }}>
              <PrimaryButton title={`Import ${parsedPreview.rows.length} Transactions`} onPress={handleConfirmImport} icon="cloud-download-outline" />
            </View>
          </View>
        )}
      </Sheet>

      {/* ── Full-screen Statement Detail Modal ──────────────────────────── */}
      <Modal
        visible={stmtDetailVisible}
        animationType="slide"
        onRequestClose={() => setStmtDetailVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <TouchableOpacity onPress={() => setStmtDetailVisible(false)}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={{ fontWeight: '800', color: theme.text, fontSize: 15 }} numberOfLines={1}>
                {selectedStatement?.fileName}
              </Text>
              <Text style={{ color: theme.faint, fontSize: 11 }}>
                {selectedStatement ? `${fmtDate(selectedStatement.fromDate)} → ${fmtDate(selectedStatement.toDate)}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => selectedStatement && handleDeleteStatement(selectedStatement.id)}>
              <Ionicons name="trash-outline" size={20} color={theme.red} />
            </TouchableOpacity>
          </View>

          {/* Summary pills */}
          {selectedStatement && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Card style={{ padding: 14, marginBottom: 10 }}>
                <Row>
                  <StatPill label="Total Credit" value={`+${inr(selectedStatement.totalCredit)}`} color={theme.green} />
                  <StatPill label="Total Debit" value={`-${inr(selectedStatement.totalDebit)}`} color={theme.red} />
                  <StatPill label="Net" value={inr(selectedStatement.totalCredit - selectedStatement.totalDebit)} />
                </Row>
              </Card>

              {/* Row filters */}
              <Row style={{ gap: 8, marginBottom: 8 }}>
                {(['all', 'credit', 'debit'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setStmtRowFilter(f)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor:
                        stmtRowFilter === f
                          ? f === 'credit' ? theme.green : f === 'debit' ? theme.red : theme.primary
                          : theme.card,
                      borderWidth: 1,
                      borderColor:
                        stmtRowFilter === f
                          ? f === 'credit' ? theme.green : f === 'debit' ? theme.red : theme.primary
                          : theme.border
                    }}
                  >
                    <Text style={{ color: stmtRowFilter === f ? '#fff' : theme.sub, fontWeight: '600', fontSize: 12 }}>
                      {f === 'all' ? 'All' : f === 'credit' ? 'Credits' : 'Debits'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Row>
            </View>
          )}

          {/* Transaction rows */}
          <FlatList
            data={filteredStmtRows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListEmptyComponent={<EmptyState icon="swap-horizontal-outline" text="No matching transactions" />}
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item }) => (
              <Card style={{ marginBottom: 7, padding: 12 }}>
                <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.faint, fontSize: 11 }}>{fmtDate(item.date)}</Text>
                  <Text
                    style={{
                      fontWeight: '800',
                      fontSize: 14,
                      color: item.credit > 0 ? theme.green : theme.red
                    }}
                  >
                    {item.credit > 0 ? `+${inr(item.credit)}` : `-${inr(item.debit)}`}
                  </Text>
                </Row>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }} numberOfLines={2}>
                  {item.description || '—'}
                </Text>
                <Row style={{ justifyContent: 'space-between', marginTop: 5 }}>
                  <Text style={{ color: theme.faint, fontSize: 10 }}>
                    {item.refNo ? `Ref: ${item.refNo}` : ''}
                  </Text>
                  <Text style={{ color: theme.sub, fontSize: 10, fontWeight: '600' }}>
                    Bal: {inr(item.balance)}
                  </Text>
                </Row>
              </Card>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
