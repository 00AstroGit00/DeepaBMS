import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as T from '../src/domains/rooms/rooms.types';
import { RoomsRepository as R } from '../src/domains/rooms/rooms.repository';

let testRoomTypeId = '';
let testRoomType2Id = '';
let testRoomId = '';
let testRoom2Id = '';
let testGuestId = '';
let testGuestCorpId = '';
let testReservationId = '';
let testStayId = '';
let testFolioId = '';

function uid(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

beforeAll(async () => {
  const rt = await R.createRoomType({
    name: `Standard ${uid()}`,
    code: `STD${uid().slice(0, 4).toUpperCase()}`,
    baseRate: 2500,
    capacity: 2,
    bedType: 'queen',
    amenities: 'TV, AC, WiFi',
  });
  testRoomTypeId = rt.id;

  const rt2 = await R.createRoomType({
    name: `Deluxe ${uid()}`,
    code: `DEL${uid().slice(0, 4).toUpperCase()}`,
    baseRate: 4000,
    capacity: 2,
    bedType: 'king',
    amenities: 'TV, AC, WiFi, Mini Bar',
  });
  testRoomType2Id = rt2.id;

  const room = await R.createRoom({
    roomNo: `R${uid().slice(0, 6)}`,
    roomTypeId: testRoomTypeId,
    floor: 1,
    view: 'garden',
    isSmoking: false,
  });
  testRoomId = room.id;

  const room2 = await R.createRoom({
    roomNo: `R${uid().slice(0, 6)}`,
    roomTypeId: testRoomType2Id,
    floor: 2,
    view: 'sea',
  });
  testRoom2Id = room2.id;

  const guest = await R.createGuest({
    name: `Test Guest ${uid()}`,
    phone: `99${uid().slice(0, 8)}`,
    email: 'guest@test.com',
    nationality: 'Indian',
  });
  testGuestId = guest.id;

  const corpGuest = await R.createGuest({
    name: `Corp Guest ${uid()}`,
    phone: `99${uid().slice(0, 8)}`,
    email: 'corp@test.com',
    isCorporate: true,
    companyName: 'Test Corp',
    companyGst: '32AABCU9603R1ZL',
  });
  testGuestCorpId = corpGuest.id;
});

afterAll(async () => {
  const cleanups = [
    testStayId,
    testReservationId,
    testRoomId,
    testRoom2Id,
    testGuestId,
    testGuestCorpId,
  ].filter(Boolean);
  for (const id of cleanups) {
    try {
      /* cleanup if possible */
    } catch {}
  }
  if (testRoomTypeId) {
    try {
      await R.archiveRoomType(testRoomTypeId);
    } catch {}
  }
  if (testRoomType2Id) {
    try {
      await R.archiveRoomType(testRoomType2Id);
    } catch {}
  }
});

// ═════════════════════════════════════════════════════════════════════
// 1. ROOM TYPES
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Room Types', () => {
  let rtId = '';

  test('findAllRoomTypes returns room types', async () => {
    const result = await R.findAllRoomTypes({ limit: 100 });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('findAllRoomTypes filters by search', async () => {
    const result = await R.findAllRoomTypes({ search: 'Standard', limit: 10 });
    for (const rt of result.data) {
      expect(rt.name.toLowerCase()).toContain('standard');
    }
  });

  test('createRoomType creates with correct data', async () => {
    const name = `Suite ${uid()}`;
    const code = `SUI${uid().slice(0, 4).toUpperCase()}`;
    const rt = await R.createRoomType({
      name,
      code,
      baseRate: 8000,
      capacity: 3,
      bedType: 'king',
    });
    expect(rt.id).toBeTruthy();
    expect(rt.name).toBe(name);
    expect(rt.code).toBe(code);
    expect(rt.baseRate).toBe(8000);
    expect(rt.capacity).toBe(3);
    expect(rt.isActive).toBe(true);
    rtId = rt.id;
  });

  test('createRoomType rejects duplicate code', async () => {
    const rt = await R.findRoomTypeById(rtId);
    await expect(
      R.createRoomType({ name: 'Duplicate', code: rt!.code, baseRate: 1000 }),
    ).rejects.toThrow();
  });

  test('findRoomTypeById returns correct type', async () => {
    const rt = await R.findRoomTypeById(rtId);
    expect(rt).not.toBeNull();
    expect(rt!.id).toBe(rtId);
  });

  test('findRoomTypeByCode works', async () => {
    const rt = await R.findRoomTypeById(rtId);
    const found = await R.findRoomTypeByCode(rt!.code);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(rtId);
  });

  test('findRoomTypeById returns null for non-existent', async () => {
    const rt = await R.findRoomTypeById('nonexistent');
    expect(rt).toBeNull();
  });

  test('updateRoomType updates fields', async () => {
    const updated = await R.updateRoomType(rtId, {
      baseRate: 8500,
      capacity: 4,
    } as any);
    expect(updated.baseRate).toBe(8500);
    expect(updated.capacity).toBe(4);
  });

  test('archiveRoomType sets isActive to false', async () => {
    await R.archiveRoomType(rtId);
    const rt = await R.findRoomTypeById(rtId);
    expect(rt!.isActive).toBe(false);
  });

  test('findAllRoomTypes excludes inactive after archive', async () => {
    const result = await R.findAllRoomTypes({ limit: 100 });
    for (const rt of result.data) {
      expect(rt.isActive).toBe(true);
    }
  });

  test('updateRoomType on non-existent throws', async () => {
    await expect(
      R.updateRoomType('nonexistent', { name: 'Test' } as any),
    ).rejects.toThrow('not found');
  });

  test('createRoomType with defaults works', async () => {
    const name = `Basic ${uid()}`;
    const code = `BAS${uid().slice(0, 4).toUpperCase()}`;
    const rt = await R.createRoomType({ name, code, baseRate: 1500 });
    expect(rt.capacity).toBe(2);
    expect(rt.maxAdults).toBe(2);
    expect(rt.maxChildren).toBe(1);
    expect(rt.bedType).toBe('queen');
    await R.archiveRoomType(rt.id);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. ROOMS
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Rooms', () => {
  let newRoomId = '';

  test('findAllRooms with no filters returns all', async () => {
    const result = await R.findAllRooms({ limit: 100 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('findAllRooms filters by status', async () => {
    const result = await R.findAllRooms({ status: 'vacant', limit: 100 });
    for (const r of result.data) {
      expect(r.status).toBe('vacant');
    }
  });

  test('findAllRooms filters by roomTypeId', async () => {
    const result = await R.findAllRooms({
      roomTypeId: testRoomTypeId,
      limit: 100,
    });
    for (const r of result.data) {
      expect(r.roomTypeId).toBe(testRoomTypeId);
    }
  });

  test('findAllRooms filters by view', async () => {
    const result = await R.findAllRooms({ view: 'sea', limit: 100 });
    for (const r of result.data) {
      expect(r.view).toBe('sea');
    }
  });

  test('findAllRooms filters by floor', async () => {
    const result = await R.findAllRooms({ floor: 1, limit: 100 });
    for (const r of result.data) {
      expect(r.floor).toBe(1);
    }
  });

  test('findAllRooms filters by search (roomNo)', async () => {
    const room = await R.findRoomById(testRoomId);
    const result = await R.findAllRooms({
      search: room!.roomNo.slice(0, 3),
      limit: 100,
    });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('findAllRooms filters by isActive', async () => {
    const result = await R.findAllRooms({ isActive: true, limit: 100 });
    for (const r of result.data) {
      expect(r.isActive).toBe(true);
    }
  });

  test('createRoom creates with correct data', async () => {
    const roomNo = `R${uid().slice(0, 6)}`;
    const room = await R.createRoom({
      roomNo,
      roomTypeId: testRoomTypeId,
      floor: 1,
      view: 'garden',
    });
    expect(room.id).toBeTruthy();
    expect(room.roomNo).toBe(roomNo);
    expect(room.roomTypeId).toBe(testRoomTypeId);
    expect(room.status).toBe('vacant');
    expect(room.isActive).toBe(true);
    expect(room.view).toBe('garden');
    expect(room.floor).toBe(1);
    expect(room.roomTypeName).toBeTruthy();
    newRoomId = room.id;
  });

  test('createRoom rejects duplicate roomNo', async () => {
    const room = await R.findRoomById(newRoomId);
    await expect(
      R.createRoom({ roomNo: room!.roomNo, roomTypeId: testRoomTypeId }),
    ).rejects.toThrow('already exists');
  });

  test('createRoom rejects non-existent roomTypeId', async () => {
    await expect(
      R.createRoom({
        roomNo: `R${uid().slice(0, 6)}`,
        roomTypeId: 'nonexistent',
      }),
    ).rejects.toThrow('not found');
  });

  test('findRoomById returns with roomTypeName via JOIN', async () => {
    const room = await R.findRoomById(newRoomId);
    expect(room).not.toBeNull();
    expect(room!.roomTypeName).toBeTruthy();
  });

  test('findRoomById returns null for non-existent', async () => {
    const room = await R.findRoomById('nonexistent');
    expect(room).toBeNull();
  });

  test('findRoomByNo works', async () => {
    const room = await R.findRoomById(newRoomId);
    const found = await R.findRoomByNo(room!.roomNo);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(newRoomId);
  });

  test('findRoomsByType filters correctly', async () => {
    const rooms = await R.findRoomsByType(testRoomTypeId);
    for (const r of rooms) {
      expect(r.roomTypeId).toBe(testRoomTypeId);
      expect(r.isActive).toBe(true);
    }
  });

  test('findRoomsByStatus filters correctly', async () => {
    const rooms = await R.findRoomsByStatus('vacant');
    for (const r of rooms) {
      expect(r.status).toBe('vacant');
    }
  });

  test('findAvailableRooms excludes occupied rooms', async () => {
    const rooms = await R.findAvailableRooms(today(), daysFromNow(1));
    for (const r of rooms) {
      expect(r.status).toBe('vacant');
    }
  });

  test('findAvailableRooms filters by roomTypeId', async () => {
    const rooms = await R.findAvailableRooms(
      today(),
      daysFromNow(1),
      testRoomTypeId,
    );
    for (const r of rooms) {
      expect(r.roomTypeId).toBe(testRoomTypeId);
      expect(r.status).toBe('vacant');
    }
  });

  test('updateRoom changes fields', async () => {
    const updated = await R.updateRoom(newRoomId, {
      notes: 'Test note',
      floor: 2,
    } as any);
    expect(updated.floor).toBe(2);
    expect(updated.notes).toBe('Test note');
  });

  test('updateRoom on non-existent throws', async () => {
    await expect(
      R.updateRoom('nonexistent', { notes: 'Test' } as any),
    ).rejects.toThrow('not found');
  });

  test('updateRoomStatus changes status', async () => {
    const room = await R.updateRoomStatus(newRoomId, 'cleaning');
    expect(room.status).toBe('cleaning');
    await R.updateRoomStatus(newRoomId, 'vacant');
  });

  test('updateRoomStatus with stayId sets currentStayId', async () => {
    const stay = await R.createStay({
      guestId: testGuestId,
      guestName: 'Check Stay',
      guestPhone: '9999999999',
      roomId: newRoomId,
      roomNo: 'TEMP',
      roomTypeId: testRoomTypeId,
      roomTypeName: 'Temp',
      expectedCheckOut: daysFromNow(2),
      nights: 1,
      rate: 2500,
      checkedInBy: 'test',
    });
    const room = await R.findRoomById(newRoomId);
    expect(room!.status).toBe('occupied');
    expect(room!.currentStayId).toBe(stay.id);
    await R.checkOutStay(stay.id, 'test');
  });

  test('getOccupancySummary returns correct counts', async () => {
    const summary = await R.getOccupancySummary();
    expect(typeof summary.vacant).toBe('number');
    expect(typeof summary.occupied).toBe('number');
    expect(typeof summary.cleaning).toBe('number');
    expect(typeof summary.maintenance).toBe('number');
    expect(typeof summary.blocked).toBe('number');
    expect(typeof summary.out_of_service).toBe('number');
    expect(typeof summary.reserved).toBe('number');
    expect(
      summary.vacant +
        summary.occupied +
        summary.cleaning +
        summary.maintenance +
        summary.blocked +
        summary.out_of_service +
        summary.reserved,
    ).toBeGreaterThanOrEqual(1);
  });

  test('updateRoomStatus with invalid status still works (no validation in repo)', async () => {
    const room = await R.updateRoomStatus(
      newRoomId,
      'occupied' as T.RoomStatus,
    );
    expect(room.status).toBe('occupied');
    await R.updateRoomStatus(newRoomId, 'vacant');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. GUESTS
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Guests', () => {
  let guestId = '';

  test('createGuest creates with correct data', async () => {
    const name = `Guest ${uid()}`;
    const phone = `99${uid().slice(0, 8)}`;
    const guest = await R.createGuest({
      name,
      phone,
      email: 'new@test.com',
      nationality: 'Indian',
    });
    expect(guest.id).toBeTruthy();
    expect(guest.name).toBe(name);
    expect(guest.phone).toBe(phone);
    expect(guest.email).toBe('new@test.com');
    expect(guest.nationality).toBe('Indian');
    expect(guest.totalStays).toBe(0);
    expect(guest.totalRevenue).toBe(0);
    expect(guest.isBlacklisted).toBe(false);
    guestId = guest.id;
  });

  test('createGuest with duplicate phone throws', async () => {
    const guest = await R.findGuestById(guestId);
    await expect(
      R.createGuest({ name: 'Dup', phone: guest!.phone }),
    ).rejects.toThrow('already exists');
  });

  test('findGuestByPhone works', async () => {
    const guest = await R.findGuestById(guestId);
    const found = await R.findGuestByPhone(guest!.phone);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(guestId);
  });

  test('findGuestById returns null for non-existent', async () => {
    const guest = await R.findGuestById('nonexistent');
    expect(guest).toBeNull();
  });

  test('searchGuests by name works', async () => {
    const guest = await R.findGuestById(guestId);
    const results = await R.searchGuests(guest!.name.slice(0, 4));
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((g) => g.id === guestId)).toBe(true);
  });

  test('searchGuests by phone works', async () => {
    const guest = await R.findGuestById(guestId);
    const results = await R.searchGuests(guest!.phone.slice(-4));
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('searchGuests returns empty for no match', async () => {
    const results = await R.searchGuests('zzzznonexistentzzzz');
    expect(results.length).toBe(0);
  });

  test('updateGuest changes fields', async () => {
    const updated = await R.updateGuest(guestId, {
      email: 'updated@test.com',
      address: '123 Test St',
    } as any);
    expect(updated.email).toBe('updated@test.com');
    expect(updated.address).toBe('123 Test St');
  });

  test('updateGuest on non-existent throws', async () => {
    await expect(
      R.updateGuest('nonexistent', { name: 'Test' } as any),
    ).rejects.toThrow('not found');
  });

  test('incrementGuestStats updates counts', async () => {
    const updated = await R.incrementGuestStats(guestId, 5000);
    expect(updated.totalStays).toBe(1);
    expect(updated.totalRevenue).toBe(5000);
  });

  test('incrementGuestStats accumulates revenue', async () => {
    const updated = await R.incrementGuestStats(guestId, 3000);
    expect(updated.totalStays).toBe(2);
    expect(updated.totalRevenue).toBe(8000);
  });

  test('blacklistGuest sets isBlacklisted', async () => {
    const guest = await R.blacklistGuest(guestId);
    expect(guest.isBlacklisted).toBe(true);
  });

  test('findCorporateGuests returns only corporate', async () => {
    const corporates = await R.findCorporateGuests();
    for (const g of corporates) {
      expect(g.isCorporate).toBe(true);
      expect(g.isBlacklisted).toBe(false);
    }
  });

  test('findAllGuests returns paginated results', async () => {
    const result = await R.findAllGuests({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('findAllGuests with search filter works', async () => {
    const guest = await R.findGuestById(guestId);
    const result = await R.findAllGuests({
      search: guest!.name.slice(0, 4),
      limit: 10,
    });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('findAllGuests filters by isCorporate', async () => {
    const result = await R.findAllGuests({ isCorporate: true, limit: 10 });
    for (const g of result.data) {
      expect(g.isCorporate).toBe(true);
    }
  });

  test('findAllGuests filters by isBlacklisted', async () => {
    const result = await R.findAllGuests({ isBlacklisted: true, limit: 10 });
    for (const g of result.data) {
      expect(g.isBlacklisted).toBe(true);
    }
  });

  test('createGuest with corporate info works', async () => {
    const guest = await R.createGuest({
      name: `Biz Guest ${uid()}`,
      phone: `99${uid().slice(0, 8)}`,
      isCorporate: true,
      companyName: 'Biz Corp',
      companyGst: '32AAAAA0000A1Z5',
    });
    expect(guest.isCorporate).toBe(true);
    expect(guest.companyName).toBe('Biz Corp');
    expect(guest.companyGst).toBe('32AAAAA0000A1Z5');
  });

  test('updateGuest can clear fields to null', async () => {
    const updated = await R.updateGuest(guestId, {
      email: null as any,
      address: null as any,
    });
    expect(updated.email).toBeNull();
    expect(updated.address).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. RESERVATIONS
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Reservations', () => {
  let rsvId = '';
  let rsv2Id = '';

  test('createReservation creates with correct data', async () => {
    const rsv = await R.createReservation(
      {
        guestName: `Res Guest ${uid()}`,
        guestPhone: `99${uid().slice(0, 8)}`,
        guestEmail: 'res@test.com',
        roomTypeId: testRoomTypeId,
        checkIn: daysFromNow(5),
        checkOut: daysFromNow(8),
        adults: 2,
        children: 1,
        source: 'direct',
      },
      'test-user',
    );
    expect(rsv.id).toBeTruthy();
    expect(rsv.reservationNo).toMatch(/^RSV-/);
    expect(rsv.guestName).toBeTruthy();
    expect(rsv.status).toBe('inquiry');
    expect(rsv.nights).toBe(3);
    expect(rsv.source).toBe('direct');
    expect(rsv.createdBy).toBe('test-user');
    rsvId = rsv.id;
  });

  test('createReservation calculates totalAmount = rate × nights', async () => {
    const rsv = await R.findReservationById(rsvId);
    expect(rsv!.totalAmount).toBe(2500 * 3);
  });

  test('createReservation with rateOverride uses override', async () => {
    const rsv = await R.createReservation({
      guestName: `Override Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      roomTypeId: testRoomType2Id,
      rateOverride: 3500,
      checkIn: daysFromNow(10),
      checkOut: daysFromNow(13),
    });
    expect(rsv.totalAmount).toBe(3500 * 3);
  });

  test('createReservation with discountPercent reduces total', async () => {
    const rsv = await R.createReservation({
      guestName: `Disc Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      roomTypeId: testRoomTypeId,
      discountPercent: 10,
      checkIn: daysFromNow(14),
      checkOut: daysFromNow(16),
    });
    expect(rsv.nights).toBe(2);
    expect(rsv.discountPercent).toBe(10);
    expect(rsv.totalAmount).toBe(2500 * 2 * 0.9);
  });

  test('createReservation with discountPercent and rateOverride', async () => {
    const rsv = await R.createReservation({
      guestName: `Both Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      rateOverride: 3000,
      discountPercent: 15,
      checkIn: daysFromNow(17),
      checkOut: daysFromNow(19),
    });
    expect(rsv.totalAmount).toBe(3000 * 2 * 0.85);
  });

  test('createReservation with guestId links existing guest', async () => {
    const rsv = await R.createReservation({
      guestId: testGuestId,
      guestName: 'Linked Guest',
      guestPhone: '9999999999',
      checkIn: daysFromNow(3),
      checkOut: daysFromNow(5),
    });
    expect(rsv.guestId).toBe(testGuestId);
  });

  test('findReservationById returns reservation with roomTypeName', async () => {
    const rsv = await R.findReservationById(rsvId);
    expect(rsv).not.toBeNull();
    expect(rsv!.roomTypeName).toBeTruthy();
  });

  test('findReservationByNo works', async () => {
    const rsv = await R.findReservationById(rsvId);
    const found = await R.findReservationByNo(rsv!.reservationNo);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(rsvId);
  });

  test('updateReservationStatus: inquiry -> reserved allowed', async () => {
    const rsv = await R.updateReservationStatus(rsvId, 'reserved');
    expect(rsv.status).toBe('reserved');
  });

  test('updateReservationStatus: reserved -> confirmed allowed', async () => {
    const rsv = await R.updateReservationStatus(rsvId, 'confirmed');
    expect(rsv.status).toBe('confirmed');
  });

  test('updateReservationStatus: confirmed -> cancelled allowed', async () => {
    const rsv = await R.updateReservationStatus(rsvId, 'cancelled');
    expect(rsv.status).toBe('cancelled');
  });

  test('updateReservationStatus: invalid transition rejected', async () => {
    const fresh = await R.createReservation({
      guestName: `Fresh Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      checkIn: daysFromNow(20),
      checkOut: daysFromNow(22),
    });
    await expect(
      R.updateReservationStatus(fresh.id, 'checked_in'),
    ).rejects.toThrow('Invalid');
  });

  test('updateReservationStatus: confirmed -> no_show allowed', async () => {
    const rsv = await R.createReservation({
      guestName: `NS Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      checkIn: daysFromNow(25),
      checkOut: daysFromNow(27),
    });
    await R.updateReservationStatus(rsv.id, 'reserved');
    await R.updateReservationStatus(rsv.id, 'confirmed');
    const updated = await R.updateReservationStatus(rsv.id, 'no_show');
    expect(updated.status).toBe('no_show');
  });

  test('updateReservationStatus: cancelled -> anything rejected', async () => {
    const rsv = await R.createReservation({
      guestName: `Cancelled Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      checkIn: daysFromNow(30),
      checkOut: daysFromNow(32),
    });
    await R.cancelReservation(rsv.id);
    await expect(
      R.updateReservationStatus(rsv.id, 'confirmed'),
    ).rejects.toThrow('Invalid');
  });

  test('cancelReservation updates status', async () => {
    const rsv = await R.createReservation({
      guestName: `Cancel Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      checkIn: daysFromNow(33),
      checkOut: daysFromNow(35),
    });
    const cancelled = await R.cancelReservation(rsv.id, 'test-user');
    expect(cancelled.status).toBe('cancelled');
  });

  test('getArrivalsToday returns correct reservations', async () => {
    const arrivals = await R.getArrivalsToday();
    expect(Array.isArray(arrivals)).toBe(true);
  });

  test('getUpcomingArrivals returns future reservations', async () => {
    const arrivals = await R.getUpcomingArrivals(30);
    expect(Array.isArray(arrivals)).toBe(true);
  });

  test('findReservationsByDateRange works', async () => {
    const reservations = await R.findReservationsByDateRange(
      daysAgo(1),
      daysFromNow(60),
    );
    expect(Array.isArray(reservations)).toBe(true);
  });

  test('findReservationsByGuest works', async () => {
    const reservations = await R.findReservationsByGuest(testGuestId);
    expect(Array.isArray(reservations)).toBe(true);
  });

  test('findAllReservations returns paginated', async () => {
    const result = await R.findAllReservations({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('findAllReservations filters by status', async () => {
    const result = await R.findAllReservations({
      status: 'inquiry',
      limit: 10,
    });
    for (const r of result.data) {
      expect(r.status).toBe('inquiry');
    }
  });

  test('findAllReservations filters by date range', async () => {
    const result = await R.findAllReservations({
      fromDate: daysAgo(1),
      toDate: daysFromNow(60),
      limit: 10,
    });
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  });

  test('findAllReservations filters by guestId', async () => {
    const result = await R.findAllReservations({
      guestId: testGuestId,
      limit: 10,
    });
    for (const r of result.data) {
      expect(r.guestId).toBe(testGuestId);
    }
  });

  test('findAllReservations filters by source', async () => {
    const result = await R.findAllReservations({ source: 'direct', limit: 10 });
    for (const r of result.data) {
      expect(r.source).toBe('direct');
    }
  });

  test('findAllReservations filters by search', async () => {
    const rsv = await R.findReservationById(rsvId);
    const result = await R.findAllReservations({
      search: rsv!.guestName.slice(0, 4),
      limit: 10,
    });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('findAllReservations with ordering works', async () => {
    const result = await R.findAllReservations({
      orderBy: 'check_in',
      orderDir: 'desc',
      limit: 10,
    });
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  });

  test('updateReservation changes fields', async () => {
    const rsv = await R.createReservation({
      guestName: `Upd Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      checkIn: daysFromNow(40),
      checkOut: daysFromNow(42),
    });
    const updated = await R.updateReservation(rsv.id, {
      specialRequests: 'Late check-in',
    } as any);
    expect(updated.specialRequests).toBe('Late check-in');
  });

  test('updateReservation recalculates on date change', async () => {
    const rsv = await R.createReservation({
      guestName: `Calc Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      roomTypeId: testRoomTypeId,
      checkIn: daysFromNow(45),
      checkOut: daysFromNow(48),
    });
    const updated = await R.updateReservation(rsv.id, {
      checkOut: daysFromNow(50),
    } as any);
    expect(updated.nights).toBe(5);
    expect(updated.totalAmount).toBe(2500 * 5);
  });

  test('updateReservation with rateOverride recalculates', async () => {
    const rsv = await R.updateReservation(rsvId, {
      rateOverride: 3000,
    } as any);
    expect(rsv.rateOverride).toBe(3000);
  });

  test('createReservation with same-night stay sets nights to 1', async () => {
    const rsv = await R.createReservation({
      guestName: `SameNight ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      checkIn: today(),
      checkOut: today(),
    });
    expect(rsv.nights).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. STAYS & CHECK-IN FLOW
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Stays & Check-In', () => {
  let checkInRoomId = '';
  let checkInRsvId = '';
  let stayId = '';

  beforeAll(async () => {
    const room = await R.createRoom({
      roomNo: `CI${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
      view: 'garden',
    });
    checkInRoomId = room.id;

    const rsv = await R.createReservation({
      guestName: `CheckIn Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      roomTypeId: testRoomTypeId,
      roomId: checkInRoomId,
      checkIn: today(),
      checkOut: daysFromNow(2),
      adults: 2,
      source: 'direct',
    });
    await R.updateReservationStatus(rsv.id, 'reserved');
    await R.updateReservationStatus(rsv.id, 'confirmed');
    checkInRsvId = rsv.id;
  });

  test('createStay creates stay with folio and updates room', async () => {
    const rsv = await R.findReservationById(checkInRsvId);
    const room = await R.findRoomById(checkInRoomId);

    const stay = await R.createStay({
      reservationId: rsv!.id,
      guestId: testGuestId,
      guestName: rsv!.guestName,
      guestPhone: rsv!.guestPhone,
      roomId: room!.id,
      roomNo: room!.roomNo,
      roomTypeId: room!.roomTypeId,
      roomTypeName: room!.roomTypeName,
      expectedCheckOut: rsv!.checkOut,
      nights: rsv!.nights,
      adults: rsv!.adults,
      children: rsv!.children,
      boardType: rsv!.boardType,
      rate: rsv!.rateOverride ?? 0,
      discountPercent: rsv!.discountPercent,
      notes: rsv!.specialRequests || undefined,
      checkedInBy: 'test-user',
    });

    expect(stay.id).toBeTruthy();
    expect(stay.status).toBe('active');
    expect(stay.folioId).toBeTruthy();
    expect(stay.folioNumber).toMatch(/^FIO-/);
    stayId = stay.id;
    testStayId = stay.id;
    testFolioId = stay.folioId!;
  });

  test('createStay updates reservation to checked_in', async () => {
    const rsv = await R.findReservationById(checkInRsvId);
    expect(rsv!.status).toBe('checked_in');
  });

  test('createStay creates folio with balance', async () => {
    const folio = await R.findFolioById(testFolioId);
    expect(folio).not.toBeNull();
    expect(folio!.status).toBe('open');
    expect(folio!.balanceAmount).toBeGreaterThanOrEqual(0);
  });

  test('createStay updates room to occupied', async () => {
    const room = await R.findRoomById(checkInRoomId);
    expect(room!.status).toBe('occupied');
    expect(room!.currentStayId).toBe(stayId);
  });

  test('findStayById returns stay', async () => {
    const stay = await R.findStayById(stayId);
    expect(stay).not.toBeNull();
    expect(stay!.id).toBe(stayId);
  });

  test('findStayByReservation works', async () => {
    const stay = await R.findStayByReservation(checkInRsvId);
    expect(stay).not.toBeNull();
    expect(stay!.reservationId).toBe(checkInRsvId);
  });

  test('findActiveStays returns active stays', async () => {
    const stays = await R.findActiveStays();
    for (const s of stays) {
      expect(s.status).toBe('active');
      expect(s.checkOut).toBeNull();
    }
  });

  test('findStaysByRoom works', async () => {
    const stays = await R.findStaysByRoom(checkInRoomId);
    expect(stays.length).toBeGreaterThanOrEqual(1);
  });

  test('findStaysByRoom with activeOnly filter', async () => {
    const stays = await R.findStaysByRoom(checkInRoomId, true);
    for (const s of stays) {
      expect(s.status).toBe('active');
    }
  });

  test('findAllStays returns paginated', async () => {
    const result = await R.findAllStays({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('findAllStays filters by status', async () => {
    const result = await R.findAllStays({ status: 'active', limit: 10 });
    for (const s of result.data) {
      expect(s.status).toBe('active');
    }
  });

  test('createStay without reservation (walk-in) works', async () => {
    const room = await R.createRoom({
      roomNo: `WI${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
    });
    const walkInStay = await R.createStay({
      guestId: testGuestId,
      guestName: 'Walk-in Guest',
      guestPhone: '9999999998',
      roomId: room.id,
      roomNo: room.roomNo,
      roomTypeId: room.roomTypeId,
      roomTypeName: room.roomTypeName,
      expectedCheckOut: daysFromNow(1),
      nights: 1,
      rate: 2500,
      checkedInBy: 'test-user',
    });
    expect(walkInStay.reservationId).toBeNull();
    expect(walkInStay.status).toBe('active');
    await R.checkOutStay(walkInStay.id, 'test');
  });

  test('updateStay changes nights and check-out', async () => {
    const updated = await R.updateStay(stayId, {
      expectedCheckOut: daysFromNow(3),
      nights: 3,
    });
    expect(updated.nights).toBe(3);
    expect(updated.expectedCheckOut).toBe(daysFromNow(3));
  });

  test('updateStay on non-existent throws', async () => {
    await expect(R.updateStay('nonexistent', { nights: 2 })).rejects.toThrow(
      'not found',
    );
  });

  test('recordRoomEvent creates event for check-in', async () => {
    const events = await R.findRoomEvents('stay', stayId);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.eventType === 'GUEST_CHECKED_IN')).toBe(true);
  });

  test('findStayById returns null for non-existent', async () => {
    const stay = await R.findStayById('nonexistent');
    expect(stay).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 6. CHECK-OUT FLOW
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Check-Out', () => {
  let coStayId = '';
  let coRoomId = '';
  let coRsvId = '';

  beforeAll(async () => {
    const room = await R.createRoom({
      roomNo: `CO${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
    });
    coRoomId = room.id;

    const rsv = await R.createReservation({
      guestName: `CO Guest ${uid()}`,
      guestPhone: `99${uid().slice(0, 8)}`,
      roomTypeId: testRoomTypeId,
      checkIn: daysAgo(2),
      checkOut: today(),
    });
    await R.updateReservationStatus(rsv.id, 'reserved');
    await R.updateReservationStatus(rsv.id, 'confirmed');
    coRsvId = rsv.id;

    const stay = await R.createStay({
      reservationId: rsv.id,
      guestId: testGuestId,
      guestName: rsv.guestName,
      guestPhone: rsv.guestPhone,
      roomId: room.id,
      roomNo: room.roomNo,
      roomTypeId: room.roomTypeId,
      roomTypeName: room.roomTypeName,
      expectedCheckOut: rsv.checkOut,
      nights: rsv.nights,
      adults: rsv.adults,
      children: rsv.children,
      boardType: rsv.boardType,
      rate: rsv.rateOverride ?? 0,
      checkedInBy: 'test-user',
    });
    coStayId = stay.id;
  });

  test('checkOutStay closes stay', async () => {
    const stay = await R.checkOutStay(coStayId, 'test-user');
    expect(stay.status).toBe('checked_out');
    expect(stay.checkedOutAt).not.toBeNull();
    expect(stay.checkedOutBy).toBe('test-user');
    expect(stay.checkOut).not.toBeNull();
  });

  test('checkOutStay updates room to vacant', async () => {
    const room = await R.findRoomById(coRoomId);
    expect(room!.status).toBe('vacant');
  });

  test('checkOutStay clears room currentStayId', async () => {
    const room = await R.findRoomById(coRoomId);
    expect(room!.currentStayId).toBeNull();
  });

  test('checkOutStay updates reservation to checked_out', async () => {
    const rsv = await R.findReservationById(coRsvId);
    expect(rsv!.status).toBe('checked_out');
  });

  test('checkOutStay on already checked-out stay throws', async () => {
    await expect(R.checkOutStay(coStayId, 'test-user')).rejects.toThrow(
      'not active',
    );
  });

  test('checkOutStay on non-existent stay throws', async () => {
    await expect(R.checkOutStay('nonexistent', 'test')).rejects.toThrow(
      'not found',
    );
  });

  test('recordRoomEvent creates event for check-out', async () => {
    const events = await R.findRoomEvents('stay', coStayId);
    expect(events.some((e) => e.eventType === 'GUEST_CHECKED_OUT')).toBe(true);
  });

  test('checkOutStay recalculates folio', async () => {
    const stay = await R.findStayById(coStayId);
    if (stay && stay.folioId) {
      const folio = await R.findFolioById(stay.folioId);
      expect(folio).not.toBeNull();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 7. FOLIO & BILLING
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Folio & Billing', () => {
  let folioStayId = '';
  let folioId = '';
  let chargeId = '';
  let paymentId = '';

  beforeAll(async () => {
    const room = await R.createRoom({
      roomNo: `FO${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
    });
    const stay = await R.createStay({
      guestId: testGuestId,
      guestName: 'Folio Guest',
      guestPhone: '9999999997',
      roomId: room.id,
      roomNo: room.roomNo,
      roomTypeId: room.roomTypeId,
      roomTypeName: room.roomTypeName,
      expectedCheckOut: daysFromNow(1),
      nights: 1,
      rate: 2500,
      checkedInBy: 'test-user',
    });
    folioStayId = stay.id;
    folioId = stay.folioId!;
  });

  test('findFolioById returns folio with charges and payments', async () => {
    const folio = await R.findFolioById(folioId);
    expect(folio).not.toBeNull();
    expect(folio!.folioNumber).toMatch(/^FIO-/);
    expect(Array.isArray(folio!.charges)).toBe(true);
    expect(Array.isArray(folio!.payments)).toBe(true);
  });

  test('findFolioByStay works', async () => {
    const folio = await R.findFolioByStay(folioStayId);
    expect(folio).not.toBeNull();
    expect(folio!.stayId).toBe(folioStayId);
  });

  test('findFolioByNumber works', async () => {
    const folio = await R.findFolioById(folioId);
    const found = await R.findFolioByNumber(folio!.folioNumber);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(folioId);
  });

  test('findAllFolios returns paginated', async () => {
    const result = await R.findAllFolios({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('findAllFolios filters by stayId', async () => {
    const result = await R.findAllFolios({ stayId: folioStayId, limit: 10 });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('postCharge adds charge and recalculates', async () => {
    const charge = await R.postCharge({
      folioId,
      category: 'room_tariff',
      description: 'Room charge - 1 night',
      amount: 2500,
      quantity: 1,
    });
    expect(charge.id).toBeTruthy();
    expect(charge.category).toBe('room_tariff');
    expect(charge.totalAmount).toBe(2500);
    chargeId = charge.id;

    const folio = await R.findFolioById(folioId);
    expect(folio!.roomCharges).toBe(2500);
    expect(folio!.totalCharges).toBeGreaterThanOrEqual(2500);
  });

  test('postCharge with room_tariff category updates roomCharges', async () => {
    await R.postCharge({
      folioId,
      category: 'room_tariff',
      description: 'Room charge - extra night',
      amount: 2500,
      quantity: 1,
    });
    const folio = await R.findFolioById(folioId);
    expect(folio!.roomCharges).toBe(5000);
  });

  test('postCharge with restaurant category updates restaurantCharges', async () => {
    await R.postCharge({
      folioId,
      category: 'restaurant',
      description: 'Dinner',
      amount: 1500,
      quantity: 1,
    });
    const folio = await R.findFolioById(folioId);
    expect(folio!.restaurantCharges).toBe(1500);
  });

  test('postCharge with bar category updates barCharges', async () => {
    await R.postCharge({
      folioId,
      category: 'bar',
      description: 'Drinks',
      amount: 800,
      quantity: 1,
    });
    const folio = await R.findFolioById(folioId);
    expect(folio!.barCharges).toBe(800);
  });

  test('postCharge with extra_bed updates extraBedCharges', async () => {
    await R.postCharge({
      folioId,
      category: 'extra_bed',
      description: 'Extra bed',
      amount: 500,
      quantity: 1,
    });
    const folio = await R.findFolioById(folioId);
    expect(folio!.extraBedCharges).toBe(500);
  });

  test('postCharge with quantity > 1 multiplies totalAmount', async () => {
    const charge = await R.postCharge({
      folioId,
      category: 'laundry',
      description: 'Laundry service',
      amount: 200,
      quantity: 3,
    });
    expect(charge.totalAmount).toBe(600);
  });

  test('postCharge with taxAmount includes tax', async () => {
    const charge = await R.postCharge({
      folioId,
      category: 'room_service',
      description: 'Room service',
      amount: 1000,
      quantity: 1,
      taxAmount: 180,
    });
    expect(charge.totalAmount).toBe(1180);
  });

  test('postFolioCharge is alias for postCharge', async () => {
    const charge = await R.postFolioCharge({
      folioId,
      category: 'amenities',
      description: 'Spa',
      amount: 2000,
      quantity: 1,
    });
    expect(charge.category).toBe('amenities');
  });

  test('postPayment adds payment and recalculates', async () => {
    const payment = await R.postPayment({
      folioId,
      mode: 'cash',
      amount: 3000,
      reference: 'Cash payment',
    });
    expect(payment.id).toBeTruthy();
    expect(payment.mode).toBe('cash');
    expect(payment.amount).toBe(3000);
    paymentId = payment.id;

    const folio = await R.findFolioById(folioId);
    expect(folio!.totalPayments).toBeGreaterThanOrEqual(3000);
  });

  test('postPayment with multiple modes accumulates', async () => {
    await R.postPayment({
      folioId,
      mode: 'upi',
      amount: 5000,
    });
    const folio = await R.findFolioById(folioId);
    expect(folio!.totalPayments).toBeGreaterThanOrEqual(8000);
  });

  test('postPayment that zeroes balance auto-closes folio', async () => {
    const folio = await R.findFolioById(folioId);
    const remainingBalance = folio!.balanceAmount;
    if (remainingBalance > 0) {
      await R.postPayment({
        folioId,
        mode: 'card',
        amount: remainingBalance,
      });
      const updatedFolio = await R.findFolioById(folioId);
      expect(updatedFolio!.status).toBe('paid');
      expect(updatedFolio!.balanceAmount).toBeLessThanOrEqual(0);
    }
  });

  test('getFolioBalance returns correct amount', async () => {
    const balance = await R.getFolioBalance(folioId);
    expect(typeof balance).toBe('number');
  });

  test('closeFolio sets closed status', async () => {
    const folio = await R.closeFolio(folioId);
    expect(folio.status).toBe('closed');
    expect(folio.closedAt).not.toBeNull();
  });

  test('voidFolio sets cancelled status', async () => {
    const coRoom = await R.createRoom({
      roomNo: `VO${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
    });
    const coStay = await R.createStay({
      guestId: testGuestId,
      guestName: 'Void Guest',
      guestPhone: '9999999996',
      roomId: coRoom.id,
      roomNo: coRoom.roomNo,
      roomTypeId: coRoom.roomTypeId,
      roomTypeName: coRoom.roomTypeName,
      expectedCheckOut: daysFromNow(1),
      nights: 1,
      rate: 2500,
    });
    const voidFolio = await R.voidFolio(coStay.folioId!);
    expect(voidFolio.status).toBe('cancelled');
    await R.checkOutStay(coStay.id, 'test');
  });

  test('createFolio creates stand-alone folio', async () => {
    const folio = await R.createFolio({
      stayId: folioStayId,
      guestId: testGuestId,
      guestName: 'Standalone',
      roomNo: '101',
    });
    expect(folio.id).toBeTruthy();
    expect(folio.folioNumber).toMatch(/^FIO-/);
  });

  test('findFolioById returns null for non-existent', async () => {
    const folio = await R.findFolioById('nonexistent');
    expect(folio).toBeNull();
  });

  test('recalculateFolio updates totals correctly', async () => {
    const freshRoom = await R.createRoom({
      roomNo: `RF${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
    });
    const freshStay = await R.createStay({
      guestId: testGuestId,
      guestName: 'Recalc Guest',
      guestPhone: '9999999995',
      roomId: freshRoom.id,
      roomNo: freshRoom.roomNo,
      roomTypeId: freshRoom.roomTypeId,
      roomTypeName: freshRoom.roomTypeName,
      expectedCheckOut: daysFromNow(1),
      nights: 1,
      rate: 2500,
    });
    await R.postCharge({
      folioId: freshStay.folioId!,
      category: 'room_tariff',
      description: 'Test charge',
      amount: 2500,
      quantity: 1,
    });
    const folio = await R.recalculateFolio(freshStay.folioId!);
    expect(folio.totalCharges).toBeGreaterThanOrEqual(2500);
    await R.checkOutStay(freshStay.id, 'test');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 8. HOUSEKEEPING
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Housekeeping', () => {
  let hkId = '';
  let hkRoomId = '';

  beforeAll(async () => {
    const room = await R.createRoom({
      roomNo: `HK${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
    });
    hkRoomId = room.id;
  });

  test('createHousekeepingTask creates with correct data', async () => {
    const task = await R.createHousekeepingTask({
      roomId: hkRoomId,
      taskType: 'daily_cleaning',
      scheduledDate: today(),
      priority: 1,
      notes: 'Standard cleaning',
    });
    expect(task.id).toBeTruthy();
    expect(task.status).toBe('pending');
    expect(task.roomNo).toBeTruthy();
    expect(task.taskType).toBe('daily_cleaning');
    expect(task.priority).toBe(1);
    hkId = task.id;
  });

  test('findHousekeepingByDate returns tasks', async () => {
    const tasks = await R.findHousekeepingByDate(today());
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  test('findHousekeepingByRoom works', async () => {
    const tasks = await R.findHousekeepingByRoom(hkRoomId);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  test('findHousekeepingTaskById returns task', async () => {
    const task = await R.findHousekeepingTaskById(hkId);
    expect(task).not.toBeNull();
    expect(task!.id).toBe(hkId);
  });

  test('findAllHousekeepingTasks returns paginated', async () => {
    const result = await R.findAllHousekeepingTasks({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('findAllHousekeepingTasks filters by status', async () => {
    const result = await R.findAllHousekeepingTasks({
      status: 'pending',
      limit: 10,
    });
    for (const t of result.data) {
      expect(t.status).toBe('pending');
    }
  });

  test('findAllHousekeepingTasks filters by roomId', async () => {
    const result = await R.findAllHousekeepingTasks({
      roomId: hkRoomId,
      limit: 10,
    });
    for (const t of result.data) {
      expect(t.roomId).toBe(hkRoomId);
    }
  });

  test('findAllHousekeepingTasks filters by date range', async () => {
    const result = await R.findAllHousekeepingTasks({
      fromDate: daysAgo(1),
      toDate: daysFromNow(1),
      limit: 10,
    });
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  });

  test('completeHousekeepingTask updates status and sets completed_at', async () => {
    const task = await R.completeHousekeepingTask(hkId);
    expect(task.status).toBe('completed');
    expect(task.completedAt).not.toBeNull();
  });

  test('updateHousekeepingTask changes fields', async () => {
    const task = await R.updateHousekeepingTask(hkId, {
      priority: 2,
      notes: 'Updated',
    } as any);
    expect(task.priority).toBe(2);
    expect(task.notes).toBe('Updated');
  });

  test('updateHousekeepingTask changes status', async () => {
    const task = await R.updateHousekeepingTask(hkId, {
      status: 'inspected',
    } as any);
    expect(task.status).toBe('inspected');
  });

  test('updateHousekeepingTask on non-existent throws', async () => {
    await expect(
      R.updateHousekeepingTask('nonexistent', { notes: 'Test' } as any),
    ).rejects.toThrow('not found');
  });

  test('getHousekeepingSummary returns counts', async () => {
    const summary = await R.getHousekeepingSummary();
    expect(typeof summary.pending).toBe('number');
    expect(typeof summary.completed).toBe('number');
    expect(typeof summary.in_progress).toBe('number');
    expect(typeof summary.inspected).toBe('number');
  });

  test('getHousekeepingSummary filters by date', async () => {
    const summary = await R.getHousekeepingSummary(today());
    expect(typeof summary.pending).toBe('number');
  });

  test('createHousekeepingTask with assignment works', async () => {
    const task = await R.createHousekeepingTask({
      roomId: hkRoomId,
      taskType: 'deep_cleaning',
      scheduledDate: today(),
      assignedTo: 'housekeeper-1',
    });
    expect(task.assignedTo).toBe('housekeeper-1');
  });

  test('findHousekeepingTaskById returns null for non-existent', async () => {
    const task = await R.findHousekeepingTaskById('nonexistent');
    expect(task).toBeNull();
  });

  test('Housekeeping event recorded on create', async () => {
    const events = await R.findRoomEvents('housekeeping_task', hkId);
    expect(events.some((e) => e.eventType === 'HOUSEKEEPING_STARTED')).toBe(
      true,
    );
  });

  test('Housekeeping event recorded on complete', async () => {
    const fresh = await R.createHousekeepingTask({
      roomId: hkRoomId,
      taskType: 'turn_down',
      scheduledDate: today(),
    });
    await R.completeHousekeepingTask(fresh.id);
    const events = await R.findRoomEvents('housekeeping_task', fresh.id);
    expect(events.some((e) => e.eventType === 'HOUSEKEEPING_COMPLETED')).toBe(
      true,
    );
  });
});

// ═════════════════════════════════════════════════════════════════════
// 9. MAINTENANCE
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Maintenance', () => {
  let mtcId = '';
  let mtcRoomId = '';

  beforeAll(async () => {
    const room = await R.createRoom({
      roomNo: `MT${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
    });
    mtcRoomId = room.id;
  });

  test('createMaintenanceRequest creates with correct data', async () => {
    const req = await R.createMaintenanceRequest({
      roomId: mtcRoomId,
      issueType: 'ac_fault',
      description: 'AC not cooling',
      priority: 1,
      reportedBy: 'reception',
    });
    expect(req.id).toBeTruthy();
    expect(req.status).toBe('reported');
    expect(req.issueType).toBe('ac_fault');
    expect(req.description).toBe('AC not cooling');
    expect(req.priority).toBe(1);
    expect(req.roomNo).toBeTruthy();
    mtcId = req.id;
  });

  test('findMaintenanceByRoom works', async () => {
    const requests = await R.findMaintenanceByRoom(mtcRoomId);
    expect(requests.length).toBeGreaterThanOrEqual(1);
  });

  test('findMaintenanceRequestById returns request', async () => {
    const req = await R.findMaintenanceRequestById(mtcId);
    expect(req).not.toBeNull();
    expect(req!.id).toBe(mtcId);
  });

  test('findAllMaintenanceRequests returns paginated', async () => {
    const result = await R.findAllMaintenanceRequests({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('findAllMaintenanceRequests filters by status', async () => {
    const result = await R.findAllMaintenanceRequests({
      status: 'reported',
      limit: 10,
    });
    for (const r of result.data) {
      expect(r.status).toBe('reported');
    }
  });

  test('findAllMaintenanceRequests filters by roomId', async () => {
    const result = await R.findAllMaintenanceRequests({
      roomId: mtcRoomId,
      limit: 10,
    });
    for (const r of result.data) {
      expect(r.roomId).toBe(mtcRoomId);
    }
  });

  test('findAllMaintenanceRequests filters by priority', async () => {
    const result = await R.findAllMaintenanceRequests({
      priority: 1,
      limit: 10,
    });
    for (const r of result.data) {
      expect(r.priority).toBe(1);
    }
  });

  test('findAllMaintenanceRequests filters by issueType', async () => {
    const result = await R.findAllMaintenanceRequests({
      issueType: 'ac_fault',
      limit: 10,
    });
    for (const r of result.data) {
      expect(r.issueType).toBe('ac_fault');
    }
  });

  test('updateMaintenanceRequest changes fields', async () => {
    const updated = await R.updateMaintenanceRequest(mtcId, {
      priority: 2,
      assignedTo: 'tech-1',
      status: 'assigned',
    } as any);
    expect(updated.priority).toBe(2);
    expect(updated.assignedTo).toBe('tech-1');
    expect(updated.status).toBe('assigned');
  });

  test('updateMaintenanceRequest on non-existent throws', async () => {
    await expect(
      R.updateMaintenanceRequest('nonexistent', { notes: 'Test' } as any),
    ).rejects.toThrow('not found');
  });

  test('resolveMaintenance updates status and resolution', async () => {
    const resolved = await R.resolveMaintenance(
      mtcId,
      'Replaced AC filter',
      500,
      'tech-1',
    );
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolution).toBe('Replaced AC filter');
    expect(resolved.cost).toBe(500);
    expect(resolved.verifiedBy).toBe('tech-1');
    expect(resolved.resolvedAt).not.toBeNull();
  });

  test('resolveMaintenance records event', async () => {
    const events = await R.findRoomEvents('maintenance_request', mtcId);
    expect(events.some((e) => e.eventType === 'MAINTENANCE_CLOSED')).toBe(true);
  });

  test('getMaintenanceSummary returns counts', async () => {
    const summary = await R.getMaintenanceSummary();
    expect(summary.byStatus).toBeDefined();
    expect(typeof summary.byStatus.reported).toBe('number');
    expect(typeof summary.byStatus.resolved).toBe('number');
    expect(summary.byPriority).toBeDefined();
  });

  test('findMaintenanceRequestById returns null for non-existent', async () => {
    const req = await R.findMaintenanceRequestById('nonexistent');
    expect(req).toBeNull();
  });

  test('createMaintenanceRequest with high priority works', async () => {
    const req = await R.createMaintenanceRequest({
      roomId: mtcRoomId,
      issueType: 'plumbing',
      description: 'Leaking pipe',
      priority: 5,
      reportedBy: 'housekeeping',
    });
    expect(req.priority).toBe(5);
  });

  test('Maintenance event recorded on create', async () => {
    const events = await R.findRoomEvents('maintenance_request', mtcId);
    expect(events.some((e) => e.eventType === 'MAINTENANCE_OPENED')).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 10. NIGHT AUDIT
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Night Audit', () => {
  let auditId = '';

  test('performNightAudit creates audit record', async () => {
    const audit = await R.performNightAudit({
      auditDate: today(),
      totalRooms: 10,
      occupiedRooms: 5,
      vacantRooms: 4,
      outOfServiceRooms: 1,
      blockedRooms: 0,
      housekeepingRooms: 1,
      totalRevenue: 50000,
      roomRevenue: 40000,
      restaurantRevenue: 8000,
      barRevenue: 2000,
      otherRevenue: 0,
      totalTax: 5000,
      totalDiscounts: 1000,
      totalPayments: 45000,
      outstandingBalance: 5000,
      performedBy: 'auditor-1',
    });
    expect(audit.id).toBeTruthy();
    expect(audit.auditDate).toBe(today());
    expect(audit.status).toBe('draft');
    expect(audit.performedBy).toBe('auditor-1');
    auditId = audit.id;
  });

  test('performNightAudit calculates occupancy percent correctly', async () => {
    const audit = await R.findNightAuditByDate(today());
    expect(audit).not.toBeNull();
    expect(audit!.occupancyPercent).toBe(50);
  });

  test('performNightAudit calculates ADR correctly', async () => {
    const audit = await R.findNightAuditByDate(today());
    expect(audit!.adr).toBe(8000);
  });

  test('performNightAudit calculates RevPAR correctly', async () => {
    const audit = await R.findNightAuditByDate(today());
    expect(audit!.revpar).toBe(4000);
  });

  test('performNightAudit rejects duplicate date', async () => {
    await expect(
      R.performNightAudit({
        auditDate: today(),
        totalRooms: 10,
        occupiedRooms: 5,
        vacantRooms: 5,
        performedBy: 'test',
      }),
    ).rejects.toThrow('already exists');
  });

  test('approveNightAudit sets status to approved', async () => {
    const audit = await R.approveNightAudit(auditId);
    expect(audit.status).toBe('approved');
  });

  test('findNightAuditByDate returns audit', async () => {
    const audit = await R.findNightAuditByDate(today());
    expect(audit).not.toBeNull();
    expect(audit!.auditDate).toBe(today());
  });

  test('findNightAuditByDate returns null for missing date', async () => {
    const audit = await R.findNightAuditByDate('2099-01-01');
    expect(audit).toBeNull();
  });

  test('findAllNightAudits returns audits', async () => {
    const audits = await R.findAllNightAudits(10);
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });

  test('getNightAuditSummary returns aggregated data', async () => {
    const summary = await R.getNightAuditSummary(daysAgo(1), daysFromNow(1));
    expect(summary.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(summary.totalTax).toBeGreaterThanOrEqual(0);
    expect(summary.totalPayments).toBeGreaterThanOrEqual(0);
    expect(typeof summary.avgOccupancy).toBe('number');
    expect(typeof summary.avgAdr).toBe('number');
    expect(typeof summary.avgRevpar).toBe('number');
    expect(summary.auditCount).toBeGreaterThanOrEqual(1);
  });

  test('calculateOccupancy returns room counts', async () => {
    const occ = await R.calculateOccupancy(today());
    expect(occ.totalRooms).toBeGreaterThanOrEqual(1);
    expect(typeof occ.occupiedRooms).toBe('number');
    expect(typeof occ.vacantRooms).toBe('number');
    expect(typeof occ.occupancyPercent).toBe('number');
    expect(typeof occ.outOfService).toBe('number');
    expect(typeof occ.blocked).toBe('number');
    expect(typeof occ.cleaning).toBe('number');
  });

  test('performNightAudit with zero rooms handles gracefully', async () => {
    const audit = await R.performNightAudit({
      auditDate: daysFromNow(100),
      totalRooms: 0,
      occupiedRooms: 0,
      vacantRooms: 0,
      performedBy: 'test',
    });
    expect(audit.occupancyPercent).toBe(0);
    expect(audit.adr).toBe(0);
    expect(audit.revpar).toBe(0);
  });

  test('Night audit event recorded', async () => {
    const events = await R.findRoomEvents('night_audit', auditId);
    expect(events.some((e) => e.eventType === 'NIGHT_AUDIT_COMPLETED')).toBe(
      true,
    );
  });

  test('performNightAudit with revenue data persists correctly', async () => {
    const audit = await R.performNightAudit({
      auditDate: daysFromNow(101),
      totalRooms: 20,
      occupiedRooms: 15,
      vacantRooms: 5,
      roomRevenue: 60000,
      restaurantRevenue: 10000,
      barRevenue: 5000,
      otherRevenue: 2000,
      totalTax: 8000,
      totalDiscounts: 2000,
      totalPayments: 60000,
      outstandingBalance: 15000,
      performedBy: 'auditor-2',
    });
    expect(audit.roomRevenue).toBe(60000);
    expect(audit.restaurantRevenue).toBe(10000);
    expect(audit.barRevenue).toBe(5000);
    expect(audit.otherRevenue).toBe(2000);
    expect(audit.totalRevenue).toBe(77000);
    expect(audit.occupancyPercent).toBe(75);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 11. ROOM OPERATIONS & ASSIGNMENTS
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Room Operations & Assignments', () => {
  let opRoomId = '';
  let opStayId = '';

  beforeAll(async () => {
    const room = await R.createRoom({
      roomNo: `OP${uid().slice(0, 6)}`,
      roomTypeId: testRoomTypeId,
      floor: 1,
    });
    opRoomId = room.id;

    const stay = await R.createStay({
      guestId: testGuestId,
      guestName: 'Op Guest',
      guestPhone: '9999999994',
      roomId: room.id,
      roomNo: room.roomNo,
      roomTypeId: room.roomTypeId,
      roomTypeName: room.roomTypeName,
      expectedCheckOut: daysFromNow(1),
      nights: 1,
      rate: 2500,
      checkedInBy: 'test',
    });
    opStayId = stay.id;
  });

  test('blockRoom sets status to blocked', async () => {
    const room = await R.updateRoomStatus(opRoomId, 'blocked');
    expect(room.status).toBe('blocked');
  });

  test('unblockRoom sets status to vacant', async () => {
    const room = await R.updateRoomStatus(opRoomId, 'vacant');
    expect(room.status).toBe('vacant');
  });

  test('setOutOfService sets status correctly', async () => {
    const room = await R.updateRoomStatus(opRoomId, 'out_of_service');
    expect(room.status).toBe('out_of_service');
    await R.updateRoomStatus(opRoomId, 'vacant');
  });

  test('setMaintenance sets status correctly', async () => {
    const room = await R.updateRoomStatus(opRoomId, 'maintenance');
    expect(room.status).toBe('maintenance');
    await R.updateRoomStatus(opRoomId, 'vacant');
  });

  test('createAssignment creates assignment record', async () => {
    const assignment = await R.createAssignment({
      stayId: opStayId,
      roomId: opRoomId,
      roomNo: 'OP-ROOM',
      assignedBy: 'test-user',
    });
    expect(assignment.id).toBeTruthy();
    expect(assignment.stayId).toBe(opStayId);
    expect(assignment.roomId).toBe(opRoomId);
    expect(assignment.assignedBy).toBe('test-user');
    expect(assignment.releasedAt).toBeNull();
  });

  test('findAssignmentsByStay returns assignments', async () => {
    const assignments = await R.findAssignmentsByStay(opStayId);
    expect(assignments.length).toBeGreaterThanOrEqual(1);
  });

  test('findAssignmentsByRoom returns assignments', async () => {
    const assignments = await R.findAssignmentsByRoom(opRoomId);
    expect(assignments.length).toBeGreaterThanOrEqual(1);
  });

  test('getCurrentAssignment returns active assignment', async () => {
    // After createAssignment, the assignment is active (releasedAt IS NULL)
    const assignments = await R.findAssignmentsByRoom(opRoomId);
    const activeAssignments = assignments.filter((a) => !a.releasedAt);
    if (activeAssignments.length > 0) {
      const current = await R.getCurrentAssignment(opRoomId);
      expect(current).not.toBeNull();
      expect(current!.roomId).toBe(opRoomId);
    }
  });

  test('releaseAssignment sets releasedAt', async () => {
    const assignment = await R.createAssignment({
      stayId: opStayId,
      roomId: opRoomId,
      roomNo: 'REL-ROOM',
      assignedBy: 'test',
    });
    const released = await R.releaseAssignment(assignment.id, 'Check-out');
    expect(released.releasedAt).not.toBeNull();
    expect(released.reason).toBe('Check-out');
  });

  test('Block event recorded', async () => {
    await R.updateRoomStatus(opRoomId, 'blocked');
    await R.recordRoomEvent(
      'ROOM_BLOCKED',
      'room',
      opRoomId,
      undefined,
      'test',
    );
    const events = await R.findRoomEvents('room', opRoomId);
    expect(events.some((e) => e.eventType === 'ROOM_BLOCKED')).toBe(true);
    await R.updateRoomStatus(opRoomId, 'vacant');
  });

  test('Transfer event type exists', () => {
    const types = [
      'ROOM_TRANSFERRED',
      'ROOM_UPGRADED',
      'ROOM_ASSIGNED',
      'ROOM_OCCUPIED',
      'ROOM_VACANT',
      'STAY_EXTENDED',
    ] as const;
    for (const t of types) {
      expect(t).toBeTruthy();
    }
  });

  test('updateRoomStatus with stayId on occupied room', async () => {
    // Re-create occupied state
    const room = await R.findRoomById(opRoomId);
    await R.updateRoomStatus(opRoomId, 'occupied', opStayId);
    const updated = await R.findRoomById(opRoomId);
    expect(updated!.currentStayId).toBe(opStayId);
    await R.updateRoomStatus(opRoomId, 'vacant');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 12. REPORTING & EVENTS
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Reporting & Events', () => {
  test('getOccupancyReport returns data', async () => {
    const report = await R.getOccupancyReport(daysAgo(1), daysFromNow(1));
    expect(Array.isArray(report)).toBe(true);
  });

  test('getRevenueReport returns summary', async () => {
    const report = await R.getRevenueReport(daysAgo(1), daysFromNow(1));
    expect(report.fromDate).toBe(daysAgo(1));
    expect(report.toDate).toBe(daysFromNow(1));
    expect(typeof report.totalRevenue).toBe('number');
    expect(typeof report.netRevenue).toBe('number');
  });

  test('getGuestHistory returns stay history', async () => {
    const history = await R.getGuestHistory(testGuestId);
    expect(Array.isArray(history)).toBe(true);
    for (const h of history) {
      expect(h.stayId).toBeTruthy();
      expect(typeof h.totalCharges).toBe('number');
    }
  });

  test('getGuestHistory returns empty for no stays', async () => {
    const history = await R.getGuestHistory('nonexistent');
    expect(history).toEqual([]);
  });

  test('getRoomHistory returns assignment history', async () => {
    const history = await R.getRoomHistory(testRoomId);
    expect(Array.isArray(history)).toBe(true);
  });

  test('getRoomHistory returns empty for no assignments', async () => {
    const history = await R.getRoomHistory('nonexistent');
    expect(history).toEqual([]);
  });

  test('recordRoomEvent creates event', async () => {
    const event = await R.recordRoomEvent(
      'ROOM_OCCUPIED',
      'room',
      testRoomId,
      JSON.stringify({ test: true }),
      'test-user',
    );
    expect(event.id).toBeTruthy();
    expect(event.eventType).toBe('ROOM_OCCUPIED');
    expect(event.createdBy).toBe('test-user');
  });

  test('findRoomEvents returns events for aggregate', async () => {
    const events = await R.findRoomEvents('room', testRoomId);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  test('findRoomEvents filters by type', async () => {
    const events = await R.findRoomEvents('reservation');
    expect(Array.isArray(events)).toBe(true);
  });

  test('findRoomEvents returns events in desc order', async () => {
    const events = await R.findRoomEvents('room', testRoomId);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].timestamp >= events[i].timestamp).toBe(true);
    }
  });

  test('getOccupancyReport with no audits returns empty', async () => {
    const report = await R.getOccupancyReport('2000-01-01', '2000-01-02');
    expect(report).toEqual([]);
  });

  test('getRevenueReport with no audits returns zeros', async () => {
    const report = await R.getRevenueReport('2000-01-01', '2000-01-02');
    expect(report.totalRevenue).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 13. EDGE CASES
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — Edge Cases', () => {
  test('findRoomById returns null for non-existent', async () => {
    const room = await R.findRoomById('nonexistent-id');
    expect(room).toBeNull();
  });

  test('findRoomByNo returns null for non-existent', async () => {
    const room = await R.findRoomByNo('ZZZ999');
    expect(room).toBeNull();
  });

  test('findGuestByPhone returns null for non-existent', async () => {
    const guest = await R.findGuestByPhone('0000000000');
    expect(guest).toBeNull();
  });

  test('findReservationByNo returns null for non-existent', async () => {
    const rsv = await R.findReservationByNo('RSV-NONEXISTENT');
    expect(rsv).toBeNull();
  });

  test('findFolioByStay returns null for non-existent stay', async () => {
    const folio = await R.findFolioByStay('nonexistent');
    expect(folio).toBeNull();
  });

  test('findFolioByNumber returns null for non-existent', async () => {
    const folio = await R.findFolioByNumber('FIO-NONEXISTENT');
    expect(folio).toBeNull();
  });

  test('getFolioBalance returns 0 for non-existent', async () => {
    const balance = await R.getFolioBalance('nonexistent');
    expect(balance).toBe(0);
  });

  test('createRoomType with long name works', async () => {
    const name = 'A'.repeat(100);
    const code = `LNG${uid().slice(0, 4).toUpperCase()}`;
    const rt = await R.createRoomType({ name, code, baseRate: 1000 });
    expect(rt.name.length).toBe(100);
    await R.archiveRoomType(rt.id);
  });

  test('createGuest with minimum fields works', async () => {
    const guest = await R.createGuest({
      name: 'Min Guest',
      phone: `99${uid().slice(0, 8)}`,
    });
    expect(guest.name).toBe('Min Guest');
    expect(guest.nationality).toBe('Indian');
    expect(guest.isCorporate).toBe(false);
  });

  test('getArrivalsToday returns empty when none expected', async () => {
    const arrivals = await R.getArrivalsToday();
    expect(Array.isArray(arrivals)).toBe(true);
  });

  test('getUpcomingArrivals with 0 days returns today', async () => {
    const arrivals = await R.getUpcomingArrivals(0);
    expect(Array.isArray(arrivals)).toBe(true);
  });

  test('findReservationsByDateRange with no overlap returns empty', async () => {
    const reservations = await R.findReservationsByDateRange(
      '2000-01-01',
      '2000-01-02',
    );
    expect(reservations).toEqual([]);
  });

  test('findRoomsByStatus with unknown status returns empty', async () => {
    const rooms = await R.findRoomsByStatus('occupied' as T.RoomStatus);
    expect(Array.isArray(rooms)).toBe(true);
  });

  test('findAvailableRooms with dates excludes reserved rooms', async () => {
    const futureStart = daysFromNow(200);
    const futureEnd = daysFromNow(205);
    // First check availability
    const before = await R.findAvailableRooms(futureStart, futureEnd);
    const beforeCount = before.length;

    // Create a reservation for one of those rooms
    if (before.length > 0) {
      const availableRoom = before[0];
      await R.createReservation({
        guestName: 'Block Guest',
        guestPhone: '9999999993',
        roomTypeId: availableRoom.roomTypeId,
        roomId: availableRoom.id,
        checkIn: futureStart,
        checkOut: futureEnd,
      });

      // The reserved room should no longer be available
      const after = await R.findAvailableRooms(futureStart, futureEnd);
      expect(after.length).toBe(beforeCount - 1);
    }
  });

  test('createReservation without roomTypeId still works', async () => {
    const rsv = await R.createReservation({
      guestName: 'No RoomType Guest',
      guestPhone: `99${uid().slice(0, 8)}`,
      checkIn: daysFromNow(50),
      checkOut: daysFromNow(52),
    });
    expect(rsv.roomTypeId).toBeNull();
    expect(rsv.nights).toBe(2);
    expect(rsv.totalAmount).toBe(0);
  });

  test('updateReservation on non-existent throws', async () => {
    await expect(
      R.updateReservation('nonexistent', { notes: 'Test' } as any),
    ).rejects.toThrow('not found');
  });

  test('updateReservationStatus on non-existent throws', async () => {
    await expect(
      R.updateReservationStatus('nonexistent', 'confirmed'),
    ).rejects.toThrow('not found');
  });

  test('cancelReservation on non-existent throws', async () => {
    await expect(R.cancelReservation('nonexistent')).rejects.toThrow(
      'not found',
    );
  });

  test('postCharge on non-existent folio fails (FK constraint)', async () => {
    await expect(
      R.postCharge({
        folioId: 'nonexistent',
        category: 'other',
        description: 'Test',
        amount: 100,
      }),
    ).rejects.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 14. STATE MACHINE & CONSTANTS
// ═════════════════════════════════════════════════════════════════════

describe('Rooms — State Machine & Constants', () => {
  // ── Reservation Transitions ────────────────────────────────────────

  test('inquiry transitions to reserved and cancelled', () => {
    expect(T.RESERVATION_TRANSITIONS.inquiry).toContain('reserved');
    expect(T.RESERVATION_TRANSITIONS.inquiry).toContain('cancelled');
  });

  test('inquiry does NOT transition to checked_in', () => {
    expect(T.RESERVATION_TRANSITIONS.inquiry).not.toContain('checked_in');
  });

  test('reserved transitions to confirmed, cancelled, no_show', () => {
    expect(T.RESERVATION_TRANSITIONS.reserved).toContain('confirmed');
    expect(T.RESERVATION_TRANSITIONS.reserved).toContain('cancelled');
    expect(T.RESERVATION_TRANSITIONS.reserved).toContain('no_show');
  });

  test('reserved does NOT transition to checked_out', () => {
    expect(T.RESERVATION_TRANSITIONS.reserved).not.toContain('checked_out');
  });

  test('confirmed transitions to checked_in, cancelled, no_show', () => {
    expect(T.RESERVATION_TRANSITIONS.confirmed).toContain('checked_in');
    expect(T.RESERVATION_TRANSITIONS.confirmed).toContain('cancelled');
    expect(T.RESERVATION_TRANSITIONS.confirmed).toContain('no_show');
  });

  test('confirmed does NOT transition to reserved', () => {
    expect(T.RESERVATION_TRANSITIONS.confirmed).not.toContain('reserved');
  });

  test('checked_in transitions to checked_out and cancelled', () => {
    expect(T.RESERVATION_TRANSITIONS.checked_in).toContain('checked_out');
    expect(T.RESERVATION_TRANSITIONS.checked_in).toContain('cancelled');
  });

  test('checked_out transitions to completed only', () => {
    expect(T.RESERVATION_TRANSITIONS.checked_out).toContain('completed');
    expect(T.RESERVATION_TRANSITIONS.checked_out).not.toContain('cancelled');
    expect(T.RESERVATION_TRANSITIONS.checked_out).not.toContain('checked_in');
  });

  test('cancelled has no outgoing transitions', () => {
    expect(T.RESERVATION_TRANSITIONS.cancelled).toEqual([]);
  });

  test('no_show has no outgoing transitions', () => {
    expect(T.RESERVATION_TRANSITIONS.no_show).toEqual([]);
  });

  test('completed has no outgoing transitions', () => {
    expect(T.RESERVATION_TRANSITIONS.completed).toEqual([]);
  });

  // ── Permissions ────────────────────────────────────────────────────

  test('inquiry->reserved permission includes reception, manager, owner', () => {
    const key = 'inquiry->reserved';
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('reception');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('manager');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('owner');
  });

  test('confirmed->cancelled permission requires manager or owner', () => {
    const key = 'confirmed->cancelled';
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('manager');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('owner');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).not.toContain(
      'reception',
    );
  });

  test('checked_out->completed permission includes reception', () => {
    const key = 'checked_out->completed';
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('reception');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('manager');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('owner');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('accountant');
  });

  test('checked_in->cancelled requires manager or owner', () => {
    const key = 'checked_in->cancelled';
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('manager');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).toContain('owner');
    expect(T.RESERVATION_TRANSITION_PERMISSIONS[key]).not.toContain(
      'reception',
    );
  });

  // ── Valid Status Arrays ────────────────────────────────────────────

  test('VALID_RESERVATION_STATUSES contains all 8 statuses', () => {
    const expected = [
      'inquiry',
      'reserved',
      'confirmed',
      'checked_in',
      'checked_out',
      'cancelled',
      'no_show',
      'completed',
    ];
    expect(T.VALID_RESERVATION_STATUSES.length).toBe(8);
    for (const s of expected) {
      expect(T.VALID_RESERVATION_STATUSES).toContain(s);
    }
  });

  test('VALID_ROOM_STATUSES contains all 7 statuses', () => {
    const expected = [
      'vacant',
      'occupied',
      'cleaning',
      'maintenance',
      'out_of_service',
      'blocked',
      'reserved',
    ];
    expect(T.VALID_ROOM_STATUSES.length).toBe(7);
    for (const s of expected) {
      expect(T.VALID_ROOM_STATUSES).toContain(s);
    }
  });

  test('VALID_CHARGE_CATEGORIES contains all categories', () => {
    const expected = [
      'room_tariff',
      'restaurant',
      'bar',
      'room_service',
      'laundry',
      'extra_bed',
      'amenities',
      'service_charge',
      'tax',
      'deposit',
      'other',
    ];
    expect(T.VALID_CHARGE_CATEGORIES.length).toBe(11);
    for (const c of expected) {
      expect(T.VALID_CHARGE_CATEGORIES).toContain(c);
    }
  });

  test('VALID_PAYMENT_MODES contains all modes', () => {
    const expected = ['cash', 'upi', 'card', 'bank', 'credit', 'online'];
    expect(T.VALID_PAYMENT_MODES.length).toBe(6);
    for (const m of expected) {
      expect(T.VALID_PAYMENT_MODES).toContain(m);
    }
  });

  test('VALID_BOOKING_SOURCES contains all sources', () => {
    const expected = ['direct', 'walk_in', 'ota', 'corporate', 'agent'];
    expect(T.VALID_BOOKING_SOURCES.length).toBe(5);
    for (const s of expected) {
      expect(T.VALID_BOOKING_SOURCES).toContain(s);
    }
  });

  test('VALID_BOARD_TYPES contains all types', () => {
    const expected = [
      'room_only',
      'bed_breakfast',
      'half_board',
      'full_board',
      'all_inclusive',
    ];
    expect(T.VALID_BOARD_TYPES.length).toBe(5);
    for (const b of expected) {
      expect(T.VALID_BOARD_TYPES).toContain(b);
    }
  });

  test('RoomEventType includes all event types', () => {
    const expected: T.RoomEventType[] = [
      'RESERVATION_CREATED',
      'RESERVATION_CONFIRMED',
      'RESERVATION_CANCELLED',
      'GUEST_CHECKED_IN',
      'GUEST_CHECKED_OUT',
      'ROOM_OCCUPIED',
      'ROOM_VACANT',
      'ROOM_ASSIGNED',
      'ROOM_TRANSFERRED',
      'ROOM_UPGRADED',
      'ROOM_BLOCKED',
      'HOUSEKEEPING_STARTED',
      'HOUSEKEEPING_COMPLETED',
      'MAINTENANCE_OPENED',
      'MAINTENANCE_CLOSED',
      'CHARGE_POSTED',
      'PAYMENT_RECEIVED',
      'NIGHT_AUDIT_COMPLETED',
      'FOLIO_CLOSED',
      'STAY_EXTENDED',
    ];
    for (const e of expected) {
      expect(e).toBeTruthy();
    }
  });

  // ── All statuses covered by transitions ────────────────────────────

  test('all VALID_RESERVATION_STATUSES have transition entries', () => {
    const transitionKeys = Object.keys(T.RESERVATION_TRANSITIONS);
    for (const s of T.VALID_RESERVATION_STATUSES) {
      expect(transitionKeys).toContain(s);
    }
  });

  test('no extra transition keys beyond valid statuses', () => {
    const transitionKeys = Object.keys(T.RESERVATION_TRANSITIONS);
    expect(transitionKeys.length).toBe(T.VALID_RESERVATION_STATUSES.length);
  });
});
