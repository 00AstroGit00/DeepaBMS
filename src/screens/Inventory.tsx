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
  inventoryValue,
  lowStockItems,
  InvItem
} from '../context/StoreContext';
import {
  Card,
  Row,
  StatPill,
  Segmented,
  Chip,
  Badge,
  Sheet,
  Field,
  Select,
  PrimaryButton,
  EmptyState
} from '../components/Primitives';
import { inr, uid, parseNum, fmtDateTime } from '../utils/helpers';

const INV_CATEGORIES = [
  { value: 'food', label: 'Food', icon: 'basket-outline' as const, sub: 'Rice, meat, vegetables, oil' },
  { value: 'softdrink', label: 'Soft Drinks', icon: 'pint-outline' as const, sub: 'Sodas, water, juices' },
  { value: 'kitchen', label: 'Kitchen', icon: 'flame-outline' as const, sub: 'LPG, utensils, equipment' },
  { value: 'housekeeping', label: 'Housekeeping', icon: 'bed-outline' as const, sub: 'Linen, towels, toiletries' },
  { value: 'consumable', label: 'Consumables', icon: 'trash-bin-outline' as const, sub: 'Cleaning, tissues, disposables' }
];

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg · kilogram' },
  { value: 'g', label: 'g · gram' },
  { value: 'L', label: 'L · litre' },
  { value: 'ml', label: 'ml · millilitre' },
  { value: 'pc', label: 'pc · piece' },
  { value: 'btl', label: 'btl · bottle' },
  { value: 'pkt', label: 'pkt · packet' },
  { value: 'box', label: 'box' },
  { value: 'set', label: 'set' },
  { value: 'cyl', label: 'cyl · cylinder' },
  { value: 'can', label: 'can' },
  { value: 'roll', label: 'roll' }
];

const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'food', label: 'Food' },
  { key: 'softdrink', label: 'Soft Drinks' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'consumable', label: 'Consumables' }
];

