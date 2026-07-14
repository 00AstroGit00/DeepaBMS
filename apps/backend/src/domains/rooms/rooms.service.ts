import { query, run } from '../../db';
import * as R from './rooms.repository';
import * as T from './rooms.types';
import { postOperationalToLedger } from '../accounting/ledger-integration';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Inclusive-tax split: given a total that already contains `rate`% tax,
// return { taxable, tax }.
function splitInclusive(
  total: number,
  rate: number,
): { taxable: number; tax: number } {
  if (rate <= 0) return { taxable: round2(total), tax: 0 };
  const taxable = round2(total / (1 + rate / 100));
  return { taxable, tax: round2(total - taxable) };
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function recordEvent(
  eventType: T.RoomEventType,
  aggregateType: string,
  aggregateId: string,
  data?: string,
  createdBy?: string,
) {
  return R.RoomsRepository.recordRoomEvent(
    eventType,
    aggregateType,
    aggregateId,
    data,
    createdBy,
  );
}

// ── 1. CheckInOutService ─────────────────────────────────────────────────

export const CheckInOutService = {
  async checkIn(dto: T.CheckInDto, operator?: string) {
    const reservation = await R.RoomsRepository.findReservationById(
      dto.reservationId,
    );
    if (!reservation)
      throw new Error(`Reservation not found: ${dto.reservationId}`);
    if (reservation.status !== 'confirmed') {
      throw new Error(
        `Reservation ${dto.reservationId} status is ${reservation.status}, expected 'confirmed'`,
      );
    }

    let guest = await R.RoomsRepository.findGuestByPhone(
      reservation.guestPhone,
    );
    if (!guest) {
      guest = await R.RoomsRepository.createGuest({
        name: reservation.guestName,
        phone: reservation.guestPhone,
        email: reservation.guestEmail || undefined,
        idProofType: dto.idProofType,
        idProofNumber: dto.idProofNumber,
      });
    }

    const allowed = T.RESERVATION_TRANSITIONS[reservation.status];
    if (!allowed || !allowed.includes('checked_in')) {
      throw new Error(
        `Invalid reservation status transition: ${reservation.status} -> checked_in`,
      );
    }
    const now = new Date().toISOString();
    await run(
      "UPDATE reservations SET status = 'checked_in', updated_at = ? WHERE id = ?",
      [now, dto.reservationId],
    );

    const room = await R.RoomsRepository.findRoomById(dto.roomId);
    if (!room) throw new Error(`Room not found: ${dto.roomId}`);
    if (room.status !== 'vacant') {
      throw new Error(
        `Room ${room.roomNo} status is ${room.status}, expected 'vacant'`,
      );
    }

    let rate = reservation.rateOverride;
    if (rate === null || rate === undefined) {
      const roomType = await R.RoomsRepository.findRoomTypeById(
        room.roomTypeId,
      );
      rate = roomType ? roomType.baseRate : 0;
    }

    const stayId = uid('sta');
    const checkInDate = new Date(reservation.checkIn);
    const checkOutDate = new Date(reservation.checkOut);
    const nights = Math.max(
      1,
      Math.round(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const discountPercent = reservation.discountPercent || 0;
    const totalAmount = rate * nights;

    await run(
      `INSERT INTO stays (id, reservation_id, guest_id, guest_name, guest_phone, room_id, room_no, room_type_id, room_type_name, check_in, expected_check_out, nights, adults, children, board_type, rate, discount_percent, discount_amount, status, notes, checked_in_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      [
        stayId,
        dto.reservationId,
        guest.id,
        reservation.guestName,
        reservation.guestPhone,
        room.id,
        room.roomNo,
        room.roomTypeId,
        room.roomTypeName || '',
        now,
        reservation.checkOut,
        nights,
        dto.adults ?? reservation.adults,
        dto.children ?? reservation.children,
        reservation.boardType,
        rate,
        discountPercent,
        0,
        dto.specialRequests || null,
        operator || null,
        now,
        now,
      ],
    );

    const folio = await R.RoomsRepository.createFolio({
      stayId,
      guestId: guest.id,
      guestName: guest.name,
      roomNo: room.roomNo,
    });

    await run('UPDATE stays SET folio_id = ?, folio_number = ? WHERE id = ?', [
      folio.id,
      folio.folioNumber,
      stayId,
    ]);

    await R.RoomsRepository.createAssignment({
      stayId,
      roomId: room.id,
      roomNo: room.roomNo,
      assignedBy: operator,
    });

    await R.RoomsRepository.updateRoomStatus(room.id, 'occupied', stayId);

    if (dto.advanceAmount && dto.advanceAmount > 0) {
      await R.RoomsRepository.postFolioCharge({
        folioId: folio.id,
        category: 'deposit',
        description: 'Advance payment',
        amount: dto.advanceAmount,
        quantity: 1,
        notes: dto.advanceMode ? `Mode: ${dto.advanceMode}` : undefined,
      });
    }

    await recordEvent(
      'GUEST_CHECKED_IN',
      'stay',
      stayId,
      JSON.stringify({ guestName: guest.name, roomNo: room.roomNo }),
      operator,
    );
    await recordEvent(
      'ROOM_OCCUPIED',
      'room',
      room.id,
      JSON.stringify({ stayId, guestName: guest.name }),
      operator,
    );

    const createdStay = await R.RoomsRepository.findStayById(stayId);
    const createdFolio = await R.RoomsRepository.findFolioById(folio.id);
    return { stay: createdStay, folio: createdFolio };
  },

  async checkOut(dto: T.CheckOutDto, operator?: string) {
    const stay = await R.RoomsRepository.findStayById(dto.stayId);
    if (!stay) throw new Error(`Stay not found: ${dto.stayId}`);
    if (stay.status !== 'active')
      throw new Error(`Stay ${dto.stayId} is not active`);

    const now = new Date().toISOString();

    const checkInDate = new Date(stay.checkIn);
    const checkOutDate = new Date(now);
    const nightsStayed = Math.max(
      1,
      Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    let folio: T.Folio | null = null;
    if (stay.folioId) {
      folio = await R.RoomsRepository.findFolioById(stay.folioId);
    }
    if (!folio) {
      folio = await R.RoomsRepository.findFolioByStay(dto.stayId);
    }
    if (!folio) throw new Error(`Folio not found for stay ${dto.stayId}`);

    const existingRoomCharges = folio.charges
      .filter((c) => c.category === 'room_tariff')
      .reduce((s, c) => s + c.totalAmount, 0);
    const expectedRoomCharges = stay.rate * nightsStayed;
    const unbilled = expectedRoomCharges - existingRoomCharges;
    if (unbilled > 0) {
      await R.RoomsRepository.postFolioCharge({
        folioId: folio.id,
        category: 'room_tariff',
        description: 'Room charges (checkout)',
        amount: unbilled,
        quantity: 1,
      });
      folio = await R.RoomsRepository.findFolioById(folio.id);
    }

    if (dto.paymentMode && folio!.balanceAmount > 0) {
      await R.RoomsRepository.postPayment({
        folioId: folio!.id,
        mode: dto.paymentMode,
        amount: folio!.balanceAmount,
        notes: dto.notes,
      });
      folio = await R.RoomsRepository.findFolioById(folio!.id);
    }

    await R.RoomsRepository.closeFolio(folio!.id);

    await run(
      "UPDATE stays SET status = 'checked_out', check_out = ?, checked_out_by = ?, checked_out_at = ?, updated_at = ? WHERE id = ?",
      [now, operator || null, now, now, dto.stayId],
    );

    if (stay.reservationId) {
      await run(
        "UPDATE reservations SET status = 'checked_out', updated_at = ? WHERE id = ?",
        [now, stay.reservationId],
      );
    }

    const assignments = await R.RoomsRepository.findAssignmentsByStay(
      dto.stayId,
    );
    const activeAssignment = assignments.find((a) => !a.releasedAt);
    if (activeAssignment) {
      await R.RoomsRepository.releaseAssignment(
        activeAssignment.id,
        'Checkout',
      );
    }

    await R.RoomsRepository.updateRoomStatus(stay.roomId, 'cleaning');
    await run('UPDATE rooms SET current_stay_id = NULL WHERE id = ?', [
      stay.roomId,
    ]);

    const totalRevenue = folio!.totalCharges - folio!.discounts;
    await R.RoomsRepository.incrementGuestStats(stay.guestId, totalRevenue);

    await recordEvent(
      'GUEST_CHECKED_OUT',
      'stay',
      dto.stayId,
      JSON.stringify({ guestName: stay.guestName, roomNo: stay.roomNo }),
      operator,
    );
    await recordEvent(
      'ROOM_VACANT',
      'room',
      stay.roomId,
      JSON.stringify({ stayId: dto.stayId }),
      operator,
    );

    const completedStay = await R.RoomsRepository.findStayById(dto.stayId);
    return completedStay;
  },

  async getActiveStays() {
    const stays = await R.RoomsRepository.findActiveStays();
    const enriched = await Promise.all(
      stays.map(async (stay) => {
        const [room, guest] = await Promise.all([
          R.RoomsRepository.findRoomById(stay.roomId),
          R.RoomsRepository.findGuestById(stay.guestId),
        ]);
        return { ...stay, room, guest };
      }),
    );
    return enriched;
  },
};

// ── 2. FolioService ──────────────────────────────────────────────────────

export const FolioService = {
  async getFolio(folioId: string) {
    const folio = await R.RoomsRepository.findFolioById(folioId);
    if (!folio) throw new Error(`Folio not found: ${folioId}`);
    return folio;
  },

  async postCharge(dto: T.CreateFolioChargeDto, operator?: string) {
    const folio = await R.RoomsRepository.findFolioById(dto.folioId);
    if (!folio) throw new Error(`Folio not found: ${dto.folioId}`);
    if (folio.status !== 'open') {
      throw new Error(
        `Folio ${dto.folioId} is ${folio.status}, expected 'open'`,
      );
    }

    const charge = await R.RoomsRepository.postFolioCharge(dto);
    const updatedFolio = await R.RoomsRepository.findFolioById(dto.folioId);

    await recordEvent(
      'CHARGE_POSTED',
      'folio_charge',
      charge.id,
      JSON.stringify({
        folioId: dto.folioId,
        category: dto.category,
        amount: charge.totalAmount,
      }),
      operator,
    );

    return { charge, folio: updatedFolio };
  },

  async postPayment(dto: T.CreateFolioPaymentDto, operator?: string) {
    const folio = await R.RoomsRepository.findFolioById(dto.folioId);
    if (!folio) throw new Error(`Folio not found: ${dto.folioId}`);
    if (folio.status !== 'open') {
      throw new Error(
        `Folio ${dto.folioId} is ${folio.status}, expected 'open'`,
      );
    }

    const payment = await R.RoomsRepository.postPayment(dto);

    let updatedFolio = await R.RoomsRepository.findFolioById(dto.folioId);
    if (
      updatedFolio &&
      updatedFolio.balanceAmount <= 0 &&
      updatedFolio.status === 'paid'
    ) {
      await R.RoomsRepository.closeFolio(dto.folioId);
      updatedFolio = await R.RoomsRepository.findFolioById(dto.folioId);

      // M0-1: settled folio becomes an immutable accounting entry.
      const rateRows = await query(
        'SELECT tax_rate_rooms FROM settings LIMIT 1',
      );
      const rate = Number(rateRows[0]?.tax_rate_rooms || 0);
      const { taxable, tax } = splitInclusive(dto.amount, rate);
      await postOperationalToLedger('hotel_folio_charge', {
        referenceId: dto.folioId,
        referenceNo: `FOLIO-${dto.folioId}`,
        amount: taxable,
        gstAmount: tax,
        entryDate: new Date().toISOString().slice(0, 10),
        description: `Room settlement folio ${dto.folioId}`,
      });
    }

    await recordEvent(
      'PAYMENT_RECEIVED',
      'folio_payment',
      payment.id,
      JSON.stringify({
        folioId: dto.folioId,
        mode: dto.mode,
        amount: dto.amount,
      }),
      operator,
    );

    return { payment, folio: updatedFolio };
  },

  async closeFolio(folioId: string) {
    const folio = await R.RoomsRepository.findFolioById(folioId);
    if (!folio) throw new Error(`Folio not found: ${folioId}`);
    if (folio.status !== 'open') {
      throw new Error(`Folio ${folioId} is ${folio.status}, expected 'open'`);
    }

    const updated = await R.RoomsRepository.closeFolio(folioId);

    await recordEvent(
      'FOLIO_CLOSED',
      'folio',
      folioId,
      JSON.stringify({ balance: folio.balanceAmount }),
    );

    return updated;
  },
};

// ── 3. ReservationService ────────────────────────────────────────────────

export const ReservationService = {
  async createReservation(dto: T.CreateReservationDto, operator?: string) {
    const checkInDate = new Date(dto.checkIn);
    const checkOutDate = new Date(dto.checkOut);
    const nights = Math.max(
      1,
      Math.round(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    let baseRate = 0;
    if (dto.roomTypeId) {
      const roomType = await R.RoomsRepository.findRoomTypeById(dto.roomTypeId);
      if (roomType) baseRate = roomType.baseRate;
    }
    const rate = dto.rateOverride ?? baseRate;
    const totalAmount = rate * nights;
    const discountPercent = dto.discountPercent ?? 0;
    const discountAmount =
      discountPercent > 0 ? totalAmount * (discountPercent / 100) : 0;
    const finalTotal = totalAmount - discountAmount;

    const reservation = await R.RoomsRepository.createReservation(
      { ...dto, discountPercent, rateOverride: rate },
      operator,
    );

    await recordEvent(
      'RESERVATION_CREATED',
      'reservation',
      reservation.id,
      JSON.stringify({
        reservationNo: reservation.reservationNo,
        guestName: dto.guestName,
        totalAmount: finalTotal,
      }),
      operator,
    );

    return reservation;
  },

  async confirmReservation(id: string, operator?: string) {
    return R.RoomsRepository.updateReservationStatus(id, 'confirmed', operator);
  },

  async cancelReservation(id: string, operator?: string) {
    const reservation = await R.RoomsRepository.findReservationById(id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);

    if (reservation.roomId) {
      await R.RoomsRepository.updateRoomStatus(reservation.roomId, 'vacant');
      await run('UPDATE reservations SET room_id = NULL WHERE id = ?', [id]);
    }

    return R.RoomsRepository.cancelReservation(id, operator);
  },

  async markNoShow(id: string, operator?: string) {
    const reservation = await R.RoomsRepository.findReservationById(id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);

    const allowed = T.RESERVATION_TRANSITIONS[reservation.status];
    if (!allowed || !allowed.includes('no_show')) {
      throw new Error(
        `Invalid reservation status transition: ${reservation.status} -> no_show`,
      );
    }

    const now = new Date().toISOString();
    await run(
      "UPDATE reservations SET status = 'no_show', updated_at = ? WHERE id = ?",
      [now, id],
    );

    if (reservation.roomId) {
      await R.RoomsRepository.updateRoomStatus(reservation.roomId, 'vacant');
      await run('UPDATE reservations SET room_id = NULL WHERE id = ?', [id]);
    }

    await recordEvent(
      'RESERVATION_CANCELLED',
      'reservation',
      id,
      JSON.stringify({ from: reservation.status, to: 'no_show' }),
      operator,
    );

    return R.RoomsRepository.findReservationById(id);
  },
};

// ── 4. RoomService ───────────────────────────────────────────────────────

export const RoomService = {
  async transferRoom(stayId: string, newRoomId: string, operator?: string) {
    const stay = await R.RoomsRepository.findStayById(stayId);
    if (!stay) throw new Error(`Stay not found: ${stayId}`);
    if (stay.status !== 'active')
      throw new Error(`Stay ${stayId} is not active`);

    const newRoom = await R.RoomsRepository.findRoomById(newRoomId);
    if (!newRoom) throw new Error(`Room not found: ${newRoomId}`);
    if (newRoom.status !== 'vacant') {
      throw new Error(
        `Room ${newRoom.roomNo} is ${newRoom.status}, expected 'vacant'`,
      );
    }

    const assignments = await R.RoomsRepository.findAssignmentsByStay(stayId);
    const activeAssignment = assignments.find((a) => !a.releasedAt);
    if (activeAssignment) {
      await R.RoomsRepository.releaseAssignment(
        activeAssignment.id,
        'Room transfer',
      );
    }

    await R.RoomsRepository.createAssignment({
      stayId,
      roomId: newRoom.id,
      roomNo: newRoom.roomNo,
      assignedBy: operator,
    });

    await R.RoomsRepository.updateRoomStatus(stay.roomId, 'vacant');
    await R.RoomsRepository.updateRoomStatus(newRoom.id, 'occupied', stayId);

    const oldRoom = await R.RoomsRepository.findRoomById(stay.roomId);

    await recordEvent(
      'ROOM_TRANSFERRED',
      'stay',
      stayId,
      JSON.stringify({ fromRoom: oldRoom?.roomNo, toRoom: newRoom.roomNo }),
      operator,
    );

    return {
      stay: await R.RoomsRepository.findStayById(stayId),
      oldRoom,
      newRoom,
    };
  },

  async blockRoom(roomId: string, operator?: string) {
    const room = await R.RoomsRepository.findRoomById(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);

    const updated = await R.RoomsRepository.updateRoomStatus(roomId, 'blocked');

    await recordEvent(
      'ROOM_BLOCKED',
      'room',
      roomId,
      JSON.stringify({ roomNo: room.roomNo }),
      operator,
    );

    return updated;
  },

  async unblockRoom(roomId: string, operator?: string) {
    const room = await R.RoomsRepository.findRoomById(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);
    if (room.status !== 'blocked') {
      throw new Error(
        `Room ${room.roomNo} is ${room.status}, expected 'blocked'`,
      );
    }

    const updated = await R.RoomsRepository.updateRoomStatus(roomId, 'vacant');

    await recordEvent(
      'ROOM_VACANT',
      'room',
      roomId,
      JSON.stringify({ roomNo: room.roomNo, action: 'unblocked' }),
      operator,
    );

    return updated;
  },

  async setOutOfService(roomId: string, operator?: string) {
    const room = await R.RoomsRepository.findRoomById(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);

    const updated = await R.RoomsRepository.updateRoomStatus(
      roomId,
      'out_of_service',
    );

    await recordEvent(
      'ROOM_BLOCKED',
      'room',
      roomId,
      JSON.stringify({ roomNo: room.roomNo, action: 'out_of_service' }),
      operator,
    );

    return updated;
  },
};

// ── 5. HousekeepingService ───────────────────────────────────────────────

export const HousekeepingService = {
  async createTask(dto: T.CreateHousekeepingDto, operator?: string) {
    const room = await R.RoomsRepository.findRoomById(dto.roomId);
    if (!room) throw new Error(`Room not found: ${dto.roomId}`);

    const task = await R.RoomsRepository.createHousekeepingTask({
      ...dto,
      assignedTo: dto.assignedTo || operator,
    });

    await recordEvent(
      'HOUSEKEEPING_STARTED',
      'housekeeping_task',
      task.id,
      JSON.stringify({
        roomId: dto.roomId,
        roomNo: room.roomNo,
        taskType: dto.taskType,
      }),
      operator,
    );

    return task;
  },

  async completeTask(taskId: string, operator?: string) {
    const task = await R.RoomsRepository.findHousekeepingTaskById(taskId);
    if (!task) throw new Error(`Housekeeping task not found: ${taskId}`);

    const completed = await R.RoomsRepository.completeHousekeepingTask(taskId);

    if (task.status === 'in_progress' || task.status === 'pending') {
      const room = await R.RoomsRepository.findRoomById(task.roomId);
      if (room && room.status === 'cleaning') {
        await R.RoomsRepository.updateRoomStatus(task.roomId, 'vacant');
      }
    }

    await recordEvent(
      'HOUSEKEEPING_COMPLETED',
      'housekeeping_task',
      taskId,
      JSON.stringify({ roomId: task.roomId, taskType: task.taskType }),
      operator,
    );

    return completed;
  },

  async getTaskSummary(date?: string) {
    return R.RoomsRepository.getHousekeepingSummary(date);
  },
};

// ── 6. MaintenanceService ────────────────────────────────────────────────

export const MaintenanceService = {
  async createRequest(dto: T.CreateMaintenanceDto, operator?: string) {
    const room = await R.RoomsRepository.findRoomById(dto.roomId);
    if (!room) throw new Error(`Room not found: ${dto.roomId}`);

    const request = await R.RoomsRepository.createMaintenanceRequest({
      ...dto,
      reportedBy: operator || dto.reportedBy,
    });

    await recordEvent(
      'MAINTENANCE_OPENED',
      'maintenance_request',
      request.id,
      JSON.stringify({
        roomId: dto.roomId,
        roomNo: room.roomNo,
        issueType: dto.issueType,
      }),
      operator,
    );

    return request;
  },

  async resolveRequest(
    requestId: string,
    resolution: string,
    cost: number,
    verifiedBy: string,
  ) {
    const request =
      await R.RoomsRepository.findMaintenanceRequestById(requestId);
    if (!request)
      throw new Error(`Maintenance request not found: ${requestId}`);

    const resolved = await R.RoomsRepository.resolveMaintenance(
      requestId,
      resolution,
      cost,
      verifiedBy,
    );

    await recordEvent(
      'MAINTENANCE_CLOSED',
      'maintenance_request',
      requestId,
      JSON.stringify({ resolution, cost, verifiedBy }),
      verifiedBy,
    );

    return resolved;
  },
};

// ── 7. NightAuditService ─────────────────────────────────────────────────

export const NightAuditService = {
  async performNightAudit(auditDate: string, performedBy: string) {
    const existing = await R.RoomsRepository.findNightAuditByDate(auditDate);
    if (existing)
      throw new Error(`Night audit already exists for ${auditDate}`);

    const summary = await R.RoomsRepository.getOccupancySummary();
    const totalRooms = Object.values(summary).reduce((a, b) => a + b, 0);
    const occupiedRooms = summary.occupied || 0;
    const vacantRooms = summary.vacant || 0;
    const outOfServiceRooms = summary.out_of_service || 0;
    const blockedRooms = summary.blocked || 0;
    const housekeepingRooms = summary.cleaning || 0;

    const activeStays = await R.RoomsRepository.findActiveStays();
    for (const stay of activeStays) {
      const folio = stay.folioId
        ? await R.RoomsRepository.findFolioById(stay.folioId)
        : await R.RoomsRepository.findFolioByStay(stay.id);
      if (folio) {
        await R.RoomsRepository.postFolioCharge({
          folioId: folio.id,
          category: 'room_tariff',
          description: `Night of ${auditDate}`,
          amount: stay.rate,
          quantity: 1,
          reference: `night-audit-${auditDate}`,
        });
      }
    }

    const dayStart = `${auditDate} 00:00:00`;
    const dayEnd = `${auditDate} 23:59:59`;

    const revenueRows = await query(
      `SELECT category, COALESCE(SUM(total_amount), 0) as total
       FROM folio_charges
       WHERE posted_at >= ? AND posted_at <= ?
       GROUP BY category`,
      [dayStart, dayEnd],
    );

    const revenueByCategory: Record<string, number> = {};
    for (const r of revenueRows) {
      revenueByCategory[r.category] = Number(r.total);
    }

    const roomRevenue = revenueByCategory.room_tariff || 0;
    const restaurantRevenue =
      (revenueByCategory.restaurant || 0) +
      (revenueByCategory.room_service || 0);
    const barRevenue = revenueByCategory.bar || 0;
    const otherRevenue =
      (revenueByCategory.laundry || 0) +
      (revenueByCategory.extra_bed || 0) +
      (revenueByCategory.amenities || 0) +
      (revenueByCategory.service_charge || 0) +
      (revenueByCategory.other || 0);
    const totalRevenue = Object.values(revenueByCategory).reduce(
      (a, b) => a + b,
      0,
    );

    const taxResult = await query(
      `SELECT COALESCE(SUM(tax_amount), 0) as total FROM folio_charges
       WHERE posted_at >= ? AND posted_at <= ?`,
      [dayStart, dayEnd],
    );
    const totalTax = Number(taxResult[0]?.total || 0);

    const discountResult = await query(
      `SELECT COALESCE(SUM(discounts), 0) as total FROM folios
       WHERE updated_at >= ? AND updated_at <= ?`,
      [dayStart, dayEnd],
    );
    const totalDiscounts = Number(discountResult[0]?.total || 0);

    const payResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM folio_payments
       WHERE processed_at >= ? AND processed_at <= ?`,
      [dayStart, dayEnd],
    );
    const totalPayments = Number(payResult[0]?.total || 0);

    const outstandingResult = await query(
      `SELECT COALESCE(SUM(balance_amount), 0) as total FROM folios WHERE status IN ('open', 'partially_paid')`,
    );
    const outstandingBalance = Number(outstandingResult[0]?.total || 0);

    const occupancyPercent =
      totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    const adr = occupiedRooms > 0 ? roomRevenue / occupiedRooms : 0;
    const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

    const audit = await R.RoomsRepository.performNightAudit({
      auditDate,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      outOfServiceRooms,
      blockedRooms,
      housekeepingRooms,
      totalRevenue,
      roomRevenue,
      restaurantRevenue,
      barRevenue,
      otherRevenue,
      totalTax,
      totalDiscounts,
      totalPayments,
      outstandingBalance,
      performedBy,
    });

    await recordEvent(
      'NIGHT_AUDIT_COMPLETED',
      'night_audit',
      audit.id,
      JSON.stringify({
        auditDate,
        occupancyPercent,
        roomRevenue,
        totalRevenue,
      }),
      performedBy,
    );

    return audit;
  },
};

// ── 8. ReportingService ──────────────────────────────────────────────────

export const ReportingService = {
  async getOccupancyReport(fromDate: string, toDate: string) {
    return R.RoomsRepository.getOccupancyReport(fromDate, toDate);
  },

  async getRevenueReport(fromDate: string, toDate: string) {
    return R.RoomsRepository.getRevenueReport(fromDate, toDate);
  },

  async getCurrentOccupancy() {
    const summary = await R.RoomsRepository.getOccupancySummary();
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    const occupied = summary.occupied || 0;
    return {
      total,
      occupied,
      vacant: summary.vacant || 0,
      cleaning: summary.cleaning || 0,
      maintenance: summary.maintenance || 0,
      outOfService: summary.out_of_service || 0,
      blocked: summary.blocked || 0,
      reserved: summary.reserved || 0,
      occupancyPercent: total > 0 ? (occupied / total) * 100 : 0,
    };
  },

  async getGuestHistory(guestId: string) {
    return R.RoomsRepository.getGuestHistory(guestId);
  },
};

// ── 9. ValidationService ─────────────────────────────────────────────────

export const ValidationService = {
  validateCreateReservation(dto: T.CreateReservationDto): string[] {
    const errors: string[] = [];
    if (!dto.guestName?.trim()) errors.push('Guest name is required');
    if (!dto.guestPhone?.trim()) errors.push('Guest phone is required');
    if (!dto.checkIn) errors.push('Check-in date is required');
    if (!dto.checkOut) errors.push('Check-out date is required');
    if (dto.checkIn && dto.checkOut) {
      const checkIn = new Date(dto.checkIn);
      const checkOut = new Date(dto.checkOut);
      if (checkIn >= checkOut) errors.push('Check-out must be after check-in');
    }
    if (dto.adults !== undefined && dto.adults < 1)
      errors.push('At least 1 adult required');
    if (dto.children !== undefined && dto.children < 0)
      errors.push('Children cannot be negative');
    if (
      dto.discountPercent !== undefined &&
      (dto.discountPercent < 0 || dto.discountPercent > 100)
    ) {
      errors.push('Discount percent must be between 0 and 100');
    }
    if (dto.rateOverride !== undefined && dto.rateOverride < 0)
      errors.push('Rate override cannot be negative');
    if (dto.boardType && !T.VALID_BOARD_TYPES.includes(dto.boardType)) {
      errors.push(`Invalid board type: ${dto.boardType}`);
    }
    if (dto.source && !T.VALID_BOOKING_SOURCES.includes(dto.source)) {
      errors.push(`Invalid booking source: ${dto.source}`);
    }
    return errors;
  },

  validateCheckIn(dto: T.CheckInDto): string[] {
    const errors: string[] = [];
    if (!dto.reservationId?.trim()) errors.push('Reservation ID is required');
    if (!dto.roomId?.trim()) errors.push('Room ID is required');
    if (dto.advanceAmount !== undefined && dto.advanceAmount < 0)
      errors.push('Advance amount cannot be negative');
    if (dto.adults !== undefined && dto.adults < 1)
      errors.push('At least 1 adult required');
    if (dto.children !== undefined && dto.children < 0)
      errors.push('Children cannot be negative');
    if (dto.advanceMode && !T.VALID_PAYMENT_MODES.includes(dto.advanceMode)) {
      errors.push(`Invalid payment mode: ${dto.advanceMode}`);
    }
    return errors;
  },

  validateCheckOut(dto: T.CheckOutDto): string[] {
    const errors: string[] = [];
    if (!dto.stayId?.trim()) errors.push('Stay ID is required');
    if (dto.paymentMode && !T.VALID_PAYMENT_MODES.includes(dto.paymentMode)) {
      errors.push(`Invalid payment mode: ${dto.paymentMode}`);
    }
    return errors;
  },

  validateCreateGuest(dto: T.CreateGuestDto): string[] {
    const errors: string[] = [];
    if (!dto.name?.trim()) errors.push('Guest name is required');
    if (!dto.phone?.trim()) errors.push('Guest phone is required');
    if (dto.phone && !/^\+?[\d\s-]{7,20}$/.test(dto.phone))
      errors.push('Invalid phone number format');
    if (dto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email))
      errors.push('Invalid email format');
    if (dto.nationality && dto.nationality.length > 100)
      errors.push('Nationality too long');
    return errors;
  },
};

// ── Unified export ───────────────────────────────────────────────────────

export const roomsService = {
  checkInOut: CheckInOutService,
  folio: FolioService,
  reservation: ReservationService,
  room: RoomService,
  housekeeping: HousekeepingService,
  maintenance: MaintenanceService,
  nightAudit: NightAuditService,
  reporting: ReportingService,
  validation: ValidationService,
};
