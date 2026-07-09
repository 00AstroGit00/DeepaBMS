import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  liquorStockValue,
  LiquorItem,
} from '../context/StoreContext';
import {
  Card,
  Row,
  StatPill,
  Segmented,
  Badge,
  Sheet,
  Field,
  Select,
  PrimaryButton,
  EmptyState,
} from '../components/Primitives';
import { inr, fmtDate, uid, parseNum, isToday, pegStr } from '../utils/helpers';
import { warnUser } from '../utils/fileExporter';

const LIQUOR_TYPES = [
  { value: 'Whisky', icon: 'wine-outline' as const },
  { value: 'Rum', icon: 'wine-outline' as const },
  { value: 'Brandy', icon: 'wine-outline' as const },
  { value: 'Vodka', icon: 'wine-outline' as const },
  { value: 'Beer', icon: 'beer-outline' as const },
  { value: 'Wine', icon: 'wine-outline' as const },
];

const BOTTLE_SIZES = [
  { value: '180', label: '180 ml · Quarter' },
  { value: '375', label: '375 ml · Half (Pint)' },
  { value: '500', label: '500 ml · Beer can' },
  { value: '650', label: '650 ml · Beer bottle' },
  { value: '750', label: '750 ml · Full bottle' },
  { value: '1000', label: '1000 ml · Litre' },
];

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: 'cash-outline' as const },
  { value: 'upi', label: 'UPI', icon: 'qr-code-outline' as const },
  { value: 'card', label: 'Card', icon: 'card-outline' as const },
];