export default function Inventory({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();

  // Screen Tabs: 'items' (Stock Items) or 'moves' (Movement Log)
  const [activeTab, setActiveTab] = useState<'items' | 'moves'>('items');

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Operational states
  const [selectedItem, setSelectedItem] = useState<InvItem | null>(null);
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  // Form states: Movement Log
  const [moveKind, setMoveKind] = useState<'in' | 'out' | 'wastage'>('in');
  const [moveQty, setMoveQty] = useState('');
  const [moveNote, setMoveNote] = useState('');

  // Form states: New Item
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('food');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [openingStock, setOpeningStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');

  const totalStockValue = useMemo(() => inventoryValue(state), [state]);
  const lowStockList = useMemo(() => lowStockItems(state), [state]);

  const filteredItems = useMemo(() => {
    return state.inventory.filter((item) => selectedCategory === 'all' || item.category === selectedCategory);
  }, [state.inventory, selectedCategory]);

  const handleStockMove = () => {
    if (!selectedItem) return;

    const qty = parseNum(moveQty);
    if (!qty) return;

    if (moveKind !== 'in' && qty > selectedItem.stock) {
      Alert.alert(
        'Insufficient Stock',
        `Only ${selectedItem.stock} ${selectedItem.unit} of ${selectedItem.name} in stock. Cannot issue/waste ${qty} ${selectedItem.unit}.`
      );
      return;
    }

    const defaultNote =
      moveKind === 'in'
        ? 'Purchase / stock in'
        : moveKind === 'out'
        ? 'Kitchen issue'
        : 'Wastage';

    const move = {
      id: uid(),
      date: new Date().toISOString(),
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      kind: moveKind,
      qty,
      note: moveNote.trim() || defaultNote
    };

    dispatch({
      type: 'STOCK_MOVE',
      move
    });

    setSelectedItem(null);
    setMoveQty('');
    setMoveNote('');
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim()) return;

    const item = {
      id: uid(),
      name: newItemName.trim(),
      category: newItemCategory,
      unit: newItemUnit.trim() || 'pc',
      stock: parseNum(openingStock) || 0,
      reorder: parseNum(reorderLevel) || 0,
      cost: parseNum(costPerUnit) || 0
    };

    dispatch({
      type: 'ADD_INV_ITEM',
      item
    });

    setAddSheetVisible(false);
    setNewItemName('');
    setOpeningStock('');
    setReorderLevel('');
    setCostPerUnit('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top Header stats */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
          Inventory
        </Text>

        <Card style={{ padding: 14, marginBottom: 12 }}>
          <Row>
            <StatPill label="Stock Value" value={inr(totalStockValue)} color={theme.teal} />
            <StatPill label="Items" value={String(state.inventory.length)} />
            <StatPill label="Low Stock" value={String(lowStockList.length)} color={lowStockList.length ? theme.red : theme.green} />
          </Row>
        </Card>

        <Segmented
          options={[
            { key: 'items', label: 'Stock Items' },
            { key: 'moves', label: 'Movement Log' }
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />

        {activeTab === 'items' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12, flexGrow: 0 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {FILTER_CHIPS.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                active={selectedCategory === chip.key}
                onPress={() => setSelectedCategory(chip.key)}
                color={theme.teal}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Lists Panels */}
      {activeTab === 'items' ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState icon="cube-outline" text="No items in this category" />}
          renderItem={({ item }) => {
            const isLow = item.stock <= item.reorder;
            return (
              <TouchableOpacity
                onPress={() => {
                  setSelectedItem(item);
                  setMoveKind('in');
                  setMoveQty('');
                  setMoveNote('');
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
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: isLow ? theme.redSoft : theme.tealSoft,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Ionicons name="cube-outline" size={18} color={isLow ? theme.red : theme.teal} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{item.name}</Text>
                    <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                      Reorder at {item.reorder} {item.unit} · {inr(item.cost)}/{item.unit}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontWeight: '800',
                        fontSize: 15,
                        color: isLow ? theme.red : theme.text
                      }}
                    >
                      {item.stock} {item.unit}
                    </Text>
                    {isLow && <Badge text="REORDER" color={theme.red} soft />}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={state.stockMoves}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState icon="swap-vertical-outline" text="No stock movements yet" />}
          renderItem={({ item }) => {
            const badgeColor = item.kind === 'in' ? theme.green : item.kind === 'wastage' ? theme.red : theme.amber;
            const badgeBg = item.kind === 'in' ? theme.greenSoft : item.kind === 'wastage' ? theme.redSoft : theme.amberSoft;
            const itemUnit = state.inventory.find((i) => i.id === item.itemId)?.unit || '';

            return (
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
                    item.kind === 'in'
                      ? 'arrow-down-circle-outline'
                      : item.kind === 'wastage'
                      ? 'trash-outline'
                      : 'arrow-up-circle-outline'
                  }
                  size={22}
                  color={item.kind === 'in' ? theme.green : item.kind === 'wastage' ? theme.red : theme.amber}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>
                    {item.itemName} · {item.kind === 'in' ? '+' : '-'}
                    {item.qty} {itemUnit}
                  </Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                    {item.note} · {fmtDateTime(item.date)}
                  </Text>
                </View>
                <Badge text={item.kind.toUpperCase()} color={badgeColor} soft={badgeBg} />
              </Card>
            );
          }}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => {
          setNewItemName('');
          setOpeningStock('');
          setReorderLevel('');
          setCostPerUnit('');
          setAddSheetVisible(true);
        }}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: theme.teal,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 }
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Sheet Modal: Record Stock Move */}
      <Sheet visible={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.name || ''}>
        <Segmented
          options={[
            { key: 'in', label: 'Stock In' },
            { key: 'out', label: 'Stock Out' },
            { key: 'wastage', label: 'Wastage' }
          ]}
          value={moveKind}
          onChange={(val) => setMoveKind(val as any)}
        />

        <Field
          label={`Quantity (${selectedItem?.unit || ''})`}
          value={moveQty}
          onChangeText={setMoveQty}
          keyboardType="numeric"
          placeholder="0"
        />

        <Field
          label="Note"
          value={moveNote}
          onChangeText={setMoveNote}
          placeholder={
            moveKind === 'in'
              ? 'Purchase from...'
              : moveKind === 'out'
              ? 'Issued to kitchen'
              : 'Reason for wastage'
          }
        />

        <PrimaryButton
          title={moveKind === 'in' ? 'Add Stock' : moveKind === 'out' ? 'Issue Stock' : 'Record Wastage'}
          onPress={handleStockMove}
          icon="checkmark"
          color={moveKind === 'wastage' ? theme.red : theme.teal}
        />
      </Sheet>

      {/* Sheet Modal: Add New Item */}
      <Sheet visible={addSheetVisible} onClose={() => setAddSheetVisible(false)} title="New Inventory Item">
        <Field label="Item Name" value={newItemName} onChangeText={setNewItemName} placeholder="e.g. Basmati Rice" />

        <Select label="Category" value={newItemCategory} onChange={setNewItemCategory} options={INV_CATEGORIES} color={theme.teal} />

        <Row style={{ gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Select label="Unit" value={newItemUnit} onChange={setNewItemUnit} options={UNIT_OPTIONS} color={theme.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Opening Stock" value={openingStock} onChangeText={setOpeningStock} keyboardType="numeric" placeholder="0" />
          </View>
        </Row>

        <Row style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Reorder Level" value={reorderLevel} onChangeText={setReorderLevel} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Cost / unit (₹)" value={costPerUnit} onChangeText={setCostPerUnit} keyboardType="numeric" placeholder="0" />
          </View>
        </Row>

        <PrimaryButton title="Add Item" onPress={handleAddNewItem} icon="add" color={theme.teal} />
      </Sheet>
    </SafeAreaView>
  );
}
