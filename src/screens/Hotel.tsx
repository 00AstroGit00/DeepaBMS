import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  View,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  useStore,
  occupancy,
  Room
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
  EmptyState
} from '../components/Primitives';
import { inr, todayKey, keyOf, fmtDate, fmtDateTime, uid, parseNum, isThisMonth } from '../utils/helpers';

const ID_PROOFS = [
  { value: 'Aadhaar', icon: 'finger-print-outline' as const, sub: 'Aadhaar card' },
  { value: 'Driving License', icon: 'car-outline' as const },
  { value: 'Passport', icon: 'airplane-outline' as const },
  { value: 'Voter ID', icon: 'checkbox-outline' as const },
  { value: 'PAN Card', icon: 'card-outline' as const },
  { value: 'Other Govt ID', icon: 'document-outline' as const }
];

const ADULT_OPTIONS = ['1', '2', '3', '4', '5', '6'].map((n) => ({
  value: n,
  label: `${n} adult${n === '1' ? '' : 's'}`
}));

const SETTLEMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: 'cash-outline' as const },
  { value: 'upi', label: 'UPI', icon: 'qr-code-outline' as const },
  { value: 'card', label: 'Card', icon: 'card-outline' as const }
];

export default function Hotel({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { state, dispatch } = useStore();

  // Screen Tabs: 'rooms' (Room Board) or 'register' (Guest Register)
  const [activeTab, setActiveTab] = useState<'rooms' | 'register'>('rooms');

  // Selected Room for checkin/checkout sheet
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Check In Form State
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [adults, setAdults] = useState('2');
  const [advance, setAdvance] = useState('');

  // Check Out Form State
  const [settlementMode, setSettlementMode] = useState('cash');

  const occupancyStats = useMemo(() => occupancy(state), [state]);

  const monthlyRoomsRevenue = useMemo(() => {
    return state.sales
      .filter((s) => s.dept === 'rooms' && isThisMonth(s.date))
      .reduce((sum, s) => sum + s.total, 0);
  }, [state.sales]);

  const getStatusStyle = (status: Room['status']) => {
    if (status === 'occupied') return theme.redSoft;
    if (status === 'cleaning') return theme.amberSoft;
    return theme.greenSoft;
  };

  const getStatusColor = (status: Room['status']) => {
    if (status === 'occupied') return theme.red;
    if (status === 'cleaning') return theme.amber;
    return theme.green;
  };

  // Live bill computation for check-out
  const checkoutBill = useMemo(() => {
    if (!selectedRoom || !selectedRoom.guest) return null;
    const g = selectedRoom.guest;

    // Calculate nights elapsed (minimum 1 night)
    const timeDiff = Date.now() - new Date(g.checkIn).getTime();
    const nights = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

    const netAmount = selectedRoom.rate * nights;
    const gstAmount = Math.round(0.05 * netAmount); // Kerala room turnover/GST rate is 5%
    const totalAmount = netAmount + gstAmount;
    const balanceDue = Math.max(0, totalAmount - g.advance);

    return {
      nights,
      net: netAmount,
      gst: gstAmount,
      total: totalAmount,
      due: balanceDue
    };
  }, [selectedRoom]);

  const handleCheckIn = () => {
    if (!selectedRoom || !guestName.trim()) return;

    const idProofText = idNumber.trim() ? `${idType} ${idNumber.trim()}` : idType;

    const guest = {
      name: guestName.trim(),
      phone: phone.trim(),
      idProof: idProofText,
      adults: Math.max(1, Math.round(parseNum(adults) || 1)),
      checkIn: new Date().toISOString(),
      advance: parseNum(advance)
    };

    dispatch({
      type: 'CHECK_IN',
      roomId: selectedRoom.id,
      guest
    });

    setSelectedRoom(null);
    setGuestName('');
    setPhone('');
    setIdNumber('');
    setIdType('Aadhaar');
    setAdults('2');
    setAdvance('');
  };

  const handleCheckOut = () => {
    if (!selectedRoom || !selectedRoom.guest || !checkoutBill) return;
    const g = selectedRoom.guest;

    const stayRecord = {
      id: uid(),
      roomNo: selectedRoom.no,
      category: selectedRoom.category,
      guestName: g.name,
      phone: g.phone,
      checkIn: g.checkIn,
      checkOut: new Date().toISOString(),
      nights: checkoutBill.nights,
      amount: checkoutBill.total,
      mode: settlementMode as any
    };

    // Auto-generate DayBook entry for room settlement
    const saleRecord = {
      id: uid(),
      date: new Date().toISOString(),
      dept: 'rooms' as const,
      description: `Room ${selectedRoom.no} - ${g.name} - ${checkoutBill.nights}N`,
      amount: checkoutBill.net,
      gstRate: 5,
      gstAmount: checkoutBill.gst,
      total: checkoutBill.total,
      mode: settlementMode as any
    };

    dispatch({
      type: 'CHECK_OUT',
      roomId: selectedRoom.id,
      stay: stayRecord,
      sale: saleRecord
    });

    setSelectedRoom(null);
  };

  const handleMarkCleaned = () => {
    if (!selectedRoom) return;
    dispatch({
      type: 'SET_ROOM_STATUS',
      roomId: selectedRoom.id,
      status: 'vacant'
    });
    setSelectedRoom(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top Header stats */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 }}>
          Hotel
        </Text>

        <Card style={{ padding: 14, marginBottom: 12 }}>
          <Row>
            <StatPill label="Occupancy" value={`${occupancyStats.pct}%`} color={theme.blue} />
            <StatPill label="Occupied" value={`${occupancyStats.occupied}/${occupancyStats.total}`} />
            <StatPill label="Room Rev (month)" value={inr(monthlyRoomsRevenue)} color={theme.green} />
          </Row>
        </Card>

        <Segmented
          options={[
            { key: 'rooms', label: 'Room Board' },
            { key: 'register', label: 'Guest Register' }
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
        />
      </View>

      {/* Tab Panels */}
      {activeTab === 'rooms' ? (
        <FlatList
          data={state.rooms}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 32, gap: 10 }}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={4}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => {
                setSelectedRoom(item);
                setSettlementMode('cash');
              }}
            >
              <Card style={{ padding: 14 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text }}>{item.no}</Text>
                  <Badge
                    text={item.status.toUpperCase()}
                    color={getStatusColor(item.status)}
                    soft
                  />
                </Row>
                <Text style={{ color: theme.sub, fontSize: 12, marginTop: 6 }}>{item.category}</Text>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13, marginTop: 2 }}>
                  {inr(item.rate)}/night
                </Text>

                {item.guest && (
                  <View
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: theme.border
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                      {item.guest.name}
                    </Text>
                    <Text style={{ color: theme.faint, fontSize: 11, marginTop: 2 }}>
                      Since {fmtDate(item.guest.checkIn)}
                    </Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={state.stays ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListEmptyComponent={<EmptyState icon="people-outline" text="No past stays yet" />}
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8, padding: 13 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{item.guestName}</Text>
                <Text style={{ fontWeight: '800', color: theme.green, fontSize: 14 }}>{inr(item.amount)}</Text>
              </Row>
              <Text style={{ color: theme.faint, fontSize: 12, marginTop: 4 }}>
                Room {item.roomNo} · {item.nights}N · {fmtDate(item.checkIn)} → {fmtDate(item.checkOut)} ·{' '}
                {item.mode?.toUpperCase() || ''}
              </Text>
            </Card>
          )}
        />
      )}

      {/* Bottom Sheet: CheckIn / CheckOut Details */}
      <Sheet
        visible={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom ? `Room ${selectedRoom.no} · ${selectedRoom.category}` : ''}
      >
        {selectedRoom?.status === 'vacant' && (
          <View>
            <Field label="Guest Name" value={guestName} onChangeText={setGuestName} placeholder="Full name" />
            <Field
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="98470 12345"
            />
            <Row style={{ gap: 12, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Select label="ID Proof Type" value={idType} onChange={setIdType} options={ID_PROOFS} />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="ID Number (last 4 digits)"
                  value={idNumber}
                  onChangeText={setIdNumber}
                  placeholder="e.g. 4432"
                />
              </View>
            </Row>
            <Row style={{ gap: 12, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Select label="Adults" value={adults} onChange={setAdults} options={ADULT_OPTIONS} />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Advance (₹)"
                  value={advance}
                  onChangeText={setAdvance}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </Row>
            <PrimaryButton
              title="Check In Guest"
              onPress={handleCheckIn}
              icon="log-in-outline"
              color={theme.green}
            />
          </View>
        )}

        {selectedRoom?.status === 'occupied' && selectedRoom.guest && checkoutBill && (
          <View>
            {/* Guest Summary Card */}
            <Card style={{ backgroundColor: theme.cardAlt, marginBottom: 16 }}>
              <Text style={{ fontWeight: '800', fontSize: 16, color: theme.text }}>
                {selectedRoom.guest.name}
              </Text>
              <Text style={{ color: theme.sub, fontSize: 13, marginTop: 4 }}>
                {selectedRoom.guest.phone} · {selectedRoom.guest.idProof} · {selectedRoom.guest.adults}{' '}
                adult(s)
              </Text>
              <Text style={{ color: theme.faint, fontSize: 12, marginTop: 4 }}>
                Checked in {fmtDateTime(selectedRoom.guest.checkIn)}
              </Text>
            </Card>

            {/* Bill Summary details */}
            <Card style={{ marginBottom: 16 }}>
              {[
                [`Room charge · ${checkoutBill.nights} night(s)`, inr(checkoutBill.net)],
                ['GST @ 5% (rooms service)', inr(checkoutBill.gst)],
                ['Bill total', inr(checkoutBill.total)],
                ['Advance paid', `-${inr(selectedRoom.guest.advance)}`]
              ].map(([itemLabel, itemVal], idx) => (
                <Row key={idx} style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: theme.sub, fontSize: 14 }}>{itemLabel}</Text>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{itemVal}</Text>
                </Row>
              ))}
              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Balance Due</Text>
                <Text style={{ color: theme.green, fontWeight: '900', fontSize: 20 }}>
                  {inr(checkoutBill.due)}
                </Text>
              </Row>
            </Card>

            <Select
              label="Settle via"
              value={settlementMode}
              onChange={setSettlementMode}
              options={SETTLEMENT_MODES}
            />

            <PrimaryButton
              title="Check Out & Settle"
              onPress={handleCheckOut}
              icon="log-out-outline"
              color={theme.red}
            />
          </View>
        )}

        {selectedRoom?.status === 'cleaning' && (
          <View>
            <EmptyState icon="sparkles-outline" text="Room is being cleaned" />
            <PrimaryButton
              title="Mark Ready / Vacant"
              onPress={handleMarkCleaned}
              icon="checkmark-circle-outline"
              color={theme.green}
            />
          </View>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