export default function Bar({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();

  // Screen Tabs: 'stock' (Liquor Stock) or 'variance' (Variance Log)
  const [activeTab, setActiveTab] = useState<'stock' | 'variance'>('stock');

  // Selected item and current modal operational panel (sell, purchase, audit, edit)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [opMode, setOpMode] = useState<'sell' | 'purchase' | 'audit' | 'edit'>(
    'sell',
  );

  // Add Brand Sheet visibility
  const [addBrandVisible, setAddBrandVisible] = useState(false);

  // Form states
  const [brandName, setBrandName] = useState('');
  const [liquorType, setLiquorType] = useState('Whisky');
  const [bottleSize, setBottleSize] = useState('750');
  const [fullBottles, setFullBottles] = useState('');
  const [looseML, setLooseML] = useState('');
  const [costPerBottle, setCostPerBottle] = useState('');
  const [pricePerPeg, setPricePerPeg] = useState('');
  const [pricePerBottle, setPricePerBottle] = useState('');

  // Operations state
  const [opQty, setOpQty] = useState(''); // purchasing bottles (purchase mode)
  const [bottleQty, setBottleQty] = useState(''); // selling bottles
  const [pegQty, setPegQty] = useState(''); // selling pegs (fractional allowed)
  const [paymentMode, setPaymentMode] = useState('cash');
  const [physicalCountML, setPhysicalCountML] = useState('');

  const selectedItem = useMemo(() => {
    return state.liquor.find((item) => item.id === selectedItemId) || null;
  }, [state.liquor, selectedItemId]);

  const todayBarSales = useMemo(() => {
    return state.sales
      .filter((s) => s.dept === 'bar' && isToday(s.date))
      .reduce((sum, s) => sum + s.total, 0);
  }, [state.sales]);

  const totalStockValue = useMemo(() => liquorStockValue(state), [state]);

  const getMLStock = (item: LiquorItem) => {
    return item.fullBottles * item.sizeML + item.looseML;
  };

  const getFormValues = () => {
    if (!brandName.trim()) {
      warnUser('Brand Required', 'Enter the brand name.');
      return null;
    }
    const size = Math.max(50, Math.round(parseNum(bottleSize) || 750));
    const loose = Math.max(0, Math.round(parseNum(looseML) || 0));

    return {
      brand: brandName.trim(),
      type: liquorType,
      sizeML: size,
      fullBottles: Math.max(0, Math.round(parseNum(fullBottles) || 0)),
      looseML: Math.min(loose, size - 1),
      costPerBottle: parseNum(costPerBottle) || 0,
      pricePerPeg: parseNum(pricePerPeg) || 0,
      pricePerBottle: parseNum(pricePerBottle) || 0,
    };
  };

  const clearForm = () => {
    setBrandName('');
    setLiquorType('Whisky');
    setBottleSize('750');
    setFullBottles('');
    setLooseML('');
    setCostPerBottle('');
    setPricePerPeg('');
    setPricePerBottle('');
    setOpQty('');
    setBottleQty('');
    setPegQty('');
    setPhysicalCountML('');
  };

  const handleRecordSale = () => {
    if (!selectedItem) return;

    const isBeer = selectedItem.type === 'Beer';
    const bQty = Math.floor(parseNum(bottleQty) || 0);
    const pQty = parseNum(pegQty) || 0;

    if (bQty < 0) return;
    if (pQty < 0) return;
    if (bQty === 0 && pQty === 0) return;

    const bottleML = bQty * selectedItem.sizeML;
    const pegML = isBeer ? 0 : Math.round(pQty * 60);
    const volumeToDeduct = bottleML + pegML;
    const currentML = getMLStock(selectedItem);

    if (volumeToDeduct > currentML) {
      warnUser(
        'Insufficient Stock',
        `Only ${selectedItem.fullBottles} bottle(s) + ${selectedItem.looseML}ml of ${selectedItem.brand} in stock (${currentML}ml). Cannot sell ${volumeToDeduct}ml.`,
      );
      return;
    }

    const price =
      bQty * selectedItem.pricePerBottle + pQty * selectedItem.pricePerPeg;
    const parts: string[] = [];
    if (bQty > 0) parts.push(`${bQty} btl`);
    if (pQty > 0) parts.push(`${pQty} peg`);

    const sale = {
      id: uid(),
      date: new Date().toISOString(),
      dept: 'bar' as const,
      description: `${selectedItem.brand} · ${parts.join(' + ')}`,
      amount: price,
      gstRate: 0,
      gstAmount: 0,
      total: price,
      mode: paymentMode as any,
    };

    dispatch({
      type: 'SELL_LIQUOR',
      itemId: selectedItem.id,
      ml: volumeToDeduct,
      sale,
    });

    setSelectedItemId(null);
    clearForm();
  };

  const handleRecordPurchase = () => {
    if (!selectedItem) return;

    const qty = Math.max(1, Math.round(parseNum(opQty) || 1));
    const expenseCost = qty * selectedItem.costPerBottle;

    const txn = {
      id: uid(),
      date: new Date().toISOString(),
      kind: 'expense' as const,
      category: 'Liquor Purchase',
      description: `BEVCO · ${selectedItem.brand} x${qty}`,
      amount: expenseCost,
      mode: 'bank' as const,
      bankId: state.settings.defaultBankId,
      hasBill: true,
    };

    dispatch({
      type: 'LIQUOR_PURCHASE',
      itemId: selectedItem.id,
      bottles: qty,
      txn,
    });

    setSelectedItemId(null);
    clearForm();
  };

  const handleSaveAudit = () => {
    if (!selectedItem) return;

    if (!physicalCountML.trim()) {
      warnUser(
        'Physical Count Required',
        'Enter the physically counted stock in ml before saving the audit.',
      );
      return;
    }

    const countedML = parseNum(physicalCountML);
    const expectedML = getMLStock(selectedItem);

    dispatch({
      type: 'LIQUOR_AUDIT',
      audit: {
        id: uid(),
        date: new Date().toISOString(),
        brand: selectedItem.brand,
        sizeML: selectedItem.sizeML,
        expectedBottles: selectedItem.fullBottles,
        expectedLooseML: selectedItem.looseML,
        actualBottles: Math.floor(countedML / selectedItem.sizeML),
        actualLooseML: countedML % selectedItem.sizeML,
        differenceML: countedML - expectedML,
        auditor: 'Owner',
      },
    });

    setSelectedItemId(null);
    clearForm();
  };

  const handleSaveEdit = () => {
    if (!selectedItem) return;
    const vals = getFormValues();

    if (vals) {
      dispatch({
        type: 'UPDATE_LIQUOR_ITEM',
        item: {
          ...vals,
          id: selectedItem.id,
        },
      });
      setSelectedItemId(null);
      clearForm();
    }
  };

  const handleRemoveItem = () => {
    if (!selectedItem) return;

    const confirmText = `Remove ${selectedItem.brand} from the bar stock register? Past sales records are kept.`;
    Alert.alert('Remove Brand', confirmText, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          dispatch({
            type: 'REMOVE_LIQUOR_ITEM',
            itemId: selectedItem.id,
          });
          setSelectedItemId(null);
          clearForm();
        },
      },
    ]);
  };

  const handleAddNewBrand = () => {
    const vals = getFormValues();
    if (vals) {
      dispatch({
        type: 'ADD_LIQUOR_ITEM',
        item: {
          ...vals,
          id: uid(),
        },
      });
      setAddBrandVisible(false);
      clearForm();
    }
  };

  const typeColors: Record<string, string> = {
    Whisky: theme.amber,
    Rum: theme.primary,
    Brandy: theme.purple,
    Vodka: theme.blue,
    Beer: theme.teal,
    Wine: theme.red,
  };

  const renderSharedFormFields = () => {
    return (
      <View>
        <Field
          label="Brand Name"
          value={brandName}
          onChangeText={setBrandName}
          placeholder="e.g. Royal Stag"
        />
        <Row style={{ gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Select
              label="Type"
              value={liquorType}
              onChange={(val) => {
                setLiquorType(val);
                if (val === 'Beer' && bottleSize === '750') {
                  setBottleSize('650');
                }
              }}
              options={LIQUOR_TYPES}
              color={theme.amber}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Select
              label="Bottle Size"
              value={bottleSize}
              onChange={setBottleSize}
              options={BOTTLE_SIZES}
              color={theme.amber}
            />
          </View>
        </Row>
        <Row style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Full Bottles"
              value={fullBottles}
              onChangeText={setFullBottles}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={liquorType === 'Beer' ? 'Loose ml (n/a)' : 'Loose (ml)'}
              value={looseML}
              onChangeText={setLooseML}
              keyboardType="numeric"
              placeholder="0"
              disabled={liquorType === 'Beer'}
            />
            {liquorType !== 'Beer' && looseML.trim() && (
              <Text
                style={{
                  fontSize: 11,
                  color: theme.faint,
                  marginTop: -8,
                  marginBottom: 6,
                }}
              >
                ≈ {pegStr(parseNum(looseML))}
              </Text>
            )}
          </View>
        </Row>
        <Row style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Cost / Bottle (₹)"
              value={costPerBottle}
              onChangeText={setCostPerBottle}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Selling Price / Peg 60ml (₹)"
              value={pricePerPeg}
              onChangeText={setPricePerPeg}
              keyboardType="numeric"
              placeholder="0"
              disabled={liquorType === 'Beer'}
            />
          </View>
        </Row>
        <Row style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Selling Price / Bottle (₹)"
              value={pricePerBottle}
              onChangeText={setPricePerBottle}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }} />
        </Row>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top Header stats */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: theme.text,
            marginBottom: 12,
          }}
        >
          Bar Management
        </Text>

        <Card style={{ padding: 14, marginBottom: 12 }}>
          <Row>
            <StatPill
              label="Today's Bar Sales"
              value={inr(todayBarSales)}
              color={theme.amber}
            />
            <StatPill label="Stock Value" value={inr(totalStockValue)} />
            <StatPill label="Brands" value={String(state.liquor.length)} />
          </Row>
        </Card>

        <Segmented
          options={[
            { key: 'stock', label: 'Liquor Stock' },
            { key: 'variance', label: 'Variance Log' },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />
      </View>

      {/* Tabs panels */}
      {activeTab === 'stock' ? (
        <FlatList
          data={state.liquor}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState icon="wine-outline" text="No brands registered yet" />
          }
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => {
            const isLowStock = item.fullBottles <= 8;
            return (
              <TouchableOpacity
                onPress={() => {
                  setSelectedItemId(item.id);
                  setOpMode('sell');
                  setBrandName(item.brand);
                  setLiquorType(item.type);
                  setBottleSize(String(item.sizeML));
                  setFullBottles(String(item.fullBottles));
                  setLooseML(String(item.looseML));
                  setCostPerBottle(String(item.costPerBottle));
                  setPricePerPeg(String(item.pricePerPeg));
                  setPricePerBottle(String(item.pricePerBottle));
                }}
              >
                <Card style={{ marginBottom: 8, padding: 13 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row style={{ gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: theme.cardAlt,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons
                          name={
                            item.type === 'Beer'
                              ? 'beer-outline'
                              : 'wine-outline'
                          }
                          size={19}
                          color={typeColors[item.type] || theme.amber}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontWeight: '700',
                            color: theme.text,
                            fontSize: 14,
                          }}
                          numberOfLines={1}
                        >
                          {item.brand}
                        </Text>
                        <Text
                          style={{
                            color: theme.faint,
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {item.type} · {item.sizeML}ml · cost{' '}
                          {inr(item.costPerBottle)}/btl
                        </Text>
                      </View>
                    </Row>
                    {isLowStock && <Badge text="LOW" color={theme.red} soft />}
                  </Row>
                  <Row style={{ marginTop: 10, gap: 0 }}>
                    <StatPill
                      label="Full bottles"
                      value={String(item.fullBottles)}
                    />
                    <StatPill
                      label="Loose"
                      value={
                        item.type === 'Beer'
                          ? '—'
                          : `${item.looseML} ml (${pegStr(item.looseML)})`
                      }
                    />
                    <StatPill
                      label={
                        item.type === 'Beer' ? 'Price/btl' : 'Peg / Bottle'
                      }
                      value={
                        item.type === 'Beer'
                          ? inr(item.pricePerBottle)
                          : `${inr(item.pricePerPeg)} / ${inr(item.pricePerBottle)}`
                      }
                    />
                  </Row>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={state.liquorAudits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="analytics-outline"
              text="No stock audits yet. Tap a brand → Audit to record physical stock."
            />
          }
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8, padding: 13 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text
                  style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}
                >
                  {item.brand}
                </Text>
                <Badge
                  text={`${item.differenceML >= 0 ? '+' : ''}${item.differenceML} ml`}
                  color={item.differenceML < 0 ? theme.red : theme.green}
                  soft
                />
              </Row>
              <Text style={{ color: theme.faint, fontSize: 12, marginTop: 4 }}>
                {fmtDate(item.date)} · Book:{' '}
                {item.expectedBottles * item.sizeML + item.expectedLooseML}ml ·
                Physical:{' '}
                {item.actualBottles * item.sizeML + item.actualLooseML}ml
              </Text>
            </Card>
          )}
        />
      )}

      {/* Sheet Modal: Brand Operational Panel */}
      <Sheet
        visible={!!selectedItem}
        onClose={() => setSelectedItemId(null)}
        title={selectedItem?.brand || ''}
      >
        <Segmented
          options={[
            { key: 'sell', label: 'Sell' },
            { key: 'purchase', label: 'Purchase' },
            { key: 'audit', label: 'Audit' },
            { key: 'edit', label: 'Update' },
          ]}
          value={opMode}
          onChange={(val) => setOpMode(val as any)}
        />

        {/* Action Panel: Sell */}
        {opMode === 'sell' && selectedItem && (
          <View>
            {selectedItem.type !== 'Beer' ? (
              <Row style={{ gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Bottles"
                    value={bottleQty}
                    onChangeText={setBottleQty}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Pegs (e.g. 3.5)"
                    value={pegQty}
                    onChangeText={setPegQty}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </Row>
            ) : (
              <Field
                label="Bottles"
                value={bottleQty}
                onChangeText={setBottleQty}
                keyboardType="numeric"
                placeholder="0"
              />
            )}

            <Select
              label="Payment"
              value={paymentMode}
              onChange={setPaymentMode}
              options={PAYMENT_MODES}
              color={theme.amber}
            />

            <Card
              style={{
                backgroundColor: theme.cardAlt,
                marginBottom: 16,
                padding: 13,
              }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: theme.sub }}>Sale amount</Text>
                <Text
                  style={{
                    color: theme.green,
                    fontWeight: '800',
                    fontSize: 17,
                  }}
                >
                  {inr(
                    Math.floor(parseNum(bottleQty) || 0) *
                      selectedItem.pricePerBottle +
                      (parseNum(pegQty) || 0) * selectedItem.pricePerPeg,
                  )}
                </Text>
              </Row>
              <Text style={{ color: theme.faint, fontSize: 11, marginTop: 4 }}>
                Liquor outside GST · 10% Kerala TOT applies · stock
                auto-deducted in ml
              </Text>
            </Card>

            <PrimaryButton
              title="Record Bar Sale"
              onPress={handleRecordSale}
              icon="checkmark"
              color={theme.amber}
            />
          </View>
        )}

        {/* Action Panel: Purchase (BEVCO invoice) */}
        {opMode === 'purchase' && selectedItem && (
          <View>
            <Field
              label="Bottles purchased (BEVCO)"
              value={opQty}
              onChangeText={setOpQty}
              keyboardType="numeric"
              placeholder="12"
            />

            <Card
              style={{
                backgroundColor: theme.cardAlt,
                marginBottom: 16,
                padding: 13,
              }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: theme.sub }}>
                  Cost @ {inr(selectedItem.costPerBottle)}/btl
                </Text>
                <Text
                  style={{ color: theme.red, fontWeight: '800', fontSize: 17 }}
                >
                  {inr(
                    selectedItem.costPerBottle *
                      Math.max(1, Math.round(parseNum(opQty) || 1)),
                  )}
                </Text>
              </Row>
              <Text style={{ color: theme.faint, fontSize: 11, marginTop: 4 }}>
                Paid via bank · auto-posted to expense register
              </Text>
            </Card>

            <PrimaryButton
              title="Record Purchase"
              onPress={handleRecordPurchase}
              icon="cart-outline"
            />
          </View>
        )}

        {/* Action Panel: Physical Audit */}
        {opMode === 'audit' && selectedItem && (
          <View>
            <Card
              style={{
                backgroundColor: theme.cardAlt,
                marginBottom: 16,
                padding: 13,
              }}
            >
              <Text style={{ color: theme.sub, fontSize: 13 }}>
                Book stock (expected)
              </Text>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: '800',
                  fontSize: 18,
                  marginTop: 2,
                }}
              >
                {getMLStock(selectedItem)} ml{' '}
                <Text style={{ fontSize: 13, color: theme.faint }}>
                  ({selectedItem.fullBottles} btl + {selectedItem.looseML} ml)
                </Text>
              </Text>
            </Card>

            <Field
              label="Physical stock counted (ml)"
              value={physicalCountML}
              onChangeText={setPhysicalCountML}
              keyboardType="numeric"
              placeholder="e.g. 10980"
            />

            <PrimaryButton
              title="Save Audit & Variance"
              onPress={handleSaveAudit}
              icon="analytics-outline"
              color={theme.purple}
            />
          </View>
        )}

        {/* Action Panel: Edit Item Details */}
        {opMode === 'edit' && selectedItem && (
          <View>
            <Card
              style={{
                backgroundColor: theme.amberSoft,
                borderColor: theme.amber,
                marginBottom: 16,
                padding: 12,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 12 }}>
                Correct stock counts, BEVCO cost and selling prices here. For
                regular stock-in use the Purchase tab (it posts the expense
                automatically); use Update for opening stock, price revisions
                and physical corrections.
              </Text>
            </Card>

            {renderSharedFormFields()}

            <PrimaryButton
              title="Save Changes"
              onPress={handleSaveEdit}
              icon="save-outline"
              color={theme.amber}
            />

            <View style={{ height: 10 }} />

            <TouchableOpacity
              onPress={handleRemoveItem}
              style={{
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: theme.red,
              }}
            >
              <Ionicons name="trash-outline" size={17} color={theme.red} />
              <Text
                style={{ color: theme.red, fontWeight: '700', fontSize: 15 }}
              >
                Remove Brand from Register
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Sheet>

      {/* Sheet Modal: Add Brand */}
      <Sheet
        visible={addBrandVisible}
        onClose={() => setAddBrandVisible(false)}
        title="Add Liquor Brand"
      >
        {renderSharedFormFields()}
        <PrimaryButton
          title="Add to Bar Stock"
          onPress={handleAddNewBrand}
          icon="add"
          color={theme.amber}
        />
      </Sheet>

      {/* Floating Add button */}
      <TouchableOpacity
        onPress={() => {
          clearForm();
          setAddBrandVisible(true);
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
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
